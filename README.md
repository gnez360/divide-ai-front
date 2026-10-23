# Conta Juntos

Divisão de conta de restaurante sem complicação: fotografe a comanda, confira a leitura, convide a mesa por link e cada um divide e confirma a sua parte — sem cadastro.

Implementação local de ponta a ponta conforme as specs em [`spec/`](spec/), com o banco já apontando para o **Supabase** (ver Configuração).

## Requisitos

- Node.js >= 22
- npm (workspaces)
- Docker (opcional — só para o Postgres local de desenvolvimento isolado)

## Primeira execução

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL (Supabase) e segredos
npm run db:migrate        # aplica db/migrations no banco configurado
npm run dev               # API (3001) + web (5173)
```

Abra <http://localhost:5173>.

> O `.env` do repositório aponta para o projeto **Supabase** real (pooler, `sslmode=no-verify` — o Supabase usa CA própria fora do store do Node). Para um banco 100% local, suba o Postgres no Docker (`npm run db:up`, porta 5433) e ajuste `DATABASE_URL`/`DATABASE_LISTEN_URL`.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Orquestra tudo (`scripts/dev.mjs`): compose, espera do Postgres, migração, API e web |
| `npm run dev:api` | Só a API (porta 3001) |
| `npm run dev:web` | Só o Vite (porta 5173) |
| `npm test` | Testes de todos os workspaces (core, ocr, api) |
| `npm run typecheck` | `tsc` em todos os workspaces |
| `npm run lint` / `lint:fix` | ESLint (`eslint.config.js`), correção automática com `--fix` |
| `npm run format` / `format:check` | Prettier (`.prettierrc.json`); `--check` só acusa |
| `npm run commitlint` | Valida mensagem no stdin pelo formato conventional |
| `npm run db:up` / `db:down` | Liga/desliga o Postgres do Docker |
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run cron` | Agendador local (`scripts/cron.mjs`); `--once` roda uma vez, `--job <nome>` só um job |

## Lint e formatação

- **ESLint flat config** (`eslint.config.js`): `typescript-eslint` com `projectService` (type-aware), `no-floating-promises`, `no-explicit-any`,
  `switch-exhaustiveness-check`, `no-unused-vars` (`^_`), `react/no-danger` (via `eslint-plugin-react`), `react-hooks/rules-of-hooks` (erro) e
  `exhaustive-deps` (aviso); proibições globais de `Math.random` e `eval`.
- **Fronteiras de importação (§3.2)** via `no-restricted-imports` com padrões por pacote: `core` não importa `apps/*` nem `@cj/api`/`@cj/ocr`;
  `contracts` e `ocr` não importam nada de interno; `web` só `contracts`+`core`; `api` só `contracts`+`core`+`ocr`.
- **eslint@^9 (pin):** eslint 10 quebra os peers de `eslint-plugin-react` (≤9.7) e `eslint-plugin-import` (≤9); atualizar quando os plugins suportarem 10.
- **commitlint** (`commitlint.config.js`): `@commitlint/config-conventional`; sem hooks (husky não instalado — o repositório local não faz commits).
- Verificação do critério: um arquivo temporário com `Math.random`, `eval`, promise flutuante, `dangerouslySetInnerHTML` ou
  `import '@cj/api'` em `core` produz erros no lint.

## Catálogo de textos (CTR-02)

- **Fonte única:** `packages/contracts/src/messages.ts` — `errorMessages` (ErrorCode → mensagem canônica da API), `statusTitles` +
  `statusTitle(status)`, `problemMessages` (mensagens `message` da API), `zodMessages`, `domainMessages` (falhas `fail()`, rótulos de
  operação e descrições do core) e `ui` (telas, agrupadas por tela em `packages/contracts/src/ui/*.ts`).
- **Referência no código:** `messages.errorMessages.X`, `domainMessages.y`, `ui.<tela>.<chave>`; strings interpoladas viram funções no
  catálogo (ex.: `domainMessages.notPermittedInState(what)`).
- **Lint de contenção** (`no-restricted-syntax`): em `apps/web/src` — texto com letras em `JSXText`, atributos
  `title|placeholder|alt|aria-label|label|aria-placeholder|aria-roledescription|aria-valuetext` e acentuação em qualquer
  string/template; em `packages/api/src` + `packages/core/src` — acentuação em string/template. Código, testes e comentários ficam em
  inglês; `packages/contracts` (o próprio catálogo) é isento.
- **Buraco conhecido:** strings ASCII sem acento fora de JSX (formatos como `R$`, `2×`, identificadores) não são detectadas pelo lint —
  a regra pega letras em JSX e acentuação em qualquer literal.
- Verificação do critério: `npm run lint` zera o repositório; um literal acentuado ou texto de JSX fora do catálogo produz erro.

## Estrutura

```
packages/core      # domínio: comandos, execução, cálculo e derivação (sem I/O)
                    # test/vectors: vetores canônicos (§4.5, gerador gen-vectors.ts)
                    # test/properties: propriedades fast-check (§11.J)
packages/contracts # schemas Zod + parse de comandos (front/back compartilham)
packages/ocr       # pipeline de OCR (provider fake em dev)
packages/api       # Express: rotas, SSE, storage, crons, migração de eventos
apps/web           # PWA: React 19 + Vite 7 + React Router 7 + Tailwind 4
db/migrations      # SQL versionado (aplicado por db/migrate.mjs)
infra/             # docker-compose do PostgreSQL
spec/              # especificação funcional/ técnica
```

## Configuração (`.env`)

O loader de `.env` tem prioridade sobre variáveis do ambiente. Chaves principais (há um modelo em [`.env.example`](.env.example)):

| Variável | Default (dev) | Observação |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://app:app@localhost:5433/conta_juntos` | **5433** no Docker local; em produção use o pooler do Supabase com `?sslmode=no-verify` |
| `DATABASE_LISTEN_URL` | mesma de `DATABASE_URL` | conexão dedicada de `LISTEN`/`NOTIFY` (fan-out do SSE) |
| `PORT` | `3001` | API (ignorado na Vercel) |
| `APP_ORIGIN` | `http://localhost:5173` | Origins permitidos (CORS/CSRF); separe por vírgula |
| `OCR_PROVIDER` | `fake` | OCR sintético para dev/testes |
| `CRON_SECRET` | `dev-cron-secret` | Segredo dos jobs internos de cron (`Authorization: Bearer`) |
| `STORAGE_PROVIDER` | `fs` (dev) / `supabase` (prod) | Backend do adapter de imagem (§10.4) |
| `SUPABASE_URL` | — | projeto Supabase (Storage), só no servidor |
| `SUPABASE_STORAGE_KEY` | — | chave de serviço do Storage, só no servidor |
| `SUPABASE_STORAGE_BUCKET` | `receipts` | bucket privado das comandas |
| `JOIN_TOKEN_KEYS` / `JOIN_TOKEN_CURRENT_KID` | defaults de dev | keyring dos links de convite (§11.1); obrigatório em produção |
| `AUDIT_HMAC_KEY` | default de dev | HMAC de auditoria/IP e das URLs de upload assinadas |

## Comportamentos de dev

- **Cookies `__Host-`:** exigem origem segura — só funcionam em `localhost` (não em IP de rede local). Em dev o Vite faz proxy de `/api` para `3001`, mantendo a mesma origem.
- **OCR fake:** com `OCR_PROVIDER=fake`, o upload aceita qualquer JPEG/PNG/WebP ≤10 MB e devolve uma comanda sintética — nenhum provedor externo é chamado.
- **Cron local:** `scripts/cron.mjs` substitui o cron-job.org da spec de produção — rode `npm run cron` em outro terminal (10 jobs nos intervalos da §14; `--once` para uma execução, `--job <nome>` para um só).
- **SSE:** `/api/bills/:id/events` emite `hello`, `bill`, `presence`, `editing`, `session` e `deleted`; o front reconecta automaticamente.

## Testes

- `packages/core`: 82 (execução de comandos, cálculo, derivação, vetores canônicos e propriedades)
- `packages/api`: 23 (unidade + fluxo E2E com app real, OCR fake, SSE, crons + catálogo CTR-02)
- `packages/ocr`: 7

Os testes da API sobem o próprio servidor em porta própria e não dependem do ambiente de dev.

## Acessibilidade

- **Lighthouse/axe (mobile): `accessibility = 100` em 10 rotas** — Home, Entrar, Sala, Itens, Pessoas, Minha parte, Final, Convidar,
  Capturar e Revisar; `target-size` também passa (áreas de toque ≥ 44 px: `Button` com `min-h-11`, tabs da conta e link de voltar).
- **Landmarks:** `Screen` renderiza `header` + `main`; o layout da conta (`Account`) expõe `<main>` no outlet.
- **Contraste:** texto secundário usa `text-slate-400` (`slate-500` ficava em 4.23:1, abaixo de 4.5:1).
- Fora do alvo de a11y: SEO (`robots.txt` não existe em dev) e os audits agentic (`llms.txt`/`ai-catalog`) não se aplicam ao ambiente local.

## PWA

- **Service worker só em produção:** gerado pelo `vite-plugin-pwa` em `npm run build -w @cj/web` (precache da casca: `index.html`, JS/CSS, ícones e manifest). O dev server (5173) roda sem SW e sem ruído de console; para testar o SW use `npm run preview -w @cj/web` (4173).
- **`/api/*` nunca vem do service worker:** não há runtime caching e o `navigateFallback` nega `/api/` — offline, as chamadas de rede falham normalmente e a interface mantém o último estado local.
- **Atualização:** com um build novo disponível, aparece o banner "Nova versão disponível" com [Atualizar] / [Depois]; [Atualizar] aplica o SW e recarrega.
- **Ícones PNG** (192, 512, maskable 512, apple-touch 180): gerados por `node scripts/gen-icons.mjs` (sem dependências, replica o desenho de `public/icon.svg`).

## Deploy (Vercel)

- **Integração Git (sem CLI):** o repositório no GitHub está conectado a um projeto Vercel — push em `main` publica produção, pull request publica preview. Os arquivos da borda ficam na **raiz** (a Vercel só lê `vercel.json` e `api/` lá): `vercel.json` define build (`npm run build -w @cj/web`), saída (`apps/web/dist`), região `gru1`, headers de segurança (§12.6 da spec), cache de `/assets/*`, fallback de SPA e rewrite de `/api/*`.
- **Função Node:** `api/[[...path]].ts` embrulha o Express do `@cj/api` com init lazy (pool + `LISTEN/NOTIFY` por instância) e `maxDuration: 300`. `TRUST_PROXY_HOPS` vira `1` automaticamente quando `process.env.VERCEL` (IP real em `req.ip`, §12.7); o OCR em background usa `waitUntil` de `@vercel/functions` (o `after()` da ADR-07) — a versão está pinada em `3.6.1` por advisory de segurança.
- **Variáveis de ambiente:** configure por ambiente (Preview e Production) no dashboard da Vercel com as mesmas chaves do [`.env.example`](.env.example) / tabela acima; obrigatórios em produção `JOIN_TOKEN_KEYS`, `JOIN_TOKEN_CURRENT_KID`, `CRON_SECRET` (real), `AUDIT_HMAC_KEY`, `SUPABASE_URL`, `SUPABASE_STORAGE_KEY` e `DATABASE_URL`/`DATABASE_LISTEN_URL` do pooler com `?sslmode=no-verify`. `OCR_PROVIDER` fica `fake` até o adapter real (API-28).
- **Crons:** agendador externo (cron-job.org, INF-11) chamando `POST /api/cron/*` com `Authorization: Bearer $CRON_SECRET` — não usar o Vercel Cron (a spec fecha com ADR-14).

## Notas conhecidas

- `npm audit` reporta advisories em `vitest`/`tinypool`/`@vitest/mocker` (somente toolchain de teste). A correção disponível é `vitest@5` (breaking change) e não foi aplicada.
