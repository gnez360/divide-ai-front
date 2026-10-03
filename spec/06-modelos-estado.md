# 06 — Modelos de Estado

Três máquinas independentes. Substitui e consolida §32/§52/§65–§67 do braindump (sem duplicação).

---

## 1. Máquina da CONTA

```text
CRIANDO
   │ (enviou imagem)
   ▼
OCR_PROCESSANDO ──falha/timeout──▶ OCR_ERRO ──retry──▶ OCR_PROCESSANDO
   │ sucesso                          │ "digitar manualmente"
   ▼                                  ▼
AGUARDANDO_CONFERENCIA ◀──────────────┘
   │ "Confirmar comanda" (divergência resolvida: Σ = total impresso ± 5¢)
   ▼
AGUARDANDO_PARTICIPANTES ◀────┐
   │ (primeiro item dividido) │ (0 participantes além do criador não impede)
   ▼                          │
DIVISAO_EM_ANDAMENTO ──────────┘
   │ zero pendências + "Fechar conta" (qualquer participante)
   ▼
FINALIZADA          (permanente no MVP — sem transição de saída)
```

**Regras de transição:**

| Transição | Gatilho | Guarda |
|---|---|---|
| CRIANDO → OCR_PROCESSANDO | imagem confirmada (03→04) | — |
| OCR_PROCESSANDO → OCR_ERRO | falha, formato inválido, timeout | — |
| OCR_ERRO → OCR_PROCESSANDO | "Tentar de novo" | — |
| OCR_ERRO → AGUARDANDO_CONFERENCIA | "Digitar manualmente" | tela 06 vazia |
| AGUARDANDO_CONFERENCIA → AGUARDANDO_PARTICIPANTES | "Confirmar e convidar" (10) | `|Σ − total impresso| ≤ 5¢` |
| AGUARDANDO_CONFERENCIA → DIVISAO_EM_ANDAMENTO | (possível: editar itens já na sala) | — |
| qualquer → DIVISAO_EM_ANDAMENTO | primeira divisão confirmada | — |
| DIVISAO_EM_ANDAMENTO → FINALIZADA | "Fechar conta" (25) | **zero pendências** |
| ↔ estados de sync | ver `08-tempo-real-concorr.md` | offline não transiciona no servidor |

**Estado ≠ sincronização:** 🟢/🟡/🔴 são dimensões separadas (qualquer estado pode estar offline).

---

## 2. Máquina do ITEM

```text
NAO_DIVIDIDO ──confirmar divisão──▶ DIVIDIDO
     ▲                                │
     │ "trocar modo" (com confirmação)│ edição que invalida
     └────────────────────────────────┤
                                      ▼
EM_DIVISAO ⇄ DIVISAO_INCOMPLETA
```

| Estado | Definição operacional |
|---|---|
| `NAO_DIVIDIDO` | Nenhuma atribuição confirmada. |
| `EM_DIVISAO` | Tela de divisão aberta por alguém (estado efêmero, **não bloqueia** os outros — sem lock; ver `08`). Visível como "editando…" opcional. |
| `DIVISAO_INCOMPLETA` | Divisão confirmada mas **não fecha**: unidades `n/n` incompletas OU soma de personalização ≠ valor do item. Gera pendência. |
| `DIVIDIDO` | Divisão confirmada e fecha (Σ atribuições = valor do item; unidades todas distribuídas). |

Transições:

- `DIVIDIDO → EM_DIVISAO`: usuário toca em "Editar novamente" (17).
- `DIVIDIDO → DIVISAO_INCOMPLETA`: edição da comanda cria excedente (ex.: 4→5 cervejas: fica `4/5`) — **nunca destrói** a divisão (`05` §6.1).
- `DIVIDIDO → NAO_DIVIDIDO`: troca de modo (com confirmação) **ou** exclusão do item.
- Item **personalizado** com soma ≠ valor nunca sai de `DIVISAO_INCOMPLETA` (validação impede confirmar).

---

## 3. Máquina do PARTICIPANTE

```text
CONVIDADO ──entrou (link/token)──▶ ATIVO ⇄ PARTE_CONFERIDA
 (placeholder)                        │            │
                                      │            └─ reabertura voluntária OU
                                      │               reabertura por edição afetada
                                      │               ("Sua parte foi alterada")
                                      │
                                      └─ NAO_INFORMOU ⇄ consumoConfirmado (flag, não estado)
```

| Estado | Definição |
|---|---|
| `CONVIDADO` | Pré-cadastrado (vaga), nunca acessou. Sinalizado "Aguardando entrada". Pode já ter atribuições. |
| `ATIVO` | Entrou (tem `dispositivoToken`). Pode editar, dividir, ver tudo. |
| `PARTE_CONFERIDA` | Marcou a própria parte como conferida ("Fechar minha parte"). Vê tudo, não edita a própria parte (reabre com aviso se afetada). |

**Flags (não estados):**

- `presença`: online/offline/conectado recentemente (`05` §5).
- `consumoConfirmado`: booleano → o próprio participante confirmou/revisou seu consumo. `false` + nada atribuído = `NAO_INFORMOU` (pendência); `false` + valor atribuído = "⏳ Aguardando confirmação"; confirmou com R$ 0,00 = `SEM_CONSUMO`. Detalhe em `05` §7.
- `estadoPagamento`: `ABERTO` no MVP; `PAGO` **pós-MVP** (sem UI agora).

**Transições especiais:**

| Gatilho | Efeito |
|---|---|
| Reabrir link no mesmo dispositivo | reconecta (mesmo id, token) |
| Nome igual a placeholder ao entrar | `CONVIDADO → ATIVO` (vincula) |
| "Fechar minha parte" | `ATIVO → PARTE_CONFERIDA` |
| Edição afeta parte conferida | `PARTE_CONFERIDA → ATIVO` + aviso obrigatório |
| "Reabrir minha parte" | `PARTE_CONFERIDA → ATIVO` |
| Conta → FINALIZADA | estados congelam em `PARTE_CONFERIDA`/`ATIVO` (transição final não obrigatória para quem não fechou) |

`PAGO` (do braindump §67) **sai do MVP** com o pagamento.

---

## 4. Sincretismo entre máquinas

| Evento | Conta | Item | Participante |
|---|---|---|---|
| OCR falha | `OCR_ERRO` | — | — |
| Primeira divisão | → `DIVISAO_EM_ANDAMENTO` | `NAO_DIVIDIDO→DIVIDIDO` | — |
| Editar item dividido | mantém | `→ DIVISAO_INCOMPLETA` | partes afetadas → `ATIVO` + aviso |
| Alguém fechar parte | mantém | — | `ATIVO→PARTE_CONFERIDA` |
| Pendência criada | mantém | `→ DIVISAO_INCOMPLETA` | `NAO_INFORMOU` flag |
| "Fechar conta" | → `FINALIZADA` | freeze | freeze |

Todos os eventos acima são **broadcast** em tempo real (`08`).
