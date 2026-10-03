# 03 — Fluxos

Fluxo em **grafo** (não linha reta): há loops, condicionais e caminhos paralelos. Cada nó referencia a tela em `04-telas.md`.

## 1. Visão geral

```text
                    ┌─────────────────────────────────────────────┐
                    │                CRIAÇÃO                      │
  [01 Home] ──nova──▶ [02 Capturar] ─▶ [03 Prévia] ─▶ [04 OCR]   │
       │                                   ▲              │       │
       │                              tirar novamente      │       │
       │                                                   ▼       │
       │                                        ┌──── sucesso ───┐ │
       │                                        ▼                │ │
       │                              [06 Conferir comanda] ◀─┐  │ │
       │                                        │        falha│ │ │
       │                                        ▼             │ │ │
       │                              [05 Fallback manual] ───┘ │ │
       │                                        │               │ │
       │                     loop editar ◀──────┤               │ │
       │                     [07 Item] [08 Taxas]               │ │
       │                                        ▼               │ │
       │                              [09 Divergência]? ──corrigir─┘
       │                                  │ confere/confirmar
       │                                  ▼
       │                              [10 Confirmar] ─▶ [11 Convidar]
       │
       └──entrar──▶ [12 Entrar] ─▶ [13 Sala] ─▶ ┌──────────────────┐
                                                │   DIVISÃO (loop) │
                              [14 Itens] ◀─────▶│  [17 Como dividir│
                              [15 Pessoas]      │   18/19/20]      │
                              [16 Detalhe]      │  [21 Item dividido]
                              [22 Minha parte]  └──────────────────┘
                                                │
                                                ▼
                                    [23 Pendências]? ──resolver──▶ volta a 17/18/19/20
                                                │ zero pendências
                                                ▼
                                    [25 Revisão final] ─▶ [26 Conta finalizada]
                                                │                 │
                                                │                 ▼
                                    [24 Fechar minha parte       [27 Resumo]
                                     (paralelo, a qualquer momento)]
```

---

## 2. Fluxo de criação (atores: criador)

| Passo | Tela | Condicional |
|---|---|---|
| 1 | 01 Home → "Nova conta" | — |
| 2 | 02 Capturar (foto ou galeria) | — |
| 3 | 03 Prévia → "Usar esta foto" | "Tirar novamente" volta ao passo 2 |
| 4 | 04 Processando OCR | **falha → 05 Fallback manual**; sucesso → 06 |
| 5 | 06 Conferir comanda | loop: 07 editar item / 08 taxas a qualquer momento |
| 6 | 09 Divergência (só se Σ ≠ total impresso) | "Corrigir" → 06/07/08; tolerância ≤ 5¢ passa direto |
| 7 | 10 Confirmar comanda | — |
| 8 | 11 Convidar (QR/link) | — |

**Após o passo 8 a conta está em AGUARDANDO_PARTICIPANTES e qualquer participante pode editar a comanda** (edição aberta).

### Fallback manual (tela 05)

- OCR falhou (ou usuário escolheu "digitar manualmente") → 06 com **lista vazia** + ação "Adicionar item" + acesso a 08.
- Obrigatório: nunca existe conta sem caminho de entrada manual.

---

## 3. Fluxo de entrada (atores: qualquer um)

```text
11 Convidar ──link/QR──▶ 12 Entrar (nome + avatar opcional)
                            │
                 tem token no dispositivo?
                    ├── sim → reconecta ao mesmo participante (mesma pessoa)
                    └── não → cria participante ATIVO com o nome digitado
                            ▼
                          13 Sala (presença, 3/6 vagas)
                            ▼
                    entra no loop de divisão
```

- Pré-cadastros (placeholders) já existem em 13 antes de a pessoa entrar: ao entrar com nome igual à vaga (ou via link de convite dedicado), **vincula à vaga** em vez de criar novo.
- Atribuir item a placeholder é permitido (sinalizado); ao entrar, a pessoa vê o que foi marcado nela e pode remover (ver `05-regras-dominio.md`).

---

## 4. Loop de divisão (atores: qualquer participante)

```text
[14 Itens] ── tocar no item ──▶ [17 Como dividir?]
                                    ├── [18 Entre pessoas]  ──▶ confirmar ──▶ [21 Item dividido]
                                    ├── [19 Unidades]       ──▶ confirmar ──▶ [21]
                                    └── [20 Personalizar]   ──▶ confirmar ──▶ [21]
[21] ── "editar novamente" ──▶ [17]     (divisão existente é substituída na troca de modo,
                                         com confirmação — ver 05)
[13/14/15/19] mudou em tempo real ──▶ card atualiza in-place (sem toast)
```

Condições:

- Unidades: botão confirmar só habilita em `n de n` (nunca 5 de 4).
- Personalizar: confirmar só com soma = valor do item (tolerância 0).
- Item de placeholder aparece sinalizado "aguardando entrada".

---

## 5. Paralelo: fechar minha parte (atores: qualquer participante)

Pode acontecer **a qualquer momento** depois que a pessoa tem parte calculada, independente do restante:

```text
[22 Minha parte] ─▶ [24 Fechar minha parte] ─▶ estado PARTE_CONFERIDA
      │                                              │
      │                                              ├▶ continua podendo VER tudo
      │                                              └▶ se um item que ela consumiu
      │                                                 for alterado → PARTE_CONFERIDA
      │                                                   volta a ATIVO + aviso
      │                                                   "sua parte foi alterada"
      └▶ "Voltar para a conta" (13/14)
```

A conta dos demais continua aberta. Quem está com parte fechada **não é bloqueado de editar** — mas editar a própria parte fechada é reabrir (com aviso).

---

## 6. Fechamento da conta (atores: qualquer participante — só com zero pendências)

```text
[23 Pendências] ── houve pendência ──▶ resolver (volta ao loop de divisão)
       │                               pendência "não informou" → só o CRIADOR
       │                               resolve explicitamente (R$0 / dividir todos / personalizar)
       ▼ zero pendências
[25 Revisão final] ─▶ "Fechar conta" ─▶ confirmação ─▶ [26 FINALIZADA] ─▶ [27 Resumo]
```

- O botão "Fechar conta" só habilita com **zero pendências** (regra de segurança: qualquer participante pode fechar, mas nunca com pendência aberta).
- Após FINALIZADA: nenhuma edição (itens, divisões, participantes). Sem reabertura no MVP (ver `10-decisoes-aberto.md`).

---

## 7. Estados transversais (afetam todos os fluxos)

| Estado | Comportamento no fluxo |
|---|---|
| 🟢 Sincronizado | normal |
| 🟡 Sincronizando | operação em andamento; cards não confirmados são visivelmente "pendentes" |
| 🔴 Offline | leitura do último estado; operações críticas bloqueadas com "Tentar novamente"; **nada é mostrado como salvo antes do servidor** |

A partição offline detalhada está em `08-tempo-real-concorr.md`.

---

## 8. Fora do fluxo do MVP (pós-MVP, ver `10-decisoes-aberto.md`)

- 25 Pagamento por terceiros e 27 Pix (telas antigas) — removidas do fluxo.
- Histórico ( Home ).
- Reabertura de conta finalizada.
