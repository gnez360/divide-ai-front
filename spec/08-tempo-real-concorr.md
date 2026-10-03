# 08 — Tempo Real e Concorrência

Consolida §37–§43 do braindump.

---

## 1. Princípios

1. **Backend é a fonte única da verdade.** O cliente nunca decide sozinho se uma alteração é válida.
2. **Atualização visual direta nos cards** — sem toast/log por evento (princípio 6: realtime visual, não intrusivo).
3. **Nada aparece como salvo antes do ack do servidor.**
4. **Optimistic concurrency + versionamento** por entidade; locks explícitos só onde estritamente necessário (nunca por "alguém abriu a tela de edição").

---

## 2. Modelo de sincronização

```text
Celular → Solicitação (op + versão base) → Servidor
   → valida (regras de 07 + permissões de 05)
   → atualização atômica (incrementa versão)
   → novo estado → Broadcast → todos os celulares
```

- Transporte: **REST (mutações) + SSE (down-channel)** — provisória da 2ª rodada (T2); WebSocket registrado em `10` como alternativa. Reconnect com backoff; ao reconectar, **fetch de estado completo** (não replay de eventos no MVP).
- Cada cliente mantém `estado local` + `estado confirmado`; alterações otimistas ficam marcadas como **pendentes** (🟡) até o ack.
- Broadcast **após o commit** (outbox/transação; nota técnica em `10`): nenhum evento sai do servidor antes da gravação ser confirmada.
- Cada evento carrega `eventId` (dedupe) e `conta.revisao` (ordenação).

---

## 3. Eventos broadcast

Relevância: **todos os eventos atualizam a UI in-place**; notificação explícita (banner) só para eventos importantes:

| Categoria | Eventos | UI |
|---|---|---|
| **Rotina** (silenciosa) | item alterado, divisão alterada, qtd alterada, item concluído, cobrança alterada | card muda no lugar |
| **Presença** | entrou, saiu, desconectou | lista/status atualiza |
| **Importante** (banner leve) | participante fechou parte, conta finalizada, **"sua parte foi alterada"** | banner/aviso persistente até acknowledge |
| **Erro** | conflito de versão, operação rejeitada | aviso + refresh do objeto |

Proibido: "João adicionou cerveja" como toast sequencial para cada mudança.

---

## 4. Versionamento e conflito

- Toda entidade editável tem `versao` (Conta, Item, Cobranca, Participante).
- **`Conta.revisao: int64`** — contador monotônico incrementado **a cada mutation aplicada na conta** (não é `versao` de escrita): serve para **ordenar eventos**, montar **snapshots** e fazer **CAS do fechamento** (§4.3). **Não** gera 409 entre operações não relacionadas — conflito de edição é sempre **por entidade** (síntese P0-10 com Gemini 3.2; ver nota abaixo).
- Cliente envia: `op`, `versaoBase` (a versão da entidade que ele leu) e `operationId` (chave de idempotência).
- Servidor (transação única — 07 §7):
  - `versaoBase == atual` → aplica, `versao++` (+ `conta.revisao++`), broadcast;
  - `versaoBase < atual` → **rejeita (409)** com **`serverState`** no payload — o cliente **re-renderiza a partir do `serverState`** sem fetch extra e **não** faz merge silencioso;
  - **idempotência**: chave única `(contaId, operationId)` — repetição devolve **a resposta original** (não reexecuta; reenvio de rede ≠ duplicação).

`serverState` (409/422) traz, sempre sem tokens: `contaId`, `contaRevisao`, `entidade` (estado atual), `partesAfetadas[]`, `pendencias[]`, `totais` (derivados de 02), `estadoConta`.

> **Síntese das duas revisões:** 409 de **edição** continua por entidade (nunca por causa de operações de outras entidades — Gemini 3.2); `contaRevisao` ordena/snapshota/CASa, mas não reprova mutações vizinhas (GPT P0-10). Fechamento e entrada de vaga são os únicos pontos com CAS de conta inteira.

### 4.1 UX de conflito

- Operação própria rejeitada (409) → diálogo rico usando o `serverState`:
  ```text
  ⚠ A cerveja foi atualizada por João.
  Valor atual:   5 × R$ 9,00    ← serverState
  Sua alteração: 4 × R$ 9,00
  [ Usar valor atual ]   [ Editar novamente ]
  ```
  - **[Usar valor atual]**: descarta a tentativa e adota o `serverState`.
  - **[Editar novamente]**: **reabre o formulário** já preenchido com os valores atuais — **nunca reenvia a operação automaticamente**; o usuário revisa e envia de novo com `versaoBase` atualizada (pode falhar de novo se houver outra mutação).
- Alteração de **outro** chegando → card atualiza normalmente (sem modal).
- Edição de item: se o formulário aberto ficou obsoleto → campos ganham "atualizado por X" e o usuário reconfirma.

### 4.2 Onde NÃO usar lock

- Tela de divisão (17–20): duas pessoas podem estar na tela; **a primeira mutation com base válida vence** — `versaoBase == atual` aplica, `versaoBase < atual` é **rejeitada (409)** com re-render (§4). Não há "última gravação vence": a base obsoleta nunca sobrescreve silenciosamente. Sem cadeado.
- "EM_DIVISAO" é só informativo (06 §2).

### 4.3 Onde lock/CAS de conta é aceitável (exceção)

- **Fechar conta**: CAS na transação — `estado ≠ FINALIZADA ∧ contaRevisao == revisaoBase ∧ pendenciasAtivas == 0` → senão **409/422** com `serverState` (nada de trava liberada por tempo). Estado `FINALIZADA` é **idempotente** (reenvio devolve sucesso).
- **Entrar em vaga**: CAS — `vaga CONVIDADO ∧ token válido ∧ vagasOcupadas < limite` → senão erro claro ("Esta vaga já foi ocupada").
- Mutex server-side garante uma única execução de cada operação única.

### 4.4 Eventos: ordenação e dedupe

| Situação | Regra |
|---|---|
| `eventId` já aplicado (replay/reconexão) | **ignora** (dedupe) |
| `contaRevisao` do evento ≤ local | evento velho → **ignora** (mantém estado mais novo) |
| `contaRevisao` do evento > local + 1 (**salto**) | cliente perdeu evento → **fetch de estado completo** (snapshot), não replay |
| evento duplicado no stream | aplica uma vez |

### 4.5 Tabela de erros (contrato)

| HTTP | Quando | Front-end |
|---|---|---|
| **400** | payload malformado | bug — loga, não mostra retry ao usuário |
| **401** | sessão inválida/expirada | rotação de token (09 §4) ou re-entrada |
| **403** | papel insuficiente (ex.: não-criador editando comanda) | mensagem sem vazamento de estado |
| **409** | `versaoBase`/CAS obsoleto | diálogo rico com `serverState` (§4.1) |
| **422** | regra de domínio violada (Σ ≠, parte negativa, saldo ≠ 0 no fechamento, vaga ocupada) | mensagem de regra + valores corretos |
| **423** | comanda em modo edição por outro (`AGUARDANDO_CONFERENCIA`) | "X está revisando a comanda" |
| **500** | falha interna / invariante 1 violada (07 §7) | "não foi possível salvar" + retry + refresh |
| **rede** | sem ack | 🟡/🔴 (§5–§6); **nunca** assume sucesso |

---

## 5. Indicadores de sincronização (UI global)

| Indicador | Condição |
|---|---|
| 🟢 **Sincronizado** | sem operações pendentes, conectado |
| 🟡 **Sincronizando…** | ≥1 operação sem ack (cards afetados com estilo "pendente") |
| 🔴 **Você está offline** | `navigator.onLine = false` ou heartbeat falho |

Regra de ouro: **operação offline ≠ salva**. Nenhum otimismo "assume sucesso" sem conexão.

---

## 6. Comportamento offline (MVP)

- **Pode:** visualizar o último estado conhecido (cache local da conta), indicador 🔴 claro.
- **Não pode:** confirmar divisões, editar comanda, fechar partes/conta — com mensagem:

  ```text
  🔴 Você está offline.
  Não foi possível confirmar esta alteração.
  [ Tentar novamente ]
  ```

- **Proibido:** marcar card como "✓ dividido" sem ack.
- Colaboração offline completa (fila de operações, merge offline) = **fora do MVP** (`10`).

---

## 7. Presença

- Heartbeat a cada ~15s; `offline` após 3 misses (≈45–60s).
- Presença é informativa (`05` §5), não bloqueia operações.
- Queda de conexão de um participante **não** remove dados nem bloqueia a mesa.

---

## 8. Requisitos de teste (concorrência)

- [ ] Dois clientes editando o mesmo item: segundo `409` + UI de conflito.
- [ ] Divisão confirmada por dois ao mesmo tempo: primeira mutation com `versaoBase` válida vence, a segunda recebe 409; Σ continua = valor do item.
- [ ] Operações **não relacionadas** (item A e item B) simultâneas: **ambas aplicam** (não há 409 por `contaRevisao`).
- [ ] Mesmo `operationId` reenviado (retry de rede): aplica **uma vez**; resposta idêntica (H14).
- [ ] Evento duplicado/replay e evento com salto de `contaRevisao` → dedupe / fetch de snapshot (§4.4).
- [ ] Dois tentando ocupar a mesma vaga: um entra, outro recebe "vaga já ocupada" (CAS, H11).
- [ ] "Fechar conta" simultâneo por dois → uma única FINALIZADA (CAS: estado + revisão + pendências).
- [ ] Fecho com pendência que surge entre leitura e commit → rejeitado com `serverState` (pendência recalculada no servidor).
- [ ] Offline não persiste otimismo local após refresh.
- [ ] Reconexão traz estado consistente (fetch completo).
- [ ] Broadcast: alteração em A aparece em B sem reload (card in-place).
