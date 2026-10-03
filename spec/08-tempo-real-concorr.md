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

- Transporte: WebSocket (ou SSE — decisão técnica, ver `10`). Reconnect com backoff; ao reconectar, **fetch de estado completo** (não replay de eventos no MVP).
- Cada cliente mantém `estado local` + `estado confirmado`; alterações otimistas ficam marcadas como **pendentes** (🟡) até o ack.

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
- Cliente envia: `op`, `versaoBase` (a versão que ele leu).
- Servidor:
  - `versaoBase == atual` → aplica, `versao++`, broadcast;
  - `versaoBase < atual` → **rejeita (409)** com **`serverState`** no payload (estado atual da entidade/conta já calculado) — o cliente **re-renderiza a partir do `serverState`** sem fetch extra e **não** faz merge silencioso.

### 4.1 UX de conflito

- Operação própria rejeitada (409) → diálogo rico usando o `serverState`:
  ```text
  ⚠ A cerveja foi atualizada por João.
  Valor atual:   5 × R$ 9,00    ← serverState
  Sua alteração: 4 × R$ 9,00
  [ Usar valor atual ]   [ Editar novamente ]
  ```
  - **[Usar valor atual]**: descarta a tentativa e adota o `serverState`.
  - **[Editar novamente]**: repete a operação com `versaoBase` atualizada (nova tentativa pode falhar de novo se houver outra mutação).
- Alteração de **outro** chegando → card atualiza normalmente (sem modal).
- Edição de item: se o formulário aberto ficou obsoleto → campos ganham "atualizado por X" e o usuário reconfirma.

### 4.2 Onde NÃO usar lock

- Tela de divisão (17–20): duas pessoas podem estar na tela; **a primeira mutation com base válida vence** — `versaoBase == atual` aplica, `versaoBase < atual` é **rejeitada (409)** com re-render (§4). Não há "última gravação vence": a base obsoleta nunca sobrescreve silenciosamente. Sem cadeado.
- "EM_DIVISAO" é só informativo.

### 4.3 Onde lock é aceitável (exceção)

- Operações únicas de conta: "Fechar conta" (mutex server-side: só uma execução, estado `FINALIZADA` idempotente).

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
- [ ] Offline não persiste otimismo local após refresh.
- [ ] Reconexão traz estado consistente (fetch completo).
- [ ] "Fechar conta" simultâneo por dois → uma única FINALIZADA.
- [ ] Broadcast: alteração em A aparece em B sem reload (card in-place).
