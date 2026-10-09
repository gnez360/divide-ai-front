# Conta Juntos: Especificação Técnica (SDD)

| Campo | Valor |
|---|---|
| Versão | 1.0 |
| Data | 09/10/2026 |
| Base | `spec.md` v2.0 (especificação funcional) |
| Status | Pronta para implementação. Decisões em aberto em §19 |
| Stack (decisão do produto) | Backend Node.js + Express + TypeScript · PostgreSQL no Supabase · Front PWA React + TypeScript + Tailwind CSS · nuvem pública genérica · OCR por adapter, começando pelo Google Cloud Vision |

**Como ler:** `§F5.8` aponta para a seção 5.8 da spec funcional (`spec.md`); `§7.3` aponta para esta spec técnica. Critérios de aceite são citados como na spec funcional (`CA-D8`). Em caso de conflito, a spec funcional define o comportamento e esta spec define como implementá-lo; um conflito real deve ser corrigido nos dois documentos.

---

## 0. Resumo das decisões técnicas

| # | Decisão | Motivo principal | Seção |
|---|---|---|---|
| ADR-01 | Monorepo TypeScript (pnpm workspaces) com o pacote `@cj/core` compartilhado entre web e API | A mesma biblioteca de cálculo e de comandos no cliente (prévia) e no servidor (autoridade), exigida por §F10.2 T4 | §3 |
| ADR-02 | Agregado "conta" persistido como documento JSONB em uma linha, com colunas indexadas para consultas operacionais | Toda mutação já trava e revalida a conta inteira (§F8.2); um documento elimina mapeamento objeto-relacional e mantém a escrita atômica | §5.1 |
| ADR-03 | Serialização por conta com `SELECT … FOR UPDATE` na linha da conta | Implementa §F10.2 T8 sem infraestrutura extra | §7 |
| ADR-04 | Um único endpoint de comandos por conta (`POST /api/bills/:id/commands`) com união discriminada validada por zod | Idempotência, guardas de versão, aviso de reabertura e auditoria uniformes | §6 |
| ADR-05 | Cada evento de tempo real carrega o snapshot completo da conta | Elimina diffs e reconstrução no cliente; um salto de revisão deixa de exigir busca extra | §8 |
| ADR-06 | Fan-out entre instâncias com `LISTEN/NOTIFY` do Postgres e tabela de eventos de vida curta | Sem Redis nem broker; `NOTIFY` só é entregue após o commit (§F10.2 T7) | §8.4 |
| ADR-07 | Jobs e tarefas agendadas com pg-boss no mesmo Postgres | OCR assíncrono, purgas e expirações sem outro serviço | §14 |
| ADR-08 | OCR atrás da porta `ReceiptExtractor`; primeira implementação: Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`) + parser próprio de comandas pt-BR | Trocar de provedor sem tocar no domínio; Vision devolve texto com posição, e a interpretação da comanda é nossa | §9 |
| ADR-09 | `joinToken` derivado por HMAC (`billId` + versão), sem armazenar o token | Pode ser reexibido a qualquer participante, rotacionado por versão e não vaza se o banco vazar | §11.1 |
| ADR-10 | Um cookie de sessão por conta (`__Host-cj_<billId>`), com o hash do token guardado no servidor | Atende "sair e apagar" por conta sem derrubar as outras contas do aparelho | §11.2 |
| ADR-11 | Imagem servida por proxy da API (sessão obrigatória), nunca por URL pública ou assinada exposta | Imagem presa à sessão da conta; sem origem de terceiros na CSP | §10 |
| ADR-12 | Cabeçalhos de segurança aplicados na borda (CDN/proxy), não na aplicação | Um único ponto de configuração (§F9.4.9) | §12.6 |
| ADR-13 | Cálculo com `BigInt` interno e desempate SHA-256 síncrono (`@noble/hashes`) | Produtos chegam a 10^16 (acima de `Number.MAX_SAFE_INTEGER`); hash síncrono roda igual no navegador e no Node | §4.5 |

---

## 1. Contexto e requisitos que guiam o desenho

### 1.1 Requisitos técnicos derivados da spec funcional

| Requisito | Origem | Consequência no desenho |
|---|---|---|
| Servidor é a autoridade; o cliente só pré-visualiza com a mesma lógica | §F7, §F10.2 T4 | `@cj/core` puro, sem I/O, usado nos dois lados |
| Mutações de uma conta serializadas; validação do agregado inteiro | §F8.2, §F8.3.2 | lock por linha + documento único |
| Guardas: `expected.version`, `expected.consumptionVersion`, `expected.shareAmount`, `acceptedReopens`, `expected.revision` | §F8.3 | envelope de comando com `expected` |
| Idempotência por `operationId` (24 h) | §F8.4 | tabela `operations`, verificada dentro do lock |
| Revisão monotônica e início sem janela de perda | §F8.5 | evento `hello` + snapshot + buffer |
| Eventos só depois do commit | §F10.2 T7 | `pg_notify` dentro da transação |
| Tentativa de OCR vigente; resultado tardio descartado | §F6.2 | tentativa no documento + checagem na aplicação do resultado |
| Token do link no fragmento, troca por sessão via `POST` | §F5.2, §F10.2 T9 | página `/entrar` + `POST /api/join` |
| Sessão por conta e participante, revogável, encerra o SSE | §F5.3.1, §F8.10 | tabela `sessions` + `NOTIFY session_revoked` |
| Foto sem metadados, só para sessões da conta, purgada 48 h após finalizar | §F9.4.8, §F9.5 | sharp + proxy + job |
| Metas: comando ≤ 1,5 s p95; evento ≤ 500 ms p95; OCR ≤ 8 s p95 | §F9.1 | mesma região para API, banco e storage |

### 1.2 Escala de referência do MVP

| Grandeza | Valor de projeto |
|---|---|
| Contas ativas simultâneas no pico | 300 |
| Conexões SSE simultâneas | 2.000 (≈ 6 por conta + abas extras) |
| Comandos por segundo no pico | 50 |
| Tamanho do documento da conta | ≤ 80 KB (100 itens, 20 cobranças, 6 participantes) |
| Fotos por dia | 2.000 (≈ 1 MB cada após compressão) |

Esses números dimensionam pools, limites e testes de carga (§17.6). Não são metas de negócio.

### 1.3 Fora do escopo técnico do MVP

Multi-região, replay de eventos, fila de operações offline, analytics de terceiros, apps nativos.

---

## 2. Arquitetura

### 2.1 Componentes

```text
                         ┌──────────────────────────────────────────────┐
  Phone (PWA)            │  Edge: CDN + proxy (contajuntos.app)         │
  React + TS + Tailwind ─┼─▶ /*        → static files (web)             │
  Service Worker         │  /api/*     → API (no cache, streaming)      │
  IndexedDB (cache)      │  security headers (ADR-12)                   │
                         └───────────────┬──────────────────────────────┘
                                         │
                       ┌─────────────────▼─────────────────┐
                       │ API (Node 24 + Express 5), ≥ 2    │
                       │ - commands, snapshot, join        │
                       │ - SSE (fan-out via LISTEN)        │
                       │ - image upload and proxy          │
                       └───────┬───────────────┬───────────┘
                               │               │
             ┌─────────────────▼───┐   ┌───────▼─────────────────┐
             │ Supabase Postgres   │   │ Supabase Storage         │
             │ schema app + pgboss │   │ private bucket receipts  │
             └─────────▲───────────┘   └───────▲─────────────────┘
                       │                       │
                       │  ┌────────────────────┴───────┐      ┌─────────────────────────┐
                       └──┤ Worker (Node 24), 1 to 2   ├─────▶│ Google Cloud Vision API │
                          │ - OCR, purges, expirations │      └─────────────────────────┘
                          └────────────────────────────┘
```

### 2.2 Responsabilidades

| Componente | Faz | Não faz |
|---|---|---|
| Web (PWA) | telas, prévia de cálculo com `@cj/core`, sincronização (§13.4), cache de leitura offline, câmera e compressão | decidir validade de operação; guardar tokens em JS |
| Borda | servir estáticos, rotear `/api`, TLS, cabeçalhos de segurança, compressão de respostas não-SSE | lógica de aplicação |
| API | autenticar sessão, autorizar, validar entrada, executar comandos de forma serializada, publicar eventos, servir SSE, processar e servir imagem | chamar o provedor de OCR; executar tarefas agendadas |
| Worker | jobs do pg-boss: OCR, expirações, purgas, efeitos fora do banco | atender HTTP de clientes |
| Postgres | estado da conta, sessões, idempotência, eventos, presença, auditoria, filas, rate limit | regras de negócio (ficam no `@cj/core`) |
| Storage | fotos processadas | servir arquivos diretamente ao cliente |
| Google Vision | texto + posição das palavras da foto | interpretar a comanda |

### 2.3 Fluxos principais

**Comando (caminho crítico):**

```text
PWA ──POST /api/bills/:id/commands {operationId, command, expected, …}──▶ API
API: session → Origin → rate limit → zod
API ──BEGIN; SELECT … FOR UPDATE──▶ Postgres
API: operationId already in operations? → return the stored result
API: core.execute(document, command, actor) → new document + events + audit entries
API ──UPDATE bills; INSERT events/audit_log/operations; pg_notify; COMMIT──▶ Postgres
API ──200 {revision, snapshot}──▶ PWA
Postgres ──NOTIFY bill_events──▶ every API instance ──SSE──▶ other phones
```

**Criação com OCR:**

```text
PWA: identification → POST /api/bills → Set-Cookie (creator session), status DRAFT
PWA: photo → compression → POST /api/bills/:id/image (multipart)
API: validate, strip metadata, re-encode → Storage → command START_OCR (OCR_PROCESSING, attempt T1)
API: enqueue job "ocr" (T1) and job "ocr-expire" (T1, +25 s) in the same transaction → 202
Worker: download image → Vision → parser → schema validation → system command APPLY_OCR_RESULT(T1)
        (ignored if T1 is no longer the current attempt)
PWA: receives the SSE event → screen 06; 20 s without a result → command ABANDON_OCR → screen 05
```

**Entrada pelo link:**

```text
PWA /entrar#t=<token>: read the fragment, clear the URL, keep the token in memory only
PWA ──POST /api/join/resolve {joinToken}──▶ preview (restaurant, table, seats, names, status)
PWA ──POST /api/join {joinToken, action, displayName, …}──▶ join command (serialized) → Set-Cookie
    or, for a claim: create request → claim cookie → poll until approved → session
```

---

## 3. Stack e organização do código

### 3.1 Stack

| Camada | Escolha | Observação |
|---|---|---|
| Linguagem | TypeScript 5.x, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | zero `any` (lint bloqueia) |
| Runtime | Node.js 24 LTS | mesma versão em API, worker e CI |
| Gerenciador | pnpm workspaces | lockfile obrigatório |
| HTTP | Express 5 | erros assíncronos tratados nativamente |
| Validação e contratos | zod | schemas em `@cj/contracts`, usados no front e na API |
| Banco | PostgreSQL 17 (Supabase) | schema `app` |
| Acesso ao banco | Drizzle ORM + `pg` (node-postgres); migrações com drizzle-kit | consultas parametrizadas sempre |
| Filas e agendamento | pg-boss | schema `pgboss` no mesmo banco |
| Rate limit | rate-limiter-flexible (store Postgres) | §12.7 |
| Imagem | sharp (libvips) + file-type + heic-convert (só para HEIC) | §10 |
| Storage | Supabase Storage (S3-compatível), bucket privado | §10.4 |
| OCR | Google Cloud Vision REST via `fetch` (undici) + google-auth-library | atrás de `ReceiptExtractor` (§9) |
| Logs | pino + pino-http com redação | §15.1 |
| Telemetria | OpenTelemetry (HTTP, pg, undici) exportando OTLP | fornecedor de observabilidade em aberto (§19) |
| Front | React 19 + Vite + React Router 7 | SPA servida como estáticos |
| Estilo | Tailwind CSS v4 | tokens do mockup (§13.7) |
| Componentes acessíveis | Radix UI (Dialog, Toggle, etc.) + vaul (bottom sheet) | foco preso e Esc nativos |
| Estado no front | Zustand | um store por conta aberta (§13.4) |
| PWA | vite-plugin-pwa (Workbox) | só a casca do app em cache (§13.6) |
| Cache local | IndexedDB via `idb-keyval` | snapshot por conta para leitura offline |
| QR Code | `qrcode` para gerar; `BarcodeDetector` nativo para ler, com `@zxing/browser` como alternativa; campo para colar o link | §F10.2 T5, tela 01 |
| Testes | Vitest, fast-check, Supertest, Playwright, axe-core, k6 | §17 |

### 3.2 Estrutura do repositório

```text
conta-juntos/
├── apps/
│   ├── web/                      # React PWA
│   │   ├── src/routes/           # one folder per screen (01..28)
│   │   ├── src/components/       # Button, Sheet, MoneyInput, StatusBadge, SyncIndicator…
│   │   ├── src/sync/             # API client, SSE, per-bill store, pending queue
│   │   ├── src/camera/           # capture and compression
│   │   ├── src/strings/pt-BR.ts  # the only place with user-facing text (pt-BR)
│   │   └── vite.config.ts
│   ├── api/                      # Express
│   │   ├── src/http/             # routes, middlewares, errors
│   │   ├── src/app/              # application services (command pipeline, join, image)
│   │   ├── src/infra/            # db, storage, sse, notify, rate limit, crypto
│   │   └── src/server.ts
│   └── worker/                   # pg-boss workers
│       ├── src/jobs/             # ocr, expirations, purges, side effects
│       └── src/worker.ts
├── packages/
│   ├── core/                     # pure domain: types, calculation, derivation, commands (no I/O)
│   │   ├── src/calc/             # largestRemainder, totals, allocation, shares
│   │   ├── src/derive.ts
│   │   ├── src/commands/         # one file per command
│   │   └── test/                 # unit, property and vector tests
│   ├── contracts/                # zod schemas for the API and events; generated types
│   └── ocr/                      # ReceiptExtractor port, Google Vision adapter, pt-BR parser, fake
├── db/migrations/                # generated and reviewed SQL (drizzle-kit)
├── infra/                        # Dockerfile, edge config, local compose
└── docs/                         # spec.md, spec_tecnica.md, ADRs
```

Regras de dependência (verificadas por lint de importações):

```text
core      → (nothing besides @noble/hashes)
contracts → core (types only)
ocr       → contracts
api       → core, contracts, ocr (types), its own infra
worker    → core, contracts, ocr
web       → core, contracts
```

### 3.3 Convenções

- **Idioma do código:** todo o código-fonte é em inglês: identificadores, tipos, campos, enums, comandos, códigos de erro, tabelas e colunas, rotas da API, nomes de jobs, métricas, variáveis de ambiente, comentários, mensagens de log e testes. O Apêndice C traduz os termos da spec funcional para os nomes usados no código.
- **Idioma da interface:** só o que o usuário vê fica em pt-BR: textos das telas, mensagens de erro exibidas, banners, texto do resumo compartilhado, rotas de página visíveis na barra de endereço (`/entrar`, `/c/:billId/itens`) e a palavra digitada na exclusão ("EXCLUIR"). Esses textos ficam em `apps/web/src/strings/pt-BR.ts` (chaves em inglês, valores em pt-BR); erros de domínio levam `message` em pt-BR vindo do mesmo catálogo.
- Palavras-chave de comanda reconhecidas pelo parser (`TOTAL`, `COUVERT`, `SERVICO`…) são dados em pt-BR, não identificadores.
- ESLint com `typescript-eslint` estrito: `no-explicit-any`, `no-floating-promises`, `switch-exhaustiveness-check`, `react/no-danger`, proibição de `Math.random` e `eval`.
- Prettier; commits convencionais; revisão obrigatória.
- Todo comando, erro e evento novo exige: schema em `contracts`, handler em `core`, testes e entrada na tabela de §6.4.

---

## 4. Domínio no código (`@cj/core`)

`@cj/core` é uma biblioteca pura: recebe estado e devolve estado. Não acessa relógio, rede, banco nem gera IDs por conta própria (recebe tudo por parâmetro). É executada no servidor (autoridade) e no cliente (prévia e aviso de reabertura, §F5.11).

### 4.1 Documento da conta

Reflete §F2.2. Campos derivados não são armazenados.

```ts
type Cents = number & { readonly __brand: 'Cents' };              // safe integer, 0 ≤ v ≤ 99_999_999
type BasisPoints = number & { readonly __brand: 'BasisPoints' };  // 0..10000
type Iso = string;                                                // ISO-8601 UTC

interface BillDocument {
  schemaVersion: 1;
  id: BillId;
  status: 'DRAFT' | 'OCR_PROCESSING' | 'OCR_FAILED' | 'RECEIPT_REVIEW' | 'OPEN' | 'CLOSED';
  createdBy: ParticipantId;
  details: { restaurantName?: string; table?: string; receiptNumber?: string; version: number };
  printedTotal: Cents | null;           // versioned by details.version
  seatLimit: number;                    // default 6
  ocrAttempt: OcrAttempt | null;
  items: Item[];                        // includes items with deletedAt
  charges: Charge[];
  participants: Participant[];
  claims: Claim[];                      // pending, plus those decided in the last 24 h
  receiptConfirmedAt: Iso | null;
  closedAt: Iso | null;
  createdAt: Iso;
}

interface Item {
  id: ItemId; name: string; quantity: number;
  priceMode: 'UNIT_PRICE' | 'LINE_TOTAL';
  unitPrice: Cents | null; lineTotal: Cents;
  splitMode: 'EQUAL' | 'BY_UNITS' | 'CUSTOM_AMOUNT' | 'CUSTOM_PERCENT' | null;
  allocations: Allocation[];
  origin: 'OCR' | 'MANUAL';
  deletedAt: Iso | null; deletedBy: ParticipantId | null;
  version: number;
}

interface Allocation {
  participantId: ParticipantId;
  units?: number; fixedAmount?: Cents; percentBp?: BasisPoints;   // depending on splitMode
}

interface Charge {
  id: ChargeId; description: string;
  kind: 'FEE' | 'DISCOUNT'; scope: 'RECEIPT' | 'TABLE';
  amount: Cents; percentBp: BasisPoints | null;
  amountSource: 'PRINTED' | 'FROM_PERCENT' | 'MANUAL';
  origin: 'OCR' | 'MANUAL' | 'DISCREPANCY_ADJUSTMENT';
  distribution: 'PROPORTIONAL' | 'EQUAL_PER_PERSON';
  splitAmong: ParticipantId[];
  waiver: 'NONE' | 'FULL' | 'PARTIAL'; waivedFor: ParticipantId[];
  confirmed: boolean; confirmedBy: ParticipantId | null;
  reviewReason: 'OCR_AMOUNT_ONLY' | 'OCR_PERCENT_ONLY' | 'PERCENT_MISMATCH' | null;
  version: number;
}

interface Participant {
  id: ParticipantId; displayName: string; avatar: { initial: string; color: AvatarColor };
  status: 'INVITED' | 'ACTIVE' | 'SHARE_CLOSED';
  consumptionConfirmed: boolean; confirmationSource: 'SELF' | 'ON_BEHALF' | null;
  confirmedBy: ParticipantId | null; confirmedAt: Iso | null;
  consumptionVersion: number;
  closedShareAmount: Cents | null; shareClosedAt: Iso | null;
  preRegisteredBy: ParticipantId | null; joinedAt: Iso | null;
  joinOrder: number;                    // used for "Participante N" (§F5.14)
  anonymized: boolean; version: number;
}

interface OcrAttempt { id: OcrAttemptId; status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'; startedAt: Iso; finishedAt: Iso | null; errorCode: OcrErrorCode | null }
interface Claim { id: ClaimId; targetParticipantId: ParticipantId; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'; requestedAt: Iso; decidedAt: Iso | null; decidedBy: ParticipantId | null }
```

Fora do documento (colunas e tabelas próprias, §5.2): imagem, versão do `joinToken`, sessões, segredos de reivindicação, idempotência, eventos, presença e auditoria.

### 4.2 Derivação

```ts
function derive(doc: BillDocument): Derived;

interface Derived {
  totals: { itemsTotal; receiptTotal; difference; reconciliationAdjustment; reconciledTotal; waivedTotal; tableAdjustmentsTotal; amountDue };
  items: Record<ItemId, { status: 'UNSPLIT' | 'PARTIAL' | 'SPLIT' | 'DELETED'; shares: Record<ParticipantId, Cents>; unassigned: Cents }>;
  charges: Record<ChargeId, { portions: Record<ParticipantId, Cents>; waived: Record<ParticipantId, Cents>; unassigned: Cents; base: Cents | null }>;
  shares: Record<ParticipantId, { consumption; lines: ShareLine[]; adjustment; amount: Cents; consumptionStatus: ConsumptionStatus }>;
  unallocated: { total: number; bySource: { items; charges; adjustment } };   // signed
  blockers: Blocker[];                                                    // §F2.4, id = `${type}:${entityId}`
  progress: { itemsSplit; itemsTotal; peopleConfirmed; peopleTotal; sharesClosed };
}
```

- `derive` é determinística e idempotente: mesma entrada, mesma saída (§F11.J).
- Ordem de cálculo: itens ativos (sem `deletedAt`) → partilhas (§F7.6) → consumo por pessoa → totais (§F7.4) → cobranças (§F7.7) com a regra "centavos de resto só sem valor sem dono" → ajuste de conciliação → partes (§F7.8) → saldo → pendências → situações (§F5.8.4).
- `derive` também valida I1 (§F7.11). Violação lança `InvariantError`, que vira 500 (§7.3).

### 4.3 Comandos

```ts
function execute(doc: BillDocument, cmd: Command, ctx: ExecutionContext): Result;

interface ExecutionContext {
  actor: { kind: 'PARTICIPANT'; participantId: ParticipantId; isCreator: boolean }
       | { kind: 'VISITOR' }             // join commands
       | { kind: 'SYSTEM' };             // OCR, expirations
  now: Iso;
  newId: () => string;                   // UUID v4 on the server; provisional IDs in the client preview
}

type Result =
  | { ok: true; noChange: true; response?: unknown }        // e.g. closing an already closed bill, discarded OCR result
  | { ok: true; noChange?: false; doc: BillDocument; derived: Derived; reopened: ParticipantId[];
      notifications: Notification[]; audit: AuditEntry[]; effects: Effect[]; response?: unknown }
  | { ok: false; error: DomainError };
```

Cada comando segue os mesmos passos dentro de `execute`:

1. Verifica estado da conta e permissão do ator (§F5.1, tabela de §6.4).
2. Verifica as guardas de `expected` (versões, `expected.shareAmount`, `expected.difference`).
3. Aplica a mutação no documento (cópia imutável).
4. Atualiza `version` das entidades tocadas e `consumptionVersion` pelas regras de §F5.8.2.
5. Recalcula `derive`; aplica as validações de §F7.10.
6. Calcula as partes reabertas (§F5.10): para cada participante em `SHARE_CLOSED`, reabre se `consumptionVersion` mudou ou se `share ≠ closedShareAmount`. Se alguma reaberta não estiver em `acceptedReopens`, devolve `REOPENS_NOT_ACCEPTED`.
7. Produz notificações (§6.6), registros de auditoria (§12.9, inclusive `RECONCILIATION_ADJUSTMENT_CHANGED` quando o `reconciliationAdjustment` derivado muda entre o estado anterior e o novo) e efeitos externos (ex.: apagar imagem).

Quando o comando não muda nada (fechar uma conta já finalizada, resultado de OCR de tentativa não vigente), `execute` devolve `noChange: true`: a API grava só a operação (idempotência), sem nova revisão, sem evento e sem auditoria.

`Effect` descreve trabalho fora do documento que a API executa na mesma transação ou enfileira (revogar sessões, enfileirar job, apagar objeto). `@cj/core` não executa efeitos.

### 4.4 Erros de domínio

```ts
interface DomainError {
  code: ErrorCode;                       // stable, English (table below)
  http: 403 | 409 | 422;
  message: string;                       // user-facing text, pt-BR, from strings/pt-BR
  details?: Record<string, unknown>;
}
```

| Código | HTTP | Quando |
|---|---|---|
| `FORBIDDEN` | 403 | ação exclusiva do criador; "em nome de" sem o comando próprio |
| `VERSION_CONFLICT` | 409 | `expected.version` diferente da atual |
| `CONSUMPTION_CHANGED` | 409 | `expected.consumptionVersion` diferente |
| `AMOUNT_CHANGED` | 409 | `expected.shareAmount` ou `expected.difference` diferente |
| `REOPENS_NOT_ACCEPTED` | 409 | reabriria parte fora de `acceptedReopens` |
| `REVISION_CONFLICT` | 409 | fechamento com `expected.revision` antiga |
| `SEAT_TAKEN` | 409 | vaga deixou de ser `INVITED` |
| `INVALID_STATE` | 422 | comando não permitido no estado da conta, do item ou da pessoa |
| `BILL_ALREADY_CLOSED` | 422 | mutação em conta finalizada (exceções em §F6.1) |
| `TABLE_FULL` | 422 | sem vaga |
| `INVALID_SPLIT` | 422 | soma de unidades, valores ou percentuais fora da regra |
| `REDUCTION_BLOCKED` | 422 | §F5.6.1 |
| `NEGATIVE_SHARE` | 422 | alguma parte < 0 |
| `DISCOUNT_EXCEEDS_RECEIPT` | 422 | total da comanda ou a pagar < 0 |
| `PERCENT_MISMATCH` | 422 | edição incompatível sem `keepAnyway: true` (§F6.5) |
| `OPEN_BLOCKERS` | 422 | fechar conta com pendências |
| `REMOVAL_NOT_ALLOWED` | 422 | §F5.4.3 |
| `LIMIT_EXCEEDED` | 422 | limites de §F9.1 |
| `INVALID_REFERENCE` | 422 | ID inexistente ou de outra conta (mesma resposta nos dois casos) |

### 4.5 Biblioteca de cálculo

- Valores trafegam como `number` inteiro (≤ 99.999.999, seguro). Produtos e divisões internos usam `BigInt`, porque `amount × weight` chega a 10^16, acima de `Number.MAX_SAFE_INTEGER` (≈ 9 × 10^15).
- `largestRemainder(total, weights, denominator, context)`: o denominador `denominator` é sempre explícito. Ele é o total de itens no rateio proporcional (§F7.7.1), a quantidade em unidades `LINE_TOTAL` (§F7.6.2), 10000 no percentual (§F7.6.4) e a soma dos pesos nos demais casos. Os centavos de resto só são distribuídos quando `Σ weights = denominator` (nada sem dono); caso contrário, ficam no saldo ou como faltante.

```ts
function largestRemainder(
  total: bigint,
  weights: ReadonlyArray<[ParticipantId, bigint]>,
  denominator: bigint,
  context: string,
): Map<ParticipantId, bigint> {
  // preconditions: denominator > 0n and sum(weights) <= denominator
  const base = weights.map(([id, w]) => [id, (total * w) / denominator, (total * w) % denominator] as const);
  const result = new Map(base.map(([id, b]) => [id, b]));
  if (sum(weights) < denominator) return result;           // unassigned value exists: remainders stay unallocated
  let leftover = total - sum(base.map(([, b]) => b));
  const order = [...base].sort(
    (a, b) => compareDesc(a[2], b[2]) || compareHex(tieBreak(context, a[0]), tieBreak(context, b[0])),
  );
  for (const [id] of order) {
    if (leftover === 0n) break;
    result.set(id, (result.get(id) ?? 0n) + 1n);
    leftover -= 1n;
  }
  return result;
}

const tieBreak = (ctx: string, id: string): string => bytesToHex(sha256(utf8ToBytes(`${ctx}:${id}`)));   // @noble/hashes
```

- Exemplos de conferência do denominador: estado E-1, serviço de Nery = (2100 × 4000) / 21000 = 400 → R$ 4,00 (não R$ 7,00); batata com 30%/30% salvo como parcial → (3000 × 3000) / 10000 = 900 → R$ 9,00 cada (não R$ 15,00).
- Percentual calculado: `(base × bp + 5000n) / 10000n` (meio para cima, §F7.1).
- Vetores canônicos (`packages/core/test/vectors/*.json`): dataset §F2.6, estados E-1 e E-2 (§F2.7), CA-A4, CA-D2, CA-D4, CA-D6 a CA-D14, CA-C5, CA-C8, CA-E1, CA-E5. Os mesmos vetores rodam no Node e em um navegador (Playwright) para provar que a prévia do cliente é idêntica à do servidor.

---

## 5. Persistência

### 5.1 ADR-02: conta como documento JSONB

**Contexto.** Toda mutação trava a conta, carrega o estado completo, revalida tudo e grava (§F8.2). O agregado é pequeno (≤ 80 KB) e lido inteiro em toda operação.

**Decisão.** A conta é uma linha em `app.bills`, com o documento (§4.1) em `document jsonb` e colunas extraídas para consultas operacionais (estado, datas, imagem). Sessões, idempotência, eventos, presença e auditoria ficam em tabelas próprias, porque são consultados por outras chaves ou têm ciclo de vida diferente.

**Consequências.**
- (+) Uma leitura e uma escrita por comando; transação curta; sem mapeamento de dezenas de tabelas.
- (+) A mesma estrutura serve de entrada para `@cj/core` no servidor e no cliente.
- (−) Integridade interna do documento é garantida pelo código (schemas zod + `derive`), não por chaves estrangeiras. Mitigação: validação do documento inteiro antes de gravar e testes de propriedade.
- (−) Evolução do formato exige migração de documento (§5.4).

**Alternativa descartada.** Tabelas normalizadas (itens, atribuições, cobranças, participantes). Daria integridade referencial, mas exigiria carregar e gravar cinco ou mais tabelas por comando, sem ganho de concorrência, porque a serialização é por conta de qualquer forma.

### 5.2 Esquema SQL

```sql
create schema if not exists app;

create table app.bills (
  id                   uuid primary key,
  status               text not null check (status in
                         ('DRAFT','OCR_PROCESSING','OCR_FAILED','RECEIPT_REVIEW','OPEN','CLOSED')),
  revision             bigint not null default 0,
  schema_version       smallint not null default 1,
  document             jsonb not null,
  created_by           uuid not null,
  join_token_version   integer not null default 1,
  image_path           text,                        -- bucket key; null without an image or after purge
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  receipt_confirmed_at timestamptz,
  closed_at            timestamptz,
  constraint document_size check (octet_length(document::text) < 262144)
);
create index bills_image_purge_idx on app.bills (closed_at) where image_path is not null;
create index bills_open_idx        on app.bills (updated_at) where status = 'OPEN';

create table app.sessions (
  id                uuid primary key,
  token_hash        bytea not null unique,          -- SHA-256 of the cookie value
  bill_id           uuid not null references app.bills(id) on delete cascade,
  participant_id    uuid not null,
  created_at        timestamptz not null default now(),
  last_used_at      timestamptz not null default now(),
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  revocation_reason text check (revocation_reason in ('SIGN_OUT','CLAIM','REMOVAL','DELETION','EXPIRATION'))
);
create index sessions_active_idx on app.sessions (bill_id, participant_id) where revoked_at is null;

create table app.claim_secrets (
  claim_id    uuid primary key,
  bill_id     uuid not null references app.bills(id) on delete cascade,
  secret_hash bytea not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

create table app.operations (                         -- idempotency for session commands
  bill_id      uuid not null references app.bills(id) on delete cascade,
  operation_id uuid not null,
  type         text not null,
  http_status  smallint not null,
  result       jsonb not null,                        -- status, code, revision, result; never the snapshot
  created_at   timestamptz not null default now(),
  primary key (bill_id, operation_id)
);

create table app.entry_operations (                   -- idempotency for bill creation and join
  operation_id   uuid primary key,
  type           text not null check (type in ('CREATE_BILL','JOIN','REQUEST_CLAIM')),
  bill_id        uuid references app.bills(id) on delete cascade,
  participant_id uuid,
  http_status    smallint not null,
  result         jsonb not null,                      -- never holds the cookie value
  created_at     timestamptz not null default now()
);

create table app.events (                             -- fan-out; 5 min retention
  bill_id    uuid not null references app.bills(id) on delete cascade,
  revision   bigint not null,
  event_id   uuid not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  primary key (bill_id, revision)
);

create table app.presence (
  bill_id        uuid not null references app.bills(id) on delete cascade,
  participant_id uuid not null,
  instance       text not null,
  connections    smallint not null,
  last_seen_at   timestamptz not null,
  primary key (bill_id, participant_id, instance)
);

create table app.audit_log (
  id                   uuid primary key default gen_random_uuid(),
  bill_id              uuid,                         -- no FK: the minimal record survives deletion
  bill_ref             bytea,                        -- HMAC of the bill id, only in the deletion record
  action               text not null,
  actor_participant_id uuid,
  target               jsonb not null default '{}',  -- IDs only
  data                 jsonb not null default '{}',  -- amounts in cents and codes; never names or free text
  ip_hmac              bytea,
  created_at           timestamptz not null default now()
);
create index audit_log_bill_idx      on app.audit_log (bill_id, created_at);
create index audit_log_retention_idx on app.audit_log (created_at);
```

- Todos os IDs de entidades são UUID v4 gerados com `crypto.randomUUID()` (aleatórios, não sequenciais nem ordenados por tempo).
- O schema `pgboss` e a tabela do rate-limiter-flexible são criados pelas migrações, com `app_owner`. Em runtime, os dois rodam com a criação automática desligada (pg-boss com `migrate: false` e filas criadas na migração; rate-limiter-flexible com `tableCreated: true`). Os nomes exatos das opções devem ser conferidos na versão adotada de cada biblioteca.
- Valores monetários dentro do documento são inteiros JSON; o Postgres não faz aritmética sobre eles.

### 5.3 Supabase

| Tema | Configuração |
|---|---|
| Acesso | Só a API e o worker acessam o banco. O cliente nunca recebe a URL do projeto nem chaves do Supabase |
| API de dados do Supabase (PostgREST/GraphQL) | Schema `app` fora de "Exposed schemas"; se nada mais usar a API de dados, desativá-la |
| Papéis | `app_owner` (dono dos objetos, só para migrações); `app_runtime` (login da API e do worker: `select/insert/update/delete` nas tabelas de `app` e acesso ao schema `pgboss`; sem `create`, sem acesso a `public`, `auth` e `storage`) |
| RLS | Ativado em todas as tabelas de `app`, com uma política `to app_runtime using (true) with check (true)`. `anon` e `authenticated` sem nenhum `grant`: defesa em profundidade caso o schema seja exposto por engano |
| Conexões | `DATABASE_URL`: Supavisor em modo sessão, pool de 10 conexões por instância. `DATABASE_LISTEN_URL`: conexão direta ou Supavisor em modo sessão, 1 conexão dedicada por instância para `LISTEN` (o modo transação não suporta `LISTEN`) |
| Timeouts | `statement_timeout = 5s` e `idle_in_transaction_session_timeout = 10s` no papel `app_runtime`; `lock_timeout = 3s` por transação de comando (§7.1) |
| Região | São Paulo, a mesma das instâncias da API e do worker |
| Backups | backup diário do plano; PITR opcional (RPO baixo não é crítico, §F9.8) |
| Ambientes | um projeto Supabase por ambiente (dev local com Supabase CLI, staging, produção) |

### 5.4 Migrações e evolução do documento

- **Esquema SQL:** drizzle-kit gera o SQL; cada migração é revisada e versionada em `db/migrations`. Mudanças seguem expandir e contrair: adicionar compatível → publicar código → remover o antigo em outra versão.
- **Documento:** `schema_version` na linha e `schemaVersion` no documento. `@cj/core` exporta `migrateDocument(doc)`, uma cadeia de funções de atualização (`v1 → v2 → …`), aplicada em toda leitura. A gravação é sempre na versão atual. Uma migração em lote (job) atualiza contas abertas antes de remover o suporte à versão antiga.
- Toda função de migração tem teste com documentos reais anonimizados da versão anterior.

### 5.5 Retenção

| Dado | Retenção | Mecanismo |
|---|---|---|
| Conta e documento | até a exclusão (§F10.1 D1) | exclusão pelo criador |
| Foto | 48 h após `closed_at`, ou imediata na exclusão | job `purge-images` (§14) |
| Sessões | até expirar (30 dias sem uso) ou serem revogadas; linhas removidas 7 dias depois | job `purge-sessions` |
| Segredos de reivindicação | 10 min | job `expire-claims` |
| Idempotência | 24 h | job `purge-operations` |
| Eventos | 5 min | job `purge-events` |
| Presença | 10 min sem sinal (o estado "recente" usa os últimos 5 min) | job `purge-presence` |
| Auditoria | 90 dias (provisório, §F10.2 T11) | job `purge-audit-log` |

---

## 6. API

### 6.1 Convenções

- Base `/api`, mesma origem do app (sem CORS).
- JSON (`application/json`), UTF-8, limite de 256 KB por corpo (upload de imagem: §10).
- Dinheiro em centavos inteiros; datas ISO-8601 UTC; IDs UUID.
- Erros no formato `application/problem+json` (RFC 9457): `{ type, title, status, code, message, serverState? }`. Nunca stack trace nem mensagem do banco.
- Autenticação por cookie de sessão da conta (§11.2). Nenhum endpoint aceita token em query string.
- Toda mutação exige `Origin` igual à origem do app (§12.5) e é `POST`. Nenhum `GET` altera estado.
- Idempotência por `operationId` (UUID v4 gerado no cliente) no **corpo** da requisição.
- Toda resposta de leitura ou comando tem `Cache-Control: no-store`.

### 6.2 Endpoints

| Método e caminho | Autenticação | Resposta | Uso |
|---|---|---|---|
| `POST /api/bills` | nenhuma (rate limit) | 201 `{ me, snapshot }` + `Set-Cookie` | identificação do criador (tela 01) |
| `GET /api/bills/:billId` | sessão | 200 `{ me, snapshot }` | carga inicial, reconexão |
| `GET /api/bills/:billId/events` | sessão | `text/event-stream` | tempo real (§8) |
| `POST /api/bills/:billId/commands` | sessão | 200 `{ revision, snapshot, result? }` | todos os comandos de §6.4 |
| `POST /api/bills/:billId/image` | sessão do criador, conta `DRAFT` | 202 `{ revision, snapshot, attemptId }` | upload da foto e início do OCR |
| `GET /api/bills/:billId/image` | sessão | `image/jpeg` | "Ver foto" (§10.5) |
| `GET /api/bills/:billId/invite` | sessão | 200 `{ url }` | tela 11 (link e QR) |
| `POST /api/bills/:billId/session/end` | sessão | 204 + cookie expirado | "Sair e apagar dados deste dispositivo" |
| `POST /api/bills/:billId/editing` | sessão | 204 | `{ itemId \| null }`: presença de edição ("Thais está editando este item", §F5.7); efêmera, sem revisão; expira em 30 s sem renovação e é enviada pelo canal de presença (§8.5) |
| `POST /api/join/resolve` | `joinToken` no corpo | 200 `JoinPreview` | tela 12 e leitura de conta finalizada |
| `POST /api/join` | `joinToken` no corpo | 201 `{ me, snapshot }` + `Set-Cookie`, ou 202 `{ claimId }` + cookie de pedido | novo participante, vínculo de vaga, reivindicação |
| `GET /api/claims/:id` | cookie de pedido | 200 `{ status }` | polling da reivindicação |
| `POST /api/claims/:id/complete` | cookie de pedido | 201 `{ me, snapshot }` + `Set-Cookie` | troca do pedido aprovado por sessão |
| `GET /api/health` | nenhuma | 200 | liveness |
| `GET /api/ready` | nenhuma | 200 / 503 | readiness (banco e LISTEN) |

`me = { participantId, isCreator }` só vai nas respostas diretas, nunca nos eventos (que são iguais para todos).

`JoinPreview`:

```ts
interface JoinPreview {
  billId: BillId;
  status: BillStatus;
  restaurantName?: string; table?: string;
  seats: { taken: number; limit: number };
  participants: { id: ParticipantId; displayName: string; avatar: Avatar; status: 'INVITED' | 'ACTIVE' | 'SHARE_CLOSED'; preRegisteredBy?: string }[];
  hasSession: boolean;                   // this browser already has a session for this bill
  summary?: FinalSummary;                // only when CLOSED
}
```

### 6.3 Envelope de comando

```ts
interface CommandEnvelope {
  operationId: string;                   // UUID v4
  command: Command;                      // discriminated union on "type" (§6.4)
  expected?: {
    version?: number;                    // target entity
    consumptionVersion?: number;         // target participant (or self)
    shareAmount?: number;                // CLOSE_MY_SHARE
    difference?: number;                 // CREATE_DISCREPANCY_ADJUSTMENT
    revision?: number;                   // CLOSE_BILL
    versions?: Record<string, number>;   // multi-entity commands (e.g. MERGE_ITEMS)
  };
  acceptedReopens?: string[];            // §F5.11
}
```

Os schemas zod usam `.strict()`: campos desconhecidos são rejeitados com 400.

### 6.4 Comandos

**Com sessão** (`POST /api/bills/:billId/commands`). Na coluna de guardas, "reaberturas" significa `acceptedReopens` (§F5.11); os demais nomes são campos de `expected`.

| `type` | Payload | Quem | Estado da conta | Guardas |
|---|---|---|---|---|
| `ENTER_MANUALLY` | nenhum | criador | `DRAFT`, `OCR_FAILED` | nenhuma |
| `CANCEL_OCR` | `attemptId` | criador | `OCR_PROCESSING` | tentativa vigente |
| `ABANDON_OCR` | `attemptId` | criador | `OCR_PROCESSING` | tentativa vigente (cliente aos 20 s) |
| `RETRY_OCR` | nenhum | criador | `OCR_FAILED` | imagem existe |
| `TAKE_NEW_PHOTO` | nenhum | criador | `OCR_FAILED` | nenhuma |
| `DISCARD_RECEIPT` | nenhum | criador | `RECEIPT_REVIEW` | `version` (detalhes) |
| `UPDATE_BILL_DETAILS` | `restaurantName`, `table`, `receiptNumber` | participante | `RECEIPT_REVIEW`, `OPEN` | `version` (detalhes) |
| `SET_PRINTED_TOTAL` | `printedTotal` | participante | `RECEIPT_REVIEW`, `OPEN` | `version` (detalhes), reaberturas |
| `ADD_ITEM` | `name`, `quantity`, `priceMode`, `unitPrice` ou `lineTotal` | participante | `RECEIPT_REVIEW`, `OPEN` | reaberturas |
| `EDIT_ITEM` | `itemId` e os campos alterados | participante | `RECEIPT_REVIEW`, `OPEN` | `version`, reaberturas |
| `DELETE_ITEM` | `itemId` | participante | `RECEIPT_REVIEW`, `OPEN` | `version`, reaberturas |
| `RESTORE_ITEM` | `itemId` | participante | `OPEN` | `version`, reaberturas |
| `MERGE_ITEMS` | `itemIds` (2) | participante | `RECEIPT_REVIEW`, `OPEN` | `versions` dos dois itens |
| `SET_SPLIT` | `itemId`, `mode`, `allocations`, `partial` | participante | `OPEN` | `version`, reaberturas |
| `ADD_CHARGE` | campos de `Charge` (§4.1), `keepAnyway?` | participante | `RECEIPT_REVIEW`, `OPEN` | reaberturas |
| `EDIT_CHARGE` | `chargeId`, campos, `keepAnyway?` | participante | `RECEIPT_REVIEW`, `OPEN` | `version`, reaberturas |
| `REMOVE_CHARGE` | `chargeId` | participante | `RECEIPT_REVIEW`, `OPEN` | `version`, reaberturas |
| `CONFIRM_CHARGE` | `chargeId` | participante | `RECEIPT_REVIEW`, `OPEN` | `version` |
| `SET_WAIVER` | `chargeId`, `waiver`, `waivedFor` | participante | `OPEN` | `version`, reaberturas |
| `CREATE_DISCREPANCY_ADJUSTMENT` | nenhum | participante | `RECEIPT_REVIEW`, `OPEN` | `difference`, reaberturas |
| `CONFIRM_RECEIPT` | nenhum | criador | `RECEIPT_REVIEW` | `version` (detalhes) |
| `PRE_REGISTER_SEAT` | `displayName`, `avatar` | participante | `OPEN` | vagas (§F5.4.2) |
| `RENAME_SEAT` | `participantId`, `displayName` | participante | `OPEN` | `version`, alvo `INVITED` |
| `UPDATE_MY_PROFILE` | `displayName`, `avatar` | o próprio | todos, exceto `CLOSED` | `version` |
| `REMOVE_PARTICIPANT` | `participantId` | participante | `OPEN` | §F5.4.3 |
| `DECIDE_CLAIM` | `claimId`, `decision` (`APPROVE` ou `REJECT`) | participante (nunca a sessão que pediu) | `OPEN`, `CLOSED` | pedido `PENDING` |
| `CONFIRM_MY_CONSUMPTION` | nenhum | o próprio | `OPEN` | `consumptionVersion` |
| `CONFIRM_NO_CONSUMPTION` | nenhum | o próprio, sem itens | `OPEN` | `consumptionVersion` |
| `CLOSE_MY_SHARE` | nenhum | o próprio | `OPEN` | `consumptionVersion`, `shareAmount` |
| `REOPEN_MY_SHARE` | nenhum | o próprio | `OPEN` | nenhuma |
| `CONFIRM_ON_BEHALF` | `participantId` | outro participante | `OPEN` | `consumptionVersion` do alvo |
| `CONFIRM_ZERO_ON_BEHALF` | `participantId` | outro participante | `OPEN` | `consumptionVersion` do alvo; alvo sem itens |
| `REMOVE_ITEMS_AND_CONFIRM_ZERO` | `participantId` | outro participante | `OPEN` | `consumptionVersion` do alvo, reaberturas |
| `CLOSE_BILL` | nenhum | participante | `OPEN` (`CLOSED` → 200) | `revision` |
| `ROTATE_INVITE_LINK` | nenhum | criador | `OPEN` | nenhuma |
| `ANONYMIZE_ME` | nenhum | o próprio | qualquer | nenhuma |
| `DELETE_BILL` | `confirmation` (texto digitado pela pessoa: "EXCLUIR") | criador | qualquer | nenhuma |

**De entrada** (`POST /api/join`, ator `VISITOR`):

| `type` | Payload | Estado da conta | Guardas |
|---|---|---|---|
| `JOIN_AS_NEW` | `displayName`, `avatar`, `consumed` | `OPEN` | vagas |
| `TAKE_RESERVED_SEAT` | `participantId` | `OPEN` | alvo em `INVITED` |
| `REQUEST_CLAIM` | `participantId` | `OPEN`, `CLOSED` | alvo em `ACTIVE` ou `SHARE_CLOSED`; limites de §12.7 |

Em outros estados, a resposta é a mesma de link inválido (404), para não revelar a fase da conta a quem não participa dela. `GET /api/bills/:id/invite` só responde com a conta `OPEN`.

`DELETE_BILL` não passa pelo `UPDATE` do pipeline; tem a transação própria de §7.5.

**De sistema** (só o worker; nunca expostos por HTTP): `START_OCR` (chamado pela rota de imagem), `APPLY_OCR_RESULT`, `FAIL_OCR`, `EXPIRE_OCR_ATTEMPT`, `EXPIRE_CLAIM`.

`ROTATE_INVITE_LINK` incrementa `join_token_version` (coluna, fora do documento) no mesmo commit e gera um evento para que a tela 11 dos outros participantes busque o link novo.

### 6.5 Snapshot

```ts
interface BillSnapshot {
  revision: number;
  document: BillDocument;                // holds no secrets (tokens and sessions live elsewhere)
  derived: Derived;
  hasImage: boolean;
  presence: Record<ParticipantId, 'online' | 'offline' | 'recent'>;
}
```

O snapshot é igual para todos os participantes da conta (a divisão é transparente, §F4.4 tela 16). Dados específicos de quem lê (`me`) vão só nas respostas diretas.

### 6.6 Eventos e notificações

```ts
interface BillEvent {
  eventId: string; revision: number; at: Iso;
  type: CommandType;                     // command that produced the revision
  actorParticipantId: ParticipantId | null;
  notifications: Notification[];
  snapshot: Omit<BillSnapshot, 'presence'>;
}

type Notification =
  | { type: 'SHARE_REOPENED'; participantId: ParticipantId; from: number; to: number }
  | { type: 'ITEMS_CHANGED'; participantId: ParticipantId }
  | { type: 'CLAIM_PENDING'; claimId: ClaimId; targetParticipantId: ParticipantId }
  | { type: 'ACCESS_TRANSFERRED'; participantId: ParticipantId }
  | { type: 'RESERVED_SEAT_TAKEN'; participantId: ParticipantId; preRegisteredBy: ParticipantId }
  | { type: 'PARTICIPANT_REMOVED'; participantId: ParticipantId; actor: ParticipantId }
  | { type: 'ITEM_DELETED'; itemId: ItemId; actor: ParticipantId }
  | { type: 'PRINTED_TOTAL_CHANGED'; from: number | null; to: number; actor: ParticipantId }
  | { type: 'DISCREPANCY_ADJUSTMENT_CREATED'; amount: number; actor: ParticipantId }
  | { type: 'INVITE_LINK_ROTATED' }
  | { type: 'BILL_CLOSED' };
```

O cliente decide o que mostrar: banners pessoais (`SHARE_REOPENED`, `ITEMS_CHANGED`, `ACCESS_TRANSFERRED`) só para o próprio `participantId`; os demais para todos (§F8.6).

### 6.7 Mapeamento de erros HTTP

| HTTP | Origem |
|---|---|
| 400 | JSON inválido, schema zod, campo desconhecido |
| 401 | cookie da conta presente, mas sessão expirada ou revogada (`code: SESSION_INVALID` ou `ACCESS_TRANSFERRED`) |
| 403 | `FORBIDDEN`; `Origin` inválido |
| 404 | conta inexistente ou excluída, sem cookie para a conta, `joinToken` inválido ou rotacionado, comando de entrada fora do estado permitido; sempre o mesmo corpo |
| 409 | erros de domínio 409 (§4.4), com `serverState` |
| 413 | corpo ou imagem acima do limite |
| 415 | tipo de imagem não permitido |
| 422 | erros de domínio 422, com `serverState` |
| 429 | rate limit, com `Retry-After` |
| 503 | `lock_timeout` ou banco indisponível (`code: BUSY`); o cliente repete com o mesmo `operationId` |
| 500 | falha interna, `InvariantError` |

---

## 7. Pipeline de mutação e consistência

### 7.1 Passo a passo de um comando

```text
1.  Express: JSON body ≤ 256 KB → zod (CommandEnvelope.strict) → 400 if invalid
2.  Session: cookie __Host-cj_<billId> → SHA-256 → sessions (bill_id, not revoked, not expired)
        → 404 without a cookie, 401 with an invalid session
3.  Origin must equal APP_ORIGIN → 403 otherwise
4.  Rate limit per session and per IP → 429
5.  BEGIN
6.    SET LOCAL lock_timeout = '3s'
7.    SELECT document, revision, status, join_token_version, image_path FROM app.bills WHERE id = $1 FOR UPDATE
        → 404 if missing; 503 BUSY on lock_timeout
8.    SELECT http_status, result FROM app.operations WHERE bill_id = $1 AND operation_id = $2
        → if found: COMMIT and return the stored result (status, code, result) with the CURRENT snapshot
9.    doc = migrateDocument(document); r = core.execute(doc, command, { actor, now, newId })
10.   if !r.ok:
        response = problem+json with serverState = snapshot(current doc)
        INSERT app.operations (http_status = error.http, result without serverState); COMMIT; return
11.   if r.ok && r.noChange:
        INSERT app.operations (200, result); COMMIT; return            (no new revision, no event, no audit)
12.   if r.ok:
        next = revision + 1
        UPDATE app.bills SET document, revision = next, status, updated_at, extracted columns
        apply transactional effects (revoke sessions, join_token_version++,
            enqueue pg-boss jobs through send's `db` option bound to the transaction client)
        INSERT app.events (bill_id, next, eventId, payload = BillEvent)
        INSERT app.audit_log (r.audit entries, ip_hmac)
        INSERT app.operations (200, result without snapshot)
        SELECT pg_notify('bill_events', billId || ':' || next)
13. COMMIT
14. post-commit effects (Set-Cookie, close local streams) → 200
```

- O lock é sempre o primeiro acesso à conta na transação; nenhuma rota lê o documento para decidir uma escrita fora desse caminho.
- A verificação de idempotência fica **depois** do lock: duas cópias do mesmo comando chegando juntas nunca executam duas vezes.
- Erros de domínio também são gravados em `operations`: repetir um comando rejeitado devolve a mesma rejeição.
- `operations` guarda só o resultado (status, código, `revision` produzida e o campo `result`), nunca o snapshot: com documentos de até 80 KB e 50 comandos por segundo no pico, guardar snapshots criaria gigabytes por hora. Na repetição, o snapshot anexado é o atual; como o cliente só aplica revisões maiores que a local (§8.2), isso é seguro.
- `serverState` em 409 e 422 usa o snapshot do estado atual, que nunca inclui tokens (§F8.7).
- Comandos de sistema (worker) seguem os mesmos passos 5 a 13, com ator `SYSTEM` e `operationId` determinístico: UUID v5 de `"<type>:<attempt or claim id>"` em um namespace fixo da aplicação. Isso cabe na coluna `uuid` e torna o reprocessamento de um job seguro.

### 7.2 Por que isso atende às guardas da spec funcional

| Guarda (§F8.3) | Implementação |
|---|---|
| Versão da entidade | `execute` compara `expected.version` com a `version` da entidade no documento travado |
| Validação do agregado (CA-G4) | o segundo comando só roda depois do commit do primeiro e valida o documento resultante |
| Operações não relacionadas (CA-G3) | ambas aplicadas em sequência; nenhum 409 por elas tocarem a mesma conta |
| `expected.consumptionVersion` e `expected.shareAmount` | comparados com o participante e a parte derivada no documento travado |
| `acceptedReopens` | passo 6 de §4.3, sobre o documento travado |
| Fechamento (CAS) | `status`, `revision` e pendências lidos sob o lock; `CLOSED` → 200 antes de comparar a revisão |
| Vagas | contagem lida sob o lock; dois aparelhos pela última vaga são serializados (CA-B5) |

### 7.3 Falhas

| Falha | Comportamento |
|---|---|
| `lock_timeout` (3 s) | 503 `BUSY`; o cliente repete com o mesmo `operationId` após 300 ms a 1 s |
| `InvariantError` em `derive` | ROLLBACK; log de erro com `billId` e tipo do comando (sem o documento); 500 com snapshot do estado anterior; alerta (§15.4) |
| Banco indisponível | 503; o cliente mostra 🟡 e repete |
| Falha depois do commit e antes da resposta | o cliente repete o `operationId` e recebe a resposta gravada (CA-G5) |
| Instância cai com transação aberta | o Postgres faz ROLLBACK e libera o lock |

### 7.4 Comandos de entrada e criação

- `POST /api/bills`: idempotência por `operationId` em `entry_operations`. Cria a conta (`DRAFT`), o criador e a sessão na mesma transação.
- `POST /api/join`: resolve o `joinToken` (§11.1), trava a conta e executa `JOIN_AS_NEW`, `TAKE_RESERVED_SEAT` ou `REQUEST_CLAIM` no mesmo pipeline, com ator `VISITOR`.
- **Repetição com o mesmo `operationId`:** a resposta gravada não contém o valor do cookie, que só existe como hash. Na repetição de uma entrada ou criação já aplicada, o servidor emite uma sessão adicional para o mesmo participante, sem revogar a anterior: se a resposta original e a repetição chegarem fora de ordem, o navegador fica com um cookie válido qualquer que seja o último. Limite de 3 sessões por `operationId`. O `operationId` funciona como segredo do cliente: é aleatório, vale 24 h e nunca vai para logs (§15.1).
- **Concorrência na criação:** `POST /api/bills` não tem linha de conta para travar; antes da verificação de idempotência, a transação faz `pg_advisory_xact_lock` com um hash de 64 bits do `operationId`. Assim, duas cópias simultâneas da mesma criação produzem uma conta só, sem erro de chave duplicada.

### 7.5 Exclusão da conta

`DELETE_BILL` tem transação própria, porque a linha da conta deixa de existir:

```text
BEGIN
  SELECT … FROM app.bills WHERE id = $1 FOR UPDATE               (creator? confirmation "EXCLUIR"?)
  keep image_path
  enqueue 'delete-image' {path} in the same commit (§14)
  DELETE FROM app.audit_log WHERE bill_id = $1
  INSERT app.audit_log (action = 'BILL_DELETED', bill_ref = HMAC(billId))
  UPDATE app.sessions SET revoked_at = now(), revocation_reason = 'DELETION' WHERE bill_id = $1
  SELECT pg_notify('bill_deleted', billId)                        (does not depend on any row)
  DELETE FROM app.bills WHERE id = $1                             (cascade: sessions, operations, events, presence, secrets)
COMMIT
→ 200 with the bill cookie expired
```

Cada instância que recebe `bill_deleted` envia `event: deleted` para os streams daquela conta e os encerra. Sem a linha `events`, nada mais precisa ser lido.

---

## 8. Tempo real (SSE)

### 8.1 Conexão

`GET /api/bills/:billId/events` com a sessão da conta. Resposta `text/event-stream`, `Cache-Control: no-store`. O proxy da borda não faz buffer nem compressão nessa rota (configuração do proxy, §16.3).

```text
retry: 3000

event: hello
data: {"revision":42}

event: bill
id: 43
data: {BillEvent}

event: presence
data: {"presence":{"<participantId>":"online", …}}

: ping                                      (every 15 s)

event: session
data: {"code":"ACCESS_TRANSFERRED"}         (before closing because of a revocation)

event: deleted
data: {}                                    (bill deleted; the client clears local data)
```

### 8.2 Início sem janela de perda (§F8.5)

1. O cliente abre o `EventSource` primeiro.
2. O servidor registra o stream e só então lê `revision` da conta e envia `hello`.
3. O cliente guarda os eventos `bill` recebidos e busca `GET /api/bills/:id` se não tiver snapshot ou se `hello.revision` for maior que a local.
4. Aplica o snapshot e, em seguida, os eventos guardados com revisão maior.
5. Se nada chegar em 2 s e `hello.revision` ainda for maior que a local, busca de novo.

Como todo evento `bill` traz o snapshot completo (ADR-05), receber a revisão 52 sem a 51 não exige busca: a 52 já é o estado completo. A regra "só aplica se a revisão for maior que a local" vale para eventos, respostas de comando, `serverState` e snapshots (CA-G6, CA-G7).

### 8.3 Registro local de streams

Cada instância mantém `Map<billId, Set<Stream>>` e `Map<sessionId, Set<Stream>>`. Limites: 3 streams por sessão (abas extras); 10.000 por instância. Ao exceder por sessão, o stream mais antigo é encerrado.

### 8.4 Fan-out entre instâncias (ADR-06)

- Cada instância mantém uma conexão dedicada (`DATABASE_LISTEN_URL`) com `LISTEN bill_events`, `LISTEN session_revoked`, `LISTEN presence`.
- `bill_events` traz `billId:revision` (cabe nos 8.000 bytes do `NOTIFY`). A instância que tem streams daquela conta lê `payload` em `app.events` uma vez e escreve em todos os streams locais.
- `NOTIFY` dentro da transação só é entregue no commit, o que garante "nenhum evento antes da gravação".
- Se a conexão de `LISTEN` cair, a instância fica `not ready`, reconecta com backoff e, ao voltar: revalida no banco a sessão de cada stream local (encerra os revogados, cujo `NOTIFY` pode ter se perdido), verifica se as contas ainda existem e envia `hello` com a revisão atual para os streams restantes (os clientes buscam o snapshot se estiverem atrasados).
- Meta: commit → evento no cliente ≤ 500 ms p95 (§F9.1), medida pela métrica de §15.2.

### 8.5 Presença

- Stream aberto = participante online naquela instância. A instância faz upsert em `app.presence` ao abrir, a cada 15 s e ao fechar (decrementa `connections`).
- Online: algum registro com `last_seen_at` nos últimos 45 s; "recente": voltou nos últimos 5 min; caso contrário, offline (§F5.5).
- Mudanças disparam `NOTIFY presence` com `billId`, agrupadas em no máximo uma por segundo por conta. Presença nunca muda a `revision`.
- Celulares com o app em segundo plano costumam perder o stream; aparecem offline depois de 45 s, o que é esperado.

### 8.6 Revogação

Revogar sessões (sair, reivindicação, remoção, exclusão) faz `NOTIFY session_revoked` com os IDs de sessão. A instância que tem os streams envia `event: session` e encerra em até 5 s (CA-H5). Na exclusão da conta, `event: deleted` para todos os streams da conta.

### 8.7 Encerramento gracioso

Ao receber `SIGTERM`: para de aceitar conexões, envia `retry: 1000` e encerra os streams (os clientes reconectam em outra instância), drena requisições por até 10 s e sai.

---

## 9. OCR (ADR-08)

### 9.1 Porta e adapters

```ts
// packages/ocr
export interface ReceiptExtractor {
  readonly name: string;                                    // e.g. "google-vision"
  extract(image: Uint8Array, options: { signal: AbortSignal }): Promise<ExtractionResult>;
}

export type ExtractionResult =
  | { ok: true; receipt: ExtractedReceipt; diagnostics: { providerMs: number; parserMs: number } }
  | { ok: false; code: OcrErrorCode; detail?: string };

export interface ExtractedReceipt {          // validated by ExtractedReceiptSchema (zod) before leaving the adapter
  restaurantName?: string; table?: string; receiptNumber?: string;
  items: { name: string; quantity: number; unitPrice?: number; lineTotal: number; confidence: number }[];
  charges: { description: string; kind: 'FEE' | 'DISCOUNT'; amount?: number; percentBp?: number; confidence: number }[];
  printedTotal?: number;
  subtotalRead?: number;                     // informational only (§F7.5.3)
}
```

| Implementação | Uso |
|---|---|
| `GoogleVisionExtractor` = cliente Vision + `PtBrReceiptParser` | produção (primeira versão) |
| `FakeExtractor` | desenvolvimento local, testes e E2E (devolve fixtures por hash da imagem ou cenário) |
| (futuro) `DocumentAiExtractor`, extrator por modelo multimodal | troca por configuração (`OCR_PROVIDER`), sem mudança no domínio |

O domínio só conhece `ExtractedReceipt`. A conversão para itens e cobranças do documento (`APPLY_OCR_RESULT`) segue §F7.2 e §F6.5:

- linha com `quantity × unitPrice = lineTotal` → `UNIT_PRICE`; senão `LINE_TOTAL`;
- cobrança com percentual e valor compatíveis (≤ 5 centavos) → `PRINTED`, confirmada; só valor → não confirmada (`OCR_AMOUNT_ONLY`); só percentual → `FROM_PERCENT`, não confirmada (`OCR_PERCENT_ONLY`); incompatíveis → não confirmada (`PERCENT_MISMATCH`);
- cobrança com "couvert" ou "por pessoa" → `EQUAL_PER_PERSON` com `splitAmong` vazio (`CHARGE_WITHOUT_ALLOCATION`); demais → `PROPORTIONAL`;
- todas as cobranças do OCR têm escopo `RECEIPT`.

### 9.2 Adapter Google Cloud Vision

| Aspecto | Definição |
|---|---|
| Chamada | `POST https://vision.googleapis.com/v1/images:annotate` com `features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]` e `imageContext.languageHints: ['pt']`; imagem em base64 no corpo |
| Destino | host fixo de uma allowlist validada na inicialização (`vision.googleapis.com` ou o endpoint regional escolhido); nenhuma parte da URL vem de entrada de usuário |
| Autenticação | conta de serviço com papel mínimo para Vision; credencial pelo gerenciador de segredos (`GOOGLE_SA_JSON`) ou federação de identidade, se a plataforma suportar; token OAuth via google-auth-library com cache até expirar |
| Cliente HTTP | `fetch` (undici) com `redirect: 'error'`; cada chamada com timeout de 12 s, dentro do orçamento total de 18 s do job |
| Repetição | uma vez em 429 ou 5xx, com espera de 500 a 1.000 ms, só se restarem pelo menos 6 s do orçamento de 18 s |
| Resposta | só `fullTextAnnotation` é usado: páginas → blocos → parágrafos → palavras, com `boundingBox` e `confidence` |
| Logs | nunca o texto lido nem a imagem; só duração, status, tamanho e código de erro |
| Dados no provedor | registrar o Google como suboperador; usar o contrato de tratamento de dados do Google Cloud; confirmar a retenção de imagens em requisições síncronas e escolher o endpoint regional antes do lançamento (§19) |

### 9.3 Parser de comandas pt-BR

Entrada: palavras com caixa delimitadora. Saída: `ExtractedReceipt`. Passos:

1. **Linhas:** ordenar palavras pelo centro vertical; uma palavra entra na linha corrente se a distância vertical até o centro da linha for ≤ 0,5 × altura mediana das palavras. Dentro da linha, ordenar por x.
2. **Valores:** detectar dinheiro com `(?<![\d,])(\d{1,3}(?:\.\d{3})*|\d{1,6}),(\d{2})(?![\d,])`, convertido para centavos com aritmética inteira. O valor mais à direita é o valor da linha. Percentuais com `(\d{1,2}(?:,\d{1,2})?)\s*%`.
3. **Classificação** (palavras-chave sem acento e sem caixa):

| Classe | Palavras-chave |
|---|---|
| total | `TOTAL`, `TOTAL A PAGAR`, `VALOR TOTAL` (a última ocorrência vence) |
| subtotal | `SUBTOTAL`, `SUB-TOTAL`, `TOTAL ITENS`, `CONSUMO` |
| serviço | `SERV`, `SERVICO`, `TAXA DE SERVICO`, `GORJETA`, `10%` |
| couvert | `COUVERT`, `ARTISTICO`, `POR PESSOA` |
| desconto | `DESC`, `DESCONTO`, `CORTESIA` (com valor) |
| cabeçalho | linhas antes do primeiro item: restaurante (texto sem valor), `MESA`, `COMANDA`, `Nº` |
| ignorar | `CNPJ`, `CPF`, data e hora, `OBRIGADO`, `DINHEIRO`, `CARTAO`, `CREDITO`, `DEBITO`, `PIX`, `TROCO`, `TAXA DE ENTREGA` sem valor |
| item | demais linhas com valor |

4. **Itens:** padrões, nesta ordem: `<qty> <name> <unit> <total>` · `<qty>x <name> <total>` · `<name> <qty> x <unit> <total>` · `<name> <total>` (qtd 1). Quantidade de 1 a 999. Confiança da linha = menor confiança das palavras de valor.
5. **Limites:** mais de 100 itens, valor acima de R$ 999.999,99, nenhuma linha de item ou nenhum valor reconhecido → falha.

O parser é determinístico e testado com fixtures (§17.4).

### 9.4 Códigos de erro

| Código | Significado | Mensagem na tela 05 |
|---|---|---|
| `OCR-01` | sem texto legível | "A foto pode estar desfocada, cortada ou com pouca luz." |
| `OCR-02` | provedor indisponível ou erro 5xx | "Não conseguimos ler agora. Tente de novo ou digite manualmente." |
| `OCR-03` | tempo esgotado | idem 02 |
| `OCR-04` | texto lido, mas não reconhecemos uma comanda | "Não reconhecemos os itens desta comanda." |
| `OCR-05` | saída fora do schema ou acima dos limites | idem 04 |

Em todos os casos: "nenhuma informação foi salva" e as ações [Tentar de novo], [Tirar outra foto] e [Digitar manualmente].

### 9.5 Tentativas e jobs

```text
image route (API), in the same transaction:
  START_OCR → attempt T (PROCESSING), bill OCR_PROCESSING
  boss.send('ocr',        {billId, attemptId: T}, {expireInSeconds: 25, retryLimit: 0, singletonKey: T, db: tx})
  boss.send('ocr-expire', {billId, attemptId: T}, {startAfter: 25, db: tx})

worker 'ocr':
  download image → ReceiptExtractor.extract(signal = 18 s total budget; client gives up at 20 s; server expires at 25 s)
  ok    → APPLY_OCR_RESULT(T, receipt)        (operationId = UUIDv5("APPLY_OCR_RESULT:T"))
  error → FAIL_OCR(T, code)

APPLY_OCR_RESULT / FAIL_OCR in core:
  if T ≠ ocrAttempt.id or attempt ≠ PROCESSING or bill ≠ OCR_PROCESSING → noChange (log "ocr_result_discarded")

worker 'ocr-expire':
  EXPIRE_OCR_ATTEMPT(T) → if still PROCESSING: EXPIRED and bill OCR_FAILED (OCR-03)

client:
  20 s without a result event → ABANDON_OCR(T) → CANCELLED, bill OCR_FAILED → screen 05
```

- O checklist da tela 04 é progressão visual ligada ao tempo decorrido. "Imagem recebida" só aparece após o 202 e o resto nunca é marcado como concluído antes do evento com o resultado.
- Concorrência do worker: 4 jobs `ocr` por instância. Cota do Vision e limite por conta em §12.7.

### 9.6 Qualidade do OCR

- **Corpus:** pelo menos 50 fotos reais de comandas, com nomes de pessoas apagados, guardadas em bucket privado de testes (fora do repositório), cada uma com o JSON esperado.
- **Métricas por versão do parser:** total exato (%), F1 de itens (nome aproximado + valor exato), cobranças corretas (%), tempo p95.
- **Meta para o lançamento (provisória):** total exato ≥ 80% e F1 de itens ≥ 0,8. Abaixo disso, avaliar o adapter de Document AI ou de modelo multimodal antes do lançamento (§19).
- Em produção: taxa de sucesso, taxa de edição pós-OCR (itens alterados ou adicionados na tela 06) e distribuição de códigos de erro (§15.2).

---

## 10. Imagem da comanda

### 10.1 Cliente

1. Câmera: `input type="file" accept="image/*" capture="environment"` como caminho principal (mais confiável em PWA no iOS); visor com `getUserMedia` quando disponível, com moldura e lanterna (`torch`) só se o dispositivo suportar.
2. Galeria: `input type="file" accept="image/*"`.
3. Compressão: `createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas com lado maior ≤ 2.400 px → `toBlob('image/jpeg', 0.85)`; se passar de 4 MB, qualidade 0,7. Se o navegador não decodificar o arquivo (HEIC fora do Safari), envia o original se tiver até 10 MB.
4. Envio: `multipart/form-data`, campo `image`, mais `operationId`.

### 10.2 Validação no servidor

| Verificação | Regra |
|---|---|
| Tamanho | multer em memória, `fileSize` ≤ 10 MB, 1 arquivo, sem outros campos de arquivo → 413 |
| Tipo real | `file-type` pela assinatura do arquivo; allowlist `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` → 415 |
| Nome | o nome enviado é ignorado |
| HEIC | lê as dimensões no cabeçalho do contêiner antes de decodificar (rejeita acima de 40 megapixels); converte com heic-convert em um `worker_thread` com limite de memória (`resourceLimits`) e timeout de 5 s |
| Decodificação | `sharp(buffer, { limitInputPixels: 40_000_000, failOn: 'error' })`; falha → 415 |
| Estado | sessão do criador e conta em `DRAFT` (senão 422) |

### 10.3 Processamento

`sharp().rotate()` (aplica a orientação e descarta EXIF) → `resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })` → `jpeg({ quality: 85, mozjpeg: true })`. O sharp não copia metadados para a saída se `withMetadata()` não for chamado: a imagem gravada sai sem EXIF, GPS e perfil de câmera (CA-H7).

### 10.4 Armazenamento

- Bucket privado `receipts` no Supabase Storage. Chave gerada no servidor: `bills/<billId>/<uuid>.jpg`; nenhum trecho vem do cliente (sem risco de path traversal).
- Acesso só pela API e pelo worker, com a chave de serviço do Storage (segredo de servidor; nunca no cliente).
- Uma imagem por conta: `START_OCR`, "tirar outra foto" e "descartar leitura" enfileiram a remoção da imagem anterior, se houver.
- **Ordem do upload:** a rota verifica a idempotência (`operationId`) antes de enviar ao Storage; envia o objeto; depois roda o comando. Se o comando falhar ou a transação for desfeita, a rota apaga o objeto que acabou de enviar.
- **Varredura:** o job diário `sweep-orphan-images` apaga objetos com mais de 1 h que não estão em nenhum `image_path` (cobre falhas entre o upload e a compensação, e remoções que esgotaram as tentativas).

### 10.5 Entrega

`GET /api/bills/:billId/image` exige sessão da conta, lê o objeto e faz streaming com `Content-Type: image/jpeg`, `Cache-Control: private, no-store` e `Content-Disposition: inline`. Não existe URL pública nem URL assinada exposta ao cliente: a imagem só é vista por quem tem sessão naquela conta (§F9.4.8).

### 10.6 Purga

Job `purge-images` a cada hora: contas com `closed_at < now() - interval '48 hours'` e `image_path` preenchido → apaga o objeto → `image_path = null`. Na exclusão da conta, o efeito `delete-image` é enfileirado na mesma transação e executado logo depois, com até 5 novas tentativas (CA-H10).

---

## 11. Identidade, sessão e autorização

### 11.1 `joinToken` (ADR-09)

```text
joinToken = base64url(billId as 16 bytes) "." kid "." base64url(HMAC-SHA256(K[kid], "join:" + billId + ":" + join_token_version)[0..16))
link      = https://contajuntos.app/entrar#t=<joinToken>
```

- O MAC truncado em 128 bits é a parte secreta; o `billId` no token serve só para localizar a conta.
- **Validação** (`/api/join/resolve`, `/api/join`): decodifica; busca a conta pelo `billId`; recalcula o MAC com `K[kid]` e `join_token_version`; compara com `crypto.timingSafeEqual`. Qualquer falha (formato, conta inexistente ou excluída, MAC errado, versão antiga) → 404 com o mesmo corpo.
- **Rotação do link:** `ROTATE_INVITE_LINK` incrementa `join_token_version`; links antigos deixam de valer. Sessões existentes continuam (§F5.2).
- **Rotação de chave:** `JOIN_TOKEN_KEYS` é um keyring (`{kid: 32-byte key}`) e `JOIN_TOKEN_CURRENT_KID` define a chave dos links novos. Chaves antigas continuam aceitas até serem retiradas; retirar uma chave invalida os links gerados com ela.
- **Exibição:** `GET /api/bills/:id/invite` recalcula o link com a chave atual. O token não fica no snapshot, nos eventos nem no banco.

### 11.2 Sessão (ADR-10)

| Aspecto | Definição |
|---|---|
| Valor do cookie | 32 bytes de `crypto.randomBytes`, base64url |
| Armazenamento | `sessions.token_hash = SHA-256(value)`; o valor nunca é gravado |
| Nome | `__Host-cj_<billId without hyphens>` (um por conta) |
| Atributos | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` (30 dias), sem `Domain` |
| Renovação | `last_used_at` atualizado no máximo a cada 5 min; uma vez por dia, `expires_at = now() + interval '30 days'` e `Set-Cookie` com novo `Max-Age` ("30 dias sem uso", §F5.3.1) |
| Leitura | a rota da conta lê só o cookie daquela conta; sem ele → 401 |
| Revogação | `revoked_at` + `revocation_reason`; `NOTIFY session_revoked` (§8.6) |
| Sair e apagar | `POST /api/bills/:id/session/end` → revoga, responde com o cookie expirado (`Max-Age=0`); o cliente apaga o cache local daquela conta |
| Expiração | job diário marca `EXPIRATION` e remove linhas 7 dias depois |

Sessões não guardam nome, IP nem user agent. A auditoria usa `participantId` e IP como HMAC (§12.9).

### 11.3 Reivindicação ("Sou eu")

```text
POST /api/join {action: REQUEST_CLAIM, participantId}
  → command in the pipeline (creates a PENDING Claim in the document, notifies the table)
  → 32-byte secret → claim_secrets (hash, expires in 10 min)
  → 202 {claimId} + cookie __Host-cjc_<claimId> (HttpOnly, Secure, SameSite=Lax, Max-Age=600)

client: GET /api/claims/:id every 2 s (read only: PENDING | APPROVED | REJECTED | EXPIRED)

another participant: DECIDE_CLAIM(APPROVE)
  → revokes every session of the target (reason CLAIM), marks APPROVED

client: POST /api/claims/:id/complete (claim cookie)
  → only if APPROVED and the secret was not consumed → creates the target's session,
    consumes the secret, clears the claim cookie
  → 201 {me, snapshot} + Set-Cookie with the session
```

O job `expire-claims` (a cada minuto) aplica `EXPIRE_CLAIM` às pendentes com mais de 10 min.

### 11.4 Autorização

Um middleware `authorizeBill` em todas as rotas `/api/bills/:billId/*`:

1. Valida `billId` como UUID (senão 404).
2. Lê o cookie da conta e resolve a sessão **daquela** conta. Sessão de outra conta nunca serve (a busca é por `token_hash` e `bill_id`). Sem cookie para essa conta → 404, com o mesmo corpo de uma conta inexistente (não revela se a conta existe). Cookie presente, mas sessão revogada ou expirada → 401 (`SESSION_INVALID` ou `ACCESS_TRANSFERRED`).
3. Coloca em `res.locals.actor` o `{ participantId, sessionId }` vindo do banco. Nenhuma rota lê identidade do corpo ou da URL.
4. `isCreator` é calculado dentro do pipeline a partir do documento travado (`createdBy`), não do cliente.

As regras por comando (quem pode, em qual estado) ficam em `@cj/core` (tabela de §6.4), testadas uma a uma. Referências a IDs no payload são resolvidas dentro do documento travado: ID ausente → `INVALID_REFERENCE` (422), a mesma resposta para "não existe" e "é de outra conta".

---

## 12. Segurança

Aplicando as regras de segurança Node.js da skill `meli-security-expert`. As bibliotecas internas do Mercado Livre que essas regras indicam (`@meli/express-server`, `@meli/input-validation`, `@meli/logger`, `node-melitk-secrets`, `frontend-restclient`, `websec-crypto-js`, `@platsec-security/authz`) dependem da plataforma Fury e não se aplicam a uma aplicação em nuvem pública genérica. A tabela abaixo indica o equivalente usado para cada regra. Se a aplicação migrar para o Fury, essas bibliotecas passam a ser obrigatórias.

### 12.1 Regras aplicadas

| Regra | Implementação nesta spec |
|---|---|
| Segredos nunca no código; injeção por ambiente | gerenciador de segredos da plataforma → variáveis de ambiente; a inicialização falha se faltar algum (Apêndice B) |
| Validação por schema em todas as entradas, com allowlist | zod `.strict()` em corpo, parâmetros e query; enums para tipos; limites de tamanho. Textos: normalização NFC, `trim`, rejeição de caracteres de controle (`\p{Cc}`) e de formatação bidirecional; nomes de pessoas passam por um filtro simples de palavras impróprias em pt-BR (lista versionada) |
| Identidade de fonte confiável | só a sessão (§11.4) |
| Sem GET que altere estado | todas as mutações são `POST`; `complete` da reivindicação é `POST` |
| Sem CORS | mesma origem; nenhum middleware de CORS |
| Sem cabeçalhos de segurança na aplicação | aplicados na borda (§12.6); a API só define `Content-Type`, `Cache-Control`, `Set-Cookie`, `Retry-After` |
| Sem cabeçalhos HTTP customizados | `operationId`, versões e bases vão no corpo; nenhum `X-*` próprio |
| Chamada externa só para destino fixo | Vision por URL constante de allowlist; `redirect: 'error'`; timeout (§9.2) |
| Sem `Math.random`; IDs aleatórios não sequenciais | `crypto.randomUUID()` (v4) e `crypto.randomBytes`; lint proíbe `Math.random` |
| SQL parametrizado | Drizzle e `pg` com parâmetros; proibido montar SQL por concatenação |
| Sem `eval` ou execução dinâmica | lint |
| Criptografia moderna | SHA-256, HMAC-SHA256, `timingSafeEqual` do `node:crypto` |
| Regex sem backtracking exponencial | regex do parser revisadas e testadas com entradas longas (§17.4) |
| Sem `innerHTML` com dados não confiáveis | React escapa por padrão; `react/no-danger` no lint; textos de resumo e compartilhamento são texto puro |
| Erros sem detalhes internos | handler global com problem+json; mensagens de banco nunca chegam ao cliente nem ao log como texto cru |
| Upload validado | §10.2 |
| Estado por requisição | sem estado global mutável em handlers (exceto os registros de streams, isolados em `infra/sse`) |
| Regras de negócio no servidor | `@cj/core` executado no servidor é a autoridade |

### 12.2 Ameaças e controles (CWE)

| CWE | Ameaça | Controle |
|---|---|---|
| CWE-598 | token do link em logs, `Referer` ou pré-visualizações | token no fragmento; troca por `POST`; `Referrer-Policy: no-referrer` (CA-H2) |
| CWE-1390 | sessão fraca ou reutilizável | §11.2; hash no servidor; revogação; nova sessão na repetição de entrada (§7.4) |
| CWE-639 / CWE-862 | acesso a outra conta ou ação em nome de outro | §11.4; regras por comando no core (CA-H3, CA-H4) |
| CWE-352 | CSRF | `SameSite=Lax` + verificação de `Origin` em toda mutação (§12.5) |
| CWE-79 | XSS armazenado via nomes de itens, cobranças e pessoas | escape no React; sem HTML de usuário; CSP sem `unsafe-inline` (CA-H6) |
| CWE-434 / CWE-22 | upload malicioso, path traversal | §10.2 e §10.4 |
| CWE-918 | SSRF | sem URL de usuário em chamadas externas; host fixo; sem redirecionamento |
| CWE-89 | SQL injection | §12.1 |
| CWE-770 / CWE-307 | abuso de entrada, reivindicações, OCR | rate limit (§12.7); limite de vagas; remoção de entradas vazias |
| CWE-532 | dados sensíveis em logs | §15.1 |
| CWE-209 | mensagens de erro com detalhes | §6.7 e §12.1 |
| CWE-841 | burla de fluxo (fechar com pendência, confirmar estado não visto) | guardas no core sob lock (§7.2) |
| CWE-359 | exposição de foto e metadados | §10; purga; proxy autenticado |

### 12.3 Segredos

| Segredo | Uso |
|---|---|
| `DATABASE_URL`, `DATABASE_LISTEN_URL` | papel `app_runtime` |
| `SUPABASE_URL`, `SUPABASE_STORAGE_KEY` | Storage, só no servidor |
| `JOIN_TOKEN_KEYS`, `JOIN_TOKEN_CURRENT_KID` | §11.1 |
| `IP_HMAC_KEY` | auditoria e chaves de rate limit |
| `GOOGLE_SA_JSON` (ou federação) | Vision |

Rotação a cada 90 dias (ou imediata em suspeita de vazamento). Segredos nunca em logs, imagens de container, variáveis de build do front ou repositório (varredura com gitleaks no CI).

### 12.4 Banco e Storage

§5.3: schema não exposto, RLS em profundidade, papel com privilégio mínimo, nenhuma chave do Supabase no cliente.

### 12.5 CSRF

Toda requisição com método diferente de `GET` e `HEAD` exige `Origin` igual a `APP_ORIGIN`. Sem `Origin`, aceita apenas `Sec-Fetch-Site: same-origin`. Caso contrário, 403. Endpoints JSON exigem `Content-Type: application/json`; o de imagem, `multipart/form-data`.

### 12.6 Cabeçalhos na borda (ADR-12)

| Cabeçalho | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `no-referrer` |
| `X-Content-Type-Options` | `nosniff` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

O build do Tailwind gera CSS em arquivo, mas bibliotecas de UI acessível (o bloqueio de rolagem usado por Radix e vaul) injetam elementos `<style>` em runtime. Por isso `style-src` admite `'unsafe-inline'`; `script-src` continua sem nenhuma exceção, que é onde está o risco de XSS. Em M0, testar a política em modo `Report-Only`: se nenhuma violação de estilo aparecer, retirar `'unsafe-inline'`. Servir os estáticos de CDN dificulta usar nonce por resposta.

### 12.7 Rate limits

Chaves com `HMAC(IP)` (IP vindo do proxy confiável, com `trust proxy` igual ao número exato de saltos) ou com o ID da sessão.

| Ação | Limite |
|---|---|
| Criar conta | 10 por hora por IP |
| `join/resolve` e `join` | 30 por 10 min por IP (todas as tentativas); 60 por 10 min por conta, contando só tentativas com MAC válido (um link antigo ou forjado não consome o limite da conta) |
| Pedir reivindicação | 5 por 10 min por IP; 1 pendente por alvo; 3 pendentes por conta |
| Polling de reivindicação | 1 por segundo por pedido |
| Upload e OCR | 10 por minuto e 30 por dia por conta |
| Comandos | 120 por minuto por sessão |
| Streams SSE | 3 simultâneos por sessão; o quarto encerra o mais antigo (§8.3) |

Resposta 429 com `Retry-After`. CA-H1: 1.000 tentativas de adivinhar link esbarram no limite antes de qualquer chance real (o espaço é de 2^128).

### 12.8 Dependências

Lockfile; Dependabot ou Renovate; `pnpm audit` no CI (falha em vulnerabilidade alta ou crítica); SBOM na imagem; atualização mensal de sharp/libvips (decodificadores de imagem são superfície de ataque).

### 12.9 Auditoria

Ações de §F9.4.9 gravadas em `app.audit_log` no mesmo commit da mutação. `data` contém só IDs, códigos e valores em centavos; nunca nomes, descrições, texto do OCR ou imagem. `ip_hmac = HMAC-SHA256(IP_HMAC_KEY, ip)`. Na exclusão da conta, os registros dela são apagados e fica um registro `BILL_DELETED` com `bill_ref = HMAC(billId)` e a data.

---

## 13. Frontend (PWA)

### 13.1 Rotas

| Rota | Telas |
|---|---|
| `/` | 01 Home (estado de identificação em `/nova`) |
| `/entrar` | lê `#t=`, limpa a URL, telas 12 / 26-27 (leitura) |
| `/c/:billId/captura` | 02, 03, 04, 05 |
| `/c/:billId/conferir` | 06 (+ folhas 07, 09) |
| `/c/:billId/cobrancas` | 08 |
| `/c/:billId/confirmar` | 10 |
| `/c/:billId/convidar` | 11 |
| `/c/:billId` | 13 (aba Sala) |
| `/c/:billId/itens` | 14 (+ folhas 17 a 20, estado 21) |
| `/c/:billId/pessoas` · `/c/:billId/pessoas/:pid` | 15 · 16 |
| `/c/:billId/minha-parte` | 22 (+ folha 24) |
| `/c/:billId/pendencias` | 23 |
| `/c/:billId/revisao` | 25 |
| `/c/:billId/finalizada` · `/c/:billId/resumo` | 26 · 27 |
| folha global | 28 Opções da conta |

O `billId` na URL não é credencial; sem sessão, a rota leva a "Este link não é mais válido" ou ao fluxo de reivindicação.

### 13.2 Página `/entrar`

1. Na carga, antes de qualquer outra requisição: lê `location.hash`, extrai `t`, executa `history.replaceState(null, '', '/entrar')`.
2. Guarda o token só em memória (nunca em `localStorage`, `sessionStorage` ou IndexedDB).
3. `POST /api/join/resolve` → prévia → fluxo de §F3.3.
4. A página não carrega scripts de terceiros.

### 13.3 Cliente de API

- `sendCommand(cmd, expected, acceptedReopens)`: gera `operationId` com `crypto.randomUUID()`, registra a operação como pendente (🟡 nos cards afetados) e faz `POST`.
- Falha de rede ou 503: repete com o mesmo `operationId` (300 ms, 1 s, 3 s). Depois disso, o card mostra "Não foi possível confirmar" com [Tentar novamente], que reenvia o mesmo `operationId` (CA-G1).
- 409: abre o diálogo de conflito com o `serverState` (§F8.7) e aplica o estado se a revisão for maior.
- 422: mensagem da regra, perto do campo.
- 401 `ACCESS_TRANSFERRED` ou `SESSION_INVALID`: apaga o cache local da conta e vai para a entrada.

### 13.4 Sincronização

```ts
interface BillState {
  revision: number;
  snapshot: BillSnapshot | null;
  me: { participantId: string; isCreator: boolean } | null;
  pending: Map<string, { command: Command; since: number; targets: string[] }>;
  connection: 'connected' | 'connecting' | 'offline';
}
```

- Um store Zustand por conta aberta. A única função que troca o snapshot é `apply(revision, snapshot)`, que ignora revisões menores ou iguais à local (§F8.5).
- `EventSource` com o protocolo de §8.2. Sem `ping` por 35 s ou `navigator.onLine = false` → `offline` (🔴). Comandos ficam desabilitados offline.
- **Prévia:** telas de edição usam `core.execute` sobre o documento local para mostrar valores ("R$ 40,00 por pessoa", "faltam R$ 10,00") e para calcular `acceptedReopens` antes de enviar (§F5.11). O resultado da prévia nunca é exibido como salvo.
- **Banners:** gerados a partir de `BillEvent.notifications`, filtrados por `me.participantId` quando pessoais, agrupados por tipo e persistentes até "Ok" (§F4.8).

### 13.5 Cache local e privacidade

- IndexedDB (`idb-keyval`): `bill:<id>` com o último snapshot e `me`, para leitura offline.
- Apagado em: sair e apagar, 401 por transferência ou revogação, evento `deleted`, remoção do participante.
- Sem imagens em cache local (a resposta da imagem é `no-store`).

### 13.6 PWA e service worker

- vite-plugin-pwa (Workbox): precache da casca (HTML, JS, CSS, fontes, ícones); fallback de navegação para `index.html`.
- **Nenhum** cache de `/api/*` no service worker; o cache de dados é o IndexedDB, controlado pelo app.
- Atualização: o novo service worker ativa na próxima abertura; quando ele detecta uma versão publicada nova com a conta aberta, mostra o banner "Nova versão disponível" com [Atualizar]. Mudanças de contrato da API são sempre compatíveis com a versão anterior do app (§5.4).
- Instalação opcional, sem convite automático durante uma conta (§F9.3).

### 13.7 UI

- Tailwind CSS v4 com tokens do mockup: primária verde-petróleo (`#0F766E` / `#115E59`), fundo `#F4F7F7`, alerta âmbar, erro vermelho, raio 12-16 px, tipografia do sistema.
- Componentes base: `Button`, `Card`, `Sheet` (vaul), `Dialog` (Radix), `Stepper`, `MoneyInput`, `PercentInput`, `StatusBadge` (ícone + texto, §F4.8), `Banner`, `SyncIndicator`, `MyShareBar`, `Avatar` (inicial + cor).
- `MoneyInput`: `inputmode="decimal"`; os dígitos digitados formam centavos ("1234" → R$ 12,34); conversão sem ponto flutuante.
- Textos em `strings/pt-BR.ts`; nenhum texto de interface espalhado em componentes.

### 13.8 Acessibilidade

- Radix e vaul fornecem foco preso, `aria-modal`, fechamento por Esc e retorno do foco.
- `aria-live="polite"` para "Sua parte agora é R$ 64,90", com no máximo um anúncio a cada 5 s.
- Áreas de toque ≥ 44 × 44 px; contraste verificado com axe no CI (§17.5); funciona com zoom de 200% e a 320 px.

### 13.9 Orçamento de performance

| Métrica | Meta |
|---|---|
| JS inicial (gzip) | ≤ 150 KB; QR, câmera e telas de fechamento carregadas sob demanda |
| LCP em 4G no celular de referência | ≤ 2,5 s |
| Interativo | ≤ 3 s (§F9.1) |
| `@cj/core` | ≤ 25 KB gzip |

---

## 14. Jobs e tarefas agendadas (pg-boss)

| Job | Gatilho | Ação | Idempotência |
|---|---|---|---|
| `ocr` | enfileirado pela rota de imagem | §9.5 | `singletonKey = attemptId`; comando com `operationId` UUID v5 derivado da tentativa |
| `ocr-expire` | 25 s após o início | `EXPIRE_OCR_ATTEMPT` | sem efeito se a tentativa não estiver `PROCESSING` |
| `delete-image` | efeito de exclusão, descarte ou nova foto | apaga o objeto no Storage | apagar objeto inexistente é sucesso; 5 tentativas com backoff |
| `expire-claims` | cron, a cada minuto | `EXPIRE_CLAIM` nas pendentes com mais de 10 min | por reivindicação |
| `purge-images` | cron, a cada hora | §10.6 | condição na própria consulta |
| `sweep-orphan-images` | cron, diário | §10.4 | objeto referenciado nunca é apagado |
| `purge-sessions` | cron, diário | marca expiradas; apaga revogadas ou expiradas há mais de 7 dias | condição na consulta |
| `purge-operations` | cron, a cada 10 min | apaga `operations` e `entry_operations` com mais de 24 h, em lotes de 5.000 linhas | idem |
| `purge-events` | cron, a cada minuto | apaga `events` com mais de 5 min, em lotes de 5.000 linhas | idem |
| `purge-presence` | cron, a cada minuto | apaga presença sem sinal há mais de 10 min | idem |
| `purge-audit-log` | cron, diário | apaga auditoria com mais de 90 dias | idem |
| `product-metrics` | cron, a cada 15 min | grava métricas de §15.3 | sobrescreve a janela |

Os jobs rodam no worker. Jobs que mudam o documento passam pelo pipeline de §7 com ator `SYSTEM`.

**Enfileiramento transacional:** todo `send` feito durante um comando usa a opção `db` do pg-boss com o cliente da transação corrente, para que um ROLLBACK também desfaça o job (ex.: `delete-image` nunca roda para uma imagem que continua referenciada). Se a versão adotada do pg-boss não suportar isso, usar uma tabela `app.side_effects` gravada na transação e despachada por um job que a lê (outbox).

---

## 15. Observabilidade

### 15.1 Logs

- pino em JSON, um log por requisição (pino-http) e logs de domínio com campos fixos: `reqId`, `route`, `method`, `status`, `durationMs`, `billId`, `commandType`, `code`.
- **Redação obrigatória:** `req.headers.cookie`, `res.headers["set-cookie"]`, `authorization`, todo o corpo da requisição e da resposta, `joinToken`, `operationId` de entrada, segredos de reivindicação.
- **Nunca logar:** nomes de pessoas, descrições de itens e cobranças, texto do OCR, imagens, valores por pessoa, URLs com fragmento.
- Erros de infraestrutura (banco, Storage, Vision) são logados por código estável e tipo, nunca pela mensagem crua do driver, que pode conter host ou usuário.
- `billId` e `participantId` são identificadores opacos e podem aparecer em logs operacionais.

### 15.2 Métricas técnicas (OpenTelemetry)

| Métrica | Tipo | Uso |
|---|---|---|
| `http_server_duration` por rota e status | histograma | meta de 1,5 s p95 para comandos |
| `commands_total` por tipo e resultado | contador | volume, 409, 422 |
| `lock_wait_ms` | histograma | contenção por conta |
| `event_fanout_ms` (commit → escrita no stream) | histograma | meta de 500 ms p95 |
| `sse_active_streams` | gauge | capacidade |
| `listen_connected` | gauge (0/1) | readiness |
| `ocr_duration_ms` por provedor | histograma | meta de 8 s p95 |
| `ocr_result_total` por código | contador | qualidade do OCR |
| `ocr_result_discarded_total` | contador | resultados tardios (§6.2) |
| `pgboss_queue_lag_s` por fila | gauge | jobs atrasados |
| `db_pool_in_use` | gauge | dimensionamento |
| `rate_limit_blocked_total` por chave | contador | abuso |

Tracing distribuído com auto-instrumentação de Express, `pg` e `fetch`; a amostragem é de 10% em produção e de 100% para erros.

### 15.3 Métricas de produto (§F9.8)

Calculadas pelo job `product-metrics` a partir de `app.bills` e `app.audit_log`, sem dados pessoais: contas criadas; contas que nunca dividiram; contas finalizadas; tempo entre confirmar a comanda e fechar; **contas travadas** (`OPEN` há mais de 2 h com pendências pessoais); reivindicações pedidas, aprovadas e expiradas; remoções; taxa de sucesso do OCR; edições por conta na tela 06 depois do OCR.

### 15.4 Alertas

| Condição | Severidade |
|---|---|
| 5xx > 2% em 5 min | alta |
| p95 de comandos > 1,5 s por 10 min | média |
| `listen_connected = 0` em alguma instância por 1 min | alta |
| `InvariantError` (qualquer ocorrência) | alta |
| OCR com falha > 30% em 15 min | média |
| atraso da fila `ocr` > 10 s | média |
| pool do banco > 80% por 5 min | média |
| job de purga sem sucesso por 3 h | média (privacidade) |

---

## 16. Infraestrutura e entrega

### 16.1 Ambientes

| Ambiente | Banco e Storage | OCR | Uso |
|---|---|---|---|
| Local | Supabase CLI (`supabase start`) | `FakeExtractor` | desenvolvimento |
| CI | Postgres em container na mesma versão do Supabase | `FakeExtractor` | testes |
| Staging | projeto Supabase de staging | Vision (cota baixa) | homologação, testes de carga |
| Produção | projeto Supabase de produção (São Paulo) | Vision | usuários |

### 16.2 Containers

- Uma imagem para API e worker (`node:24-slim` ou distroless), com entrypoints `dist/server.js` e `dist/worker.js`.
- Usuário não-root, sistema de arquivos só leitura (exceto `/tmp`), porta 8080, `--enable-source-maps`.
- Plataforma de containers com conexões HTTP longas (SSE de vários minutos), escala horizontal e região São Paulo. Escolha do fornecedor em aberto (§19).
- API: no mínimo 2 instâncias; autoescala por CPU e por streams ativos. Worker: 1 a 2 instâncias.
- Health: `/api/health` (processo vivo) e `/api/ready` (banco e `LISTEN` ok).

### 16.3 Borda (CDN e proxy)

- Domínio `contajuntos.app` com TLS.
- `/assets/*`: cache imutável (nomes com hash). `index.html` e `sw.js`: `no-cache`.
- `/api/*`: encaminhado para a API sem cache; repassa o IP do cliente em um único cabeçalho padrão confiável.
- `/api/bills/*/events`: sem buffer e sem compressão; timeout ocioso ≥ 120 s (há `ping` a cada 15 s).
- Cabeçalhos de segurança de §12.6 em todas as respostas.
- Compressão gzip/brotli nas demais respostas.

### 16.4 CI/CD

```text
pull request: install (pnpm, lockfile) → lint → typecheck → unit and property tests (core)
              → integration (API + Postgres) → E2E (Playwright, local compose) → build
              → pnpm audit → gitleaks → CodeQL
main:         image build + SBOM → staging migrations → staging deploy → smoke tests
release:      manual approval → production migrations (separate job) → gradual deploy → smoke tests
```

- Migrações rodam antes do deploy e sempre são compatíveis com a versão anterior do código (§5.4).
- Rollback: reimplantar a imagem anterior; migrações nunca removem colunas na mesma versão em que deixam de usá-las.
- Cobertura mínima: `@cj/core` ≥ 95% de linhas e 90% de ramos; demais pacotes ≥ 80%.

---

## 17. Estratégia de testes

### 17.1 Pirâmide

| Nível | Ferramenta | O que cobre |
|---|---|---|
| Unitário e propriedades | Vitest + fast-check | `@cj/core` (cálculo, derivação, comandos), parser de OCR, utilitários |
| Integração | Vitest + Supertest + Postgres real | pipeline, sessões, idempotência, concorrência, SSE, imagem, rate limit |
| Contrato | zod + fixtures | schemas de comandos, eventos e respostas do Vision |
| E2E | Playwright (vários contextos de navegador) | fluxos de ponta a ponta com várias pessoas |
| Acessibilidade | axe-core no Playwright | todas as telas |
| Carga | k6 | §17.6 |
| Segurança | testes dedicados + varredura DAST de base em staging | §17.7 |

### 17.2 `@cj/core`

- Vetores de §4.5 (dataset, E-1, E-2 e aceites numéricos), executados no Node e no Chromium e WebKit.
- Propriedades (§F11.J) com fast-check sobre contas geradas aleatoriamente dentro dos limites: nenhuma parte negativa servida; I1 sempre; I2 ao finalizar; determinismo; idempotência de `derive`; dividir o item de outra pessoa não muda a parcela proporcional de quem não está nele enquanto houver valor sem dono; nenhum valor intermediário fora de 64 bits.
- Um teste por linha das tabelas de §F5.8.3, §F5.8.4, §F5.9, §F6.1, §F6.3 e §6.4.

### 17.3 Integração da API

| Cenário | Aceites |
|---|---|
| Criar conta, entrar, vincular vaga, mesa cheia, corridas por vaga | CA-B1 a CA-B5 |
| Reivindicação com aprovação, recusa, expiração e criador | CA-B7, CA-B8 |
| Remoção de participante sem consumo | CA-B9 |
| Rotação do link | CA-B11 |
| Concorrência: `Promise.all` de comandos na mesma conta | CA-G3, CA-G4, CA-F6, CA-F7 |
| Idempotência: mesma operação repetida, inclusive após 409 e após queda | CA-G5 |
| SSE: `hello`, salto de revisão, resposta antiga, commit entre snapshot e assinatura | CA-G6, CA-G7, CA-G8 |
| Revogação encerra o stream em até 5 s | CA-H5 |
| Escopo de sessão e IDs de outra conta | CA-H3, CA-H4 |
| Upload: tipo falso, tamanho, bomba de descompressão, EXIF removido, proxy exige sessão | CA-H7 |
| Exclusão e anonimização, inclusive em conta finalizada | CA-H8, CA-H9 |
| Purga da foto com relógio controlado | CA-H10 |
| OCR: resultado tardio descartado, expiração aos 25 s | CA-A8 |

### 17.4 OCR

- Parser: fixtures com respostas reais do Vision (JSON gravado, sem a imagem) e o resultado esperado; casos de layout (duas colunas, linhas tortas, valores sem quantidade, "4x", serviço sem percentual).
- Regex: testes com entradas de 10 mil caracteres para garantir tempo linear.
- Adapter: teste de contrato com servidor HTTP falso (timeout, 429, 5xx, redirecionamento rejeitado).
- Corpus de qualidade (§9.6): script `pnpm ocr:evaluate` fora do CI obrigatório; relatório por versão.

### 17.5 E2E

- Fluxo completo com três contextos (Nery, Ray e Thais): criação com `FakeExtractor`, conferência, convite, entrada, divisão nos três modos, confirmação, resolução em nome, fechamento e resumo, conferindo os valores do dataset (CA-D1).
- Offline (`context.setOffline`) (CA-G1); conflito simultâneo (CA-G2); atualização sem recarregar (CA-G9).
- axe em cada tela; viewport de 320 px; zoom de 200%.

### 17.6 Carga

k6 com 300 contas simultâneas × 6 streams SSE e 50 comandos por segundo. Critérios: comando p95 ≤ 1,5 s; evento p95 ≤ 500 ms; nenhum erro 5xx; espera de lock p99 < 200 ms.

### 17.7 Segurança

Testes automatizados para atributos de cookie, rejeição por `Origin`, ausência de token em logs (inspeção dos logs do teste), payload de XSS em todos os campos de texto (CA-H6), upload malformado, rate limit (CA-H1) e cabeçalhos da borda em staging. Varredura DAST de base em staging a cada release.

---

## 18. Plano de implementação

| Marco | Entrega | Critério de saída |
|---|---|---|
| M0 Fundamentos | monorepo, CI, lint, `@cj/core` (cálculo, derivação, vetores, propriedades), esquema SQL, Supabase local e staging | dataset e aceites numéricos verdes no Node e no navegador |
| M1 Criação | `POST /api/bills`, pipeline de comandos, imagem, OCR (fake, Vision, parser), telas 01 a 10 | CA-A1 a CA-A11 |
| M2 Entrada e identidade | `joinToken`, sessões, `/entrar`, vagas, pré-cadastro, reivindicação, remoção, telas 11 a 13 | CA-B1 a CA-B12 |
| M3 Divisão e tempo real | `SET_SPLIT`, SSE, fan-out, presença, conflito, telas 14 a 21 | CA-C1 a CA-C9, CA-G1 a CA-G9 |
| M4 Confirmação e fechamento | confirmação, resolução em nome, ajustes da mesa, fechamento, telas 22 a 27 | CA-D1 a CA-D14, CA-E1 a CA-E8, CA-F1 a CA-F8 |
| M5 Privacidade e operação | tela 28, exclusão, anonimização, purgas, rate limits, cabeçalhos, observabilidade, acessibilidade, carga, avaliação do OCR | CA-H1 a CA-H11, §F11.I, §17.6, meta de §9.6 |
| M6 Beta fechado | uso real com grupos convidados | métricas de §15.3 sem bloqueadores |

Spikes antes de M1 e M3 (§19): qualidade do Vision com o parser e SSE de longa duração na plataforma escolhida.

---

## 19. Riscos técnicos e decisões em aberto

| # | Item | Tipo | Ação |
|---|---|---|---|
| RT1 | Qualidade do Vision + parser próprio em comandas brasileiras (layouts variados, impressão térmica apagada) | risco alto | spike com o corpus antes de M1; meta de §9.6; adapters alternativos prontos para comparação |
| RT2 | Conexões SSE longas e sem buffer na plataforma e na CDN escolhidas | risco médio | spike antes de M3; plano B: WebSocket (§F10.2 T2) mantendo o mesmo protocolo de mensagens |
| RT3 | `LISTEN` no Supabase exige conexão direta ou modo sessão do pooler | risco médio | validar no spike de M3; plano B: Redis pub/sub só para o fan-out |
| RT4 | Evolução do formato do documento JSONB | risco baixo | `migrateDocument` e testes por versão (§5.4) |
| RT5 | Conversão de HEIC no servidor é lenta (1 a 2 s) | risco baixo | o cliente já envia JPEG na maioria dos casos; medir |
| RT6 | Custo e cota do Vision | risco baixo | rate limit por conta; métrica por conta; alerta de custo |
| RT7 | Cookies separados entre navegadores e app instalado (iOS) | risco conhecido | reivindicação (§11.3); métrica de reivindicações |
| A1 | Fornecedor da plataforma de containers e da CDN | aberta | escolher no spike de M3 (requisitos em §16.2 e §16.3) |
| A2 | Fornecedor de observabilidade e de rastreamento de erros | aberta | qualquer backend OTLP; ferramenta de erros com limpeza de dados pessoais |
| A3 | Endpoint regional do Vision e confirmação de retenção no contrato | aberta | decidir antes do lançamento (§9.2) |
| A4 | Domínio definitivo e marca | aberta | depende de §F10.1 D12 |

---

## Apêndice A. Rastreabilidade (spec funcional → técnica)

| Spec funcional | Onde é implementado |
|---|---|
| §F2.2 Entidades | §4.1 (documento), §5.2 (tabelas fora do documento) |
| §F2.3 Derivados, §F2.4 Pendências | §4.2 |
| §F3 Fluxos | §2.3, §7, §9.5, §11.3, §13.1 |
| §F4 Telas | §13 |
| §F5.1 Permissões | §6.4, §11.4 |
| §F5.2 Link | §11.1, §13.2 |
| §F5.3 Identidade e sessão | §11.2, §11.3 |
| §F5.4 Vagas | §6.4, §7.2 |
| §F5.5 Presença | §8.5 |
| §F5.6 a §F5.13 Regras de edição, divisão, confirmação, resolução, ajustes, fechamento | §4.3, §6.4, §7 |
| §F5.14 Saída, exclusão, anonimização | §6.4, §11.2, §12.9, §14 |
| §F6 Máquinas de estado | §4.3 (validação por comando), §9.5 (tentativas) |
| §F7 Cálculo | §4.2, §4.5 |
| §F8 Tempo real e concorrência | §7, §8, §13.3, §13.4 |
| §F9.1 Performance | §1.2, §13.9, §15.2, §17.6 |
| §F9.2 OCR | §9 |
| §F9.3 PWA | §10.1, §13.6 |
| §F9.4 Segurança | §11, §12 |
| §F9.5 Privacidade | §5.5, §10, §12.9, §14 |
| §F9.6 e §F9.7 Acessibilidade e responsividade | §13.8, §17.5 |
| §F9.8 Operação | §15, §16 |
| §F10.2 Decisões técnicas T1 a T12 | ADR-01 a ADR-13, §9, §12.5, §19 |
| §F11 Aceites | §17, §18 |

## Apêndice B. Variáveis de ambiente

| Variável | Componente | Obrigatória | Descrição |
|---|---|---|---|
| `NODE_ENV` | API, worker | sim | `production` / `staging` / `development` |
| `APP_ORIGIN` | API | sim | `https://contajuntos.app`; base do link e da verificação de `Origin` |
| `PORT` | API | não | padrão 8080 |
| `TRUST_PROXY_HOPS` | API | sim | número exato de proxies à frente da API |
| `DATABASE_URL` | API, worker | sim | Supavisor em modo sessão, papel `app_runtime` |
| `DATABASE_LISTEN_URL` | API | sim | conexão para `LISTEN` |
| `DB_POOL_MAX` | API, worker | não | padrão 10 |
| `SUPABASE_URL` | API, worker | sim | projeto (Storage) |
| `SUPABASE_STORAGE_KEY` | API, worker | sim | chave de serviço do Storage (segredo) |
| `STORAGE_BUCKET` | API, worker | não | padrão `receipts` |
| `JOIN_TOKEN_KEYS` | API | sim | keyring JSON `{kid: base64}` (segredo) |
| `JOIN_TOKEN_CURRENT_KID` | API | sim | kid dos links novos |
| `IP_HMAC_KEY` | API | sim | segredo de 32 bytes |
| `OCR_PROVIDER` | worker | sim | `google-vision` ou `fake` |
| `GOOGLE_VISION_ENDPOINT` | worker | não | host da allowlist; padrão `https://vision.googleapis.com` |
| `GOOGLE_SA_JSON` | worker | se `google-vision` | credencial da conta de serviço (segredo) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | API, worker | não | telemetria |
| `LOG_LEVEL` | API, worker | não | padrão `info` |

A inicialização valida todas as variáveis com zod e encerra o processo se faltar alguma obrigatória, sem imprimir os valores.

## Apêndice C. Termos da spec funcional → nomes no código

A spec funcional usa o vocabulário do produto em português. No código, valem os nomes em inglês abaixo. Nos testes de aceite, um critério que cita um nome da spec funcional (ex.: `PARTICIPANTE_NAO_CONFIRMOU`) usa o equivalente desta tabela.

### C.1 Entidades e campos

| Spec funcional (pt-BR) | Código (en) |
|---|---|
| Conta | `Bill` (`billId`, tabela `app.bills`) |
| Comanda | receipt (`printedTotal`, `CONFIRM_RECEIPT`, escopo `RECEIPT`) |
| Total impresso (`totalInformado`) | `printedTotal` |
| Item, `quantidade`, `precoUnitario`, `valorTotal` | `Item`, `quantity`, `unitPrice`, `lineTotal` |
| `modoPreco`: `UNITARIO`, `TOTAL_LINHA` | `priceMode`: `UNIT_PRICE`, `LINE_TOTAL` |
| Divisão, `modoDivisao`: `ENTRE_PESSOAS`, `UNIDADES`, `PERSONALIZADO_VALOR`, `PERSONALIZADO_PERCENTUAL` | split, `splitMode`: `EQUAL`, `BY_UNITS`, `CUSTOM_AMOUNT`, `CUSTOM_PERCENT` |
| Atribuição (`unidades`, `valorFixo`, `percentualBp`) | `Allocation` (`units`, `fixedAmount`, `percentBp`) |
| Cobrança, `tipo`: `TAXA`, `DESCONTO` | `Charge`, `kind`: `FEE`, `DISCOUNT` |
| `escopo`: `COMANDA`, `MESA` | `scope`: `RECEIPT`, `TABLE` |
| `origemValor`: `IMPRESSO_FIXO`, `CALCULADO_DE_PERCENTUAL`, `MANUAL_FIXO` | `amountSource`: `PRINTED`, `FROM_PERCENT`, `MANUAL` |
| `origem`: `OCR`, `MANUAL`, `AJUSTE_DIVERGENCIA` | `origin`: `OCR`, `MANUAL`, `DISCREPANCY_ADJUSTMENT` |
| `regraDistribuicao`: `PROPORCIONAL_CONSUMO`, `IGUAL_POR_PESSOA` | `distribution`: `PROPORTIONAL`, `EQUAL_PER_PERSON` |
| `participantesRateio` | `splitAmong` |
| Dispensa (`NENHUMA`, `TOTAL`, `PARCIAL`), `dispensadaPara` | `waiver` (`NONE`, `FULL`, `PARTIAL`), `waivedFor` |
| `motivoRevisao`: `OCR_SEM_PERCENTUAL`, `OCR_SO_PERCENTUAL`, `PERCENTUAL_INCOMPATIVEL` | `reviewReason`: `OCR_AMOUNT_ONLY`, `OCR_PERCENT_ONLY`, `PERCENT_MISMATCH` |
| Participante, `nomeExibido` | `Participant`, `displayName` |
| Estado do participante: `CONVIDADO`, `ATIVO`, `PARTE_CONFERIDA` | `status`: `INVITED`, `ACTIVE`, `SHARE_CLOSED` |
| `consumoConfirmado`, `origemConfirmacao` (`PROPRIA`, `EM_NOME_DE`), `confirmadoPor` | `consumptionConfirmed`, `confirmationSource` (`SELF`, `ON_BEHALF`), `confirmedBy` |
| `versaoConsumo` | `consumptionVersion` |
| `valorConferido`, `conferidaEm` | `closedShareAmount`, `shareClosedAt` |
| Parte | share (`derived.shares`) |
| Vaga, limite de vagas | seat, `seatLimit` |
| Reivindicação ("Sou eu") | `Claim` |
| Tentativa de OCR | `OcrAttempt` |
| Ajuste de conciliação | `reconciliationAdjustment` |
| Saldo não distribuído | `unallocated` |
| Pendência | `Blocker` |
| Revisão, versão | `revision`, `version` |
| Maior Resto | `largestRemainder` |

### C.2 Estados

| Spec funcional | Código |
|---|---|
| Conta: `CRIANDO`, `OCR_PROCESSANDO`, `OCR_ERRO`, `AGUARDANDO_CONFERENCIA`, `ABERTA`, `FINALIZADA` | `DRAFT`, `OCR_PROCESSING`, `OCR_FAILED`, `RECEIPT_REVIEW`, `OPEN`, `CLOSED` |
| Item: `NAO_DIVIDIDO`, `DIVISAO_INCOMPLETA`, `DIVIDIDO`, `EXCLUIDO` | `UNSPLIT`, `PARTIAL`, `SPLIT`, `DELETED` |
| Tentativa de OCR: `PROCESSANDO`, `CONCLUIDA`, `FALHOU`, `CANCELADA`, `EXPIRADA` | `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED` |
| Reivindicação: `PENDENTE`, `APROVADA`, `RECUSADA`, `EXPIRADA` | `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED` |
| Situação de consumo: `VAGA_VAZIA`, `AGUARDANDO_ENTRADA`, `NAO_INFORMOU`, `AGUARDANDO_CONFIRMACAO`, `SEM_CONSUMO`, `CONFIRMADO`, `RESOLVIDO_POR_OUTRO` | `ConsumptionStatus`: `EMPTY_SEAT`, `AWAITING_JOIN`, `NOT_REPORTED`, `AWAITING_CONFIRMATION`, `NO_ITEMS`, `CONFIRMED`, `RESOLVED_BY_OTHER` |

### C.3 Pendências

| Spec funcional | Código (`Blocker.type`) |
|---|---|
| `ITEM_NAO_DIVIDIDO` | `ITEM_UNSPLIT` |
| `UNIDADES_NAO_DISTRIBUIDAS` | `UNITS_UNASSIGNED` |
| `DIVISAO_INCOMPLETA` | `SPLIT_INCOMPLETE` |
| `PARTICIPANTE_NAO_INFORMOU` | `PARTICIPANT_NOT_REPORTED` |
| `PARTICIPANTE_NAO_CONFIRMOU` | `PARTICIPANT_NOT_CONFIRMED` |
| `PARTICIPANTE_AGUARDANDO_ENTRADA` | `PARTICIPANT_NOT_JOINED` |
| `COBRANCA_NAO_CONFIRMADA` | `CHARGE_UNCONFIRMED` |
| `COBRANCA_SEM_RATEIO` | `CHARGE_WITHOUT_ALLOCATION` |
| `DIVERGENCIA_COMANDA` | `RECEIPT_MISMATCH` |

### C.4 Erros

| Spec funcional | Código |
|---|---|
| `MESA_CHEIA` | `TABLE_FULL` |
| `VAGA_OCUPADA` | `SEAT_TAKEN` |
| `CONTA_FINALIZADA` | `BILL_ALREADY_CLOSED` |
| `ACESSO_TRANSFERIDO`, `SESSAO_INVALIDA`, `OCUPADO` | `ACCESS_TRANSFERRED`, `SESSION_INVALID`, `BUSY` |
| demais erros de domínio | tabela de §4.4 |

### C.5 Telas e rotas

As rotas de página, visíveis para o usuário, seguem em pt-BR (§13.1). As rotas da API e os nomes de componentes, em inglês: tela 22 "Minha parte" → componente `MyShareScreen`, barra "Minha parte" → `MyShareBar`; tela 23 "Pendências" → `BlockersScreen`; tela 28 "Opções da conta" → `BillOptionsSheet`.
