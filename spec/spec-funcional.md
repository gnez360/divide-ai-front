# 01 — Visão e Escopo

## 1. Visão do produto

PWA mobile-first para dividir contas de restaurante de forma colaborativa.

O usuário fotografa a comanda, o sistema interpreta (OCR) itens e valores, os participantes entram por QR Code ou link sem instalar nada e cada pessoa informa o que consumiu. O sistema calcula quanto cada um deve pagar, incluindo taxas, descontos e arredondamentos.

### Princípio central

> **O usuário informa o que consumiu. O sistema resolve a matemática.**

O usuário não precisa entender proporções, rateios, percentuais, arredondamentos, distribuição de taxas nem cálculos de centavos.

### Princípio final

Para o usuário, a experiência deve ser:

```text
📸 Fotografe a conta → 👥 Convide → 🍽️ Cada um marca o que consumiu → 💰 Veja sua parte
```

O produto resolve todo o restante automaticamente.

---

## 2. Domínio conceitual

Três conceitos separados orientam todas as decisões funcionais:

```text
┌───────────────────────┐
│       COMANDA         │  O que o restaurante cobrou
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│       CONSUMO         │  Quem consumiu cada item e como foi dividido
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│      PAGAMENTO        │  Quem efetivamente pagará cada valor
└───────────────────────┘
```

**Comanda → Consumo → Pagamento.**

No MVP a camada PAGAMENTO existe no modelo de dados (para não remodelar depois), mas **não possui interface**: não há Pix, nem "Já paguei", nem pagamento por terceiros. A interface termina em "quanto cada um deve" + resumo compartilhável.

---

## 3. Princípios de UX

1. Perguntar **"O que você consumiu?"**, nunca "Qual percentual deseja atribuir?".
2. Perguntar **"Como dividir este item?"**, nunca expor conceitos técnicos.
3. O convidado não instala nada, não cria conta, não informa e-mail.
4. O usuário deve perceber imediatamente quanto está pagando.
5. A matemática fica escondida.
6. O realtime é visual, não intrusivo (atualização direta nos cards, não toast por evento).
7. O OCR deve ser editável de maneira extremamente rápida.
8. **Nenhuma cobrança deve ser presumida silenciosamente** (nenhuma taxa inventada, nenhum item atribuído automaticamente).
9. **Nada é confirmado por silêncio**: atribuição feita por terceiros não confirma o consumo; a conta só fecha com zero pendências e resoluções explícitas (`05` §7).

---

## 4. Atores

| Atores | Descrição |
|---|---|
| **Criador** | Quem iniciou a conta (identificado **antes** da comanda — `10` D15). Pré-cadastra participantes, edita comanda, resolve pendências de participantes ("não informou"/"não confirmou"/aguardando entrada) com **origem visível** ("Resolvido por X"). |
| **Participante** | Quem entra por link/QR ou foi pré-cadastro pelo criador. Sem cadastro, sem login. |

**No MVP, criador e participante têm as mesmas permissões de edição de comanda e divisão** (decisão: edição aberta). As diferenças do criador são: pré-cadastro de participantes e resolução explícita de pendências de terceiros (ver `05-regras-dominio.md`).

O criador **também é um participante** da divisão.

---

## 5. Escopo do MVP

### Dentro do MVP

- Criar conta, fotografar/selecionar comanda, OCR com **fallback manual obrigatório**.
- Revisão e edição completa (itens, taxas, descontos), validação de total com tolerância de 5 centavos.
- Convite por QR Code/link, entrada sem cadastro (token de dispositivo), pré-cadastro pelo criador.
- Limite de **6 vagas por conta** (entrados + pré-cadastros), configurável.
- Presença, tempo real, indicador de sincronização, estado offline honesto.
- Três modos de divisão: entre pessoas / distribuir unidades / personalizar (valor ou %).
- Minha parte, visão de pessoas, detalhe por pessoa, fechar minha parte.
- Pendências (inclui "não confirmou" bloqueando), revisão final, fechamento da conta, resumo compartilhável.
- **[Ajuste de comanda]** na divergência > 5¢ (cobrança explícita, sem "Confirmar assim mesmo").
- **[Sair e apagar dados deste dispositivo]** (revoga sessão + cache local).
- Regras de cálculo: taxas, descontos, distribuição proporcional, arredondamento determinístico, invariantes (parcial e de fechamento).

### Fora do MVP

- **Pagamento**: Pix, "Já paguei", pagamento por terceiros, status PAGO (pós-MVP).
- Histórico de contas, cardápio/restaurantes, múltiplas moedas.
- Despesas domésticas, aluguel, recorrência, grupos permanentes.
- Integração bancária, estatísticas, exportação contábil, gestão financeira.
- Notificações push (o "Lembrar pessoas" do MVP usa compartilhar/WhatsApp com texto pronto).
- Colaboração offline completa (MVP: leitura do último estado + bloqueio de operações críticas).

### Pós-MVP registrado em `10-decisoes-aberto.md`

Purga da foto 48h pós-fechamento (decidida — `10` D1), TTL da conta por inatividade, provedor de OCR, provedor de realtime, histórico, cardápio.

---

## 6. Público e contexto de uso

- Mobile-first, uso **com uma mão, em pé ou na mesa do restaurante**.
- Prioridade de responsividade: celular > tablet > desktop.
- Idioma: pt-BR.
- Funciona como PWA (instalável, câmera, share nativo).

---

## 7. Referências

- Braindump original: `braindump-spec.md` (80 seções).
- Telas originais: `braindump-telas.md` + `telas.png` (regenerar com numeração canônica — ver `10-decisoes-aberto.md`).
- Fluxo: `03-fluxos.md` · Telas: `04-telas.md` · Regras: `05` a `08`.
# 02 — Glossário e Modelo de Dados

## 1. Glossário

| Termo | Definição |
|---|---|
| **Conta** | Sessão colaborativa de uma divisão de mesa. O que a spec chama de "sessão". Identificada por ID compartilhável. |
| **Comanda** | A conta do restaurante: itens, quantidades, preços, taxas, descontos e total impresso. Camada "o que foi cobrado". |
| **Item** | Linha da comanda (nome, quantidade, preço). O **total da linha** ou o **unitário** é a autoridade (ver `07 §1`). Pode ser dividido de 3 formas. |
| **Taxa / Adicional** | Cobrança sobre o consumo (serviço, couvert, gorjeta...). Nunca presumida: vem da comanda ou é adicionada pelo usuário. |
| **Desconto** | Dedução sobre o consumo. Participa do cálculo final. |
| **Divisão** | Como o item foi atribuído aos participantes. Modos: entre pessoas, unidades, personalizada. |
| **Consumo** | Camada do domínio: quem deve cada item, já com taxas/descontos rateados. |
| **Parte** | O total individual de um participante (consumo + taxas - descontos rateados). |
| **Fechar minha parte** | Ação individual que marca a parte como **conferida com o estado atual** da divisão (ela pode ir embora). Pode mudar até a conta finalizar; se a comanda mudar, a parte reabre com aviso. Não fecha a conta. Enquanto houver pendências, a barra global lê "Minha parte **até agora**". |
| **Fechar conta** | Ação final que bloqueia toda a divisão (estado FINALIZADA). |
| **Participante** | Pessoa na conta. Pode ter sido pré-cadastrado (vaga) ou ter entrado pelo link. |
| **Vaga** | Limite de 6 = entrados + pré-cadastros. |
| **Placeholder** | Participante pré-cadastrado que ainda não entrou (estado "aguardando entrada"). |
| **Pendência** | Algo que impede o fechamento (item não dividido, unidade sobrando, "não informou", "não confirmou", aguardando entrada, cobrança não confirmada, divergência). Tipos em `§2`. |
| **Pagamento** | Camada do domínio (quem paga o quê). **Fora do MVP na interface.** |

---

## 2. Modelo de dados (entidades)

```text
Conta
├── id: string (aleatório, indevinhável)
├── nomeRestaurante?: string
├── mesa?: string
├── numeroComanda?: string
├── imagemComanda?: blob/URL     (purgada 48h após FINALIZADA; ver 10-D1)
├── estado: ver 06-modelos-estado.md
├── versao: number (concorrência por entidade)
├── revisao: int64 (ordenação de eventos + snapshot + CAS de fechamento; ver 08)
├── criadoPor: participanteId
├── criadoEm, atualizadoEm: datetime
├── itens: Item[]
├── cobrancas: Cobranca[]           (taxas, descontos e ajustes)
├── totalInformado: centavos        (total impresso na comanda)
├── ajusteConciliacao: centavos     (= totalInformado − totalCalculado; |.| ≤ 5¢;
│                                    0 quando confere; nunca negativo em módulo; ver 07 §3)
├── participantes: Participante[]
├── pendencias: Pendencia[]          (derivada; calculada/servida pelo servidor)
│
│   Derivados (calculados/servidos; nunca autoridade de escrita):
├── subtotalItens: derivado (Σ itens)
├── valorItensNaoAtribuidos: derivado (itens NAO_DIVIDIDO + DIVISAO_INCOMPLETA + unidades do pool)
├── saldoNaoDistribuido: derivado (valorItensNaoAtribuidos + cobranças sem rateio válido;
│                                   deve ser 0 para fechar)
├── totalCalculado: derivado (Σ itens + Σ taxas − Σ descontos + ajusteConciliacao)
└── totalDistribuido: DEPRECADO → usar totalCalculado (nome antigo mantido só em textos antigos)
```

```text
Pendencia                        (lista estruturada; o frontend não infere do estado)
├── id: string
├── tipo: ITEM_NAO_DIVIDIDO | UNIDADES_NAO_DISTRIBUIDAS | DIVISAO_INCOMPLETA
│       | PARTICIPANTE_NAO_INFORMOU | PARTICIPANTE_NAO_CONFIRMOU
│       | PARTICIPANTE_AGUARDANDO_ENTRADA
│       | COBRANCA_NAO_CONFIRMADA | DIVERGENCIA_COMANDA
├── entidadeId: string           (item/cobranca/participante que originou)
├── participanteId?: string
├── severidade: BLOQUEIA_FECHAMENTO
├── resolvida: boolean
├── resolvidaEm?: datetime
└── resolvidaPor?: participanteId  (quando resolvido pelo criador em nome da pessoa)
```

```text
Item
├── id, nome: string
├── quantidade: int (≥ 1)
├── modoPreco: TOTAL_LINHA | UNITARIO
│        (TOTAL_LINHA: valorTotal é autoridade — ex.: OCR "3 un · R$ 10,00" sem unitário exato;
│         UNITARIO: precoUnitario é autoridade; ver 07 §1)
├── valorTotal: centavos          (autoridade quando modoPreco = TOTAL_LINHA)
├── precoUnitario?: centavos      (autoridade quando UNITARIO; derivado/informativo quando
│                                  TOTAL_LINHA e divisível; null quando não divisível)
├── modoDivisao: ENTRE_PESSOAS | UNIDADES | PERSONALIZADO | NAO_DIVIDIDO
├── atribuicoes: Atribuicao[]
├── estado: ver 06-modelos-estado.md
└── versao: number (concorrência por item)
```

```text
Atribuicao                    (partilha de um item por participante)
├── participanteId
├── tipo: PROPORCIONAL (entre pessoas) | UNIDADE (n unidades) | VALOR_FIXO | PERCENTUAL
├── unidades?: int
└── valor: centavos (derivado quando PROPORCIONAL/UNIDADE; autônomo quando VALOR_FIXO/PERCENTUAL)
```

```text
Cobranca                      (taxa, desconto ou ajuste de conciliação)
├── id, descricao: string
├── tipo: TAXA | DESCONTO
├── valor: centavos (≥ 0; o SINAL vem do tipo: TAXA soma, DESCONTO subtrai)
├── percentualBp?: int          (basis points quando informado na comanda; 1000 = 10%)
├── baseCalculo?: centavos      (quando identificável)
├── origemValor: IMPRESSO_FIXO | CALCULADO_DE_PERCENTUAL | MANUAL_FIXO  (auditável)
├── regraDistribuicao: PROPORCIONAL_CONSUMO | IGUAL_POR_PESSOA
│                               (default do OCR: PROPORCIONAL_CONSUMO;
│                                couvert/taxa "por pessoa" → IGUAL_POR_PESSOA)
├── participantesElegiveis?: participanteId[]
│                               (obrigatório quando IGUAL_POR_PESSOA; sem auto-inclusão:
│                                quem já confirmou parte não é incluído em rateios futuros)
├── quantidadeCobrada?: int     (= |elegíveis|; rateio = valor ÷ quantidadeCobrada, Maior Resto)
├── confirmadaNaVersao?: int    (confirmada ⇔ confirmadaNaVersao == versao; edição zera)
├── confirmadaPor?: participanteId
└── versao: number
```

```text
Participante
├── id: string
├── nomeExibido: string
├── avatar?: string (emoji/ID)
├── estado: CONVIDADO | ATIVO | PARTE_CONFERIDA   (+ PAGO pós-MVP)
├── tokenConvite?: string       (vaga pré-cadastrada, ainda não entrou)
├── dispositivoToken?: string   (identidade de re-entrada)
├── consumoConfirmado: boolean  (o PRÓPRIO participante confirmou/revisou seu consumo;
│                                atribuição feita por terceiros NÃO conta;
│                                QUALQUER mudança de atribuição zera este flag — ver 05 §7)
├── origemConfirmacao?: PROPRIO_PARTICIPANTE | RESOLUCAO_CRIADOR
│                                (quando RESOLUCAO_CRIADOR: UI exibe "Resolvido por X";
│                                setado pelo override do criador — ver 05 §7)
├── entrouEm?: datetime
└── versao: number
```

```text
Pagamento (pós-MVP, esqueleto no MVP)
├── participanteId
├── valorDevido: centavos
├── pagadores: [{ participanteId, valor }]   (consumo ≠ pagamento)
└── estado: ABERTO | PAGO
```

---

## 3. Convencões

- **Dinheiro**: sempre em **centavos (inteiro)**. Nunca float/double. Exibição em BRL `R$ 1.234,56`.
- **Datas**: ISO-8601 UTC.
- **IDs**: aleatórios longos (mín. 128 bits) — o link `c/AB12CD` do mockup é só display, o ID real precisa ser indevinhável (ver `09-nao-funcionais.md`).
- **Versões**: toda entidade editável concorrente tem `versao` (ver `08-tempo-real-concorr.md`).

---

## 4. Dataset canônico

Todo exemplo da spec (telas, cálculos, revisão final) usa **este único dataset**, verificado aritmeticamente:

### Comanda — Restaurante Bistrô, Mesa 12

| Item | Qtd | Unit. | Total |
|---|---|---|---|
| Pizza Margherita | 1 | 120,00 | 120,00 |
| Cerveja | 4 | 9,00 | 36,00 |
| Refrigerante | 4 | 6,00 | 24,00 |
| Batata frita | 1 | 30,00 | 30,00 |
| **Subtotal** | | | **210,00** |

```text
Serviço 10%    R$ 21,00   (impresso na comanda: "Serviço 10% ... R$ 21,00")
Total impresso R$ 231,00
```

Validação: 210,00 + 21,00 − 0 = 231,00 ✓ (sem divergência).

### Participantes (6 vagas, criador incluso)

Guilherme (criador), Maria, João, Pedro, Ana, Carlos.

### Divisão canônica

| Item | Modo | Atribuição |
|---|---|---|
| Pizza | Entre pessoas | João, Maria, Pedro → 40,00 cada |
| Cerveja | Unidades | João 1, Maria 1, Pedro 2 |
| Refrigerante | Unidades | Ana 2, Guilherme 1, Carlos 1 |
| Batata | Entre pessoas | João, Maria, Ana → 10,00 cada |

### Resultado (centavos verificados: Σ itens = 21000, Σ taxa = 2100, Σ total = 23100)

| Pessoa | Itens | Taxa 10% | **Total** |
|---|---|---|---|
| João | 59,00 | 5,90 | **64,90** |
| Maria | 59,00 | 5,90 | **64,90** |
| Pedro | 58,00 | 5,80 | **63,80** |
| Ana | 22,00 | 2,20 | **24,20** |
| Guilherme | 6,00 | 0,60 | **6,60** |
| Carlos | 6,00 | 0,60 | **6,60** |
| **Σ** | **210,00** | **21,00** | **231,00** ✓ |

Detalhamento por pessoa:

```text
João:      pizza 40,00 + cerveja 9,00 + batata 10,00                = 59,00
Maria:     pizza 40,00 + cerveja 9,00 + batata 10,00                = 59,00
Pedro:     pizza 40,00 + cerveja 18,00                              = 58,00
Ana:       refri 12,00 (2un) + batata 10,00                         = 22,00
Guilherme: refri 6,00                                               =  6,00
Carlos:    refri 6,00                                               =  6,00
```

**Proibido** em qualquer tela/regra usar valores fora deste dataset sem marcá-los como "exemplo ilustrativo".
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
| 1 | 01 Home → "Nova conta" → mini-step **nome/avatar do criador** (criador criado antes da comanda — `10` D15) | — |
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

- Pré-cadastros (placeholders) já existem em 13 antes de a pessoa entrar: ao entrar com nome igual à vaga (D6: **nome + token de dispositivo**) ou via tokenConvite do link, **vincula à vaga** em vez de criar novo.
- Atribuir item a placeholder é permitido (sinalizado); ao entrar, a pessoa vê o que foi marcado nela e pode remover (ver `05-regras-dominio.md`).
- **Conta finalizada** → o link abre o resumo somente leitura (26/27), sem modo de edição (tela 12 · 3.20).

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

- Unidades: botão confirmar só habilita em `n de n` (nunca 5 de 4) e **só [Confirmar] persiste** — o stepper é local, sem gravação por toque (P0-14).
- Personalizar: confirmar só com soma = valor do item (tolerância 0); **[Salvar parcial]** grava incompleto com pendência visível (tela 20 · D13).
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
       │                               "não informou"/"não confirmou"/aguardando entrada
       │                               → só o CRIADOR resolve explicitamente,
       │                                 com origem visível ("Resolvido por X")
       ▼ zero pendências (CAS no servidor — 08 §4.3)
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
# 04 — Telas

Numeração **canônica** (substitui a numeração antiga de `braindump-telas.md` e `telas.png` — regenerar o png, ver `10-decisoes-aberto.md`).

Cada tela: **Ator • Objetivo • Conteúdo • Pré-condição • Transições**. Todos os valores são o **dataset canônico** (`02-glossario-dados.md`), salvo menção "ilustrativo".

## Mapa de correspondência (antigo → novo)

| Antigo (telas.md/png) | Novo | | Antigo | Novo |
|---|---|---|---|---|
| 1–4 | 1–4 | | 19 Item dividido | **21** |
| — | **5 Fallback OCR (novo)** | | 20 Minha parte | **22** |
| 5 Conferir | **6** | | 21 Detalhe pessoa | **16** |
| 6 Editar item | **7** | | 22 Pendências | **23** |
| 7 Taxas | **8** | | 23 Fechar minha parte | **24** |
| 8 Divergência | **9** | | 24 Revisão final | **25** |
| 9 Confirmar | **10** | | 26 Conta finalizada | **26** |
| 10 Convidar | **11** | | 28 Resumo | **27** |
| 11 Entrar | **12** | | 25 Pag. terceiros | **pós-MVP** |
| 12 Sala | **13** | | 27 Pix | **pós-MVP** |
| 13 Itens | **14** | | | |
| 14 Pessoas | **15** | | | |
| 15 Como dividir | **17** | | | |
| 16 Entre pessoas | **18** | | | |
| 17 Unidades | **19** | | | |
| 18 Personalizar | **20** | | | |

---

## Classificação "Tipo" das telas

As 27 entradas **não** são 27 telas físicas. Tipos: **Física** (destino de navegação) · **Modal/Bottom sheet** · **Estado** (variação de outra tela) · **Confirmação**. A numeração canônica **não muda** (as cross-refs `03`–`11` permanecem).

| # | Tela | Tipo |
|---|---|---|
| 01 | Home | Física |
| 02 | Capturar comanda | Física |
| 03 | Pré-visualização | Estado (02) |
| 04 | Processando OCR | Estado (02) |
| 05 | Fallback OCR | Estado (04) |
| 06 | Conferir comanda | Física |
| 07 | Editar item | Bottom sheet |
| 08 | Taxas e descontos | Física |
| 09 | Divergência | Modal |
| 10 | Confirmar comanda | Confirmação (06) |
| 11 | Convidar participantes | Física |
| 12 | Entrar na conta | Física |
| 13 | Sala de participantes | Física (conta) |
| 14 | Conta — itens | Física (conta, tab) |
| 15 | Conta — pessoas | Física (conta, tab) |
| 16 | Detalhe da pessoa | Física (push da conta) |
| 17 | Como dividir este item | Modal |
| 18 | Dividir entre pessoas | Modal (17) |
| 19 | Distribuir unidades | Modal (17) |
| 20 | Personalizar divisão | Modal (17) |
| 21 | Item dividido | Estado (14) |
| 22 | Minha parte | Física (conta) |
| 23 | Pendências | Física (push da conta) |
| 24 | Fechar minha parte | Confirmação (22) |
| 25 | Revisão final | Física |
| 26 | Conta finalizada | Física |
| 27 | Resumo compartilhável | Física |

Navegação principal (físicas): 01 → 02 → 06 → 10 → 11 → 13 ⇄ 14 ⇄ 15 ⇄ 16/22/23 → 25 → 26 → 27. Modais/sheets: 07, 09, 17–20. Estados: 03, 04, 05, 21. Confirmações: 10, 24.

---

## FASE A — Criação

### 01 Home
- **Ator:** qualquer um.
- **Objetivo:** iniciar ou entrar em uma conta.
- **Conteúdo:** "Conta Juntos — Divida a conta sem complicação" · [📷 Nova conta] · [🔗 Entrar em uma conta] · "Como funciona?" (intro curta) · Histórico (futuro, oculto no MVP).
- **Pré:** nenhuma.
- **Transições:** Nova conta → **mini-step "Como devemos te chamar?"** (nome + avatar do criador — o participante CRIADOR é criado **antes** da comanda, então `criadoPor` sempre existe; ver `10` D15) → 02 · Entrar → 12 (campo de **link colado/QR**; o código curto da tela é só display do link real — 09 §4).

### 02 Capturar comanda
- **Ator:** criador.
- **Objetivo:** fotografar a comanda.
- **Conteúdo:** visor da câmera com moldura/orientação ("Posicione a comanda dentro do quadro") · [Foto] · [Galeria].
- **Pré:** Home, "Nova conta"; permissão de câmera concedida (senão: instrução + alternativa galeria).
- **Transições:** foto → 03 · galeria → 03.

### 03 Pré-visualização
- **Ator:** criador.
- **Objetivo:** confirmar a imagem antes do OCR.
- **Conteúdo:** imagem · [Usar esta foto] · [Tirar novamente].
- **Pré:** foto capturada.
- **Transições:** Usar → 04 · Tirar → 02.

### 04 Processando OCR
- **Ator:** criador.
- **Objetivo:** mostrar progresso da interpretação.
- **Conteúdo:** spinner + checklist "Identificando: ✓ Itens ✓ Quantidades ✓ Valores ⏳ Taxas e descontos" · "Isso pode levar alguns segundos."
- **Pré:** imagem enviada ao servidor.
- **Transições:** sucesso → 06 · **falha/timeout → 05** · voltar = cancela OCR (02).

### 05 Falha do OCR → entrada manual *(novo)*
- **Ator:** criador.
- **Objetivo:** garantir caminho de entrada mesmo sem OCR.
- **Conteúdo:** "Não conseguimos ler sua comanda." · [Tentar de novo] (volta ao 04) · [Digitar manualmente] · resumo do erro · nota "Você informará os itens e o **Total impresso** na próxima tela."
- **Pré:** OCR falhou, ou criador escolheu "digitar manualmente" no 04.
- **Transições:** Digitar → **06 com lista vazia** (com estado vazio + [Adicionar item] + **campo Total impresso obrigatório** — é a META do fechamento; nunca presumir total ausente) · Tentar → 04.

### 06 Conferir comanda ⭐
- **Ator:** criador (e, depois do convite, qualquer participante).
- **Objetivo:** revisar tudo que o OCR (ou a digitação) produziu. Tela mais importante do produto.
- **Conteúdo:** lista de itens (nome, qtd × unitário/total conforme `modoPreco` — 07 §1) · seção Taxas/descontos · Subtotal · **Total impresso (editável — é a META; obrigatório quando veio do fallback)** · [Confirmar comanda] · **[Ver comanda]** (abre a imagem original para validar o OCR — ex.: conferir se "8,90" não virou "89,00"; oculto se não houver imagem) · ações por linha: editar (07) · "+" adicionar item · mesclar itens duplicados (aparece só se houver duplicatas).
  - **Reabertura:** quando a conta já está ativa, a 06 é alcançada pelo **[Editar comanda]** (13/14/15); sair da tela revalida a divergência — se > 5¢, vira pendência `DIVERGENCIA_COMANDA` e bloqueia (07 §3), sem retrocesso de estado (06 §1).
- **Dataset:**
  ```text
  Pizza Margherita   1 × R$ 120,00   R$ 120,00
  Cerveja            4 × R$   9,00   R$  36,00
  Refrigerante       4 × R$   6,00   R$  24,00
  Batata frita       1 × R$  30,00   R$  30,00
  ─────────────────────────────────────────────
  Subtotal                      R$ 210,00
  Serviço 10%                   R$  21,00
  Total impresso                R$ 231,00
  [ Confirmar comanda ]
  ```
- **Pré:** OCR concluído ou fallback.
- **Transições:** item → 07 · "Taxas e descontos" → 8 · divergência → 09 · Confirmar → 10 (se Σ confere ou divergência resolvida).

### 07 Editar item
- **Ator:** qualquer participante.
- **Objetivo:** correção rápida de uma linha.
- **Conteúdo:** bottom sheet: Nome · Quantidade (−/+) · **Preço unitário** e **Total** (a edição é por `modoPreco` — 07 §1) · **[Ver comanda]** (zoom na imagem original — útil quando o OCR lê "8,90" como "89,00") · [Excluir item] · [Salvar]/[Cancelar]. Teclado numérico nos campos de dinheiro.
  - **`modoPreco = UNITARIO`:** unitário editável; total derivado (4 × 9,00 → qtd 5 → 45,00, unitário permanece 9,00). Total não digita isoladamente.
  - **`modoPreco = TOTAL_LINHA`:** **total editável** (autoridade); unitário exibido como derivado/informativo — quando `total ÷ qtd` não é exato, mostra "sem preço unitário exato" e a linha é válida (3 un · R$ 10,00). Mudar a quantidade **mantém** o total (com aviso).
  - Trocar a autoridade é atômico com o salvar (um único commit; 08 §4).
- **Pré:** 06 aberto.
- **Transições:** Salvar → se reabrir parte de alguém em `PARTE_CONFERIDA` → alerta prévio do editor (`05` §6.3: "Esta alteração vai reabrir a parte de X. Deseja continuar?") → 06 (e recálculo); se o item já estava dividido → regra de `05-regras-dominio.md` (divisão remanescente preservada; excedente vira pendência) · Cancelar → 06.

### 08 Taxas e descontos
- **Ator:** qualquer participante.
- **Objetivo:** revisar/adicionar cobranças e descontos. **Nenhuma taxa é presumida.**
- **Conteúdo:** por cobrança: descrição, valor, % (quando calculável), base (quando identificável), **regra de distribuição** (editável), **conjunto de elegíveis** (quando `Igual por pessoa` — edição exige reconfirmar: 07 §2.4), origem do valor (impresso/calculado/manual), confirmada ✓, editar/adicionar/remover.
  - **Regra exibida:** `Proporcional ao consumo` (default) → aviso "Distribuída proporcionalmente ao consumo." · `Igual por pessoa` → exibição "R$ 15,00 × 6 pessoas".
  ```text
  Taxa de serviço   R$ 21,00  (10% · base R$ 210,00)  Proporcional ✓
  Couvert artístico R$ 90,00  (R$ 15,00 × 6 pessoas)  Igual por pessoa ✓
  [ + Adicionar taxa ou desconto ]
  [ Salvar ]
  ```
- **Pré:** 06.
- **Transições:** Salvar → 06 (recalcula divergência → 09 se necessário).

### 09 Divergência
- **Ator:** qualquer participante.
- **Objetivo:** impedir avanço com conta que não fecha.
- **Condição de exibição:** `|Σ (itens + taxas − descontos) − total impresso| > R$ 0,05`.
- **Conteúdo:** ⚠ "Os valores não conferem" · Calculado vs **Total impresso (meta)** · Diferença · [Corrigir] · **[Ajuste de comanda]** · explicação.
  ```text
  Calculado        R$ 230,00
  Total impresso   R$ 231,00   ← meta
  Diferença          R$  1,00
  [ Corrigir ]   [ Ajuste de comanda ]
  ```
- **Regra:** ≤ 5¢ passa sem exibir (absorvido). Acima: **só [Corrigir] ou [Ajuste de comanda]** — sem "Confirmar assim mesmo" (o total impresso é autoridade).
  - **[Ajuste de comanda]** (decisão 4 da 2ª rodada): cria a cobrança explícita "Ajuste de divergência" (TAXA se faltam / DESCONTO se sobra) que é rateada como qualquer cobrança — itens e taxas impressos intactos; depois disso Σ = impresso e a pendência some. Detalhe: `07 §3.1`.
- **Transições:** Corrigir → 06/07/08 · Ajuste de comanda → cria cobrança e volta para 06 (pendência resolvida).

### 10 Confirmar comanda
- **Ator:** criador.
- **Objetivo:** resumo antes de abrir a sessão.
- **Conteúdo:** checklist "✓ 4 itens ✓ Subtotal R$ 210,00 ✓ Taxas R$ 21,00 ✓ Total R$ 231,00" · [Confirmar e convidar].
- **Pré:** divergência resolvida (ou inexistente).
- **Transições:** → 11. Mudança de estado: AGUARDANDO_CONFERENCIA → AGUARDANDO_PARTICIPANTES.

### 11 Convidar participantes
- **Ator:** qualquer participante.
- **Objetivo:** compartilhar o acesso.
- **Conteúdo:** QR Code · link copiável · [Compartilhar no WhatsApp] · [Copiar link] · contador "3/6 participantes" · nota "Podem entrar pelo próprio celular, sem instalar o app." · [Pré-cadastrar participante] (nome → vaga).
- **Pré:** comanda confirmada (10).
- **Transições:** compartilhar (share nativo) · [Entrar na conta] (o criador vira participante) → 13.

---

## FASE B — Entrada

### 12 Entrar na conta
- **Ator:** convidado.
- **Objetivo:** se identificar sem cadastro.
- **Conteúdo:** nome do restaurante · "Como podemos te chamar?" · [nome] · avatar (opcional, set de emojis) · [Entrar na conta] · aviso "Você entrará diretamente na divisão. Não é necessário criar conta."
- **Pré:** link/QR válido.
- **Transições:** Entrar → 13. Se dispositivo tiver token → **entra direto como o mesmo participante** (sem pedir nome). Se nome igual a vaga pré-cadastrada → vincula à vaga (D6: nome + token — `05` §3). **Conta finalizada** → abre o resumo somente leitura (26/27), sem modo de edição (3.20).

### 13 Sala de participantes
- **Ator:** todos.
- **Objetivo:** ver quem está na mesa; começar a dividir sem esperar.
- **Conteúdo:** lista com avatar/nome/status (🟢 online · ⚪ offline · 🕓 aguardando entrada · ⏳ aguardando confirmação) · "3/6 participantes" · [Compartilhar mais pessoas] · **[Editar comanda] → 06 (modo edição)** · **[Sair e apagar dados deste dispositivo]** (decisão 5 da 2ª rodada: revoga sessão + limpa cache local; dados no servidor intactos — `05` §11) · aviso "Podem começar a dividir a conta a qualquer momento." · acesso às tabs.
- **Pré:** participante ATIVO (ou sala visível ao criador antes dos convites).
- **Transições:** → 14 (Itens) / 15 (Pessoas).

---

## FASE C — Divisão colaborativa

### 14 Conta — visão de itens
- **Ator:** todos.
- **Objetivo:** tela principal; ver estado de cada item.
- **Conteúdo:** tabs [Itens][Pessoas] · rodapé "Total da comanda R$ 231,00" · **barra fixa "Minha parte"** (ver "Estados globais") · **[Editar comanda] → 06 (modo edição)** · por item: status.
  ```text
  🍕 Pizza Margherita  R$ 120,00   ✓ Dividido entre 3
  🍺 Cerveja           4 × 9,00     4/4 unidades
  🥤 Refrigerante      4 × 6,00     4/4 unidades
  🍟 Batata frita      R$ 30,00     ⚠ Não dividido   ← estado intermediário
  Total da comanda                R$ 231,00
  ```
  Status possíveis: `⚠ Não dividido` · `n/n unidades` (parcial: `3/4 unidades`) · `✓ Dividido entre N` · `✓ Divisão personalizada` · placeholder: `⏳ Aguardando entrada de Lucas`.
- **Pré:** conta ativa.
- **Transições:** item → 17 · tab → 15.

### 15 Conta — visão de pessoas
- **Ator:** todos.
- **Objetivo:** quanto cada um paga e quem ainda não confirmou o próprio consumo.
- **Conteúdo:**
  ```text
  João       R$ 64,90   ✓ Confirmado
  Maria      R$ 64,90   ✓ Confirmado
  Pedro      R$ 63,80   ✓ Confirmado
  Ana        R$ 24,20   ⏳ Aguardando confirmação   ← valor atribuído por outro, ela não revisou
  Guilherme   R$  6,60   ✓ Confirmado
  Carlos      R$  6,60   ⏳ Aguardando confirmação   ← refri atribuída, ele não revisou (pendência)
  Total     R$ 231,00
  ```
  - **Semântica:** `✓ Confirmado` = o próprio participante revisou/confirmou (ou resolvido pelo criador, com "Resolvido por X"). `⏳ Aguardando confirmação` = tem valor **atribuído por terceiros** mas `consumoConfirmado = false` → **gera pendência e bloqueia o fechamento** (decisão 1 da 2ª rodada). `⚠ Não informou` = `!consumoConfirmado` sem nada atribuído (gera pendência; ex.: vaga vazia de um convidado que não recebeu nada — não ocorre neste dataset). `R$ 0,00 ✓` = informou explicitamente que não consumiu (não gera pendência).
  - **[Editar comanda] → 06 (modo edição)** disponível aqui também (3.19).
- **Transições:** pessoa → 16.

### 16 Detalhe da pessoa
- **Ator:** todos (visível para todos — a divisão é transparente).
- **Objetivo:** consumo detalhado de um participante.
- **Conteúdo (dataset, Maria):**
  ```text
  Maria
  Pizza Margherita      R$ 40,00
  Cerveja               R$  9,00
  Batata frita          R$ 10,00
  ───────────────────────────────
  Consumo               R$ 59,00
  Serviço 10%           R$  5,90
  TOTAL                 R$ 64,90
  ```
  - Linha extra **"Ajuste de conciliação ±R$ X,XX"** quando existir (`07 §3.1`) — itens/taxas originais nunca são alterados por ela.
- **Transições:** editar itens da pessoa (atalho para 14/17) · voltar → 15.

### 17 Como dividir este item? ⭐
- **Ator:** qualquer participante.
- **Objetivo:** escolher o modo. Tela-chave da UX.
- **Conteúdo:** nome/valor do item · 3 opções: 👥 Dividir entre pessoas · 🔢 Distribuir unidades · ⚙️ Personalizar · se já dividido: mostrar divisão atual + aviso "trocar de modo descarta a divisão atual" (confirmação).
- **Pré:** item aberto a partir de 14.
- **Transições:** → 18 / 19 / 20 · cancelar → 14.

### 18 Dividir entre pessoas
- **Ator:** qualquer.
- **Conteúdo:** checkboxes de participantes (placeholders sinalizados "aguardando entrada") · contagem "3 pessoas" · "R$ 40,00 por pessoa" (dataset: pizza) · [Confirmar].
- **Regra:** ≥ 1 pessoa. Recalcular em tempo real conforme marca.
- **Transições:** Confirmar → 21 · voltar → 17.

### 19 Distribuir unidades
- **Ator:** qualquer.
- **Conteúdo:** por pessoa stepper `− n +` · "4 de 4 distribuídas" · barra de progresso · [Confirmar] **só habilita em n/n**.
- **Regra (P0-14):** o stepper é **local** — alterações não são persistidas a cada toque; **só [Confirmar] grava** (um único commit). Nunca existe estado persistido "5 de 4" nem `n+1/n`; sair sem confirmar descarta. Item com `modoPreco = TOTAL_LINHA` indivisível distribui pelo Maior Resto (`07 §4.2`).
- **Dataset (cerveja):** João 1, Maria 1, Pedro 2 → 4/4.
- **Transições:** Confirmar → 21.

### 20 Personalizar divisão
- **Ator:** qualquer.
- **Conteúdo:** toggle [Valor][%] · campos por participante · "Total / Dividido" · ✓ "Divisão confere" ou ⚠ "A divisão não fecha (falta R$ X)" · [Confirmar] só com soma = valor do item (tolerância 0) · **[Salvar parcial]**.
  - **[Salvar parcial]** (decisão D13): grava o que já foi digitado → item `DIVISAO_INCOMPLETA` + pendência "falta R$ X" — **qualquer participante pode completar depois**; [Confirmar] continua bloqueado até fechar. Nunca existe metade salva sem a pendência visível.
- **Exemplo ilustrativo:** Sobremesa R$ 60 → João 30 / Maria 20 / Pedro 10.
- **Transições:** Confirmar → 21 · Salvar parcial → 14 (item fica ⚠ incompleto).

### 21 Item dividido
- **Ator:** todos.
- **Conteúdo:** resumo do item com partilha por pessoa · ✓ status · [Editar novamente] → 17.
- **Dataset (pizza):** João 40,00 · Maria 40,00 · Pedro 40,00.
- **Transições:** editar → 17 · fechar → 14.

---

## FASE D — Acompanhamento

### 22 Minha parte
- **Ator:** participante logado no dispositivo (você).
- **Objetivo:** ver o próprio total, atualizado em tempo real; confirmar o próprio consumo.
- **Conteúdo (dataset, Maria):**
  ```text
  MINHA PARTE
  Pizza Margherita    R$ 40,00
  Cerveja             R$  9,00
  Batata frita        R$ 10,00
  ──────────────────────────────
  Consumo             R$ 59,00
  Serviço 10%         R$  5,90
  TOTAL               R$ 64,90
  ✓ Meu consumo confirmado   (ou [ Confirmar meu consumo ] se ainda não confirmou)
  [ Fechar minha parte ]
  ```
  - Linha extra **"Ajuste de conciliação ±R$ X,XX"** quando existir (`07 §3.1`).
- **Regra:** tocar em qualquer divisão que afete você **ou** [Confirmar meu consumo] → `consumoConfirmado = true`. Confirmação é do próprio participante: atribuição feita por terceiros não confirma sozinha. **Qualquer mudança futura de atribuição zera a confirmação** (`05` §7.2).
- **Transições:** → 24 · voltar → 14.

### 23 Pendências da conta
- **Ator:** todos veem; **resolver** é do próprio participante (confirmar seu consumo) ou do **criador** (pendências de terceiros — com origem visível).
- **Objetivo:** listar o que impede o fechamento.
- **Conteúdo:** lista de pendências com atalho "Ir para a falta" · [Lembrar pessoas] (share/WhatsApp com texto pronto — sem push):
  ```text
  Ainda falta resolver:
  ⚠ Batata frita não dividida                [Ir para a falta]
  ⚠ 1 unidade de cerveja não distribuída     [Ir para a falta]
  ⚠ Carlos não confirmou o consumo           [só o criador resolve]
  ⏳ Ana aguardando confirmação               [só o criador resolve]
  [ Lembretes via WhatsApp ]
  ```
- **Pendências reconhecidas:** lista estruturada `Pendencia[]` (`02`) — `ITEM_NAO_DIVIDIDO` · `UNIDADES_NAO_DISTRIBUIDAS` · `DIVISAO_INCOMPLETA` · `PARTICIPANTE_NAO_INFORMOU` · `PARTICIPANTE_NAO_CONFIRMOU` · `PARTICIPANTE_AGUARDANDO_ENTRADA` · `COBRANCA_NAO_CONFIRMADA` · `DIVERGENCIA_COMANDA`. Cada entrada tem `id`, `tipo`, `entidadeId` e atalho "Ir para a falta".
- **Diálogo do criador** (escolha explícita, nunca automática — `05` §7.3):
  - pendência **"não informou"**: [Marcar R$ 0,00] · [Personalizar] · [Desvincular consumos];
  - pendência **"não confirmou"** (⚠ bloqueia, decisão 1 da 2ª rodada): **[Confirmar em nome dela]** (→ exibe "✓ Resolvido por Guilherme (em nome de Ana)") · [Dividir entre todos] · [Personalizar] · [Desvincular consumos].
  - **[Desvincular consumos] é etapa:** remove as atribuições e **mantém a pendência aberta**; o diálogo avança até a segunda escolha resolver de fato. Para placeholder que nunca entrou, é o caminho natural.
- **Transições:** resolver item → loop 17–21 · zero pendências → 25.

### 24 Fechar minha parte
- **Ator:** qualquer participante (paralelo ao restante).
- **Conteúdo:** total atual · "Depois de fechar, sua parte ficará **conferida**. Se a comanda mudar, você será avisado." · [Fechar minha parte] → confirmação → estado:
  ```text
  ✓ Sua parte foi conferida   R$ 64,90
  Se a comanda mudar, você será avisado para conferir novamente.
  [ Voltar para a conta ]
  ```
- **Semântica:** fechar marca a parte como **conferida com o estado atual da divisão** (a pessoa revisou o próprio total) — a conta pode mudar até finalizar; não é congelamento absoluto.
- **Pós:** se item que ela consumiu for alterado → **reabre com aviso** "Sua parte foi alterada — confirme novamente" (volta a ATIVO). Copy pós-fechamento: "Conferida — pode mudar até a conta finalizar; avisaremos se mudar."
- **Transições:** confirmar → estado PARTE_CONFERIDA (fica na tela) · Voltar → 14.

---

## FASE E — Fechamento

### 25 Revisão final
- **Ator:** qualquer participante (botão habilitado só com **zero pendências**).
- **Conteúdo:**
  ```text
  CONFERIR DIVISÃO
  João        R$ 64,90
  Maria       R$ 64,90
  Pedro       R$ 63,80
  Ana         R$ 24,20
  Guilherme    R$  6,60
  Carlos       R$  6,60
  ──────────────────────
  Total da conta   R$ 231,00
  ✓ Todos os itens distribuídos
  ✓ Taxas confirmadas
  ✓ Valores conferem (Σ = total)
  [ Fechar conta ]
  ```
- **Transições:** Fechar → confirmação ("Depois disso, a divisão será bloqueada") → 26 · Voltar → 14.

### 26 Conta finalizada
- **Ator:** todos.
- **Conteúdo:** "🎉 Conta dividida!" · mesma tabela da 25 · total · data/hora da finalização · bloqueio total de edição.
- **Transições:** → 27.

### 27 Resumo compartilhável
- **Ator:** todos.
- **Conteúdo:** resumo em texto (restaurante, pessoas, valores, total) · [Compartilhar (WhatsApp)] · [Copiar texto] · [Copiar link].
  ```text
  Conta Restaurante Bistrô
  João       R$ 64,90
  Maria      R$ 64,90
  Pedro      R$ 63,80
  Ana        R$ 24,20
  Guilherme   R$  6,60
  Carlos      R$  6,60
  Total      R$ 231,00
  ```
- **Transições:** share nativo · Home.

---

## Estados globais de UI (todas as telas)

| Indicador | Quando |
|---|---|
| 🟢 Sincronizado | normal |
| 🟡 Sincronizando… | operação em voo (o card alterado fica "pendente" até ack) |
| 🔴 Você está offline | sem conexão: leitura do último estado; operações críticas bloqueadas com "Tentar novamente"; nada é exibido como salvo antes do servidor |
| **Banner leve** | eventos importantes ("sua parte foi alterada", conta finalizada): banner persistente **até acknowledge**; com **debounce** para eventos repetidos — **não** é toast sequencial (Gemini 2.2 · `08 §3`) |

### Barra fixa "Minha parte" (elemento global na conta)

Presente **sempre** nas telas da conta ativa (13, 14, 15, 16, 23, 24 — não em 01–12 nem 25–27):

```text
──────────────────────────────
Minha parte até agora   R$ 64,90 ⏳     ← enquanto houver pendências na conta
Minha parte             R$ 64,90 ✓      ← conta sem pendências
```

- Valor recalcula em tempo real; **toque abre a tela 22**.
- **Rótulo:** "Minha parte **até agora**" enquanto houver pendências (a divisão pode mudar); sem pendências, "Minha parte".
- Sufixo de estado: `✓` confirmado · `⏳` aguardando confirmação · `⚠` não informou (mesma semântica da tela 15).
- Atende ao princípio "o usuário deve perceber imediatamente quanto está pagando" — não é só uma tela.

Acessibilidade: nunca usar só cor/emoji — sempre texto + ícone (ex.: "✓ Dividido", "⚠ Não dividido").

---

## Pós-MVP (telas fora do fluxo)

| Tela antiga | Conteúdo | Condição de retorno |
|---|---|---|
| Pagamento por terceiros (antiga 25) | "Quem vai pagar?" + consolidação de pagadores | pós-MVP (Pix) |
| Pagamento / Pix (antiga 27) | Pagar via Pix / Copiar / status | pós-MVP |
| "Já paguei" | removido do MVP | pós-MVP |
| Histórico (Home) | lista de contas antigas | pós-MVP |
# 05 — Regras de Domínio

## 1. Matriz de permissões (MVP)

| Ação | Criador | Participante |
|---|---|---|
| Criar conta / fotografar / OCR | ✅ | — (só existe pelo criador) |
| Editar itens, taxas, descontos, total | ✅ | ✅ *(edição aberta — decisão)* |
| Dividir itens / personalizar | ✅ | ✅ |
| Convidar / compartilhar link | ✅ | ✅ |
| **Pré-cadastrar participantes (vagas)** | ✅ | ❌ |
| Editar dados de outro participante | ❌ | ❌ |
| Editar **próprio** nome/avatar | ✅ | ✅ |
| Entrar / sair da sala | ✅ | ✅ |
| Fechar minha parte | ✅ | ✅ |
| **Resolver pendências de participantes** ("não informou" / "não confirmou" / aguardando entrada) | ✅ *(com origem visível)* | ❌ |
| **Fechar conta** | ✅ | ✅ *(somente com ZERO pendências)* |
| Remover participante da conta | ❌ | ❌ *(fora do MVP — ver 10)* |

Justificativa: edição aberta reduz gargalo (o criador pode sair da mesa); a proteção vem do **versionamento** (`08`) e da regra de fechamento só sem pendências.

---

## 2. Conta e identificadores

- Cada conta tem `id` aleatório ≥128 bits. O QR/link usa esse id (o que se vê na tela, tipo `c/AB12CD`, é apenas display legível — o link real é indevinhável; ver `09`).
- Link compartilhável via QR, cópia e WhatsApp.
- **Sem login, sem e-mail, sem cadastro.**

### TTL

- **MVP: conta sem expiração automática** (decisão). A **foto** da comanda é purgada **48h após FINALIZADA** (10-D1; `09 §5`).
- Conta finalizada continua acessível para leitura (resumo), sem edição.

---

## 3. Identidade do participante (re-entrada)

Sem login, a identidade é por **token de dispositivo**:

1. Ao entrar (tela 12), servidor emite `dispositivoToken` guardado em **cookie `HttpOnly`** do dispositivo (ver `09 §4` — nunca `localStorage`).
2. Reabrir o link no **mesmo dispositivo** → reconecta ao mesmo participante (mesmo nome/avatar, mesmo `participanteId`).
3. **Outro dispositivo** → novo participante; se o nome digitado coincidir com vaga/convidado, **vincula à vaga** em vez de duplicar.
4. Colisão de nomes ("2 Marias" fora de vaga): ids são distintos; exibição diferencia por avatar. **Decisão D6 (mantida na 2ª rodada): nome igual à vaga pré-cadastrada VINCULA** (nome + token de dispositivo, nunca nome sozinho como credencial de sessão) — o risco de alguém reivindicar vaga homônima é **aceito** e registrado (`10` D6, `09 §4`); a pendência de confirmação obrigatória (§7) é a mitigação.

Atributos por participante: `id`, `nomeExibido`, `avatar` (opcional), `estado`, `presença`, `consumoConfirmado`, estado de fechamento individual.

---

## 4. Vagas e pré-cadastro (limite 6)

- **Limite = 6 vagas por conta** (configurável), contando **entrados + pré-cadastros**. O criador ocupa uma vaga.
- **Pré-cadastro pelo criador** (tela 11): informa nome → cria `Participante` em estado `CONVIDADO` (placeholder) com `tokenConvite`.
- Placeholder aparece em todas as listas **sinalizado** ("Aguardando entrada") e **pode receber itens** (decisão) — mas de forma visível:
  - na lista de divisão: rótulo "⏳ aguardando entrada";
  - ao entrar, a pessoa vê o que foi marcado nela e **pode remover** as atribuições.
- Entrar por link com nome igual ao de um placeholder (ou usando `tokenConvite`) → vincula; caso contrário, cria novo participante **enquanto houver vaga**. Sem vaga: "Mesa cheia" (erro).
- Placeholder que recebe itens atribuídos e **nunca entra** → pendência `PARTICIPANTE_AGUARDANDO_ENTRADA` (bloqueia o fechamento) resolvida pelo criador com **[Desvincular consumos]** (§7): os itens voltam a `NAO_DIVIDIDO`/incompleto e seguem pelo fluxo normal. Placeholder **sem atribuição** é só vaga vazia — **não** gera pendência.
- Remoção de vaga/placeholder pelo criador: permitida **antes** da divisão começar; depois, remover alguém com atribuições é bloqueado (transformaria o consumo em órfão). Definido: **fora do MVP remover participantes** — ver `10`.

---

## 5. Presença

Estados: `online` (heartbeat ativo) · `offline` (sem heartbeat por > 60s) · `aguardando entrada` (CONVIDADO) · `conectado recentemente` (voltou nos últimos 5 min).

- Presença é **informativa**; não bloqueia operações.
- Não confundir presença com `consumoConfirmado` (§7).

---

## 6. Edição de comanda pós-divisão

A comanda pode ser editada por qualquer participante **a qualquer momento** (antes ou depois do convite). Regras:

### 6.1 Alterar quantidade/preço de item já dividido

- **Não destruir** a divisão existente.
- Excedente (ex.: 4 → 5 cervejas) fica **disponível** e vira pendência (`4/5 unidades`).
- Diminuir (5 → 4) com 5 unidades atribuídas: **bloqueado** enquanto a soma das unidades > nova quantidade (mensagem: "Há 5 unidades distribuídas; ajuste a divisão antes de reduzir").
- Excluir item com divisão: **permitido com confirmação explícita** ("Isso remove R$ X de João, Maria e Pedro"); as partes afetadas são reabertas (§7).

### 6.2 Trocar modo de divisão

- **Troca descarta a divisão atual com confirmação** (decisão): "Trocar o modo vai apagar a divisão atual de N pessoas. Continuar?"
- A troca é **atômica**: descarte + novo modo em **um único commit** — se falhar (409/422/offline), nada muda (modo e divisão antigos permanecem). Nunca meio-estado "modo novo com divisão velha" (3.14).
- Sem conversão automática.

### 6.3 Parte conferida × edição

- Editar é **sempre permitido**.
- Se a alteração afeta participante em `PARTE_CONFERIDA` → a parte **reabre automaticamente** (`ATIVO`) com aviso obrigatório: **"Sua parte foi alterada — confirme novamente"** (decisão).
- **Confirmação do editor (antecipada):** antes de aplicar qualquer mutação que **reabra** a parte de participantes em `PARTE_CONFERIDA`, a UI do editor exibe alerta: **"Esta alteração vai reabrir a parte de Maria e Pedro. Deseja continuar?"** (lista nomes afetados). **Cancelar** aborta a operação; **Continuar** aplica e as partes reabrem com o aviso delas. Evita thrashing quando há edições repetidas.
  - Aplica-se a: editar item (07), trocar modo/redividir (17–21), excluir item, resolver pendências que alterem partilha.
- Valores mudam para todos em tempo real; o aviso garante que ninguém é surpreendido em silêncio.

### 6.4 Mesclar itens (OCR duplicado)

- Se duas linhas parecidas (mesmo nome + mesmo preço unitário) → ação "Mesclar": soma quantidades (2+2 → 4 × R$ 9,00). Disponível só enquanto não houver divisão conflitante.

### 6.5 Separar itens

- **Fora do MVP** (não há tela) — registrado em `10`.

---

## 7. Atribuição × confirmação ("informou" ≠ "consumiu zero")

Dois conceitos separados:

- **Atribuição** (quem deve o quê): qualquer participante pode atribuir itens/unidades a **qualquer um**, inclusive a quem não entrou.
- **Confirmação** (`consumoConfirmado`): só o **próprio** participante confirma o seu consumo (tocar em uma divisão que o afete ou [Confirmar meu consumo] na tela 22). **Atribuição feita por terceiros não confirma.**

### 7.1 Tabela normativa (P0-16 · decisão 1 da 2ª rodada)

| Participante | Atribuído a ele? | `consumoConfirmado`? | Estado | Bloqueia fechamento? |
|---|---|---|---|---|
| `CONVIDADO` | não | — | `AGUARDANDO_ENTRADA` | **não** (vaga vazia) |
| `CONVIDADO` | sim | — | `AGUARDANDO_ENTRADA` | **sim** (pendência `PARTICIPANTE_AGUARDANDO_ENTRADA`) |
| `ATIVO` | não | não | `NAO_INFORMOU` | **sim** (pendência) |
| `ATIVO` | sim | não | `AGUARDANDO_CONFIRMACAO` | **sim** (pendência — **acabou a aprovação tácita**) |
| `ATIVO` | qualquer | sim | `CONFIRMADO` | não |

Estados na UI, sempre diferenciados:

| Estado | Significado | UI |
|---|---|---|
| `SEM_CONSUMO` | ele próprio informou R$ 0,00 (caso de `CONFIRMADO`) | "R$ 0,00 ✓" neutro |
| `AGUARDANDO_CONFIRMACAO` | valor atribuído por outro, ele ainda não revisou → **pendência** | "⏳ Aguardando confirmação" |
| `NAO_INFORMOU` | nada atribuído e não mexeu → pendência | "⚠ Não informou" |
| resolvido pelo criador | `origemConfirmacao = RESOLUCAO_CRIADOR` | "✓ Resolvido por Guilherme (em nome de Ana)" |

### 7.2 Reset de confirmação (P0-04, versão simplificada)

- Qualquer mutação que **altere atribuições/partes** de um participante zera `consumoConfirmado` (→ `AGUARDANDO_CONFIRMACAO` se tem atribuição, `NAO_INFORMOU` se não tem). Nunca "mantém confirmado" um valor que mudou.
- Mudança só de taxa/desconto **não** mexe em `consumoConfirmado` (parte recalcula, mas a pessoa já revisou o quê consome), embora reabra `PARTE_CONFERIDA` pela via §6.3.
- `origemConfirmacao`: `PROPRIO_PARTICIPANTE` (ação dela) ou `RESOLUCAO_CRIADOR` (override — sempre visível).

### 7.3 Resolução pelo criador (escolha explícita, nunca automática — princípio 8)

Pendência `NAO_INFORMOU` (nada atribuído):

- **[Marcar R$ 0,00]** → `SEM_CONSUMO` (resolve);
- **[Personalizar]** → leva ao fluxo de itens (atribui consumo a ele);
- **[Desvincular consumos]** → **etapa**, ver abaixo.

Pendência `AGUARDANDO_CONFIRMACAO` (atribuído):

- **[Confirmar em nome dela]** → `consumoConfirmado = true` + `origemConfirmacao = RESOLUCAO_CRIADOR`, exibido como "✓ Resolvido por X" (resolve);
- **[Dividir entre todos]** → algoritmo §7.4 (resolve, se não sobrar furo);
- **[Personalizar]** → leva ao fluxo de itens;
- **[Desvincular consumos]** → **etapa**.

**[Desvincular consumos] é etapa, não resolução** (3.13): remove as atribuições do participante e **mantém a pendência aberta**; o diálogo avança para a segunda escolha até resolver de fato:

| Modo do item | Efeito do desvincular |
|---|---|
| `ENTRE_PESSOAS` | sai da seleção; Maior Resto redistribui entre os restantes; sem restante → `NAO_DIVIDIDO` |
| `UNIDADES` | unidades dele voltam ao pool → `DIVISAO_INCOMPLETA` (pendência de unidades) |
| `PERSONALIZADO` | valores dele viram "faltando" → `DIVISAO_INCOMPLETA` |

### 7.4 Algoritmo de [Dividir entre todos]

Para **cada item** onde o participante tem atribuição, o que era dele é redistribuído:

- `ENTRE_PESSOAS`: participante sai da seleção; as partes são redistribuídas entre os demais **que já têm atribuição no item** via Maior Resto (modo preservado);
- `UNIDADES`: unidades dele voltam ao pool não distribuído (item → incompleto; o criador distribui);
- `PERSONALIZADO`: soma dos valores dele vira "faltando" (item → incompleto).

Sem itens a redistribuir (não havia atribuição) → a opção não existe nessa pendência.

---

## 8. Fechar minha parte

- Disponível a qualquer momento para qualquer participante com parte calculada.
- **Marca a parte como `PARTE_CONFERIDA`**: a pessoa revisou o próprio total naquele instante; ela pode ir embora; a conta dos demais segue aberta. Não é congelamento absoluto.
- Depois de fechar: **continua podendo ver tudo**; se sua parte for afetada por edição → reabre com aviso (§6.3).
- Reverter fechamento voluntário: "Reabrir minha parte" (volta a ATIVO, valor recalcula). Permitido enquanto a conta não estiver FINALIZADA.

---

## 9. Fechar a conta

- **Qualquer participante** pode fechar (decisão), mas o botão só habilita com **ZERO pendências** — a lista é a coleção estruturada `Pendencia[]` de `02` (tipos: `ITEM_NAO_DIVIDIDO` · `UNIDADES_NAO_DISTRIBUIDAS` · `DIVISAO_INCOMPLETA` · `PARTICIPANTE_NAO_INFORMOU` · `PARTICIPANTE_NAO_CONFIRMOU` · `PARTICIPANTE_AGUARDANDO_ENTRADA` · `COBRANCA_NAO_CONFIRMADA` · `DIVERGENCIA_COMANDA`). O frontend **não infere** pendências varrendo o estado: consome a lista servida.
- O fechamento é **CAS no servidor** (`08 §4.3`): `estado ≠ FINALIZADA ∧ contaRevisao == base ∧ pendenciasAtivas == 0` — pendência que surge entre leitura e commit derruba a tentativa com `serverState`.
- Confirmação obrigatória: "Depois disso, a divisão será bloqueada."
- **Nota:** fechar conta é uma ação **operacional** (habilita com zero pendências) — **não** exige confirmação ou fechamento de parte de todos os participantes; quem não conferiu sua parte pode seguir com ela aberta.
- **FINALIZADA é permanente no MVP** (sem reabertura — ver `10`).

---

## 10. Comanda → Consumo → Pagamento (MVP)

- **Comanda**: o que o restaurante cobrou (itens + cobranças + total impresso). Editável até FINALIZADA.
- **Consumo**: rateio por participante (divisões + taxas/descontos proporcionais). É o que a UI exibe em "Minha parte"/"Pessoas".
- **Pagamento**: existe no modelo (`02`) mas **sem UI no MVP** (sem Pix, sem "Já paguei", sem terceiros). O MVP termina no resumo.

---

## 11. Remoção/saída

- Sair da sala (fechar aba) ≠ sair da conta: participante permanece com dados.
- **"Sair e apagar dados deste dispositivo" (no MVP — decisão 5 da 2ª rodada)**: revoga a sessão no servidor, apaga o cookie de dispositivo e limpa o cache local (fotos/dados em cache) **do dispositivo**; os dados da conta no servidor ficam intactos. Depois disso, re-entrar exige o link de novo. Exposto na tela 13 (conta) e no menu global.
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
| AGUARDANDO_CONFERENCIA → AGUARDANDO_PARTICIPANTES | "Confirmar comanda" (tela 06) / "Confirmar e convidar" (tela 10) | `|Σ − total impresso| ≤ 5¢` (ou ajuste de comanda aplicado — 07 §3.1) |
| AGUARDANDO_PARTICIPANTES → DIVISAO_EM_ANDAMENTO | primeira divisão confirmada | — |
| DIVISAO_EM_ANDAMENTO → DIVISAO_EM_ANDAMENTO | edições/nav (sem mudança de estado) | — |
| DIVISAO_EM_ANDAMENTO → FINALIZADA | "Fechar conta" (25) | **zero pendências** + CAS (`08 §4.3`) |
| ↔ estados de sync | ver `08-tempo-real-concorr.md` | offline não transiciona no servidor |

Não existe volta a `AGUARDANDO_CONFERENCIA` depois de `AGUARDANDO_PARTICIPANTES` (edição de comanda na sala fica em `AGUARDANDO_PARTICIPANTES`/`DIVISAO_EM_ANDAMENTO`; divergência nova vira pendência `DIVERGENCIA_COMANDA`, não reabre o estado — 07 §3).

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
| `EM_DIVISAO` | Tela de divisão aberta por alguém. **Efêmero: não é persistido** — servido apenas como presença `editoresAtivos[]` na UI (6.2); **não bloqueia** os outros — sem lock (ver `08`). Visível como "editando…" opcional. |
| `DIVISAO_INCOMPLETA` | Divisão confirmada mas **não fecha**: unidades `n/n` incompletas OU soma de personalização ≠ valor do item. Gera pendência. |
| `DIVIDIDO` | Divisão confirmada e fecha (Σ atribuições = valor do item; unidades todas distribuídas). |

Transições:

- `DIVIDIDO → EM_DIVISAO`: usuário toca em "Editar novamente" (17).
- `DIVIDIDO → DIVISAO_INCOMPLETA`: edição da comanda cria excedente (ex.: 4→5 cervejas: fica `4/5`) — **nunca destrói** a divisão (`05` §6.1).
- `DIVIDIDO → NAO_DIVIDIDO`: troca de modo (com confirmação, atômica — `05` §6.2).
- **Exclusão do item**: o item sai da lista como **tombstone broadcast** ("A cerveja foi excluída por João" com [Desfazer] enquanto a conta não finalizar) — nunca some silenciosamente das telas dos outros; partes afetadas reabrem (`05` §6.3).
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
| `PARTE_CONFERIDA` | Marcou a própria parte como conferida ("Fechar minha parte"). Vê tudo e **pode continuar editando**; qualquer mutação que afete a própria parte reabre com aviso obrigatório (`05` §6.3) — 3.15. |

**Flags (não estados):**

- `presença`: online/offline/conectado recentemente (`05` §5).
- `consumoConfirmado`: booleano → o próprio participante confirmou/revisou seu consumo. `false` + nada atribuído = `NAO_INFORMOU` (pendência); `false` + valor atribuído = `AGUARDANDO_CONFIRMACAO` (**pendência — bloqueia fechamento**, decisão 1 da 2ª rodada); confirmou com R$ 0,00 = `SEM_CONSUMO`. **Qualquer mudança de atribuição zera o flag** (`05` §7.2). `origemConfirmacao`: `PROPRIO_PARTICIPANTE` | `RESOLUCAO_CRIADOR` (exibição "Resolvido por X"). Detalhe em `05` §7.
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
| Atribuição alterada | mantém | mantém | `consumoConfirmado → false`; parte conferida reabre |
| Alguém fechar parte | mantém | — | `ATIVO→PARTE_CONFERIDA` |
| Pendência criada | mantém | `→ DIVISAO_INCOMPLETA` | `NAO_INFORMOU` flag |
| "Fechar conta" | → `FINALIZADA` | freeze | freeze |

Todos os eventos acima são **broadcast** em tempo real (`08`).
# 07 — Regras de Cálculo

Toda a matemática financeira da spec. Princípio: **precisão decimal em centavos (inteiros), nunca float.**

---

## 1. Fundamentos

- Armazenamento: **centavos (inteiro)**. Cálculos intermediários em inteiro (unidade: 1/100 do centavo quando necessário para taxas percentuais) ou decimal exato — **nunca IEEE-754 float/double**.
- Exibição: BRL (`R$ 1.234,56`).
- Validações de item — **autoridade do preço** (P0-13, decisão 2 da 2ª rodada):
  - `modoPreco = UNITARIO`: `precoUnitario` é autoridade; `valorTotal = quantidade × precoUnitario` é **derivado**. Editar quantidade: unitário permanece, total recalcula (4 × 9,00 → qtd 5 → 45,00).
  - `modoPreco = TOTAL_LINHA`: `valorTotal` é autoridade (é o que a comanda imprime). `precoUnitario` existe só quando `valorTotal ÷ quantidade` é exato — exibido como **informativo**; quando não divisível, `precoUnitario = null` e a linha é válida (ex.: `3 un · R$ 10,00`). Editar quantidade em TOTAL_LINHA **mantém** `valorTotal` (sem unitário exato, a tela avisa "sem preço unitário exato — confira o total").
  - OCR: usa `UNITARIO` quando a linha traz `qtd × unit = total` consistente; caso contrário `TOTAL_LINHA`. Fallback manual → `UNITARIO` (total impresso digitado separadamente na tela 05).
  - Edição: o campo **editável** é sempre a autoridade do modo (tela 07). Nunca edita-se um derivado isoladamente.
  - `quantidade ≥ 1`, `valor ≥ 0`.
  - Se a soma dos totais não bater com o subtotal impresso da comanda → **divergência** (§3), não ajuste silencioso de preço.

---

## 2. Taxas e descontos (cobranças)

### 2.1 Origem

- **Nunca presumir.** Toda cobrança vem da comanda (OCR) ou é adicionada manualmente (tela 08).
- Se o OCR identificar "Serviço R$ 21,00" sem percentual → aviso "Taxa identificada, confira este valor" (tela 08, `confirmada = false`).
- Se a comanda traz percentual **e** valor → sistema valida compatibilidade (`percentual × base ≈ valor`, tolerância 5¢). Incompatível → divergência/pendência.

### 2.2 Base de cálculo (decisão)

1. **Se a comanda informa o valor da taxa → usar o valor impresso** (nunca recalcular por cima).
2. Se vem só o percentual → aplicar sobre o **subtotal ANTES do desconto** (pré-desconto).
3. Nunca aplicar percentual sobre base pós-desconto (corrige a contradição do braindump §17: o exemplo "sub 200 − desc 20 → serviço 18" era **pós-desconto e está incorreto**; serviço sobre 200 = 20,00).

### 2.3 Representação

Cada cobrança: `tipo (TAXA|DESCONTO)`, `descricao`, `valor (≥ 0; sinal vem do tipo)`, `percentualBp?`, `baseCalculo?`, `origemValor (IMPRESSO_FIXO | CALCULADO_DE_PERCENTUAL | MANUAL_FIXO)`, `regraDistribuicao`, `participantesElegiveis?`, `quantidadeCobrada?`, `confirmadaNaVersao?` (`confirmada ⇔ confirmadaNaVersao == versao`).

### 2.4 Distribuição (por `regraDistribuicao` da cobrança)

| Regra | Comportamento |
|---|---|
| `PROPORCIONAL_CONSUMO` (default do OCR) | Distribui **proporcionalmente ao consumo (itens)** de cada participante. |
| `IGUAL_POR_PESSOA` | Divide o valor entre **`participantesElegiveis[]`** → `parte = valor ÷ quantidadeCobrada`, Maior Resto (§6). Sem auto-inclusão: quem já tinha `consumoConfirmado` quando a cobrança nasceu não entra; quem entrar depois não é incluído retroativamente — mudar o conjunto é **edição da cobrança** (reabre `confirmadaNaVersao`), não efeito silencioso. Ex.: couvert R$ 90,00 ÷ 6 elegíveis → R$ 15,00 cada. |

- **Validação:** Σ das partes individuais da cobrança = `valor` da cobrança (tolerância 0; centavos de sobra pelo Maior Resto, §6).
- A distribuição é sempre **transparente**: a UI mostra a taxa na tela individual ("Serviço 10% — R$ 5,90") e na tela 08 (regra + "distribuída proporcionalmente ao consumo" / "R$ 15,00 × 6 pessoas").

---

## 3. Divergência (tela 09)

```text
Σ calculado = Σ itens + Σ taxas − Σ descontos
diferença   = total impresso − Σ calculado   (com sinal)
```

| Diferença | Ação |
|---|---|
| **≤ R$ 0,05** (5 centavos) | **Absorvida automaticamente** no campo `ajusteConciliacao` da **conta** (= `totalInformado − totalCalculado`; residual ≤ 5¢ com sinal). Sem tela, sem pendência. |
| **> R$ 0,05** | **Bloqueia**: tela 09 com `total impresso` como META. Existe [Corrigir] → ajustar itens/cobranças **e** [Ajuste de comanda] (abaixo). **Sem "Confirmar assim mesmo"** (decisão mantida). |

- Enquanto a divergência > 5¢ existir: conta **não pode** sair de `AGUARDANDO_CONFERENCIA` e gera **pendência** (`DIVERGENCIA_COMANDA`) de fechamento.
- **Absorção de ≤5¢ → `conta.ajusteConciliacao`** (entidade, nível de conta): residual com sinal guardado na conta e aplicado **no rateio das partes pelo Maior Resto** (§6). **Nunca** é injetado em item ou taxa — itens e cobranças permanecem fiéis aos valores impressos da comanda (a tela 08/09 continua mostrando R$ 21,00, não R$ 21,03). Registrar em log de auditoria.

### 3.1 [Ajuste de comanda] (decisão 4 da 2ª rodada)

Quando a diferença > 5¢, além de [Corrigir], a tela 09 oferece **[Ajuste de comanda]**: o criador aceita a diferença como cobrança **explícita** e rastreável — nunca altera itens nem taxas impressos.

- Cria uma `Cobranca { descricao: "Ajuste de divergência", origemValor: MANUAL_FIXO, confirmada }`:
  - diferença **positiva** (faltam R$ 10,00 para bater com o impresso) → `tipo: TAXA` +1000¢;
  - diferença **negativa** (sobra) → `tipo: DESCONTO` −1000¢ (módulo).
- Rateio: mesma regra da cobrança (default `PROPORCIONAL_CONSUMO`).
- `confirmada = true` na criação (foi criada de forma explícita pelo usuário).
- Depois de criada: `totalCalculado` passa a bater com o impresso, `ajusteConciliacao = 0`, pendência `DIVERGENCIA_COMANDA` se resolve.
- O resumo (telas 25/26) e o detalhe (16/22) exibem a linha discreta **"Ajuste de conciliação ±R$ X,XX"** quando `ajusteConciliacao ≠ 0` ou a cobrança de ajuste existe. Itens e taxas originais permanecem intactos (aceite A3).

---

## 4. Divisão do consumo — os 3 modos

Validação comum: **Σ de um item = valor do item** (tolerância **0** para personalizado; exata para os outros).

### 4.1 Dividir entre pessoas (PROPORCIONAL)

- Seleção de S (≥1 pessoa). `partilha_i = valor_item / |S|` via **Método do Maior Resto** (§6).
- Ex.: pizza 120 ÷ 3 = 40,00 / 40,00 / 40,00.

### 4.2 Distribuir unidades (UNIDADES)

- Σ unidades distribuídas = `quantidade` do item. **Nunca >** (UI impede `5 de 4`) e confirmar salva só em `n/n` (P0-14).
- `modoPreco = UNITARIO`: `partilha_i = unidades_i × precoUnitario`.
- `modoPreco = TOTAL_LINHA` **indivisível** (ex.: 3 un · R$ 10,00): a partilha de cada um é o **Maior Resto sobre `valorTotal` entre `quantidade` unidades** (§6) — Σ partes = valorTotal, sempre; nada de "impossível dividir".
- Quantidade ≥ 1 **não** implica modo unidades (independência conceitual, braindump §26).

### 4.3 Personalizar (VALOR_FIXO / PERCENTUAL)

- **Valor**: Σ valores = valor do item (exato). Soma errada → "A divisão não fecha — falta/sobra R$ X", confirmar desabilitado.
- **Percentual**: Σ % = 100% (exato). Valores derivados com maior resto; Σ valores = valor do item.
- Personalização aceita participantes com R$ 0,00 (pode marcar quem não leva nada).

### 4.4 Troca de modo

- Descarta a divisão atual **com confirmação** (`05` §6.2). Sem migração automática.

---

## 5. Do item para a pessoa

```text
consumo_pessoa     = Σ (partilha dos itens)
subtotal_pessoa    = consumo_pessoa
taxas_rateadas     = cada cobrança TAXA × (consumo_pessoa / Σ consumo)   [maior resto]
desc_rateado       = cada DESCONTO × mesma proporção                     [maior resto]
parte_pessoa       = consumo_pessoa + taxas_rateadas − desc_rateado
```

Dataset: Maria → 59,00 + 5,90 − 0 = **64,90** ✓

### 5.1 Exceções de rateio

| Caso | Regra |
|---|---|
| Σ consumo = 0 (ninguém informou) | rateio proporcional impossível → **pendência**; não inventar distribuição |
| Pessoas com consumo 0 | recebem R$ 0,00 de taxa/desconto (nada de "cota mínima") |
| **Desconto tornaria o total negativo** | **validação global antes de salvar a cobrança**: `Σ itens + Σ taxas − Σ descontos ≥ 0`. Se violar → **bloqueio** com "Desconto maior que o valor da comanda" (ajuste os valores na tela 08). Não existe parte "forçada a 0" no rateio. |
| Parte < R$ 0,00 por arredondamento (≤1¢) | guarda de arredondamento: piso em R$ 0,00 com redistribuição do residual pelo Maior Resto (§6). |
| **Qualquer parte individual < R$ 0,00** (causa que for: taxas, descontos, ajuste) | **validação global antes do commit** (P0-03): a operação é **rejeitada (422)** com "O desconto/ajuste deixa a parte de X negativa — ajuste os valores". Nunca existe parte negativa no estado servido; nenhum commit que a produza é aplicado. |
| Participante `NAO_INFORMOU` ou `AGUARDANDO_CONFIRMACAO` | ainda não tem parte fechada — entra/valida no rateio pelo consumo atribuído, mas o fechamento **bloqueia** até confirmar (ou o criador resolver — 05 §7) |

---

## 6. Arredondamento — Método do Maior Resto

Regra única e determinística para **qualquer** divisão de centavos:

1. Calcular quotas exatas (`total / n`) em unidade de 1/1000 de centavo (ou fração inteira).
2. Dar a cada um `floor(quota)`.
3. Distribuir os centavos restantes do **maior para o menor resto**; empate de resto → **hash determinístico `hash(participanteId + id do contexto)`** — contexto = `item.id`, `cobranca.id` ou `conta.id` conforme a divisão. Critério estável e **neutro por nome** (sem viés de ordem alfabética).

```text
R$ 100,00 ÷ 3 → 33,33 / 33,33 / 33,34   (o extra vai para o maior resto; empate: hash)
```

Aplicado em: divisão entre pessoas, rateio de cada taxa/desconto, conversão de percentual em valor.

---

## 7. Garantia financeira (invariantes)

Duas invariantes, com regras distintas (P0-01):

```text
1. Enquanto a conta está ABERTA (qualquer estado de divisão):
   Σ (partes provisórias) + saldoNaoDistribuido + 0 = totalCalculado
   (o "furo" legítimo — itens não atribuídos, unidades do pool, cobranças sem rateio —
    vive em saldoNaoDistribuido e É VISÍVEL na UI; nunca é escondido nem forçado a 0)

2. No FECHAMENTO da conta (FINALIZADA):
   saldoNaoDistribuido = 0  ∧  Σ (partes) = totalInformado (± tolerância já absorvida)
```

- `totalCalculado = Σ itens + Σ taxas − Σ descontos + ajusteConciliacao` (derivado).
- **Servidor é a autoridade**: recalcula sempre; cliente só exibe.
- Nunca pode existir R$ 99,99 ou R$ 100,01 contra R$ 100,00.
- Verificação em todo `commit` de divisão/edição no servidor (transação única — ver `08`):
  - violação da **invariante 1** = **bug interno** → **500**, loga, não aplica, reenvia estado correto;
  - estado "com furo" é **esperado** (não é erro) e vira pendência, nunca rejeição silenciosa;
  - violação da **invariante 2** (tentativa de fechar com saldo ≠ 0) → **409/422** com `serverState` (08 §4).
  - Nenhuma parte individual < 0 → **422** (§5.1).
- Testes obrigatórios: divisão por 3/6 (conta) e 3/7/6 como **teste unitário da biblioteca de Maior Resto**, desconto negativo, taxa sobre 210 com 6 pessoas (dataset), furo visível de 50,00 (não atribuído) mantendo invariante 1.

---

## 8. Progresso e pendências de cálculo

- **Progresso da conta**: `% de itens DIVIDIDO` (card na tela 13) e `X de Y participantes concluíram` (partes fechadas).
- Pendências relacionadas a cálculo:
  - item `DIVISAO_INCOMPLETA`;
  - unidades não distribuídas;
  - personalização incompleta;
  - divergência > 5¢;
  - cobrança `confirmada = false` (editada após confirmação);
  - participante `NAO_INFORMOU` (nada atribuído);
  - participante `AGUARDANDO_CONFIRMACAO` (atribuído, não confirmou — bloqueia, decisão 1 da 2ª rodada);
  - `CONVIDADO` com atribuição (`AGUARDANDO_ENTRADA`).

Nenhuma delas é resolvida automaticamente (princípio 8); "não informou"/"não confirmou" são resolvidos pelo próprio participante ou pelo criador com escolha explícita (05 §7).
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
# 09 — Requisitos Não Funcionais

---

## 1. Performance

| Métrica | Meta (MVP) |
|---|---|
| OCR (envio → resultado) | ≤ 8s p95; UI de progresso em < 300ms |
| Timeout de OCR | 20s → tela 05 (fallback) |
| Confirmação de operação (salvar divisão) | ≤ 1,5s p95 até 🟢 |
| Broadcast (servidor → outros clientes) | ≤ 500ms p95 |
| First load do PWA (4G) | ≤ 3s até interativo |
| Tamanho máximo da foto | 10 MB (comprimir client-side antes do envio) |
| Conta | servidor valida **máx. 100 itens** (422 acima); avisar na UI acima de 50 |
| Dinheiro | **int64 centavos** (nunca float); limite de conta ≤ R$ 999.999,99 validado no servidor |

---

## 2. OCR

- Entrada: JPG/PNG/HEIC (converter), retrato/paisagem.
- **Fallback manual obrigatório** (tela 05) — nunca bloquear o fluxo.
- O resultado é **sugestão**, nunca verdade definitiva (princípio).
- Confiança baixa por campo → destacar campo para conferência (nice-to-have; não bloqueia).
- Fornecedor: decisão técnica (`10-decisoes-aberto.md`). Pode ser API cloud (melhor acurácia) — exige envio da foto a terceiro → ver LGPD §5. **Recomendação T1:** provedor com visão multimodal consolidada (ex.: OpenAI Vision / Google Cloud Vision) em vez de parser próprio.
- Idioma: pt-BR; comandas com "SERV/COUVERT/TAXA/DESC" variações.

---

## 3. PWA e dispositivos

- Instalável (manifest + service worker), cache do shell.
- Câmera via **`navigator.mediaDevices.getUserMedia`** + input file com `capture` — fallback galeria obrigatório (iOS PWA tem restrições); negação de permissão → estado de erro com instrução (tela 04).
- Share nativo (`navigator.share`) com fallback copiar.
- Teclado numérico em campos monetários (`inputmode="decimal"`).
- Suporte: iOS Safari 16+, Chrome Android, desktop moderno (prioridade: celular).

---

## 4. Segurança

- **IDs indevinháveis** (≥128 bits aleatórios) para conta e convite — o código legível da tela é display; o link real não é enumerável.
- Rate limit em: OCR (ex.: 10/min por conta), criação de conta, entrada por link.
- Nomes/avatar: sanitizar (sem HTML/JS), limite de tamanho (nome ≤ 30 chars), moderação básica de conteúdo impróprio (filtro simples MVP).
- Validação **sempre no servidor** (itens, divisões, Σ = total, permissões) — cliente só UI.
- Transporte: HTTPS obrigatório (PWA + câmera).
- **Modelo de ameaça (correto, P0-15):** o **link é credencial de edição completa e irreversível** — quem obtém o link pode ler e alterar a divisão inteira; o cenário de "pior caso" é dano financeiro na conta da mesa, não só leitura. Mitigações: link secreto ≥128 bits, rotação de `joinToken` opcional pelo criador, revogação da conta, auditoria de mudanças. Ameaça aceita e documentada (sem autenticação forte no MVP).
- **Fluxo do link (join):** link de convite carrega `joinToken` → servidor valida **uma vez** → troca por **cookie de sessão `HttpOnly`** → o front limpa o token da URL (`history.replaceState`). O token de convite **nunca** persiste em `localStorage`.
- **Identidade de re-entrada (token de dispositivo):**
  - token **opaco** guardado em **cookie `HttpOnly` + `Secure` + `SameSite`** (e `__Host-`/`__Secure-` prefix quando possível) — **nunca** em `localStorage`;
  - **rotação** do token após uso, expiração/renovação e **revogação de sessão** — "Sair e apagar dados deste dispositivo" está **no MVP** (decisão 5 da 2ª rodada): apaga cookie + cache local do dispositivo e **revoga a sessão no servidor**; dados da conta no servidor ficam intactos;
  - CSRF: mutações exigem header customizado (não-curl) além de `SameSite`; Sem GET state-changing.
  - **Auditoria**: log de eventos sensíveis (criação, resolução de pendência pelo criador, fechamento, exclusão) com `participanteId`, IP-hash e timestamp.
- **Risco D6 aceito (decisão 3 da 2ª rodada):** "nome igual à vaga" vincula — pessoa errada pode assumir atribuições de uma vaga homônima. Registrado como risco aceito (`10` D6); mitigação: avatar + pendência de confirmação obrigatória antes de fechar (05 §7).

---

## 5. Privacidade / LGPD

- **Foto da comanda**: dado pessoal potencial (nome no rodapé da comanda).
- **TTL decidido (10-D1, 2ª rodada):** `imagemComanda` é **purgada automaticamente 48h após a conta FINALIZADA** (job de retenção); dados textuais da divisão permanecem (são necessários para o resumo). Enquanto a conta está viva:
  - tratar como dado efêmero; **não usar para treino/analytics**;
  - expor em política de privacidade: finalidade (dividir a conta), retenção (foto 48h pós-fechamento; divisão até deleção);
- **Direitos do titular (P0-17), 3 operações distintas no MVP:**
  1. **Excluir conta** (só criador): apaga itens/cobranças/partes/foto — participantes são notificados;
  2. **Anonimizar participante** (qualquer um de si mesmo): nome → "Participante excluído", avatar removido, valores preservados (a conta precisa fechar);
  3. **Revogar sessão deste dispositivo** (qualquer participante): "Sair e apagar dados deste dispositivo" (§4).
- Dados coletados: nome, avatar, valores da divisão. **Sem e-mail, sem CPF, sem localização.**
- Third-party de OCR: declarar subcontratado; avaliar DPA.
- Fotos em cache local do PWA (IndexedDB/cache storage): apagadas no logout/revogação (§4).

---

## 6. Acessibilidade (WCAG 2.1 AA mín.)

- Contraste ≥ 4.5:1; texto legível (não < 12px).
- Áreas de toque ≥ 44×44px; uso com uma mão (ações na metade inferior).
- **Nunca só cor/emoji**: sempre texto + ícone (✓ Dividido / ⚠ Não dividido).
- Foco visível, navegação por teclado, labels em inputs; **focus trap** em diálogos (modal fecha por Esc e devolve foco ao gatilho).
- Zoom do navegador até **200% sem perda de conteúdo** (sem `user-scalable=no`).
- Leitores de tela: Anúncios de mudança de valor ("seu total atualizou para R$ 64,90") sem poluição (throttled).
- Estados offline/sincronização sempre com texto.

---

## 7. Responsividade

- Mobile-first. Prioridade: celular > tablet > desktop.
- Funcional em **320px** de largura (sem scroll horizontal indesejado).
- Contexto de uso: em pé/na mesa, uma mão.
- Tablet/desktop: layout com mais colunas mantendo a mesma hierarquia.

---

## 8. Disponibilidade e operação

- MVP: uptime alvo 99% (fase de validação).
- Health check + logs de erro (OCR falho, 409s, operações rejeitadas).
- Backup: dado efêmero; RPO baixo não crítico no MVP.
- Observabilidade mínima: taxa de sucesso do OCR, tempo de OCR, churn de contas que nunca dividiram.

---

## 9. i18n

- MVP: **pt-BR fixo** (sem framework de i18n necessário; manter strings centralizadas para facilitar futuro).

---

## 10. Acessibilidade de teste (aceites não funcionais)

- [ ] Fluxo completo usável só com leitor de tela (navegação principal).
- [ ] Todos os status de item com texto (não só cor).
- [ ] Foto ≤ 10 MB comprimida client-side.
- [ ] IDs de conta não enumeráveis (teste: 1000 tentativas não acham conta).
- [ ] Câmera negada → estado de erro com instrução e fallback de galeria sempre disponível.
- [ ] Upload de foto falhou/timeout → retry + fallback OCR manual acessível (tela 05) sem perda de dados.
- [ ] OCR com timeout (20s) → tela 05 preenchida com o que foi digitado, nada descartado.
- [ ] Conta com 100 itens → 422 do servidor tratado com mensagem clara; 101º item não é aceito.
- [ ] Valores extremos (R$ 999.999,99) sem overflow/quebra de layout.
- [ ] Zoom 200% e viewport 320px sem conteúdo cortado.
- [ ] "Sair e apagar dados deste dispositivo" limpa cookie + cache e derruba a sessão (re-entrada pede link de novo).
- [ ] Duplicação de envio (retry de rede) não cria cobrança/item duplicado (`operationId`).
# 10 — Decisões em Aberto

Itens que **não bloqueiam** a spec funcional, mas precisam de decisão antes (ou durante) da implementação. **Status**: DECIDIDA (já aplicada na spec) · PROVISÓRIA (vale até revisão) · ABERTA · PÓS-MVP.

---

## 1. Pendências de produto

| # | Tema | Opções | Status | Responsável | Nota |
|---|---|---|---|---|---|
| D1 | **TTL da conta e destino da foto** | 24h inatividade · 7 dias + foto cedo · purga da foto pós-fechamento | **DECIDIDA** (2ª rodada) | Produto/LGPD | Foto `imagemComanda` purgada **48h após FINALIZADA**; dados textuais permanecem até deleção (`09 §5`). Conta sem TTL. |
| D2 | **Reabertura de conta FINALIZADA** | nunca · só o criador · por X horas | ABERTA | Produto | MVP: permanente. |
| D3 | **Remover participante / pré-cadastro removível** | criador pode remover · nunca | **DECIDIDA** | Produto | MVP: **sem remoção de participantes**; vaga/placeholder **vazio** é removível antes da divisão (`05 §4`). |
| D4 | **"Sair e apagar dados deste dispositivo"** | existe · não existe | **DECIDIDA** (2ª rodada) | Produto | **No MVP**: revoga sessão + apaga cookie/cache local; servidor intacto (`05 §11`, `09 §4/§5`). |
| D5 | **Atribuição a placeholder sem aviso para o criador** | como notificar a mesa que falta alguém | **DECIDIDA** | Produto | Pendência `PARTICIPANTE_AGUARDANDO_ENTRADA` cobre (`07 §8`). |
| D6 | **Nome/identidade: vincular vaga por nome + token** | token por vaga vs nome | **DECIDIDA** (2ª rodada) | Produto/Seg | **Nome + token de dispositivo mantidos**; risco de colisão deliberada **aceito** (ver §4) e mitigado pela confirmação obrigatória (`05 §3`, `09 §4`). |
| D7 | **Histórico pós-MVP** | escopo mínimo (lista + resumo) | PÓS-MVP | Produto | braindump §74. |
| D8 | **Cardápio/restaurantes pós-MVP** | — | PÓS-MVP | Produto | braindump §75. |
| D9 | **Pagamento (Pix, terceiros, "Já paguei")** | provedor, momento, consentimento | PÓS-MVP | Produto | modelo `Pagamento` já previsto em `02`; braindump §53–54, §62–63. |
| D10 | **Separação de itens (tela)** | UI de "separar" | ABERTA | Produto | MVP: fora; braindump §12. |
| D11 | **Avatar** | set de emojis vs upload | **DECIDIDA** | Design | MVP: emojis. |
| D12 | **Marca: "Conta Juntos"** | checar domínio/INPI/homônimos | ABERTA | Produto/Docs | Review encontrou homônimos para "Divide Aí"; "Conta Juntos" também precisa de checagem antes do lançamento. |
| D13 | **Personalizado: [Salvar parcial]** | salvar incompleto vs só completo | **DECIDIDA** (2ª rodada) | Produto | **Sim**: grava incompleto → `DIVISAO_INCOMPLETA` + pendência visível; qualquer um completa depois (tela 20 · Gemini 1.3). |
| D14 | **Limite de vagas = 6** | 6 · 8 · sem limite | **DECIDIDA** (2ª rodada) | Produto | **Manter 6** no MVP (decisão vigente); risco de churn registrado (§4); revisar com dados reais. |
| D15 | **Identidade do criador antes da comanda** | mini-step na criação vs só ao entrar | **DECIDIDA** (2ª rodada) | Produto | Mini-step "Como devemos te chamar?" (tela 01) → `criadoPor` sempre existe; **"só o criador resolve pendências" permanece**; perda de sessão do criador = risco (§4); transferência de papel/coadmin = pós-MVP. |
| D16 | **Copy provisória das partes** | "Fechar minha parte" vs "Fechar/Conferir…" | **DECIDIDA** (2ª rodada) | Produto/UX | Mantém nome "Fechar minha parte"; pós: "conferida com o estado atual — pode mudar até finalizar"; barra: "Minha parte **até agora**" enquanto houver pendências (04 · 02 glossário). |
| D17 | **⏳ Aguardando confirmação × fechamento** | bloqueia + override · aprovação tácita | **DECIDIDA** (2ª rodada) | Produto | **Bloqueia** (pendência `PARTICIPANTE_NAO_CONFIRMOU`); criador resolve em nome da pessoa com origem "Resolvido por X"; aprovação tácita acabou (`05 §7`). |
| D18 | **Autoridade do preço de item** | unitário · total da linha · os dois | **DECIDIDA** (2ª rodada) | Produto | `modoPreco: TOTAL_LINHA \| UNITARIO` — OCR/total é autoridade quando não há unitário exato; unidades indivisíveis rateiam por Maior Resto (`07 §1/§4.2`). |
| D19 | **Divergência > 5¢** | só corrigir · + ajuste explícito | **DECIDIDA** (2ª rodada) | Produto | **+ [Ajuste de comanda]** (tela 09 · `07 §3.1`): cria cobrança explícita; continua **sem "Confirmar assim mesmo"**. |

---

## 2. Pendências técnicas

| # | Tema | Opções | Recomendação provisória | Status |
|---|---|---|---|---|
| T1 | **Provedor de OCR** | API cloud (Google/Azure/OpenAI-vision) vs on-device | Cloud no MVP (acurácia) — contrata DPA/LGPD (ver `09 §5`); recomendação de nota técnica: visão multimodal consolidada | PROVISÓRIA |
| T2 | **Transporte realtime** | WebSocket vs SSE | **REST (mutações) + SSE (down-channel)** — 2ª rodada (Gemini T1/T2); WebSocket registrado como alternativa | PROVISÓRIA |
| T3 | **Backend/stack** | definir | Fora desta spec (SDD técnica) | ABERTA |
| T4 | **Onde roda o cálculo** | só servidor vs servidor + preview cliente | Preview cliente + **validação final no servidor** (`07 §7`) | **DECIDIDA** |
| T5 | **Geração do QR** | cliente vs servidor | Cliente (não depende de backend) | **DECIDIDA** |
| T6 | **Compressão de imagem** | client-side (canvas) | Sim — antes do upload (`09 §1`). | **DECIDIDA** |
| T7 | **Nota técnica: broadcast pós-commit** | outbox vs evento síncrono na transação | Garantir que nenhum evento sai antes do commit (2ª rodada, `08 §2`) — detalhar na SDD técnica | NOTA |

---

## 3. Pendências de documentação/design

| # | Item | Ação |
|---|---|---|
| M1 | **Regenerar `telas.png`** com a numeração canônica de `04-telas.md` (atual png tem faltas 9/18, duplicata 23, e mistura telas pós-MVP 25/27 no fluxo). | Design |
| M2 | **Dataset antigo** (valores 45,10 / 68,20 / 75,16 / 80 / 65 do braindump) está **proibido** — só dataset canônico de `02`. | Revisão |
| M3 | Exemplo do braindump §17 (serviço pós-desconto) **está incorreto** — corrigido em `07` §2.2. | Feito |
| M4 | Mapear cada item do checklist (`11`) para tela e regra (rastreabilidade). | Feito em `11` |
| M5 | **Adiados para a SDD técnica** (2ª rodada): modelo completo de versões de confirmação do P0-04 (aqui só `consumoConfirmado` + reset + origem); "sessão de rascunho" para edição em lote da comanda (P0-12); renomear entidade `Conta` → `SessaoDivisao` (3.1 — adiado, alto churn de referências); estado `PARTE_CONFERIDA` derivado de `confirmadaNaVersao` (6.3 — adiado). | SDD técnica |
| M6 | Regras de evento/dedupe (`08 §4.4`), outbox pós-commit (T7) e contrato `serverState` — detalhar na SDD técnica. | SDD técnica |

---

## 4. Riscos aceitos no MVP

1. **Retenção de dados textuais** (D1): a foto é purgada em 48h, mas a divisão (nomes + valores) permanece até deleção manual — mitigação: operações de direito do titular (`09 §5`).
2. **Link é credencial de edição completa** (`09 §4`): link equivocado/divulgado dá poder de ler **e alterar** a divisão inteira — mitigação: link ≥128 bits indevinhável + auditoria; sem autenticação forte no MVP.
3. **Edição aberta para todos** (`05`): maior chance de conflito — mitigado por versionamento; UX de conflito precisa ser boa.
4. **"Qualquer participante fecha a conta"** (`05` §9): mitigado por guarda de zero pendências + CAS + confirmação.
5. **OCR instável em comandas ruins** (T1): mitigado pelo fallback manual obrigatório.
6. **Colisão deliberada de nome em vaga** (D6): pessoa errada pode assumir atribuições de vaga homônima — mitigação: avatar + confirmação obrigatória antes de fechar (D17).
7. **Sessão do criador perdida** (D15): só o criador resolve pendências de terceiros — se o dispositivo dele morrer no meio da mesa, as pendências ficam travadas; transferência de papel/coadmin é pós-MVP.
8. **Limite de 6 vagas** (D14): mesas maiores não cabem — risco de churn; revisar com uso real.
# 11 — Checklist MVP com Critérios de Aceite

Cada item: **[tela]** → **[regra]**. Aceites em Given/When/Then nas regras críticas. Exemplos fora do dataset canônico são marcados **"cenário de teste"** (regra 9.1).

---

## A. Criação e OCR

- [ ] Criar conta (mini-step nome do criador) **[01]** `10` D15
- [ ] Fotografar / escolher da galeria **[02,03]**
- [ ] OCR com progresso **[04]** `09` §2
- [ ] **Fallback manual obrigatório** (falha → tela 05 → digitar; Total impresso obrigatório) **[05,06]** `05` §1
- [ ] Conferir comanda: itens, qtd, preços, subtotal, taxas, total **[06]**
- [ ] "Ver comanda" (imagem original p/ validar OCR) **[06,07]**
- [ ] Editar item conforme `modoPreco` (unitário × total editável) **[07]** `07` §1
- [ ] Adicionar/remover/editar taxas e descontos, sem presumir **[08]** `07` §2.1
- [ ] Regra de distribuição por cobrança (proporcional / igual por pessoa + elegíveis) **[08]** `07` §2.4
- [ ] Mesclar itens duplicados do OCR **[06]** `05` §6.4
- [ ] Validação de total com tolerância de 5¢ **[09]** `07` §3
- [ ] [Ajuste de comanda] na divergência **[09]** `07` §3.1
- [ ] Confirmar comanda **[10]**

**Aceites-chave:**

> **A1 — Fallback OCR**
> Given o OCR falhou (timeout/erro)
> When aparece a tela 05 e o usuário escolhe "Digitar manualmente"
> Then a tela 06 abre vazia com "Adicionar item" e a conta pode ser totalmente montada sem OCR

> **A2 — Divergência bloqueia**
> Given subtotal 210 + taxas 21 − descontos 0 = 231 e total impresso 232 (diferença R$ 1,00)
> When o usuário tenta "Confirmar comanda"
> Then a tela 09 exibe Calculado vs **Total impresso (meta)** e só oferece [Corrigir] ou [Ajuste de comanda]; a confirmação é impossível até a diferença ≤ R$ 0,05

> **A3 — Tolerância de centavos**
> Given diferença de R$ 0,03
> When o usuário confirma
> Then avança sem tela de divergência e sem pendência; o residual fica em `conta.ajusteConciliacao` (linha "Ajuste de conciliação" visível em 16/22) e **nenhum valor de item/taxa exibido é alterado**

> **A4 — Autoridade do preço (modoPreco)**
> Given cerveja 4 × R$ 9,00 (total R$ 36,00) com `modoPreco = UNITARIO`
> When o usuário muda a quantidade para 5 na tela 07
> Then o total vira R$ 45,00 e o unitário permanece R$ 9,00
> And **cenário de teste**: linha `TOTAL_LINHA` 3 un · R$ 10,00 → o total é editável, unitário exibido como "sem preço unitário exato" e a linha é válida

> **A5 — Ajuste de comanda**
> Given calculado 230 vs impresso 231 (diferença > 5¢)
> When o criador escolhe [Ajuste de comanda]
> Then cria cobrança "Ajuste de divergência" TAXA +R$ 1,00 (rateada pela regra da cobrança), itens/taxas intactos, Σ = 231,00 e a pendência some — sem "Confirmar assim mesmo"

---

## B. Colaboração e entrada

- [ ] QR Code + link + compartilhar WhatsApp **[11]**
- [ ] Pré-cadastro de participantes (vagas) pelo criador **[11]** `05` §4
- [ ] Limite de 6 vagas (entrados + pré-cadastros) **[05]** `05` §4
- [ ] Entrada sem cadastro: nome + avatar opcional **[12]**
- [ ] Token de dispositivo → re-entrada como a mesma pessoa **[12]** `05` §3
- [ ] Vincular nome à vaga existente **[12]** `05` §4
- [ ] Sala com presença e contador 3/6 **[13]** `05` §5
- [ ] Reconvite a partir da sala **[13]**

**Aceites:**

> **B1 — Re-entrada**
> Given Maria entrou no dispositivo X (token salvo)
> When ela reabre o link no dispositivo X
> Then reconecta ao mesmo participante (sem pedir nome)

> **B2 — Mesa cheia**
> Given 6 vagas ocupadas (entrados + pré-cadastros)
> When alguém novo abre o link
> Then vê "Mesa cheia" e não cria participante

---

## C. Divisão

- [ ] Visão de itens com status por item **[14]**
- [ ] Visão de pessoas: "Não informou" ≠ "Aguardando confirmação" ≠ R$ 0,00 **[15]** `05` §7
- [ ] Confirmar meu consumo (só o próprio confirma; mudança futura de atribuição zera) **[22]** `05` §7
- [ ] Detalhe por pessoa **[16]**
- [ ] Modo 1: dividir entre pessoas **[17,18]** `07` §4.1
- [ ] Modo 2: distribuir unidades (nunca > quantidade; stepper local, salva só n/n) **[19]** `07` §4.2
- [ ] Modo 3: personalizar por valor e por % (+ Salvar parcial) **[20]** `07` §4.3
- [ ] Validação: soma da divisão = valor do item **[19,20]** `07` §4
- [ ] Itens parcialmente/completamente divididos **[14]** `06` §2
- [ ] Item dividido: editar novamente / trocar modo com confirmação (atômica) **[17,21]** `05` §6.2
- [ ] Editar quantidade de item dividido preserva divisão (excedente = pendência) **[07]** `05` §6.1
- [ ] Atribuir item a placeholder com sinalização **[18]** `05` §4
- [ ] [Editar comanda] a partir de 13/14/15 **[13,14,15]** `04` 06
- [ ] Progresso da conta e por participante **[13,14]** `07` §8

**Aceites-chave:**

> **C1 — Unidades não estouram**
> Given cerveja 4 × R$ 9,00
> When a soma das unidades tenta chegar a 5
> Then o stepper é local (nada persistido a cada toque) e nunca existe "5 de 4" gravado; [Confirmar] só habilita em "4 de 4" e grava tudo num único commit (P0-14)

> **C2 — Personalização fecha exata**
> Given item R$ 60,00 com João 30 + Maria 20 (falta R$ 10)
> When o usuário tenta confirmar
> Then botão desabilitado com "A divisão não fecha — faltam R$ 10,00"; ao colocar Pedro 10 → ✓ confere → confirma. **[Salvar parcial]** grava incompleto com pendência (D13)

> **C3 — Troca de modo**
> Given pizza dividida entre 3
> When o usuário escolhe "Distribuir unidades"
> Then confirmação "isso apaga a divisão atual de 3 pessoas" e, confirmado, item volta a NAO_DIVIDIDO para o novo modo

> **C4 — Quantidade × modo independentes**
> Given "2 porções de batata, R$ 40,00"
> When o usuário abre o item
> Then os 3 modos estão disponíveis (não há modo automático por causa da qtd > 1)

---

## D. Cálculo

- [ ] Taxa distribuída por regra (proporcional ao consumo / igual por pessoa) e exibida por pessoa **[08,22,16]** `07` §2.4, §5
- [ ] Base de cálculo pré-desconto; valor impresso prevalece **[08]** `07` §2.2
- [ ] Desconto distribuído pela regra da cobrança **[08]** `07` §2.4
- [ ] Arredondamento por Maior Resto, determinístico **`07` §6**
- [ ] Invariantes duplas: parcial (Σ provisórios + saldo = total) e de fechamento (saldo 0 ∧ Σ = total) **`07` §7**
- [ ] Desconto > total da comanda é bloqueado (validação `total ≥ 0`) **[08]** `07` §5.1
- [ ] Nenhuma parte individual negativa (422 antes do commit) **`07` §5.1**
- [ ] Linha TOTAL_LINHA indivisível rateada por Maior Resto **[19]** `07` §4.2

**Aceites-chave (dataset canônico):**

> **D1 — Dataset fecha**
> Given a comanda do `02` (210 + 21 = 231) e a divisão canônica
> Then as partes são João 64,90 · Maria 64,90 · Pedro 63,80 · Ana 24,20 · Guilherme 6,60 · Carlos 6,60
> And Σ itens = 210,00 · Σ taxas = 21,00 · Σ totais = **231,00**

> **D2 — Maior resto**
> Given R$ 100,00 ÷ 3 pessoas
> Then 33,33 / 33,33 / 33,34 (extra no maior resto; empate → hash determinístico `participanteId + contexto`, sem viés de nome; mesma entrada → mesmo resultado)

> **D3 — Serviço pós-desconto proibido**
> Given subtotal 200,00 e desconto 20,00, serviço impresso 10% (valor ausente)
> Then serviço = **20,00** (10% de 200, pré-desconto), nunca 18,00

> **D4 — Validação de desconto**
> Given desconto de R$ 50,00 em conta com total de R$ 30,00
> When o usuário tenta salvar
> Then bloqueio "Desconto maior que o valor da comanda" (Σ itens + taxas − descontos ≥ 0); o rateio nunca produz parte negativa

> **D5 — Ajuste de conciliação isolado**
> Given comanda com divergência de R$ 0,03 (≤ 5¢)
> When o valor é absorvido
> Then `conta.ajusteConciliacao` guarda o residual (com sinal) e **nenhum item ou taxa exibido muda** (ex.: serviço continua R$ 21,00), a linha "Ajuste de conciliação" aparece em 16/22 e Σ partes = total

> **D6 — Couvert igual por pessoa**
> Given couvert artístico R$ 90,00 com `regraDistribuicao = IGUAL_POR_PESSOA` e `participantesElegiveis` de 6
> When a conta é calculada
> Then cada um paga R$ 15,00 (R$ 90 ÷ `quantidadeCobrada`), **independentemente do consumo**, e Σ da cobrança = R$ 90,00; quem já tinha `consumoConfirmado` na criação da cobrança **não é incluído** (sem auto-inclusão) e quem entra depois não muda o rateio (H7)

> **D7 — Linha não divisível (TOTAL_LINHA)**
> Given item "3 un" com `valorTotal` R$ 10,00 (`modoPreco = TOTAL_LINHA`)
> When é distribuído em unidades (ex.: 1/1/1)
> Then a linha é válida e as partes somam exatamente R$ 10,00 (Maior Resto — H10)

---

## E. Acompanhamento e partes

- [ ] Minha parte em tempo real **[22]**
- [ ] Barra fixa "Minha parte (até agora)" na conta (valor + estado, toque → 22; rótulo "até agora" enquanto houver pendências) **[13,14,15,16,23,24]** `04`
- [ ] Fechar minha parte / parte conferida com copy "pode mudar até finalizar" **[24]** `05` §8
- [ ] Reabertura voluntária **[24]** `05` §8
- [ ] **Reabertura por edição com aviso** ("Sua parte foi alterada") **`05` §6.3**
- [ ] Presença/status dos demais **[13,15]**

> **E1 — Parte conferida × edição**
> Given Maria em PARTE_CONFERIDA (parte 64,90)
> When João muda a cerveja de 4→5 (afeta Maria)
> Then primeiro ele vê o alerta "Esta alteração vai reabrir a parte de Maria — Deseja continuar?"; confirmado, a parte de Maria reabre (ATIVO) com aviso obrigatório "Sua parte foi alterada — confirme novamente" e o novo total aparece; a divisão existente não foi destruída (excedente 1 vira pendência)

---

## F. Pendências e fechamento

- [ ] Tela de pendências com atalhos **[23]**
- [ ] Pendência como entidade estruturada (id/tipo/entidadeId) — lista servida, não inferida **[23]** `02`
- [ ] "Lembrar pessoas" via share/WhatsApp (sem push) **[23]** `05`
- [ ] Pendências de participantes resolvidas **só pelo criador** com origem visível ("Resolvido por X") **[23]** `05` §7
- [ ] ⏳ Aguardando confirmação **bloqueia** o fechamento (pendência) **[15,23]** `05` §7.1
- [ ] [Desvincular consumos] como **etapa** (mantém pendência até a 2ª escolha) **[23]** `05` §7.3
- [ ] Revisão final com zero pendências **[25]**
- [ ] **Qualquer participante** pode fechar conta **[25]** `05` §9
- [ ] Confirmação + bloqueio pós-fechamento **[26]**
- [ ] Resumo compartilhável **[27]**

**Aceites:**

> **F1 — Fechamento bloqueado**
> Given um item não dividido OU um participante NAO_INFORMOU OU um participante AGUARDANDO_CONFIRMACAO (atribuído e não confirmou)
> Then [Fechar conta] desabilitado e a pendência aparece em 23

> **F2 — Resolução explícita**
> Given Carlos NAO_INFORMOU (nada atribuído)
> When o criador abre a pendência
> Then escolhe entre [Marcar R$ 0,00] [Personalizar] [Desvincular consumos] — nunca há atribuição automática
> And **cenário de teste**: Ana AGUARDANDO_CONFIRMACAO → [Confirmar em nome dela] [Dividir entre todos] [Personalizar] [Desvincular consumos]

> **F3 — Fechamento**
> Given zero pendências
> When qualquer participante toca [Fechar conta] e confirma
> Then conta → FINALIZADA; toda edição é rejeitada (servidor 409) e o resumo (27) é gerado com Σ = 231,00

> **F4 — Desvincular consumos (placeholder fantasma)**
> Given Lucas (**cenário de teste**) nunca entrou, mas recebeu a cerveja 2 × R$ 9,00 de alguém
> When o criador escolhe [Desvincular consumos]
> Then as cervejas voltam a NAO_DIVIDIDO/pendência e **a pendência de Lucas permanece aberta** (o desvincular é etapa) até a segunda escolha resolver de fato

> **F5 — Atribuído ≠ confirmado BLOQUEIA**
> Given Ana tem R$ 24,20 atribuídos e nunca confirmou (Aguardando confirmação)
> Then **gera pendência e bloqueia o fechamento** (decisão D17); ela própria pode confirmar em Minha parte, ou o criador resolve em nome dela exibindo "✓ Resolvido por Guilherme (em nome de Ana)" — nunca "Confirmado por Ana"

> **F6 — CAS de fechamento**
> Given zero pendências na revisão 40
> When A abre a revisão final e B cria uma pendência (ou edita item) antes do commit
> Then o fechamento é rejeitado com `serverState` recalculado; nunca existe FINALIZADA com pendência posterior (H12)

---

## G. Confiabilidade

- [ ] Indicador 🟢/🟡/🔴 **`08` §5**
- [ ] Offline: leitura + bloqueio de operações críticas, sem otimismo **`08` §6**
- [ ] Validação no servidor de tudo **`07` §7**, `09` §4
- [ ] Versionamento + UX de conflito (409 com `serverState`; "Editar novamente" reabre o form) **`08` §4.1**
- [ ] Idempotência por `operationId` (retry não duplica) **`08` §4**
- [ ] Eventos com `eventId`/`contaRevisao` (dedupe, salto → snapshot) **`08` §4.4**
- [ ] CAS de fechamento e de entrada em vaga **`08` §4.3**
- [ ] [Sair e apagar dados deste dispositivo] (MVP) **[13]** `05` §11, `09` §4
- [ ] Purga da foto 48h pós-FINALIZADA + operações de direito do titular **`09` §5**
- [ ] Proteção "unidades > quantidade" **C1**
- [ ] Proteção invariantes **D1/H1**
- [ ] IDs indevinháveis **`09` §4**
- [ ] Acessibilidade: estados com texto, focus trap, zoom 200%, 320px **`09` §6–§7**

> **G1 — Offline não mente**
> Given usuário offline
> When tenta confirmar uma divisão
> Then vê "🔴 Não foi possível confirmar — [Tentar novamente]" e o card **não** mostra ✓ dividido

> **G2 — Conflito**
> Given João e Maria abrem o mesmo item (versão 12)
> When os dois salvam
> Then o segundo recebe 409 com `serverState` → diálogo "A cerveja foi atualizada por João · Valor atual 5 × R$ 9,00 vs Sua alteração 4 × R$ 9,00 · [Usar valor atual] [Editar novamente]"; sem fetch extra, Σ nunca quebra

---

## H. Testes obrigatórios adicionais (2ª rodada)

Marcados **"cenário de teste"** quando fora do dataset canônico.

> **H1 — Conservação em estado parcial**
> Given apenas parte dos itens foi dividida
> Then Σ partes provisórias + `saldoNaoDistribuido` = `totalCalculado` (invariante 1)
> And o commit é aceito (o "furo" é visível, não é erro)

> **H2 — Confirmação invalidada por nova atribuição**
> Given Maria confirmou seu consumo
> When uma atribuição de Maria muda
> Then `consumoConfirmado` volta a false (ela aparece como ⏳ de novo)

> **H3 — Mudança somente de taxa**
> Given Maria confirmou o consumo e conferiu a parte
> When a taxa muda sem alterar itens
> Then a confirmação de consumo continua válida
> And a conferência da parte é invalidada (reabre com aviso)

> **H4 — Override do criador**
> Given Ana não confirmou
> When o criador resolve em nome dela
> Then o estado mostra "Resolvido por Guilherme"
> And não "Confirmado por Ana" (`origemConfirmacao = RESOLUCAO_CRIADOR`)

> **H5 — Placeholder com atribuição** *(cenário de teste)*
> Given Lucas é CONVIDADO e possui R$ 18,00 atribuídos
> Then o fechamento continua bloqueado (`PARTICIPANTE_AGUARDANDO_ENTRADA`)
> Until Lucas entra ou o criador resolve explicitamente

> **H6 — Couvert e participante com zero consumo**
> Given couvert igual por pessoa e Carlos com consumo zero
> Then Carlos **não é incluído** em `participantesElegiveis` se já tinha `consumoConfirmado` na criação da cobrança (sem auto-inclusão — `07` §2.4)

> **H7 — Entrada após couvert confirmado**
> Given cinco elegíveis e couvert confirmado
> When a sexta pessoa entra
> Then o couvert **não muda silenciosamente** (novo participante fora do rateio; mudar o conjunto é edição da cobrança, que reabre `confirmadaNaVersao`)

> **H8 — Parte individual negativa** *(cenário de teste)*
> Given consumo R$ 100,00, taxa igual R$ 100,00 e desconto proporcional R$ 180,00
> When a operação é calculada
> Then é **rejeitada com 422** ("deixa a parte negativa") antes do commit — nenhuma parte negativa é persistida

> **H9 — Ajuste positivo e negativo**
> Testar +R$ 0,01 · +R$ 0,05 · −R$ 0,01 · −R$ 0,05 verificando: determinismo, exibição da linha, ausência de parte negativa e soma final (= total impresso)

> **H10 — Linha não divisível por quantidade**
> Given 3 unidades totalizando R$ 10,00 (`TOTAL_LINHA`)
> Then a linha pode ser representada sem unitário
> And a divisão de unidades soma exatamente R$ 10,00 (Maior Resto)

> **H11 — Corrida da última vaga** *(cenário de teste)*
> Given cinco vagas ocupadas
> When dois dispositivos entram simultaneamente
> Then somente um ocupa a sexta vaga (CAS)
> And o outro recebe erro de "vaga já ocupada" — nunca dois na mesma

> **H12 — Corrida entre edição e fechamento**
> Given zero pendências na revisão 40
> When A fecha a conta e B altera um item simultaneamente
> Then somente uma ordem válida é persistida
> And nunca existe conta finalizada com mutação posterior

> **H13 — Timeout depois de commit**
> Given a operação foi persistida e a resposta se perdeu
> When o cliente reenvia o mesmo `operationId`
> Then recebe o resultado original
> And não duplica dados

> **H14 — Eventos fora de ordem**
> Given o cliente recebe `contaRevisao` 52 antes da 51
> Then não aplica estado incompleto
> And solicita snapshot autoritativo (`08` §4.4)

> **H15 — Troca de modo cancelada**
> Given divisão atual válida
> When o usuário inicia outro modo e cancela
> Then a divisão anterior permanece intacta (e a troca confirmada é atômica — falha ⇒ nada muda)

> **H16 — Criador perde a sessão**
> Given conta com pendência exclusiva do criador e o dispositivo dele sumiu
> Then a conta fica **bloqueada de fechar** por pendência não resolvida (risco aceito, `10` §4.7) — comportamento documentado; transferência de papel = pós-MVP

> **H17 — Exclusão e anonimização**
> Given pedido de direito do titular
> When exclusão de conta / anonimização de participante / revogação de sessão é executado
> Then nenhuma atribuição fica órfã (exclusão bloqueada com pendências/atribuições resolvidas) e foto, sessão e caches seguem a política (`09` §5)

> **H18 — Propriedades matemáticas**
> Para qualquer comanda válida: nenhuma parte < 0 · Σ alocações do item ≤ valor do item · item DIVIDIDO ⇒ igualdade · conta FINALIZADA ⇒ Σ partes = total · mesmo input ⇒ mesmo arredondamento (hash estável) · nenhuma operação excede int64

---

## Fora do MVP (não contar aqui)

Pagamento/Pix, "Já paguei", pagamento por terceiros, histórico, cardápio, push, remoção de participantes, separar itens, múltiplas moedas, TTL por inatividade da conta (a foto já é purgada em 48h — `09` §5) — ver `01-visao-escopo.md` §5 e `10-decisoes-aberto.md`.
