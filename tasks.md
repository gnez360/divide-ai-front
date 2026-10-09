# Conta Juntos: Decomposição de tasks do MVP

| Campo | Valor |
|---|---|
| Versão | 1.0 |
| Data | 09/10/2026 |
| Base | `spec.md` v2.0 (funcional) e `spec_tecnica.md` v1.0 (técnica) |
| Escopo | engenharia, design, produto e operação, de M0 (fundamentos) até M6 (beta fechado) |

**Como ler.** `§F5.8` aponta para `spec.md`; `§7.1` aponta para `spec_tecnica.md`; `CA-D8` é um critério de aceite do capítulo 11 de `spec.md`. Cada linha das tabelas é uma task do tamanho de um pull request (ou de uma entrega de design ou produto) e pode virar uma issue com o ID no título, a área e o marco como rótulos.

**Tamanho** (estimativa relativa, uma pessoa): **P** até 1 dia · **M** 2 a 3 dias · **G** 4 a 5 dias · **-** fora de engenharia. Nenhuma task passa de G: o que passaria foi dividido. Recalibrar ao fim de M0.

**Áreas:** PRD produto e jurídico · DES design · DOC documentação · SPK spike · FND fundação do repositório · CTR `@cj/contracts` · DB banco · CORE `@cj/core` · OCR `packages/ocr` · API `apps/api` · WRK `apps/worker` · WEB `apps/web` · INF infraestrutura · OBS observabilidade · QA testes transversais · OPS operação.

---

## 1. Definição de pronto (todas as tasks de engenharia)

- Código, testes, logs e comentários em inglês. Texto visível ao usuário só no catálogo pt-BR (CTR-02), com chave em inglês (§3.3).
- Lint e typecheck sem erros, zero `any`; testes da task verdes no CI; cobertura mínima de §16.4 (`@cj/core` ≥ 95% de linhas e 90% de ramos; demais pacotes ≥ 80%).
- Comando novo: schema zod em `@cj/contracts`, handler em `@cj/core`, um teste por linha das tabelas da spec que o comando cobre (§17.2) e linha conferida na tabela de §6.4 (§3.3).
- Nenhum token, cookie, `operationId` de entrada, nome de pessoa, texto de OCR ou imagem em logs (§15.1).
- Tela nova: status com texto e ícone (§F4.8), rótulo em todo campo, áreas de toque ≥ 44 px, axe sem violações (§13.8).
- Mudança de contrato da API compatível com a versão anterior do app (§13.6).
- Divergência descoberta entre a implementação e a spec: corrigir a spec no mesmo PR (as duas, quando for o caso).

---

## 2. Visão geral dos marcos

| Marco | Foco | Critério de saída (CAs que ficam verificáveis no marco; detalhe na seção 12) | Tasks | Esforço de engenharia (pessoa-dia) |
|---|---|---|---:|---:|
| M0 Fundamentos | repositório, CI, `@cj/core` (cálculo e derivação), banco, Supabase, OCR (spike), plataforma (spike) | CA-A5, CA-C8, CA-D2, CA-D3, CA-D4, CA-D7, CA-D8, CA-D13, CA-D14, §F11.J; ADRs de SPK-01, SPK-02 e SPK-03 | 38 | 72 |
| M1 Criação e tempo real base | motor de comandos, pipeline, criação, imagem, OCR assíncrono, SSE e fan-out, telas 01 a 10, staging | CA-A1, CA-A2, CA-A3, CA-A6, CA-A7, CA-A8, CA-A9, CA-A10, CA-D5, CA-G5, CA-G6, CA-G7, CA-G8, CA-H3, CA-H7 | 54 | 113,5 |
| M2 Entrada e identidade | `joinToken`, entrada, vagas, pré-cadastro, reivindicação, remoção, revogação, telas 11 a 13 e parte da 28 | CA-A11, CA-B1 a CA-B5, CA-B7 a CA-B11, CA-G3, CA-G4, CA-H5 | 20 | 37,5 |
| M3 Divisão, presença e offline | `SET_SPLIT`, edição de item dividido, presença, conflito, offline, PWA, telas 14 a 21 | CA-C1 a CA-C7, CA-C9, CA-G1, CA-G2, CA-G9, CA-H11 | 21 | 38 |
| M4 Confirmação e fechamento | consumo, resolução em nome, ajustes da mesa, aviso de reabertura, fechamento, telas 22 a 27 | CA-A4, CA-B6, CA-B12, CA-D1, CA-D6, CA-D9 a CA-D12, CA-E1 a CA-E8, CA-F1 a CA-F8, CA-H4 | 15 | 30 |
| M5 Privacidade e operação | tela 28 completa, exclusão, anonimização, purgas, limites, observabilidade, produção, segurança, carga, acessibilidade | CA-H1, CA-H2, CA-H6, CA-H8, CA-H9, CA-H10, §F11.I, carga (§17.6), meta do OCR (§9.6) | 27 | 41 |
| M6 Beta fechado | uso real com grupos convidados | métricas de §15.3 sem bloqueadores | 3 | 2,5 |
| **Total** | | | **178** | **334,5** |

O esforço é a soma das tasks de engenharia (P = 1, M = 2,5, G = 4,5), sem paralelismo e sem as tasks de design e produto. Serve para comparar marcos, não como prazo.

---

## 3. Desvios em relação ao §18 da spec técnica

A ordem de §18 tem dependências invertidas. Esta decomposição corrige a sequência; DOC-01 leva as correções para `spec_tecnica.md`.

| # | §18 diz | Esta decomposição | Motivo |
|---|---|---|---|
| 1 | SSE, fan-out e sincronização em M3 | M1 (API-15, API-16, WEB-05, WEB-07) | a tela 04 (M1) espera o evento com o resultado do OCR; os banners de CA-A6, CA-A11, CA-B7, CA-B9 e CA-B11 dependem do tempo real |
| 2 | spike de SSE e plataforma antes de M3 | M0 (SPK-02) | o deploy de staging (INF-03) e o SSE de M1 dependem da plataforma escolhida (A1) |
| 3 | tela 28 inteira em M5 | editar perfil, sair e apagar e rotacionar link em M2 (WEB-24); anonimizar e excluir em M5 (WEB-50) | CA-B8 (sair e voltar) e CA-B11 (rotação) são critérios de saída de M2 |
| 4 | pacote de OCR em M1 | M0, junto com o spike (OCR-01 a OCR-05) | o spike precisa do parser e do adapter reais para medir a qualidade; o protótipo vira o código |
| 5 | teste da CSP em `Report-Only` em M0 | M1 (INF-06) | só faz sentido com os componentes Radix e vaul montados |
| 6 | saída por faixa de CA (ex.: M3 = CA-G1 a CA-G9) | cada CA no marco em que todas as suas tasks terminam (seção 12) | vários CAs citam telas de marcos seguintes: CA-A4 cita 16 e 22; CA-B6 cita 22; CA-B12 cita 26 e 27; CA-G3 e CA-G4 exigem dois participantes |

---

## 4. Lacunas da spec encontradas na decomposição

Propostas para decidir em DOC-01 antes das tasks afetadas.

| # | Lacuna | Proposta | Tasks afetadas |
|---|---|---|---|
| L1 | §3.3 põe o catálogo de textos em `apps/web/src/strings/pt-BR.ts`, mas §4.4 diz que `DomainError.message` vem desse catálogo e a API devolve `message` no problem+json. `@cj/core` e a API não podem importar de `apps/web` | `@cj/core` devolve só `code` e `details`; o catálogo fica em `@cj/contracts`, usado pela API (preenche `message`) e pela web | CTR-02, CORE-13 |
| L2 | §F7.5.3 manda mostrar em 06 o subtotal lido pelo OCR, mas o documento de §4.1 não tem esse campo. O mesmo vale para a confiança por campo (§F9.2, desejável) | `details.ocrSubtotal` (centavos ou `null`); confiança por campo fica fora do MVP | CORE-15, WEB-12 |
| L3 | `POST /api/bills/:billId/editing` (§6.2) não tem onde guardar o item em edição: `app.presence` não tem coluna para isso e a requisição pode chegar a uma instância diferente da que mantém o stream | colunas `editing_item_id` e `editing_expires_at` em `app.presence`, distribuídas por `NOTIFY presence` | DB-02, API-25 |
| L4 | §6.4 diz que `GET /api/bills/:billId/invite` só responde com a conta `OPEN`, mas a tela 27 tem [Copiar link] e §F5.2 diz que o link continua abrindo o resumo depois de finalizar | responder também com a conta `CLOSED` | API-18, WEB-48 |
| L5 | §8.4 lista os canais de `LISTEN` sem `bill_deleted`, que §7.5 usa | incluir `bill_deleted` na lista | API-16 |
| L6 | o job `product-metrics` "grava" métricas (§14), mas §5.2 não tem tabela para elas | publicar como métricas OpenTelemetry (gauges), sem tabela nova | WRK-10 |
| L7 | `DECIDE_CLAIM` não pode vir da sessão que pediu (§F5.3.4), mas o pedido é feito por um visitante e nada liga o pedido a uma sessão | guardar `requester_session_id` (opcional) em `app.claim_secrets` quando o pedido vier de um navegador que já tem sessão na conta; a API recusa a decisão dessa sessão com 403. Continua sendo mitigação parcial (RA3) | DB-02, API-20 |
| L8 | nome impróprio ou texto com caractere de controle não tem código em §4.4, e 400 é tratado como erro de programa (§F8.9), sem mensagem para a pessoa | validar no cliente com o mesmo schema; no servidor, 422 `INVALID_TEXT` com mensagem do catálogo | CTR-01, CTR-03 |

---

## 5. M0 Fundamentos

### 5.1 Produto, design e documentação

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| PRD-01 | **Corpus de OCR** (§9.6). Pelo menos 50 fotos reais de comandas, com nomes de pessoas apagados, em bucket privado de testes fora do repositório, cada uma com o JSON esperado. | nenhuma | corpus disponível para SPK-01 | - |
| DES-01 | **Correções no mockup atual** (§F10.3.1): telas 01, 02, 06, 08, 09, 10, 11, 12, 13, 14, 15, 21 e indicador 🟢 🟡 🔴 em todas as telas da conta. | nenhuma | mockup revisado e aprovado | - |
| DES-02 | **Arquivo do mockup** (§F10.3.3). Renomear para um nome estável (ex.: `telas.png`), atualizar §F1.8 e o cabeçalho de `spec.md`, marcar `image.png` como obsoleto. | DES-01 | referência atualizada nas duas specs | - |
| DES-03 | **Estados da criação e elementos globais** (§F4.8, §F10.3.2). Câmera negada, OCR cancelado, banners globais, indicador de sincronização, barra "Minha parte". | DES-01 | desenhos aprovados antes de WEB-02 | - |
| DOC-01 | **Fechar as lacunas e os desvios** (seções 3 e 4). Decidir L1 a L8, atualizar `spec_tecnica.md` (inclusive §18) e `spec.md` quando a regra funcional mudar. | nenhuma | specs atualizadas e revisadas | P |

### 5.2 Spikes

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| SPK-01 | **Qualidade do OCR (RT1).** Rodar OCR-03 e OCR-04 sobre o corpus com OCR-05 e comparar com a meta provisória de §9.6 (total exato ≥ 80%, F1 de itens ≥ 0,8). Abaixo da meta, medir um adapter alternativo (Document AI ou modelo multimodal). | PRD-01, OCR-03, OCR-04, OCR-05 | relatório por versão do parser e ADR com a decisão do provedor | M |
| SPK-02 | **Plataforma e tempo real (RT2, RT3, A1).** Escolher plataforma de containers e CDN que atendam §16.2 e §16.3. Provar com protótipo: SSE de 10 min sem buffer nem compressão, timeout ocioso ≥ 120 s, `LISTEN` estável via Supavisor em modo sessão ou conexão direta, `NOTIFY` entre duas instâncias, encerramento gracioso. Registrar o plano B (WebSocket, Redis pub/sub). | INF-01 | ADR com o fornecedor e as medições (latência commit → evento) | G |
| SPK-03 | **Conferência de bibliotecas** (§5.2, §14). Nas versões adotadas: `send` do pg-boss com a opção `db` dentro de uma transação do `pg` (rollback desfaz o job); `migrate: false` e filas criadas por SQL; opção `tableCreated` do rate-limiter-flexible. Sem a opção `db`, adotar o outbox `app.side_effects` de §14. | FND-01 | teste automatizado do rollback desfazendo o job, ou decisão pelo outbox registrada | P |

### 5.3 Repositório e CI

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| FND-01 | **Monorepo** (§3.2). pnpm workspaces com `apps/web`, `apps/api`, `apps/worker`, `packages/core`, `packages/contracts`, `packages/ocr`, `db/`, `infra/`, `docs/`; `tsconfig` base com `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`; Node 24 fixado (`engines`, `.nvmrc`); specs em `docs/`. | nenhuma | `pnpm install` e `pnpm -r build` passam em máquina limpa | P |
| FND-02 | **Lint e formatação** (§3.3). ESLint `typescript-eslint` estrito (`no-explicit-any`, `no-floating-promises`, `switch-exhaustiveness-check`, `react/no-danger`, proibição de `Math.random` e `eval`); fronteiras de importação de §3.2; Prettier; commitlint. | FND-01 | importar `apps/api` em `core` ou usar `Math.random` falha no lint | P |
| FND-03 | **CI de pull request, fase 1** (§16.4). Install com lockfile, lint, typecheck, testes unitários, build, `pnpm audit` (falha em alta ou crítica), gitleaks, CodeQL, limites de cobertura. Integração e E2E entram em QA-01 e QA-02. | FND-02 | PR com vulnerabilidade alta, segredo de teste ou cobertura abaixo do limite fica vermelho | M |
| FND-04 | **Atualização de dependências** (§12.8). Renovate ou Dependabot, com sharp e libvips em atualização mensal. | FND-01 | primeiro PR automático aberto | P |
| FND-05 | **Ambiente local** (§16.1). Supabase CLI (`supabase start`), compose com API, worker e web, `.env.example` sem segredos reais, scripts `pnpm dev`, `pnpm db:migrate` e `pnpm db:reset`. | FND-01, DB-01 | pessoa nova sobe o ambiente seguindo só o README | M |
| FND-06 | **Configuração validada** (Apêndice B). Variáveis lidas com zod na API e no worker; o processo encerra se faltar uma obrigatória, sem imprimir valores. | FND-01 | teste: sem `JOIN_TOKEN_KEYS`, o processo encerra com mensagem que não contém valores | P |

### 5.4 Contratos e banco

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CTR-01 | **Pacote `@cj/contracts`** (§3.1, §5.1, §6.1, §12.1). Convenção `.strict()` em todo schema; primitivos (`Cents`, `BasisPoints`, UUID); normalização de texto (NFC, `trim`, rejeição de `\p{Cc}` e de formatação bidirecional, limites de §F9.1, L8); `BillDocumentSchema` para validar o documento inteiro antes de gravar; schema de problem+json. Os schemas de cada comando entram nas tasks dos comandos. | FND-01, CORE-01 | o documento do dataset passa; campo extra, valor fracionário ou texto com `‮` falham | M |
| CTR-02 | **Catálogo de textos pt-BR** (L1). Catálogo com chaves em inglês em `@cj/contracts`, mapa `ErrorCode` → mensagem para a API, regra de lint contra texto literal em JSX. | CTR-01, DOC-01 | nenhum texto pt-BR fora do catálogo (verificado no lint) | P |
| DB-01 | **Drizzle e migrações** (§5.4). Drizzle ORM com `pg`; drizzle-kit gerando SQL em `db/migrations`; fluxo gerar, revisar e aplicar com `app_owner`; regra de expandir e contrair. | FND-01 | migração vazia aplicada no Supabase local | P |
| DB-02 | **Migração inicial do schema `app`** (§5.2). Tabelas, constraints e índices de `bills`, `sessions`, `claim_secrets`, `operations`, `entry_operations`, `events`, `presence` e `audit_log`, com os ajustes de L3 e L7. | DB-01, DOC-01 | teste de integração: `document_size` e os `check` de estado rejeitam valores inválidos | M |
| DB-03 | **Papéis, grants e RLS** (§5.3). `app_owner` e `app_runtime` (privilégio mínimo, sem `public`, `auth` e `storage`); RLS em todas as tabelas de `app` com política só para `app_runtime`; nenhum grant para `anon` e `authenticated`; `statement_timeout = 5s` e `idle_in_transaction_session_timeout = 10s` no papel. | DB-02 | teste: `anon` e `authenticated` não leem nenhuma tabela de `app`; `app_runtime` não cria tabela | M |
| DB-04 | **pg-boss e rate limiter nas migrações** (§5.2, §14). Schema `pgboss` e filas de §14 criados na migração; tabela do rate-limiter-flexible criada na migração; em runtime, criação automática desligada com as opções confirmadas em SPK-03. | DB-02, SPK-03 | API e worker sobem com `app_runtime` sem criar objetos | P |
| INF-01 | **Supabase de staging** (§5.3, §16.1). Projeto em São Paulo; schema `app` fora de "Exposed schemas"; API de dados desativada se nada a usar; bucket privado `receipts`; papéis de DB-03; Supavisor em modo sessão. | DB-03 | migrações aplicadas em staging; requisição anônima à API de dados não vê `app` | M |

### 5.5 `@cj/core`: cálculo e derivação

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-01 | **Tipos do domínio** (§4.1, Apêndice C). `BillDocument` e entidades, IDs com marca de tipo, `Cents`, `BasisPoints`, enums de estado. Sem I/O, sem relógio e sem gerar IDs (§4). | FND-01 | o dataset de §F2.6 escrito como fixture compila | P |
| CORE-02 | **Aritmética monetária** (§F7.1, §4.5). Helpers `BigInt` para produto e divisão com resto; arredondamento meio para cima `(base × bp + 5000n) / 10000n`; constantes de limite de §F9.1. | CORE-01 | CA-D4 (R$ 12,35); produto no limite máximo sem perda | P |
| CORE-03 | **Maior Resto** (§4.5, §F7.9). `largestRemainder` com denominador explícito; centavos de resto só quando a soma dos pesos é igual ao denominador; desempate SHA-256 (`@noble/hashes`) de `contexto:participantId` em hexadecimal. | CORE-02 | CA-D2; trocar a ordem das pessoas não muda o resultado; pré-condição violada lança erro | M |
| CORE-04 | **Itens e partilhas** (§F7.2, §F7.6, §F6.3). Autoridade do preço (`UNIT_PRICE`, `LINE_TOTAL`, unitário exato só quando divisível); partilhas `EQUAL`, `BY_UNITS` (exato em `UNIT_PRICE`; por pessoa com denominador igual à quantidade em `LINE_TOTAL`), `CUSTOM_AMOUNT` e `CUSTOM_PERCENT` (completo pelo Maior Resto; parcial por divisão inteira, sem normalizar); estado do item; valor sem dono. | CORE-03 | CA-C5 (partilhas), CA-C8, CA-D13; derivação de CA-A7; partilhas do dataset | M |
| CORE-05 | **Totais e cobranças por percentual** (§F7.3.2, §F7.4). `itemsTotal`, `receiptTotal`, `difference`, `reconciliationAdjustment` (só com módulo ≤ 5), `reconciledTotal`, `waivedTotal`, `tableAdjustmentsTotal`, `amountDue`; cobrança `FROM_PERCENT` sobre o total de itens antes de descontos; checagem percentual × valor (≤ 5 centavos) exposta aos comandos. | CORE-04 | CA-D3, CA-D4; cálculo de CA-A5 | M |
| CORE-06 | **Rateio de cobranças** (§F7.7). Proporcional com `W = itemsTotal` e resto só sem valor sem dono; igual por pessoa sobre `splitAmong`; dispensa total e parcial (parcela sem dono dispensada quando atribuída a alguém da lista); ajuste de conciliação rateado com contexto `bill.id`; descontos pelo módulo, subtraindo. | CORE-05 | estados E-1 e E-2 (§F2.7); CA-D7, CA-D8, CA-D14; valores de CA-A4, CA-D9, CA-D10, CA-D11 e CA-D12 | G |
| CORE-07 | **Partes, saldo e I1** (§F7.8, §F7.11). Parte por pessoa com linhas (itens, cada cobrança, parcelas dispensadas, ajuste); `unallocated` com sinal e por origem; verificação de I1 com `InvariantError`. | CORE-06 | CA-D1 como vetor (64,90 · 64,90 · 64,90 · 16,50 · 13,20 · 6,60; saldo 0) | M |
| CORE-08 | **Pendências, situação de consumo e progresso** (§F2.4, §F5.8.4, §F6.4.3). Lista com id `${type}:${entityId}` e valor faltante; `ConsumptionStatus` (inclui `RESOLVED_BY_OTHER`); "tem atribuição" inclui `splitAmong`; progresso. A mensagem é chave do catálogo, não texto. | CORE-07, CTR-02 | um teste por linha de §F2.4 e §F5.8.4; diferença de ±6 centavos gera `RECEIPT_MISMATCH` (CA-A5) | M |
| CORE-09 | **`derive()` e validações** (§4.2, §F7.10). Montagem na ordem de §4.2; `validate` com `NEGATIVE_SHARE`, `DISCOUNT_EXCEEDS_RECEIPT`, `LIMIT_EXCEEDED` (100 itens, 20 cobranças, quantidade, valores, textos) e somas de atribuição. | CORE-08 | CA-D5 e CA-D6 como vetores de validação; `derive` aplicado duas vezes dá o mesmo resultado | M |
| CORE-10 | **Vetores canônicos** (§4.5, §17.2). JSON em `packages/core/test/vectors/`: dataset, E-1, E-2, CA-A4, CA-D2, CA-D4, CA-D6 a CA-D14, CA-C5, CA-C8 (CA-E1 e CA-E5 entram com CORE-24 e CORE-26). Runner no Node e no Chromium e WebKit via Playwright. | CORE-09 | resultados idênticos nos três ambientes, no CI | M |
| CORE-11 | **Testes de propriedade** (§F11.J, §17.2). Gerador de contas válidas dentro dos limites; propriedades: nenhuma parte negativa servida; soma das partilhas ≤ valor do item (igual quando dividido); I1 sempre; I2 ao fechar; determinismo; idempotência de `derive`; parcela proporcional de quem não está no item não muda enquanto há valor sem dono; nenhum intermediário fora de 64 bits. | CORE-09 | propriedades no CI, com a seed registrada em falhas | G |
| CORE-12 | **Migração de documento** (§5.4). `migrateDocument` com a cadeia de versões (hoje só v1), aplicada em toda leitura; harness para documentos de versões anteriores. | CORE-01 | documento v1 passa intacto; `schemaVersion` desconhecida falha | P |

### 5.6 OCR (dentro do spike RT1)

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| OCR-01 | **Porta e schema** (§9.1, §F9.2). `ReceiptExtractor`, `ExtractionResult`, `ExtractedReceipt`, `ExtractedReceiptSchema` com os limites de §F9.1 (fora do schema → `OCR-05`), `OcrErrorCode`. | CTR-01 | resultado com 101 itens ou valor fracionário é rejeitado | P |
| OCR-02 | **`FakeExtractor`** (§9.1). Fixtures por hash da imagem ou cenário: dataset, couvert, serviço sem percentual, `OCR-01` a `OCR-05`, atraso configurável, mais de 100 linhas. | OCR-01 | usado pelos testes de QA-01 e QA-02 | P |
| OCR-03 | **Parser de comandas pt-BR** (§9.3). Linhas por centro vertical; dinheiro e percentual por regex de tempo linear; classificação por palavras-chave sem acento e sem caixa; cabeçalho; os quatro padrões de item; limites; determinístico. | OCR-01 | fixtures de respostas reais do Vision (JSON gravado, sem imagem) com os layouts de §17.4; entrada de 10 mil caracteres em tempo linear | G |
| OCR-04 | **Adapter Google Cloud Vision** (§9.2). `DOCUMENT_TEXT_DETECTION` com `languageHints: ['pt']`; host de allowlist validado na inicialização; token via google-auth-library com cache; `fetch` com `redirect: 'error'`; 12 s por chamada dentro do orçamento de 18 s; uma repetição em 429 ou 5xx se restarem ≥ 6 s; mapeamento para `OCR-01` a `OCR-05`; logs só com duração, status e código. | OCR-01, OCR-03 | teste de contrato com servidor HTTP falso (timeout, 429, 5xx, redirecionamento rejeitado); nenhum texto lido no log | M |
| OCR-05 | **Avaliação de qualidade** (§9.6, §17.4). Script `pnpm ocr:evaluate`, fora do CI obrigatório: total exato (%), F1 de itens, cobranças corretas (%), tempo p95; relatório por versão do parser. | OCR-03, OCR-04 | relatório gerado sobre o corpus | M |

---

## 6. M1 Criação e tempo real base

### 6.1 `@cj/core`: motor e comandos da criação

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-13 | **Motor de comandos** (§4.3, §4.4). `execute(doc, cmd, ctx)` com `ExecutionContext`, `Result` e `DomainError` (`code`, `http`, `details`; L1); tabela de estado × permissão por comando (§6.4); guardas de `expected` (`version`, `consumptionVersion`, `shareAmount`, `difference`, `revision`, `versions`); diff de atribuições que aplica as cinco regras de `consumptionVersion` (§F5.8.2); reaberturas e `REOPENS_NOT_ACCEPTED` (§F5.10); notificações (§6.6), auditoria e efeitos; `noChange`; `BILL_ALREADY_CLOSED` com as exceções de §F6.1; `INVALID_REFERENCE` igual para ID inexistente e de outra conta; `RECONCILIATION_ADJUSTMENT_CHANGED` quando o ajuste derivado muda. | CORE-09, CORE-12, CTR-02 | testes do motor com comandos de teste: cada guarda, cada regra de §F5.8.2, reabertura aceita e não aceita, `noChange`; CA-H3 (ID de outra conta → 422) | G |
| CORE-14 | **Comandos de criação e OCR** (§F6.1, §F6.2). `ENTER_MANUALLY`, `START_OCR`, `CANCEL_OCR`, `ABANDON_OCR`, `RETRY_OCR`, `TAKE_NEW_PHOTO`, `DISCARD_RECEIPT`, `FAIL_OCR`, `EXPIRE_OCR_ATTEMPT`; uma tentativa vigente; efeitos `delete-image` (nova foto, descarte) e de enfileiramento (`ocr`, `ocr-expire`). | CORE-13 | um teste por transição de §F6.1 e §F6.2; núcleo de CA-A2 | M |
| CORE-15 | **`APPLY_OCR_RESULT`** (§9.1, §F6.5). Conversão de `ExtractedReceipt`: `UNIT_PRICE` quando `quantity × unitPrice = lineTotal`; cobranças `PRINTED` confirmadas, `OCR_AMOUNT_ONLY`, `OCR_PERCENT_ONLY` e `PERCENT_MISMATCH`; couvert e "por pessoa" → `EQUAL_PER_PERSON` com `splitAmong` vazio; escopo `RECEIPT`; dados da conta e subtotal lido (L2); tentativa não vigente → `noChange`. | CORE-14, OCR-01 | núcleo de CA-A10 e CA-A8; a fixture do dataset vira o documento esperado | M |
| CORE-16 | **Comanda: dados, total e itens** (§F5.6). `UPDATE_BILL_DETAILS`, `SET_PRINTED_TOTAL` (notificação `PRINTED_TOTAL_CHANGED` com a conta `OPEN`), `ADD_ITEM`, `EDIT_ITEM` (item sem divisão; troca de `priceMode` no mesmo commit), `CONFIRM_RECEIPT` (guarda de §F6.1). | CORE-13 | núcleo de CA-A3 e CA-A7; CA-A9 (101º item → 422) | M |
| CORE-17 | **Comanda: exclusão, restauração e mescla** (§F5.6.2, §F5.6.4). `DELETE_ITEM` (notificação `ITEM_DELETED`), `RESTORE_ITEM` (só `OPEN`, sujeito a §F7.10), `MERGE_ITEMS` (mesmo nome normalizado, mesmo `priceMode` e unitário, sem atribuições, guarda `versions`). Itens com atribuições: CORE-23. | CORE-16 | um teste por regra de §F5.6.2 e §F5.6.4, sem atribuições | M |
| CORE-18 | **Cobranças da comanda** (§F6.5, §F7.3, §F7.5.2). `ADD_CHARGE`, `EDIT_CHARGE` (checagem de percentual; com `keepAnyway` confirma, sem ele `PERCENT_MISMATCH`), `REMOVE_CHARGE`, `CONFIRM_CHARGE`, `CREATE_DISCREPANCY_ADJUSTMENT` (guarda `expected.difference`; `FEE` ou `DISCOUNT` pelo sinal; notificação); escopo `RECEIPT`; limite de 20 cobranças. Escopo `TABLE`, dispensa e `splitAmong`: CORE-26. | CORE-13 | núcleo de CA-A6; CA-D5; uma linha de teste por linha de §F6.5 | M |
| CTR-03 | **Filtro de nomes impróprios** (§12.1, §F9.4.6, L8). Aplicado a `displayName` na criação, entrada, pré-cadastro, renomear vaga e perfil; mesmo schema no cliente e no servidor. | CTR-01, PRD-02 | nome da lista → 422 `INVALID_TEXT` com mensagem do catálogo | P |

### 6.2 API

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| API-01 | **Servidor HTTP** (§6.1, §6.7, §15.1). Express 5; JSON até 256 KB; `Cache-Control: no-store`; handler global de problem+json sem stack nem mensagem do banco; corpo 404 único; `trust proxy` igual a `TRUST_PROXY_HOPS`; `/api/health` e `/api/ready`; pino-http com a redação de §15.1; encerramento gracioso (drena por até 10 s). | FND-06, CTR-01 | erro interno não vaza detalhe; a redação remove cookie e `Set-Cookie`; `ready` falha sem banco | M |
| API-02 | **CSRF e tipo de conteúdo** (§12.5). Métodos diferentes de `GET` e `HEAD` exigem `Origin` igual a `APP_ORIGIN` (sem `Origin`, só `Sec-Fetch-Site: same-origin`); JSON exige `application/json`; imagem exige `multipart/form-data`. | API-01 | `Origin` de terceiro → 403; sem `Origin` e sem `Sec-Fetch-Site` → 403 | P |
| API-03 | **Acesso ao banco** (§5.3, §7.3). Pool (Supavisor em modo sessão, `DB_POOL_MAX`); helper de transação com `SET LOCAL lock_timeout = '3s'`; `lock_timeout` → 503 `BUSY`; erros do driver logados por código estável; nenhum SQL por concatenação. | API-01, DB-03 | duas transações na mesma linha: a segunda recebe `BUSY` após 3 s | P |
| API-04 | **Sessões e autorização** (§11.2, §11.4). Valor de 32 bytes, hash SHA-256, cookie `__Host-cj_<billId sem hífens>` com `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`; renovação (`last_used_at` a cada 5 min; `expires_at` e `Set-Cookie` uma vez por dia); `authorizeBill`: UUID inválido ou sem cookie → 404, sessão revogada ou expirada → 401 `SESSION_INVALID` ou `ACCESS_TRANSFERRED`; ator só da sessão. | API-03 | atributos do cookie conferidos; sessão da conta A não serve para B (CA-H3) | M |
| API-05 | **Pipeline de comandos** (§7.1 a §7.3) e `POST /api/bills/:billId/commands`. Passos 1 a 14: lock antes da idempotência, `migrateDocument`, `execute`, erro gravado em `operations` com `serverState`, `noChange`, validação do documento inteiro, `UPDATE` com colunas extraídas, efeitos transacionais (revogar sessões, `join_token_version`, jobs na transação), `events`, `audit_log`, `operations` sem snapshot, `pg_notify`; `InvariantError` → ROLLBACK e 500 com o snapshot anterior. | API-04, API-08, CORE-13, SPK-03 | CA-G5; repetir um comando rejeitado devolve a mesma rejeição; rollback não deixa evento nem job; `Promise.all` na mesma conta serializa | G |
| API-06 | **Snapshot e leitura** (§6.5) `GET /api/bills/:billId`. `BillSnapshot` sem segredos, com `me`, `hasImage` e presença (vazia até API-24). | API-05 | o snapshot nunca contém token, hash ou caminho da imagem | P |
| API-07 | **Comandos de sistema** (§7.1). Executor compartilhado com o worker: ator `SYSTEM`, `operationId` UUID v5 de `"<type>:<id>"` em namespace fixo, passos 5 a 13 do pipeline. | API-05 | o mesmo job executado duas vezes produz uma única revisão | P |
| API-08 | **Auditoria** (§12.9, §F9.4.9). Catálogo de ações (criação, confirmação da comanda, total impresso, ajuste de divergência, ajuste de conciliação, dispensas, resoluções em nome, vínculo de vaga, reivindicações e decisões, remoções, exclusão de item, fechamento, rotação, anonimização, exclusão da conta); `ip_hmac` com `IP_HMAC_KEY`; `data` só com IDs, códigos e centavos. | API-03 | nenhum registro contém nome ou descrição | P |
| API-09 | **Rate limit** (§12.7). rate-limiter-flexible com store Postgres; chaves `HMAC(IP)` ou ID da sessão; 429 com `Retry-After`; limites de criação (10/h por IP) e de comandos (120/min por sessão). Os limites de entrada, reivindicação e upload entram nas tasks dessas rotas. | API-03, DB-04 | 11ª criação na mesma hora → 429 com `Retry-After` | M |
| API-10 | **Criação da conta** (§7.4) `POST /api/bills`. `pg_advisory_xact_lock` pelo hash do `operationId`; idempotência em `entry_operations`; conta `DRAFT`, criador `ACTIVE` e sessão na mesma transação; sessão adicional na repetição (máximo 3 por `operationId`); auditoria. Inclui a função de criação do documento no core. | API-04, API-08, API-09, CTR-03 | duas criações simultâneas com o mesmo `operationId` → uma conta; resposta gravada sem o valor do cookie | M |
| API-11 | **Adapter de Storage** (§10.4). Supabase Storage com a chave de serviço só no servidor: upload, download em stream, remoção idempotente (objeto inexistente é sucesso), listagem para a varredura. | FND-06, INF-01 | testes contra o Storage local | P |
| API-12 | **Processamento de imagem** (§10.2, §10.3). multer em memória (10 MB, 1 arquivo); `file-type` com allowlist; HEIC com dimensões lidas no cabeçalho (≤ 40 MP) e conversão em `worker_thread` com `resourceLimits` e timeout de 5 s; sharp com `limitInputPixels` e `failOn: 'error'`; `rotate`, `resize` 2400 e JPEG 85 mozjpeg, sem metadados. | API-01 | CA-H7 (tipo falso, mais de 10 MB, GPS removido); bomba de descompressão rejeitada | M |
| API-13 | **Upload e início do OCR** (§9.5, §10.4) `POST /api/bills/:billId/image`. Só o criador, conta `DRAFT`; idempotência antes do Storage; chave `bills/<billId>/<uuid>.jpg`; `START_OCR` no pipeline com `ocr` e `ocr-expire` na mesma transação; compensação apagando o objeto se o comando falhar; 10/min e 30/dia por conta; 202. | API-05, API-11, API-12, CORE-14 | CA-A8 em integração com `FakeExtractor` atrasado; falha do comando não deixa objeto | M |
| API-14 | **Entrega da imagem** (§10.5) `GET /api/bills/:billId/image`. Sessão obrigatória, streaming, `Content-Type: image/jpeg`, `Cache-Control: private, no-store`, `Content-Disposition: inline`. | API-04, API-11 | sem sessão → 404 (CA-H7) | P |
| API-15 | **SSE** (§8.1 a §8.3, §8.7) `GET /api/bills/:billId/events`. Registra o stream antes de ler a revisão e enviar `hello`; `retry: 3000`; `ping` a cada 15 s; mapas por conta e por sessão; 3 streams por sessão (o mais antigo é encerrado) e 10.000 por instância; `SIGTERM` com `retry: 1000`. | API-04, SPK-02 | CA-G8 (commit entre o snapshot e a assinatura) | M |
| API-16 | **Fan-out entre instâncias** (§8.4, L5). Conexão dedicada (`DATABASE_LISTEN_URL`) com `LISTEN` em `bill_events`, `session_revoked`, `presence` e `bill_deleted`; leitura única de `app.events` por instância; reconexão com backoff, `not ready` enquanto caída, revalidação de sessões e contas e novo `hello` ao voltar; métrica `event_fanout_ms`. | API-15 | teste com duas instâncias: o evento chega nas duas; queda do `LISTEN` revalida e reenvia `hello` | G |

### 6.3 Worker

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WRK-01 | **Worker** (§14). pg-boss com `migrate: false`, registro das filas, concorrência (4 jobs `ocr` por instância), encerramento gracioso, configuração (FND-06) e logs. | FND-06, DB-04, API-07 | o worker sobe com `app_runtime` e processa um job de teste | M |
| WRK-02 | **Job `ocr`** (§9.5). Baixa a imagem, chama o `ReceiptExtractor` de `OCR_PROVIDER` com orçamento de 18 s, executa `APPLY_OCR_RESULT` ou `FAIL_OCR` como comando de sistema; log `ocr_result_discarded` e métrica quando descartado. | WRK-01, CORE-15, OCR-02, OCR-04 | CA-A8 em integração; falha do provedor → `OCR_FAILED` com o código | M |
| WRK-03 | **Job `ocr-expire`** (§9.5). `EXPIRE_OCR_ATTEMPT` 25 s após o início; sem efeito se a tentativa não estiver `PROCESSING`. | WRK-01, CORE-14 | teste com relógio controlado | P |
| WRK-04 | **Job `delete-image`** (§14). Remove o objeto (inexistente é sucesso), 5 tentativas com backoff; só enfileirado por efeito transacional. | WRK-01, API-11 | rollback do comando não apaga a imagem | P |

### 6.4 Web

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WEB-01 | **App web** (§13.1, §13.7). Vite, React 19, React Router 7 e TypeScript; Tailwind v4 com os tokens do mockup; rotas de §13.1 com carregamento sob demanda (QR, câmera, telas de fechamento); catálogo de CTR-02. | FND-02, CTR-02 | o build gera a casca e chunks separados | M |
| WEB-02 | **Componentes base acessíveis** (§13.7, §13.8). `Button`, `Card`, `Sheet` (vaul), `Dialog` (Radix), `Avatar` (inicial e cor de conjunto fixo, D11), `StatusBadge` (ícone e texto), `Banner`, `SyncIndicator`. | WEB-01, DES-03 | axe sem violações; foco preso e Esc em `Sheet` e `Dialog`; toque ≥ 44 px | M |
| WEB-03 | **Entradas numéricas e formatação** (§13.7, §F7.1). `MoneyInput` (dígitos formam centavos, `inputmode="decimal"`, sem ponto flutuante), `PercentInput` (até duas casas, em bp), `Stepper`, formatação `R$ 1.234,56`. | WEB-01 | "1234" → R$ 12,34; R$ 999.999,99 sem quebra de layout em 320 px | M |
| WEB-04 | **Cliente de API** (§13.3, §F8.9). `sendCommand` com `operationId` de `crypto.randomUUID()`; operação pendente (🟡 nos cards afetados); repetição com o mesmo `operationId` (300 ms, 1 s, 3 s) em falha de rede e 503; "Não foi possível confirmar" com [Tentar novamente]; tratamento de 401, 409 (encaminha `serverState`), 422 (mensagem perto do campo), 429 e 500. | WEB-01 | um teste por status, com servidor simulado; CA-G5 do lado do cliente | M |
| WEB-05 | **Store por conta e sincronização** (§13.4, §8.2, §F8.5). Zustand por conta; `apply(revision, snapshot)` só com revisão maior; `EventSource` com `hello`, snapshot e eventos guardados; nova busca após 2 s; reconexão; a resposta do próprio comando encerra o pendente mesmo com revisão antiga. | WEB-04, API-15 | CA-G6, CA-G7, CA-G8 do lado do cliente | M |
| WEB-06 | **Prévia com `@cj/core`** (§13.4). `execute` sobre o documento local para os valores exibidos antes de enviar; nunca exibida como salva. | WEB-05, CORE-13 | prévia e servidor dão o mesmo valor nos vetores | P |
| WEB-07 | **Banners** (§F4.8, §F8.6, §13.4). Gerados de `BillEvent.notifications`; pessoais só para o próprio `participantId`; agrupados por tipo; persistentes até "Ok"; ações ([Desfazer], [Aprovar], [Recusar]) delegadas às telas. | WEB-02, WEB-05 | nenhum toast por evento; dois eventos iguais viram um banner | M |
| WEB-08 | **Tela 01 Home e identificação** (§F4.2). Textos da home; [+ Nova conta] → "Como devemos te chamar?" (nome até 30 caracteres, avatar) → `POST /api/bills` → 02. [Entrar em uma conta] em WEB-21; [Como funciona?] em WEB-51. | WEB-02, WEB-04, API-10 | E2E: criar a conta leva a 02 com sessão emitida | P |
| WEB-09 | **Telas 02 e 03 captura e prévia** (§10.1, §F4.2). `input capture="environment"` como caminho principal; visor `getUserMedia` com moldura e lanterna só se suportada; [Galeria]; [Digitar manualmente] (`ENTER_MANUALLY` → 06 vazia); câmera negada com instrução, galeria e digitação; prévia com [Usar esta foto] e [Tirar novamente]; selo de nitidez opcional (§F4.2 diz "quando disponível"). | WEB-02, DES-03, CORE-14 | CA-A2 em E2E; câmera negada mantém galeria e digitação | M |
| WEB-10 | **Compressão e envio da foto** (§10.1). `createImageBitmap` com orientação; lado maior ≤ 2.400 px; JPEG 0,85 (0,7 acima de 4 MB); original até 10 MB quando o navegador não decodifica (HEIC); multipart com `operationId`; falha de envio → nova tentativa com o mesmo `operationId` ou digitação manual, sem perder dados (§F11.I). | WEB-09, API-13 | foto de 12 MP sai com até 4 MB; o reenvio não cria segunda tentativa | M |
| WEB-11 | **Telas 04 e 05 OCR** (§9.5, §9.4, §F4.2). Miniatura; checklist ligado ao tempo ("Imagem recebida" só depois do 202; nada concluído antes do evento); [Cancelar leitura] → `CANCEL_OCR` → 02; 20 s sem resultado → `ABANDON_OCR` → 05; tela 05 com código e mensagem de §9.4, [Tentar de novo] (`RETRY_OCR`), [Tirar outra foto] (`TAKE_NEW_PHOTO`) e [Digitar manualmente]. | WEB-05, WEB-10, WRK-02, WRK-03 | CA-A1 e CA-A8 em E2E com `FakeExtractor` atrasado | M |
| WEB-12 | **Tela 06: lista e confirmação** (§F4.2, §F5.6). Itens (`qtd × unitário` ou "total da linha"); [+ Adicionar item]; subtotal e subtotal lido pelo OCR (L2); bloco de cobranças → 08; Total impresso editável e obrigatório, com confirmação extra na conta `OPEN` (§F5.6.3); "⚠ N cobranças para conferir"; aviso a partir de 50 itens; [Confirmar comanda] → 08 destacada, 09 ou 10. | WEB-03, WEB-06, CORE-16, CORE-18 | roteamento de CA-A3; confirmação de CA-A11 antes de enviar | M |
| WEB-13 | **Tela 06: mescla, excluídos, foto e descarte** (§F5.6.2, §F5.6.4). [Mesclar] quando houver par elegível; "Itens excluídos (N)" com [Restaurar] (só `OPEN`); [Ver foto], oculto sem imagem; voltar em `RECEIPT_REVIEW` com "Descartar a leitura e tirar outra foto?" → `DISCARD_RECEIPT` → 02. | WEB-12, CORE-17, API-14 | [Ver foto] oculto em CA-A2; restaurar pelo banner e pela seção | M |
| WEB-14 | **Tela 07 Editar item** (§F4.2, §F7.2). Nome, quantidade (− / +), preço conforme `priceMode`, valor derivado, troca de modo no mesmo salvamento, "sem preço unitário exato", aviso ao mudar a quantidade em `LINE_TOTAL`, [Ver comanda original], [Excluir item] com "Isso remove R$ X de …" quando dividido, `REDUCTION_BLOCKED` perto do campo. | WEB-03, WEB-06, CORE-16, CORE-17 | CA-A7 em E2E | M |
| WEB-15 | **Tela 08: cobranças da comanda** (§F4.2, §F6.5). Por cobrança: descrição, valor, percentual e base, origem do valor, distribuição, selo "Confirmada" ou [Confirmar] com o motivo, editar, remover; [+ Adicionar taxa ou desconto] com "Está na comanda?" (o ramo "Não" vem em WEB-45); aviso de percentual incompatível com [Manter assim]; modo destacado vindo de 06; quadro "Como será dividido?". | WEB-03, CORE-18 | CA-A10 em E2E | M |
| WEB-16 | **Tela 09 Divergência** (§F4.2, §F7.5). Calculado, Total impresso e Diferença; [Corrigir valores] → 06; [Ajuste de divergência] com a confirmação de §F4.2 → `CREATE_DISCREPANCY_ADJUSTMENT` com `expected.difference`. | WEB-12, CORE-18 | CA-A3 e CA-A6 em E2E | P |
| WEB-17 | **Tela 10 Confirmar comanda** (§F4.2). Checklist (itens, subtotal, taxas, total), aviso de edição aberta, [Confirmar e convidar] → `CONFIRM_RECEIPT` → 11. | WEB-12, CORE-16 | a conta vai a `OPEN` e navega para 11 | P |

### 6.5 Testes, infraestrutura e observabilidade

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| QA-01 | **Harness de integração** (§17.1, §17.3). Vitest, Supertest e Postgres real na versão do Supabase; migrações aplicadas; relógio controlável; Storage local; `FakeExtractor`; helpers para criar conta e sessões; etapa no CI. | FND-03, DB-03, OCR-02 | etapa de integração no CI rodando os testes de API-05 | M |
| QA-02 | **Harness E2E** (§17.5). Playwright com vários contextos, compose local, `FakeExtractor`, axe-core em cada tela, helpers de viewport 320 px e zoom 200%; etapa no CI. | FND-05, QA-01 | primeiro E2E (criar conta) verde no CI | M |
| INF-02 | **Imagem de container** (§16.2). Uma imagem para API e worker (`node:24-slim` ou distroless), usuário não-root, sistema de arquivos só leitura exceto `/tmp`, porta 8080, `--enable-source-maps`, SBOM. | FND-01 | a imagem roda os dois entrypoints localmente | M |
| INF-03 | **Staging na plataforma** (§16.1, §16.2). API com ao menos 2 instâncias e worker com 1; segredos pelo gerenciador (§12.3); `DATABASE_LISTEN_URL`; Vision com cota baixa; autoescala por CPU e por streams. | SPK-02, INF-01, INF-02 | `/api/ready` verde nas duas instâncias | M |
| INF-04 | **Borda de staging** (§16.3, §12.6). TLS; `/assets/*` imutável; `index.html` e `sw.js` sem cache; `/api/*` sem cache; rota de eventos sem buffer nem compressão, com timeout ocioso ≥ 120 s; IP do cliente em um único cabeçalho confiável; gzip e brotli; cabeçalhos de §12.6 com a CSP em `Report-Only`. | INF-03 | SSE de 10 min estável em staging; cabeçalhos presentes | M |
| INF-05 | **Entrega contínua para staging** (§16.4). Em `main`: build da imagem e SBOM, migrações em job separado com `app_owner`, deploy e smoke tests. | INF-03, FND-03 | merge em `main` publica em staging sem passo manual | M |
| INF-06 | **Decisão da CSP** (§12.6). Com Radix e vaul em uso, coletar violações em `Report-Only` e retirar `'unsafe-inline'` de `style-src` se nenhuma aparecer. | INF-04, WEB-02 | política final registrada em §12.6 | P |
| OBS-01 | **Telemetria base** (§15.2, A2). OpenTelemetry com auto-instrumentação de Express, `pg` e `fetch`; exportador OTLP; amostragem de 10% e 100% em erros; escolha do fornecedor (A2). | API-01, WRK-01 | traces de um comando visíveis em staging | M |

### 6.6 Produto e design

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| PRD-02 | **Lista de palavras impróprias** (§12.1). Lista versionada em pt-BR para o filtro de nomes. | nenhuma | lista entregue para CTR-03 | - |
| DES-04 | **Estados da entrada e tela 28** (§F10.3.2). Mesa cheia, link inválido, reivindicação (pedido, espera, aprovação, recusa), vaga ocupada, acesso transferido, conta excluída, tela 28. | DES-01 | desenhos aprovados antes de M2 | - |

---

## 7. M2 Entrada e identidade

### 7.1 `@cj/core`

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-19 | **Vagas e participantes** (§F5.4, §F3.3). `JOIN_AS_NEW` (`consumed: false` confirma consumo zero, D31; `joinOrder`); `TAKE_RESERVED_SEAT` (alvo `INVITED`, `SEAT_TAKEN`, notificação `RESERVED_SEAT_TAKEN`); `PRE_REGISTER_SEAT`; `RENAME_SEAT` (só `INVITED`); `UPDATE_MY_PROFILE`; `REMOVE_PARTICIPANT` (condições de §F5.4.3, efeito revogar sessões, notificação `PARTICIPANT_REMOVED`); `TABLE_FULL`. | CORE-13, CTR-03 | núcleo de CA-B2, CA-B3, CA-B4, CA-B5, CA-B9 e CA-B10; uma linha de teste por linha de §F5.4.2 | M |
| CORE-20 | **Reivindicações** (§F5.3.4, §11.3). `REQUEST_CLAIM` (alvo `ACTIVE` ou `SHARE_CLOSED`; 1 pendente por alvo e 3 por conta; `CLAIM_PENDING`); `DECIDE_CLAIM` (aprovar revoga as sessões do alvo com motivo `CLAIM` e notifica `ACCESS_TRANSFERRED`; recusar); `EXPIRE_CLAIM`; aceitos em `CLOSED`; decididas há mais de 24 h saem do documento. | CORE-13 | núcleo de CA-B7 e CA-B8 | M |
| CORE-21 | **Rotação do link** (§F5.2). `ROTATE_INVITE_LINK`, só do criador, com efeito `join_token_version++` e notificação `INVITE_LINK_ROTATED`. | CORE-13 | núcleo de CA-B11; quem não é criador → 403 | P |

### 7.2 API e worker

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| API-17 | **`joinToken`** (§11.1). `base64url(billId) . kid . base64url(MAC truncado em 128 bits)`; keyring `JOIN_TOKEN_KEYS` e `JOIN_TOKEN_CURRENT_KID`; validação com `timingSafeEqual`; qualquer falha → 404 com o mesmo corpo; o token nunca vai para snapshot, eventos ou banco. | API-04 | versão antiga, kid retirado ou MAC alterado → 404 idêntico | M |
| API-18 | **Link de convite** `GET /api/bills/:billId/invite` (§11.1, L4). Recalcula com a chave atual; responde com a conta `OPEN` e `CLOSED`. | API-17 | link novo depois da rotação (CA-B11) | P |
| API-19 | **Prévia de entrada** `POST /api/join/resolve` (§6.2, §12.7). `JoinPreview` com `hasSession` e `summary` em `CLOSED`; 404 nos demais estados; 30/10 min por IP e 60/10 min por conta, contando só MAC válido. | API-17, API-09 | `hasSession` de CA-B1; resumo de CA-B12 | M |
| API-20 | **Entrada** `POST /api/join` (§7.4, §11.3, L7). `JOIN_AS_NEW`, `TAKE_RESERVED_SEAT` e `REQUEST_CLAIM` no pipeline com ator `VISITOR`; idempotência em `entry_operations` com sessão adicional na repetição; `Set-Cookie`. Reivindicação: segredo de 32 bytes em `claim_secrets` (10 min), cookie `__Host-cjc_<claimId>` com `Max-Age=600`, 202, sessão que pediu registrada; 5/10 min por IP. | API-19, CORE-19, CORE-20 | CA-B4 e CA-B5 com `Promise.all`; CA-G3 e CA-G4 com duas sessões; repetição devolve sessão válida | G |
| API-21 | **Conclusão da reivindicação** (§11.3). `GET /api/claims/:id` (cookie de pedido, 1/s) e `POST /api/claims/:id/complete` (só `APPROVED` com segredo não consumido → sessão do alvo, consome o segredo, apaga o cookie de pedido, 201). | API-20 | CA-B7 em integração: aprovação, recusa e expiração | M |
| API-22 | **Revogação em tempo real** (§8.6). `NOTIFY session_revoked` em toda revogação (sair, reivindicação, remoção); `event: session` com o código; streams encerrados em até 5 s. | API-05, API-16 | CA-H5 em integração | P |
| API-23 | **Sair e apagar** `POST /api/bills/:billId/session/end` (§11.2). Revoga com `SIGN_OUT` e devolve o cookie expirado. | API-22 | parte do servidor de CA-H11 | P |
| WRK-05 | **Job `expire-claims`** (§11.3, §14). A cada minuto, `EXPIRE_CLAIM` nas pendentes com mais de 10 min. | WRK-01, CORE-20 | expiração de CA-B7 com relógio controlado | P |

### 7.3 Web

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WEB-18 | **Página `/entrar`** (§13.2). Lê `location.hash` antes de qualquer requisição; `history.replaceState` para `/entrar`; token só em memória; `POST /api/join/resolve`; sem scripts de terceiros; com sessão → 13. | WEB-05, API-19 | barra de endereço sem token (CA-H2); CA-B1 | P |
| WEB-19 | **Tela 12: novo participante** (§F4.3). Cartão da conta; nome e avatar; [Entrar na conta] → "Você consumiu algo nesta mesa?" → `JOIN_AS_NEW`; mesa cheia; link inválido; conta `CLOSED` → 26 e 27 só leitura (WEB-47 e WEB-48). | WEB-18, API-20, DES-04 | CA-B2 e CA-B10 em E2E | M |
| WEB-20 | **Tela 12: vaga e reivindicação** (§F5.3.3, §F5.3.4). Comparação de nomes sem caixa, acentos e espaços nas pontas; "Você é Thais, pré-cadastrada por Nery?" → `TAKE_RESERVED_SEAT`; 409 `SEAT_TAKEN` com as duas opções; nome de participante ativo → [Sou eu, pedir acesso]; [Já estou nesta conta] com a lista; espera com polling, recusa, expiração e conclusão. | WEB-19, API-21 | CA-B3, CA-B4 e CA-B7 em E2E | M |
| WEB-21 | **Home: entrar em uma conta** (§F4.2). Campo para colar o link; leitura de QR com `BarcodeDetector` e `@zxing/browser` sob demanda; destino `/entrar`. | WEB-08, WEB-18 | link colado e QR lido chegam a 12 | P |
| WEB-22 | **Tela 11 Convidar** (§F4.2). QR com `qrcode` sob demanda; contador de vagas; link abreviado; [Copiar]; [Compartilhar no WhatsApp] com `navigator.share` e alternativa; pré-cadastro (nome e avatar → `PRE_REGISTER_SEAT`); [Ir para a sala]; busca o link de novo em `INVITE_LINK_ROTATED`. | WEB-07, API-18, CORE-19 | QR e link novos para todos (CA-B11) | M |
| WEB-23 | **Tela 13 Sala** (§F4.3). Contador; lista com avatar, nome, papel e situação de consumo (presença em WEB-39); cartão de progresso; abas Sala, Itens e Pessoas; [Editar comanda]; menu ⋯ → 28; menu por participante ([Remover da conta] nas condições de §F5.4.3, [Editar nome] só `INVITED`, [Resolver] em WEB-44); banner de reivindicação com [Aprovar] e [Recusar] → `DECIDE_CLAIM`. | WEB-07, CORE-19, CORE-20 | CA-B9 em E2E; aprovação de CA-B7 pela sala | M |
| WEB-24 | **Tela 28, primeira parte** (§F4.7). [Editar meu nome e avatar], [Sair e apagar dados deste dispositivo] (com o texto extra para o criador), [Rotacionar link de convite] (só criador), com as confirmações de §F4.7. Anonimizar e excluir vêm em WEB-50. | WEB-02, API-23, CORE-21, DES-04 | CA-B8 e CA-B11 em E2E | M |
| WEB-25 | **Sessão perdida** (§13.3, §F8.9). 401 `ACCESS_TRANSFERRED` → "Seu acesso foi transferido para outro aparelho…"; `SESSION_INVALID` → entrada; `event: session`; limpeza do estado local da conta. | WEB-05, API-22 | CA-H5 em E2E | P |

### 7.4 Design

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| DES-05 | **Conflito e offline** (§F8.7, §F8.10). Diálogo de conflito 409, card pendente, estado offline. | DES-01 | desenhos aprovados antes de M3 | - |

---

## 8. M3 Divisão, presença e offline

### 8.1 `@cj/core`, API e worker

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-22 | **`SET_SPLIT`** (§F5.7). Modos; `partial` só no personalizado; validações (ao menos 1 pessoa; unidades iguais à quantidade; soma exata para confirmar e menor ou igual para parcial; sem repetição; só participantes da conta); troca de modo atômica; regras 1 a 3 de §F5.8.2; `INVALID_SPLIT`; dividir nunca confirma consumo. | CORE-13 | núcleo de CA-C1 a CA-C5 e de CA-E2 | M |
| CORE-23 | **Edição de item dividido** (§F5.6.1, §F5.6.2). Tabela de §F5.6.1 (`REDUCTION_BLOCKED`, unidades sem dono, faltante, percentuais recalculados); exclusão com atribuições (regra 4); restauração (regra 1; atribuições de removidos não voltam, com aviso). | CORE-17, CORE-22 | núcleo de CA-C6, CA-C7 e CA-C9; uma linha de teste por linha de §F5.6.1 | M |
| API-24 | **Presença** (§8.5). Upsert em `app.presence` ao abrir, a cada 15 s e ao fechar; online (até 45 s), recente (até 5 min), offline; `NOTIFY presence` agrupado (1/s por conta); `event: presence`; presença no `GET`. | API-16 | a presença nunca muda `revision`; dois aparelhos veem online e offline | M |
| API-25 | **Presença de edição** `POST /api/bills/:billId/editing` (§6.2, L3). Corpo com `itemId` ou `null`; expira em 30 s sem renovação; distribuída pelo canal de presença; conta no limite de comandos. | API-24, DOC-01 | "Thais está editando este item" aparece e some em 30 s | P |
| WRK-06 | **Limpeza das tabelas operacionais** (§5.5, §14). `purge-events` (5 min), `purge-operations` (24 h) e `purge-presence` (10 min), em lotes de 5.000 linhas. | WRK-01 | testes com relógio controlado | P |

### 8.2 Web

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WEB-26 | **Tela 14 Itens** (§F4.4). Status com texto e ícone (todas as variantes de §F4.4); total da comanda; "Ainda não distribuído"; [Editar comanda]; modo filtrado pelos itens de uma pessoa (usado por 16, 22 e pela resolução). | WEB-02, WEB-05 | o estado E-2 mostra os textos de §F4.4 | M |
| WEB-27 | **Tela 15 Pessoas** (§F4.4, §F6.4.3). Parte e situação de consumo de cada pessoa; "✓ Parte conferida"; total; toque → 16. | WEB-26 | o estado final mostra a tabela de §F4.4 | M |
| WEB-28 | **Tela 16 Detalhe da pessoa** (§F4.4, §F5.12.4). Linhas de itens, consumo, cada cobrança, ajuste de conciliação, ajuste de divergência, parcelas dispensadas riscadas, cobranças da mesa; nota de transparência; [Editar meus itens] ou [Editar itens de X] → 14 filtrada. | WEB-27 | Nery no estado final: 59,00 + 5,90 = 64,90; linha de CA-A4 para quem recebeu | M |
| WEB-29 | **Barra "Minha parte"** (§F4.8, §13.8). Nas telas 13, 14, 15, 16 e 23; "até agora" enquanto houver pendência; sufixo com a situação; `aria-live` "Sua parte agora é R$ X" no máximo a cada 5 s; toque → 22. | WEB-26 | E-2 mostra "Minha parte até agora R$ 53,90" | P |
| WEB-30 | **Tela 17 Como dividir** (§F4.4). Opções; resumo da divisão atual com aviso de substituição, que não grava; aviso de edição de outra pessoa; [Cancelar]. | WEB-26, API-25 | cancelar mantém a divisão (CA-C3); CA-C4 | P |
| WEB-31 | **Tela 18 Entre pessoas** (§F4.4). Marcação por participante (placeholders com "aguardando entrada"); valor por pessoa pela prévia; ao menos 1 pessoa; [Confirmar divisão] → `SET_SPLIT` `EQUAL`. | WEB-30, WEB-06, CORE-22 | pizza entre 3 mostra "R$ 40,00 por pessoa" | P |
| WEB-32 | **Tela 19 Unidades** (§F4.4). Stepper local por pessoa; "n de n" com barra; nunca acima da quantidade; total distribuído; [Confirmar] só em n de n. | WEB-30, WEB-03, CORE-22 | CA-C1 e CA-C3 em E2E | M |
| WEB-33 | **Tela 20 Personalizar** (§F4.4). [Valor] ou [Percentual] (um modo por item); campo por pessoa; "Dividido / Total"; "✓ Divisão confere" ou "faltam" e "sobram R$ X"; [Confirmar] só com soma exata; [Salvar parcial], nunca acima do total. | WEB-30, WEB-03, CORE-22 | CA-C2 e CA-C5 em E2E | M |
| WEB-34 | **Tela 21 Item dividido** (§F4.4). Resumo e partilhas depois da resposta do servidor ("Salvo para toda a mesa"); atalho "Você está nesta divisão. [Revisar e confirmar meu consumo]" → 22; [Editar novamente]; [Voltar para os itens]. | WEB-31 | atalho presente e nada confirmado (CA-E2) | P |
| WEB-35 | **UX de conflito** (§F8.7). Diálogo 409 com valor atual e alteração da pessoa a partir do `serverState`; [Usar valor atual] e [Editar novamente], sem busca extra; formulário aberto mostra "atualizado por Ray" e exige revisão; 422 perto do campo. | WEB-04, DES-05 | CA-G2 em E2E | M |
| WEB-36 | **Offline e indicador** (§F8.10, §13.4). 🟢 🟡 🔴; sem `ping` por 35 s ou `navigator.onLine = false` → offline; comandos bloqueados com a mensagem de §F8.10 e [Tentar novamente]; nada otimista depois de recarregar. | WEB-05, DES-05 | CA-G1 em E2E | M |
| WEB-37 | **Cache local** (§13.5). IndexedDB `bill:<id>` com snapshot e `me` para leitura offline; apagado ao sair, em 401 por transferência ou revogação, no evento `deleted` e na remoção do participante; sem imagens. | WEB-36 | cache apagado em CA-H11 | P |
| WEB-38 | **PWA** (§13.6, §F9.3). vite-plugin-pwa com precache da casca e fallback de navegação; nenhum cache de `/api/*`; manifest e ícones; banner "Nova versão disponível" com [Atualizar]; sem convite de instalação durante uma conta. | WEB-01 | o app abre offline com o último estado; `/api` nunca vem do service worker | M |
| WEB-39 | **Presença na interface** (§F5.5). Online, offline, recente e aguardando entrada na sala e nas listas; `POST /editing` ao abrir e fechar 07 e 17 a 20, renovado a cada 20 s. | WEB-23, API-24, API-25 | dois contextos: presença e "está editando" aparecem | P |

### 8.3 Testes e design

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| QA-03 | **E2E de sincronização** (§17.5). Offline (CA-G1), conflito simultâneo (CA-G2) e atualização sem recarregar e sem toast (CA-G9). | QA-02, WEB-26, WEB-35, WEB-36 | os três cenários verdes no CI | M |
| DES-06 | **Telas 22 a 27 e diálogos** (§F10.3.2). Minha parte, pendências, fechar minha parte, revisão final, conta finalizada, resumo; diálogo de resolução; aviso de reabertura. | DES-01 | desenhos aprovados antes de M4 | - |

---

## 9. M4 Confirmação e fechamento

### 9.1 `@cj/core`

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-24 | **Consumo e parte** (§F5.8.3, §F5.10). `CONFIRM_MY_CONSUMPTION`, `CONFIRM_NO_CONSUMPTION` (só sem itens), `CLOSE_MY_SHARE` (guardas `consumptionVersion` e `shareAmount`), `REOPEN_MY_SHARE`; reabertura automática com `SHARE_REOPENED` e `ITEMS_CHANGED`; vetores de CA-E1 e CA-E5 em CORE-10. | CORE-22, CORE-23 | núcleo de CA-E3, CA-E4, CA-E7 e CA-E8; campo `participantId` extra rejeitado (CA-H4) | M |
| CORE-25 | **Resolução em nome de outra pessoa** (§F5.9). `CONFIRM_ON_BEHALF`, `CONFIRM_ZERO_ON_BEHALF`, `REMOVE_ITEMS_AND_CONFIRM_ZERO` (efeito por modo, redistribuição pelo Maior Resto, restantes reabrem, item sem ninguém volta a `UNSPLIT`); origem `ON_BEHALF` com `confirmedBy`; auditoria. Acrescenta a CORE-11 a propriedade de CA-F8 (toda pendência tem ação disponível a um participante que não é só o criador). | CORE-24 | núcleo de CA-F2, CA-F4 e CA-F5; propriedade de CA-F8 verde | M |
| CORE-26 | **Ajustes da mesa e rateio explícito** (§F5.12, §F7.7.2, §F7.7.3). Escopo `TABLE` em `ADD_CHARGE` e `EDIT_CHARGE` (confirmada ao criar); `SET_WAIVER` (só taxa `RECEIPT` proporcional); edição de `splitAmong` (regra 5 de §F5.8.2) com validação da lista; vetores de §F5.12.3. | CORE-18, CORE-24 | núcleo de CA-D9, CA-D10, CA-D11, CA-D12 e CA-E5; CA-D6 rejeitado pelo comando | M |
| CORE-27 | **Fechar a conta** (§F5.13). `CLOSE_BILL`: conta `CLOSED` → `noChange` 200 antes do CAS; guarda `revision`; `OPEN_BLOCKERS`; I2; notificação `BILL_CLOSED`; itens excluídos descartados. | CORE-13 | núcleo de CA-F3, CA-F6 e CA-F7 | P |

### 9.2 Web

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WEB-40 | **Aviso de reabertura ao editor** (§F5.11). `acceptedReopens` calculado pela prévia antes de enviar; diálogo "Esta alteração vai reabrir a parte de …"; `REOPENS_NOT_ACCEPTED` → aviso atualizado; aplicado às telas 06, 07, 08, 09, 18, 19 e 20 e à resolução. | WEB-06, WEB-12, WEB-14, WEB-15, WEB-31, WEB-32, WEB-33, CORE-24, DES-06 | CA-E1 e CA-E6 em E2E | M |
| WEB-41 | **Tela 22 Minha parte** (§F4.5). Detalhe como em 16; situação; ações conforme o estado; aviso de mudança; "Ray confirmou seu consumo em seu nome às 21:40"; 409 `CONSUMPTION_CHANGED` mostra os itens novos. | WEB-28, CORE-24, DES-06 | CA-E3 e CA-B6 em E2E | M |
| WEB-42 | **Tela 24 Fechar minha parte** (§F4.5). Confirmação com o valor; comando com `consumptionVersion` e `shareAmount`; 409 `AMOUNT_CHANGED` mostra o valor novo; estado depois de fechar. | WEB-41 | CA-E4 e CA-E7 em E2E | P |
| WEB-43 | **Tela 23 Pendências** (§F4.5). Lista servida com mensagem e ação: [Ir para a falta] → 17 a 20, 08 ou 09; [Resolver] (para si mesmo → 22); [Lembrar pessoas] com `navigator.share` e texto pronto; zero pendências → [Revisar e fechar a conta]. | WEB-41, DES-06 | cada tipo de pendência de CA-F1 aparece com uma ação | M |
| WEB-44 | **Diálogo de resolução** (§F5.9, §F4.5). "Resolver por X"; consumo atual; ações 1, 2 e 3 (ou 2' e 3 para quem não informou); prévia "Thais ficará sem itens…"; volta de 14 exigindo a ação 1 ou 2; aviso de visibilidade; disponível em 13, 15, 16 e 23. | WEB-43, CORE-25 | CA-F2, CA-F4 e CA-F5 em E2E | M |
| WEB-45 | **Tela 08: ajustes da mesa e quem paga** (§F5.12, §F4.2). "Quem paga esta taxa?" (Todos, Ninguém, Escolher quem não paga); escolha de quem divide nas cobranças iguais ("defina quem divide"); seção "Ajustes da mesa" (valor fixo ou percentual sobre os itens, distribuição); ramo "Não" de "Está na comanda?". | WEB-15, CORE-26 | CA-D9, CA-D10 e CA-D12 em E2E | M |
| WEB-46 | **Tela 25 Revisão final** (§F4.6). Partes com "(resolvido por Ray)"; linhas de ajuste entre os dois totais; checks; [Fechar conta] só sem pendências; confirmação; `CLOSE_BILL` com `expected.revision`; 409 → recarrega com "A conta mudou enquanto você revisava". | WEB-43, CORE-27 | CA-F3, CA-F6 e CA-D11 em E2E | M |
| WEB-47 | **Tela 26 Conta finalizada** (§F4.6). Tabela, data e hora, "Edição bloqueada", [Ver resumo], [Opções da conta] com sessão, [Já estou nesta conta] sem sessão; também pela leitura de `/entrar`. | WEB-46, WEB-20 | CA-B12 em E2E | P |
| WEB-48 | **Tela 27 Resumo compartilhável** (§F4.6, §F9.4.6, L4). Texto puro montado sem HTML; [Compartilhar (WhatsApp)], [Copiar texto], [Copiar link]; "Total da comanda" e "Total a pagar" quando diferentes. | WEB-47, API-18 | texto copiado literal (CA-H6); totais de CA-D11 | P |
| WEB-49 | **Conta finalizada no app** (§F6.1). `BILL_CLOSED` leva as telas abertas a somente leitura e a 26; banner "A conta foi finalizada"; ações de edição ocultas. | WEB-47 | edição não é oferecida; forçada, o servidor responde 422 (CA-F3) | P |

### 9.3 Testes

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| QA-04 | **E2E do fluxo completo** (§17.5). Três contextos (Nery, Ray e Thais): criação com `FakeExtractor`, conferência, convite, entrada, divisão nos três modos, confirmação, resolução em nome, fechamento e resumo, conferindo os valores do dataset. | QA-02, WEB-44, WEB-48 | CA-D1 em E2E | M |

---

## 10. M5 Privacidade e operação

### 10.1 `@cj/core`, API e worker

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| CORE-28 | **Anonimizar e excluir** (§F5.14). `ANONYMIZE_ME` ("Participante N" por `joinOrder`, avatar neutro, aceito em `CLOSED`, auditoria); validação de `DELETE_BILL` (criador e "EXCLUIR"). | CORE-13 | núcleo de CA-H9; quem não é criador → 403 | P |
| API-26 | **Exclusão da conta** (§7.5). Transação própria: lock, `delete-image` enfileirado, auditoria da conta apagada e registro `BILL_DELETED` com `bill_ref`, sessões revogadas, `pg_notify('bill_deleted')`, `DELETE` em cascata, cookie expirado; cada instância envia `event: deleted` e encerra os streams. | API-05, API-16, CORE-28, WRK-04 | CA-H8 em integração; o link passa a 404 | M |
| API-27 | **Verificação dos limites** (§12.7). Testes de todos os limites da tabela de §12.7; métrica `rate_limit_blocked_total`. | API-09, API-13, API-19, API-20, API-21 | CA-H1: 1.000 tentativas não acham conta e recebem 429 depois do limite | P |
| WRK-07 | **Job `purge-images`** (§10.6). A cada hora: contas com `closed_at` há mais de 48 h e `image_path` preenchido → apaga o objeto e anula `image_path`. | WRK-04 | CA-H10 com relógio controlado | P |
| WRK-08 | **Job `sweep-orphan-images`** (§10.4). Diário: apaga objetos com mais de 1 h que não estão em nenhum `image_path`. | WRK-01, API-11 | objeto referenciado nunca é apagado | P |
| WRK-09 | **Retenção de sessões e auditoria** (§5.5). `purge-sessions` (marca `EXPIRATION` e remove 7 dias depois) e `purge-audit-log` (90 dias). | WRK-01 | testes com relógio controlado | P |
| WRK-10 | **Métricas de produto** (§15.3, L6). A cada 15 min: contas criadas, sem divisão e finalizadas; tempo entre confirmar a comanda e fechar; contas travadas; reivindicações pedidas, aprovadas e expiradas; remoções; sucesso do OCR; edições na tela 06 depois do OCR; sem dados pessoais. | WRK-01, OBS-01, DOC-01 | métricas visíveis em staging | M |

### 10.2 Web

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| WEB-50 | **Tela 28 completa** (§F4.7). [Anonimizar meus dados] e [Excluir conta] (digitar "EXCLUIR") com as confirmações; variante `CLOSED`; evento `deleted` → "Esta conta foi excluída" e limpeza local; acesso a partir de 26 e 27. | WEB-24, CORE-28, API-26 | CA-H8 e CA-H9 em E2E | M |
| WEB-51 | **Política de privacidade e "Como funciona?"** (§F9.5). Páginas com o conteúdo de PRD-05 e PRD-06, ligadas em 01 e 28. | PRD-05, PRD-06, WEB-50 | links acessíveis sem sessão | P |
| WEB-52 | **Acessibilidade WCAG 2.1 AA** (§F9.6, §13.8). Revisão de todas as telas: foco visível, teclado, rótulos, contraste, toque, zoom de 200%, 320 px; correções. | WEB-49, WEB-50 | QA-07 verde | M |
| WEB-53 | **Orçamento de performance** (§13.9). JS inicial ≤ 150 KB gzip; `@cj/core` ≤ 25 KB; chunks sob demanda; checagem de tamanho no CI; LCP ≤ 2,5 s em 4G no celular de referência. | WEB-49 | o CI falha ao estourar o orçamento; medição registrada | M |

### 10.3 Observabilidade e infraestrutura

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| OBS-02 | **Métricas técnicas** (§15.2). Todas as métricas da tabela, com rótulos sem dados pessoais. | OBS-01, API-16, WRK-02 | painel de staging com as métricas | M |
| OBS-03 | **Alertas** (§15.4). As oito condições, com severidade e destino. | OBS-02 | alerta de teste disparado em staging | P |
| OBS-04 | **Rastreamento de erros** (A2). Ferramenta com limpeza de dados pessoais no navegador e no servidor. | OBS-01 | erro de teste chega sem cookie, token nem nome | P |
| INF-07 | **Produção** (§16.1, §5.3). Supabase de produção em São Paulo, backup diário, segredos, plataforma e borda com o desenho de staging, domínio definitivo, Vision de produção com alerta de custo (RT6). | INF-05, PRD-03, PRD-04 | `/api/ready` verde em produção | M |
| INF-08 | **Release para produção** (§16.4). Aprovação manual, migrações de produção em job separado, deploy gradual e smoke tests; procedimento de rollback documentado e ensaiado. | INF-07 | rollback ensaiado em staging | M |
| INF-09 | **Cabeçalhos finais** (§12.6). CSP definitiva (INF-06) e demais cabeçalhos em staging e produção, com teste automatizado no smoke. | INF-06, INF-07 | `Referrer-Policy: no-referrer` e CSP conferidos (CA-H2) | P |
| INF-10 | **Runbook de segredos** (§12.3, §11.1). Rotação a cada 90 dias; rotação de `JOIN_TOKEN_KEYS` sem invalidar links vigentes; resposta a vazamento. | INF-07 | runbook revisado | P |

### 10.4 Testes e OCR

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| QA-05 | **Testes de segurança** (§17.7). Atributos de cookie; rejeição por `Origin`; ausência de token, cookie e nomes nos logs (inspeção dos logs do teste); payload de XSS em todos os campos de texto; upload malformado; rate limit; cabeçalhos da borda; DAST de base em staging a cada release. | API-27, INF-09 | CA-H2 e CA-H6 | M |
| QA-06 | **Carga** (§17.6). k6 com 300 contas × 6 streams e 50 comandos/s em staging: comando p95 ≤ 1,5 s, evento p95 ≤ 500 ms, nenhum 5xx, espera de lock p99 < 200 ms. | OBS-02, INF-03 | relatório com as metas atingidas | M |
| QA-07 | **Não funcionais e acessibilidade** (§F11.I, §F9.6). axe em todas as telas; fluxo principal só com leitor de tela (VoiceOver e TalkBack); 320 px e zoom de 200%; R$ 999.999,99; câmera negada; falha de envio da foto; reenvio sem duplicação. | WEB-52 | checklist de §F11.I completo | M |
| QA-08 | **Matriz de navegadores** (§F9.3, RT7). iOS Safari 16+, Chrome Android e navegadores de desktop atuais; navegador embutido do WhatsApp; app instalado e navegador com cookies separados (recuperação pela reivindicação). | WEB-53 | matriz preenchida e bugs abertos | M |
| OCR-06 | **Avaliação de lançamento** (§9.6). `pnpm ocr:evaluate` com o parser final; meta de §9.6 atingida ou decisão por adapter alternativo. | OCR-05, SPK-01 | relatório e decisão registrados | P |

### 10.5 Produto e jurídico

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| PRD-03 | **Marca e domínio** (D12, A4). Verificar e registrar; define `APP_ORIGIN` de produção. | nenhuma | domínio registrado antes de INF-07 | - |
| PRD-04 | **Contrato com o Google Cloud** (A3, §9.2, §F9.5). Suboperador, contrato de tratamento de dados, retenção em requisições síncronas, endpoint regional. | nenhuma | contrato assinado e endpoint definido | - |
| PRD-05 | **Política de privacidade** (§F9.5). Finalidade, retenções, provedor de OCR, direitos do titular. | PRD-04 | texto aprovado | - |
| PRD-06 | **"Como funciona?"** (telas 01 e 28). Conteúdo curto. | nenhuma | texto aprovado | - |

---

## 11. M6 Beta fechado

| ID | Task | Depende de | Pronto quando | Tam |
|---|---|---|---|---|
| PRD-07 | **Beta fechado.** Recrutar grupos, canal de feedback e roteiro de observação de uso real. | INF-08 | grupos com acesso | - |
| OPS-01 | **Operação do beta** (§15.3, §15.4). Painel com métricas de produto e técnicas, plantão para alertas altos, triagem semanal de bugs. | WRK-10, OBS-03 | métricas de §15.3 sem bloqueadores ao fim do beta | M |
| PRD-08 | **Revisão das decisões provisórias com dados.** D14 (limite de vagas), T11 (prazos), meta do OCR, RA9. | OPS-01 | decisões atualizadas em §F10 | - |

---

## 12. Caminho crítico e paralelismo

**Caminho crítico** (cadeia mais longa de dependências até o fim de M4):

```text
FND-01 → CORE-01 → CORE-02 → CORE-03 → CORE-04 → CORE-05 → CORE-06 → CORE-07 → CORE-08 → CORE-09
  → CORE-13 → CORE-16 → CORE-17 → CORE-23 → CORE-24 → CORE-25 → WEB-44 → QA-04
com API-01 → API-03 → API-04 → API-05 → API-13 → WRK-02 → WEB-11 fechando M1
```

`CORE-06` (G), `CORE-13` (G) e `API-05` (G) são as três tasks mais arriscadas do caminho: começam assim que as dependências permitem e recebem revisão dobrada.

**Trilhas que andam em paralelo desde M0:**

| Trilha | Começa com | Encontra o caminho crítico em |
|---|---|---|
| Domínio | CORE-01 | é o próprio caminho crítico |
| API e banco | DB-01, API-01 | API-05 (precisa de CORE-13) |
| Web | WEB-01 (só depende de FND-02 e CTR-02; pode começar no fim de M0) | WEB-06 (precisa de CORE-13) |
| OCR | OCR-01 | WRK-02 |
| Plataforma | SPK-02, INF-01 | INF-03 e API-15 |
| Design e produto | DES-01, PRD-01 | um marco antes de cada tela (DES-03 → M1, DES-04 → M2, DES-05 → M3, DES-06 → M4) |

---

## 13. Rastreabilidade: critério de aceite → tasks

"Marco" é aquele em que todas as tasks do CA terminam e o CA pode passar de ponta a ponta.

| CA | Tasks | Marco |
|---|---|---|
| CA-A1 | CORE-14, WEB-11, WEB-12, WEB-15 | M1 |
| CA-A2 | CORE-14, WEB-09, WEB-13 | M1 |
| CA-A3 | CORE-05, CORE-16, WEB-12, WEB-16 | M1 |
| CA-A4 | CORE-06, CORE-10, WEB-28, WEB-41 | M4 (cálculo em M0) |
| CA-A5 | CORE-05, CORE-08 | M0 |
| CA-A6 | CORE-18, API-08, WEB-07, WEB-16 | M1 |
| CA-A7 | CORE-04, CORE-16, WEB-14 | M1 |
| CA-A8 | CORE-14, CORE-15, API-13, WRK-02, WRK-03, WEB-11 | M1 |
| CA-A9 | CORE-09, CORE-16, OCR-01 | M1 |
| CA-A10 | CORE-15, WEB-12, WEB-15 | M1 |
| CA-A11 | CORE-16, API-08, WEB-07, WEB-12, WEB-19 | M2 (precisa de um segundo participante) |
| CA-B1 | API-19, WEB-18 | M2 |
| CA-B2 | CORE-19, API-20, WEB-19 | M2 |
| CA-B3 | CORE-19, WEB-20, WEB-22 | M2 |
| CA-B4 | CORE-19, API-20, WEB-20 | M2 |
| CA-B5 | CORE-19, API-20 | M2 |
| CA-B6 | CORE-19, CORE-22, WEB-20, WEB-41 | M4 (vínculo em M2; tela 22 em M4) |
| CA-B7 | CORE-20, API-20, API-21, API-22, WRK-05, WEB-20, WEB-23 | M2 |
| CA-B8 | CORE-20, API-23, WEB-24 | M2 |
| CA-B9 | CORE-19, API-22, WEB-23 | M2 |
| CA-B10 | CORE-19, WEB-19 | M2 |
| CA-B11 | CORE-21, API-17, API-18, WEB-22, WEB-24 | M2 |
| CA-B12 | API-19, WEB-19, WEB-47, WEB-48 | M4 |
| CA-C1 | CORE-22, WEB-32 | M3 |
| CA-C2 | CORE-22, WEB-33 | M3 |
| CA-C3 | CORE-22, WEB-30, WEB-32 | M3 |
| CA-C4 | WEB-30 | M3 |
| CA-C5 | CORE-04, CORE-22, CORE-23, WEB-33 | M3 |
| CA-C6 | CORE-23, WEB-14 | M3 |
| CA-C7 | CORE-23 | M3 |
| CA-C8 | CORE-04, CORE-10 | M0 |
| CA-C9 | CORE-17, CORE-23, WEB-07, WEB-13 | M3 |
| CA-D1 | CORE-07, CORE-10, QA-04 | M4 (vetor em M0) |
| CA-D2 | CORE-03, CORE-10 | M0 |
| CA-D3 | CORE-05 | M0 |
| CA-D4 | CORE-02, CORE-05 | M0 |
| CA-D5 | CORE-09, CORE-18 | M1 |
| CA-D6 | CORE-09, CORE-26 | M4 (vetor em M0) |
| CA-D7 | CORE-06, CORE-11 | M0 |
| CA-D8 | CORE-06 | M0 |
| CA-D9 | CORE-06, CORE-08, CORE-26, WEB-45 | M4 |
| CA-D10 | CORE-06, CORE-26, WEB-28, WEB-45 | M4 |
| CA-D11 | CORE-06, CORE-26, WEB-46, WEB-48 | M4 |
| CA-D12 | CORE-06, CORE-26, WEB-45 | M4 |
| CA-D13 | CORE-04 | M0 |
| CA-D14 | CORE-06, CORE-07, CORE-10 | M0 (linhas nas telas com CA-A4) |
| CA-E1 | CORE-13, CORE-23, CORE-24, WEB-07, WEB-40 | M4 |
| CA-E2 | CORE-22, WEB-34, WEB-41 | M4 |
| CA-E3 | CORE-24, WEB-41 | M4 |
| CA-E4 | CORE-24, WEB-42 | M4 |
| CA-E5 | CORE-24, CORE-26 | M4 |
| CA-E6 | CORE-13, WEB-40 | M4 |
| CA-E7 | CORE-24, WEB-42 | M4 |
| CA-E8 | CORE-22, CORE-24 | M4 |
| CA-F1 | CORE-08, CORE-27, WEB-43, WEB-46 | M4 |
| CA-F2 | CORE-25, WEB-44 | M4 |
| CA-F3 | CORE-27, WEB-46, WEB-49 | M4 |
| CA-F4 | CORE-25, WEB-44, WEB-46, WEB-48 | M4 |
| CA-F5 | CORE-25, WEB-44 | M4 |
| CA-F6 | CORE-27, API-05, WEB-46 | M4 |
| CA-F7 | CORE-27, API-05 | M4 |
| CA-F8 | CORE-08, CORE-25, WEB-43, WEB-44 | M4 |
| CA-G1 | WEB-36, QA-03 | M3 |
| CA-G2 | CORE-13, WEB-35, QA-03 | M3 |
| CA-G3 | API-05, API-20 | M2 |
| CA-G4 | CORE-09, API-05, API-20 | M2 |
| CA-G5 | API-05, WEB-04 | M1 |
| CA-G6 | API-15, WEB-05 | M1 |
| CA-G7 | WEB-05 | M1 |
| CA-G8 | API-15, WEB-05 | M1 |
| CA-G9 | API-16, WEB-26, QA-03 | M3 |
| CA-H1 | API-17, API-19, API-27 | M5 (limites implementados em M1 e M2) |
| CA-H2 | API-01, WEB-18, INF-09, QA-05 | M5 |
| CA-H3 | API-04, CORE-13 | M1 |
| CA-H4 | API-04, CORE-24 | M4 |
| CA-H5 | API-22, WEB-25 | M2 |
| CA-H6 | WEB-48, QA-05 | M5 |
| CA-H7 | API-12, API-14 | M1 |
| CA-H8 | CORE-28, API-26, WRK-04, WEB-50 | M5 |
| CA-H9 | CORE-28, WEB-50 | M5 |
| CA-H10 | WRK-07, API-14, WEB-13 | M5 |
| CA-H11 | API-23, WEB-24, WEB-37 | M3 |
| §F11.I | WEB-03, WEB-09, WEB-10, QA-07 | M5 |
| §F11.J | CORE-11 | M0 |
