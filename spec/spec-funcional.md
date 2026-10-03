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

---

## 4. Atores

| Atores | Descrição |
|---|---|
| **Criador** | Quem iniciou a conta. Pré-cadastra participantes, edita comanda, resolve pendências de "não informou". |
| **Participante** | Quem entra por link/QR ou foi pré-cadastro pelo criador. Sem cadastro, sem login. |

**No MVP, criador e participante têm as mesmas permissões de edição de comanda e divisão** (decisão: edição aberta). As diferenças do criador são: pré-cadastro de participantes e resolução explícita de pendências de quem não informou (ver `05-regras-dominio.md`).

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
- Pendências, revisão final, fechamento da conta, resumo compartilhável.
- Regras de cálculo: taxas, descontos, distribuição proporcional, arredondamento determinístico, garantia Σ = total.

### Fora do MVP

- **Pagamento**: Pix, "Já paguei", pagamento por terceiros, status PAGO (pós-MVP).
- Histórico de contas, cardápio/restaurantes, múltiplas moedas.
- Despesas domésticas, aluguel, recorrência, grupos permanentes.
- Integração bancária, estatísticas, exportação contábil, gestão financeira.
- Notificações push (o "Lembrar pessoas" do MVP usa compartilhar/WhatsApp com texto pronto).
- Colaboração offline completa (MVP: leitura do último estado + bloqueio de operações críticas).

### Pós-MVP registrado em `10-decisoes-aberto.md`

TTL da conta/foto (sem TTL no MVP), provedor de OCR, provedor de realtime, histórico, cardápio.

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
| **Item** | Linha da comanda (nome, quantidade, preço unitário/total). Pode ser dividido de 3 formas. |
| **Taxa / Adicional** | Cobrança sobre o consumo (serviço, couvert, gorjeta...). Nunca presumida: vem da comanda ou é adicionada pelo usuário. |
| **Desconto** | Dedução sobre o consumo. Participa do cálculo final. |
| **Divisão** | Como o item foi atribuído aos participantes. Modos: entre pessoas, unidades, personalizada. |
| **Consumo** | Camada do domínio: quem deve cada item, já com taxas/descontos rateados. |
| **Parte** | O total individual de um participante (consumo + taxas - descontos rateados). |
| **Fechar minha parte** | Ação individual que marca a parte como **conferida** pela pessoa (ela pode ir embora). Se a comanda mudar, a parte reabre com aviso. Não fecha a conta. |
| **Fechar conta** | Ação final que bloqueia toda a divisão (estado FINALIZADA). |
| **Participante** | Pessoa na conta. Pode ter sido pré-cadastrado (vaga) ou ter entrado pelo link. |
| **Vaga** | Limite de 6 = entrados + pré-cadastros. |
| **Placeholder** | Participante pré-cadastrado que ainda não entrou (estado "aguardando entrada"). |
| **Pendência** | Algo que impede o fechamento (item não dividido, unidade sobrando, "não informou", divergência). |
| **Pagamento** | Camada do domínio (quem paga o quê). **Fora do MVP na interface.** |

---

## 2. Modelo de dados (entidades)

```text
Conta
├── id: string (aleatório, indevinhável)
├── nomeRestaurante?: string
├── mesa?: string
├── numeroComanda?: string
├── imagemComanda?: blob/URL
├── estado: ver 06-modelos-estado.md
├── versao: number (concorrência da conta)
├── criadoPor: participanteId
├── criadoEm, atualizadoEm: datetime
├── itens: Item[]
├── cobrancas: Cobranca[]           (taxas e descontos)
├── totalInformado: centavos        (total impresso na comanda)
├── ajusteArredondamento: centavos  (residual ≤ 5¢ absorvido; 0 quando não há divergência)
├── participantes: Participante[]
├── pendencias: Pendencia[]          (derivada; calculada/servida pelo servidor)
└── totalDistribuido: derivado (Σ itens) — nunca armazenado como autoridade
```

```text
Pendencia                        (lista estruturada; o frontend não infere do estado)
├── id: string
├── tipo: ITEM_NAO_DIVIDIDO | UNIDADES_NAO_DISTRIBUIDAS | DIVISAO_INCOMPLETA
│       | PARTICIPANTE_NAO_INFORMOU | COBRANCA_NAO_CONFIRMADA | DIVERGENCIA_COMANDA
├── entidadeId: string           (item/cobranca/participante que originou)
├── participanteId?: string
├── severidade: BLOQUEIA_FECHAMENTO
├── resolvida: boolean
├── resolvidaEm?: datetime
└── resolvidaPor?: participanteId
```

```text
Item
├── id, nome: string
├── quantidade: int (≥ 1)
├── precoUnitario: centavos         (AUTORIDADE persistida)
├── precoTotal: centavos            (derivado = qtd × unitário; nunca editável isoladamente)
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
Cobranca                      (taxa ou desconto)
├── id, descricao: string
├── tipo: TAXA | DESCONTO
├── valor: centavos
├── percentual?: decimal        (quando informado na comanda)
├── baseCalculo?: centavos      (quando identificável)
├── regraDistribuicao: PROPORCIONAL_CONSUMO | IGUAL_POR_PESSOA
│                               (default do OCR: PROPORCIONAL_CONSUMO;
│                                couvert/taxa "por pessoa" → IGUAL_POR_PESSOA)
├── confirmada: boolean         (usuário conferiu)
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
│                                !consumoConfirmado = NAO_INFORMOU)
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
- **Transições:** Nova conta → 02 · Entrar → 12 (campo de link/código).

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
- **Conteúdo:** "Não conseguimos ler sua comanda." · [Tentar de novo] (volta ao 04) · [Digitar manualmente] · resumo do erro.
- **Pré:** OCR falhou, ou criador escolheu "digitar manualmente" no 04.
- **Transições:** Digitar → **06 com lista vazia** (com estado vazio + [Adicionar item]) · Tentar → 04.

### 06 Conferir comanda ⭐
- **Ator:** criador (e, depois do convite, qualquer participante).
- **Objetivo:** revisar tudo que o OCR (ou a digitação) produziu. Tela mais importante do produto.
- **Conteúdo:** lista de itens (nome, qtd × unitário, total) · seção Taxas/descontos · Subtotal · Total · [Confirmar comanda] · **[Ver comanda]** (abre a imagem original para validar o OCR — ex.: conferir se "8,90" não virou "89,00"; oculto se não houver imagem) · ações por linha: editar (07) · "+" adicionar item · mesclar itens duplicados (aparece só se houver duplicatas).
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
- **Conteúdo:** bottom sheet: Nome · Quantidade (−/+) · Preço unitário · **Total (somente leitura, derivado = qtd × unitário)** · **[Ver comanda]** (zoom na imagem original — útil quando o OCR lê "8,90" como "89,00") · [Excluir item] · [Salvar]/[Cancelar]. Teclado numérico nos campos de dinheiro.
  - **Autoridade:** o campo editável é o **unitário**; mudar a quantidade recalcula o total automaticamente (4 × 9,00 → qtd 5 → 45,00, unitário permanece 9,00). Não existe digitar "total" isoladamente.
- **Pré:** 06 aberto.
- **Transições:** Salvar → se reabrir parte de alguém em `PARTE_CONFERIDA` → alerta prévio do editor (`05` §6.3: "Esta alteração vai reabrir a parte de X. Deseja continuar?") → 06 (e recálculo); se o item já estava dividido → regra de `05-regras-dominio.md` (divisão remanescente preservada; excedente vira pendência) · Cancelar → 06.

### 08 Taxas e descontos
- **Ator:** qualquer participante.
- **Objetivo:** revisar/adicionar cobranças e descontos. **Nenhuma taxa é presumida.**
- **Conteúdo:** por cobrança: descrição, valor, % (quando calculável), base (quando identificável), **regra de distribuição** (editável), confirmada ✓, editar/adicionar/remover.
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
- **Conteúdo:** ⚠ "Os valores não conferem" · Calculado vs **Total impresso (meta)** · Diferença · [Corrigir] · explicação.
  ```text
  Calculado        R$ 230,00
  Total impresso   R$ 231,00   ← meta
  Diferença          R$  1,00
  [ Corrigir ]
  ```
- **Regra:** ≤ 5¢ passa sem exibir (absorvido). Acima: **só "Corrigir"** — sem "Confirmar assim mesmo" (o total impresso é autoridade). Detalhe em `07-regras-calculo.md`.
- **Transições:** Corrigir → 06/07/08.

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
- **Pré:** link/QR válido; conta não finalizada.
- **Transições:** Entrar → 13. Se dispositivo tiver token → **entra direto como o mesmo participante** (sem pedir nome). Se nome igual a vaga pré-cadastrada → vincula à vaga.

### 13 Sala de participantes
- **Ator:** todos.
- **Objetivo:** ver quem está na mesa; começar a dividir sem esperar.
- **Conteúdo:** lista com avatar/nome/status (🟢 online · ⚪ offline · 🕓 aguardando entrada) · "3/6 participantes" · [Compartilhar mais pessoas] · aviso "Podem começar a dividir a conta a qualquer momento." · acesso às tabs.
- **Pré:** participante ATIVO (ou sala visível ao criador antes dos convites).
- **Transições:** → 14 (Itens) / 15 (Pessoas).

---

## FASE C — Divisão colaborativa

### 14 Conta — visão de itens
- **Ator:** todos.
- **Objetivo:** tela principal; ver estado de cada item.
- **Conteúdo:** tabs [Itens][Pessoas] · rodapé "Total da comanda R$ 231,00" · **barra fixa "Minha parte"** (ver "Estados globais") · por item: status.
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
  Guilherme   R$ 6,60   ✓ Confirmado
  Carlos      R$ 6,60   ⚠ Não informou             ← nada atribuído e nada confirmado
  Total     R$ 231,00
  ```
  - **Semântica:** `✓ Confirmado` = o próprio participante revisou/confirmou. `⏳ Aguardando confirmação` = tem valor **atribuído por terceiros** mas `consumoConfirmado = false`. `⚠ Não informou` = `!consumoConfirmado` sem nada atribuído (gera pendência). `R$ 0,00 ✓` = informou explicitamente que não consumiu (não gera pendência).
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
- **Dataset (cerveja):** João 1, Maria 1, Pedro 2 → 4/4.
- **Transições:** Confirmar → 21.

### 20 Personalizar divisão
- **Ator:** qualquer.
- **Conteúdo:** toggle [Valor][%] · campos por participante · "Total / Dividido" · ✓ "Divisão confere" ou ⚠ "A divisão não fecha (falta R$ X)" · [Confirmar] só com soma = valor do item (tolerância 0).
- **Exemplo ilustrativo:** Sobremesa R$ 60 → João 30 / Maria 20 / Pedro 10.
- **Transições:** Confirmar → 21.

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
- **Regra:** tocar em qualquer divisão que afete você **ou** [Confirmar meu consumo] → `consumoConfirmado = true`. Confirmação é do próprio participante: atribuição feita por terceiros não confirma sozinha.
- **Transições:** → 24 · voltar → 14.

### 23 Pendências da conta
- **Ator:** todos veem; **resolver** é de qualquer um, exceto "não informou" (só criador).
- **Objetivo:** listar o que impede o fechamento.
- **Conteúdo:** lista de pendências com atalho "Ir para a falta" · [Lembrar pessoas] (share/WhatsApp com texto pronto — sem push):
  ```text
  Ainda falta resolver:
  ⚠ Batata frita não dividida        [Ir para a falta]
  ⚠ 1 unidade de cerveja não distribuída
  ⚠ Carlos não informou o consumo     [só o criador resolve]
  [ Lembretes via WhatsApp ]
  ```
- **Pendências reconhecidas:** lista estruturada `Pendencia[]` (`02`) — item não dividido · unidades sobrando · personalizada incompleta · "não informou" · divergência (>5¢) · cobrança não confirmada. Cada entrada tem `id`, `tipo`, `entidadeId` e atalho "Ir para a falta".
- **Transições:** resolver item → loop 17–21 · resolver "não informou" → diálogo do criador: [Marcar R$ 0,00] [Dividir entre todos] [Personalizar] **[Desvincular consumos]** (escolha explícita, nunca automática) · zero pendências → 25.
  - **[Desvincular consumos]:** itens/unidades que outras pessoas atribuíram a ele voltam a `NAO_DIVIDIDO`/incompleto; depois resolve-se cada item pelo caminho normal. Para placeholder que nunca entrou, é a opção padrão.

### 24 Fechar minha parte
- **Ator:** qualquer participante (paralelo ao restante).
- **Conteúdo:** total atual · "Depois de fechar, sua parte ficará **conferida**. Se a comanda mudar, você será avisado." · [Fechar minha parte] → confirmação → estado:
  ```text
  ✓ Sua parte foi conferida   R$ 64,90
  Se a comanda mudar, você será avisado para conferir novamente.
  [ Voltar para a conta ]
  ```
- **Semântica:** fechar marca a parte como **conferida** (a pessoa revisou o próprio total) — não é congelamento absoluto da conta.
- **Pós:** se item que ela consumiu for alterado → **reabre com aviso** "Sua parte foi alterada — confirme novamente" (volta a ATIVO).
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

### Barra fixa "Minha parte" (elemento global na conta)

Presente **sempre** nas telas da conta ativa (13, 14, 15, 16, 23, 24 — não em 01–12 nem 25–27):

```text
──────────────────────────────
Minha parte         R$ 64,90 ✓
```

- Valor recalcula em tempo real; **toque abre a tela 22**.
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
| **Resolver pendência "não informou"** | ✅ | ❌ |
| **Fechar conta** | ✅ | ✅ *(somente com ZERO pendências)* |
| Remover participante da conta | ❌ | ❌ *(fora do MVP — ver 10)* |

Justificativa: edição aberta reduz gargalo (o criador pode sair da mesa); a proteção vem do **versionamento** (`08`) e da regra de fechamento só sem pendências.

---

## 2. Conta e identificadores

- Cada conta tem `id` aleatório ≥128 bits. O QR/link usa esse id (o que se vê na tela, tipo `c/AB12CD`, é apenas display legível — o link real é indevinhável; ver `09`).
- Link compartilhável via QR, cópia e WhatsApp.
- **Sem login, sem e-mail, sem cadastro.**

### TTL

- **MVP: sem expiração automática** (decisão). Registrado em `10-decisoes-aberto.md` com risco de acúmulo de fotos/dados.
- Conta finalizada continua acessível para leitura (resumo), sem edição.

---

## 3. Identidade do participante (re-entrada)

Sem login, a identidade é por **token de dispositivo**:

1. Ao entrar (tela 12), servidor emite `dispositivoToken` guardado no dispositivo (localStorage/cookie).
2. Reabrir o link no **mesmo dispositivo** → reconecta ao mesmo participante (mesmo nome/avatar, mesmo `participanteId`).
3. **Outro dispositivo** → novo participante; se o nome digitado coincidir com vaga/convidado, **vincula à vaga** em vez de duplicar.
4. Colisão de nomes ("2 Marias"): ids são distintos; exibição diferencia por avatar. Nunca vincular por nome sozinho.

Atributos por participante: `id`, `nomeExibido`, `avatar` (opcional), `estado`, `presença`, `consumoConfirmado`, estado de fechamento individual.

---

## 4. Vagas e pré-cadastro (limite 6)

- **Limite = 6 vagas por conta** (configurável), contando **entrados + pré-cadastros**. O criador ocupa uma vaga.
- **Pré-cadastro pelo criador** (tela 11): informa nome → cria `Participante` em estado `CONVIDADO` (placeholder) com `tokenConvite`.
- Placeholder aparece em todas as listas **sinalizado** ("Aguardando entrada") e **pode receber itens** (decisão) — mas de forma visível:
  - na lista de divisão: rótulo "⏳ aguardando entrada";
  - ao entrar, a pessoa vê o que foi marcado nela e **pode remover** as atribuições.
- Entrar por link com nome igual ao de um placeholder (ou usando `tokenConvite`) → vincula; caso contrário, cria novo participante **enquanto houver vaga**. Sem vaga: "Mesa cheia" (erro).
- Placeholder que recebe itens atribuídos e **nunca entra** → pendência "não informou" resolvida pelo criador com **[Desvincular consumos]** (§7): os itens voltam a `NAO_DIVIDIDO` e seguem pelo fluxo normal.
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

Estados na UI, sempre diferenciados:

| Estado | Significado | UI |
|---|---|---|
| `SEM_CONSUMO` | ele próprio informou R$ 0,00 | "R$ 0,00 ✓" neutro |
| `AGUARDANDO_CONFIRMACAO` | valor atribuído por outro, ele ainda não revisou | "⏳ Aguardando confirmação" |
| `NAO_INFORMOU` (`!consumoConfirmado`, nada atribuído) | ainda não mexeu nem revisou | "⚠ Não informou" |

- `NAO_INFORMOU` gera **pendência**; `SEM_CONSUMO` e `AGUARDANDO_CONFIRMACAO` não geram.
- Pendência "não informou" só é resolvida **pelo criador**, com escolha explícita (nunca automático — princípio 8), 4 opções:
  - **[Marcar R$ 0,00]** → `SEM_CONSUMO`;
  - **[Dividir entre todos]** → distribui o valor dele entre os demais;
  - **[Personalizar]** → atribuição manual;
  - **[Desvincular consumos]** → itens/unidades que outras pessoas atribuíram a ele **voltam a `NAO_DIVIDIDO`/incompleto**; depois resolve-se cada item pelo fluxo normal (17–21). É a opção indicada para placeholder que nunca entrou.

---

## 8. Fechar minha parte

- Disponível a qualquer momento para qualquer participante com parte calculada.
- **Marca a parte como `PARTE_CONFERIDA`**: a pessoa revisou o próprio total naquele instante; ela pode ir embora; a conta dos demais segue aberta. Não é congelamento absoluto.
- Depois de fechar: **continua podendo ver tudo**; se sua parte for afetada por edição → reabre com aviso (§6.3).
- Reverter fechamento voluntário: "Reabrir minha parte" (volta a ATIVO, valor recalcula). Permitido enquanto a conta não estiver FINALIZADA.

---

## 9. Fechar a conta

- **Qualquer participante** pode fechar (decisão), mas o botão só habilita com **ZERO pendências** — a lista é a coleção estruturada `Pendencia[]` de `02` (tipos: item não dividido · unidades sobrando · divisão personalizada incompleta · `PARTICIPANTE_NAO_INFORMOU` · `COBRANCA_NAO_CONFIRMADA` · `DIVERGENCIA_COMANDA`). O frontend **não infere** pendências varrendo o estado: consome a lista servida.
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
- "Sair da conta neste dispositivo" (limpar token): permite que outra pessoa use o celular — **fora do MVP**, ver `10`.
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
# 07 — Regras de Cálculo

Toda a matemática financeira da spec. Princípio: **precisão decimal em centavos (inteiros), nunca float.**

---

## 1. Fundamentos

- Armazenamento: **centavos (inteiro)**. Cálculos intermediários em inteiro (unidade: 1/100 do centavo quando necessário para taxas percentuais) ou decimal exato — **nunca IEEE-754 float/double**.
- Exibição: BRL (`R$ 1.234,56`).
- Validações de item:
  - `precoUnitario` é a **autoridade persistida**; `precoTotal = quantidade × precoUnitario` é sempre **derivado** (nunca editável isoladamente). Editar quantidade: unitário permanece, total recalcula (4 × 9,00 → qtd 5 → 45,00).
  - `quantidade ≥ 1`, `preco ≥ 0`.
  - Se a soma dos totais derivados não bater com o subtotal impresso da comanda → **divergência** (§3), não ajuste silencioso de preço.

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

Cada cobrança: `tipo (TAXA|DESCONTO)`, `descricao`, `valor`, `percentual?`, `baseCalculo?`, `regraDistribuicao`, `confirmada`.

### 2.4 Distribuição (por `regraDistribuicao` da cobrança)

| Regra | Comportamento |
|---|---|
| `PROPORCIONAL_CONSUMO` (default do OCR) | Distribui **proporcionalmente ao consumo (itens)** de cada participante. |
| `IGUAL_POR_PESSOA` | Divide o valor pelo **número de participantes da conta** (1/n cada). Recalcula quando a contagem muda (entrada de participante). Ex.: couvert R$ 90,00 com 6 participantes → R$ 15,00 cada, independentemente do consumo. |

- **Validação:** Σ das partes individuais da cobrança = `valor` da cobrança (tolerância 0; centavos de sobra pelo Maior Resto, §6).
- A distribuição é sempre **transparente**: a UI mostra a taxa na tela individual ("Serviço 10% — R$ 5,90") e na tela 08 (regra + "distribuída proporcionalmente ao consumo" / "R$ 15,00 × 6 pessoas").

---

## 3. Divergência (tela 09)

```text
Σ calculado = Σ itens + Σ taxas − Σ descontos
diferença   = |Σ calculado − total impresso|
```

| Diferença | Ação |
|---|---|
| **≤ R$ 0,05** (5 centavos) | **Absorvida automaticamente** no campo `ajusteArredondamento` da **conta** (resquício de arredondamento, sinal + centavos). Sem tela, sem pendência. |
| **> R$ 0,05** | **Bloqueia**: tela 09 com `total impresso` como META. Só existe [Corrigir] → ajustar itens/cobranças. **Sem "Confirmar assim mesmo"** (decisão). |

- Enquanto a divergência > 5¢ existir: conta **não pode** sair de `AGUARDANDO_CONFERENCIA` e gera **pendência** de fechamento.
- **Absorção de ≤5¢ → `conta.ajusteArredondamento`** (entidade, nível de conta): residual com sinal guardado na conta e aplicado **no rateio das partes pelo Maior Resto** (§6). **Nunca** é injetado em item ou taxa — itens e cobranças permanecem fiéis aos valores impressos da comanda (a tela 08/09 continua mostrando R$ 21,00, não R$ 21,03). Registrar em log de auditoria.

---

## 4. Divisão do consumo — os 3 modos

Validação comum: **Σ de um item = valor do item** (tolerância **0** para personalizado; exata para os outros).

### 4.1 Dividir entre pessoas (PROPORCIONAL)

- Seleção de S (≥1 pessoa). `partilha_i = valor_item / |S|` via **Método do Maior Resto** (§6).
- Ex.: pizza 120 ÷ 3 = 40,00 / 40,00 / 40,00.

### 4.2 Distribuir unidades (UNIDADES)

- Σ unidades distribuídas = `quantidade` do item. **Nunca >** (UI impede `5 de 4`) e confirmar só em `n/n`.
- `partilha_i = unidades_i × precoUnitario`.
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
| Participante `NAO_INFORMOU` | ainda não tem parte fechada — entra no rateio apenas quando confirmar (ou quando o criador resolver a pendência) |

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

## 7. Garantia financeira (invariante)

```text
Σ (parte de todos os participantes) = total da conta (total impresso, quando divergência ≤ 5¢)
```

- **Servidor é a autoridade**: recalcula sempre; cliente só exibe.
- Nunca pode existir R$ 99,99 ou R$ 100,01 contra R$ 100,00.
- Verificação em todo `commit` de divisão/edição no servidor: se Σ ≠ total → **rejeita a operação** (500/409), loga, reenvia estado correto.
- Testes obrigatórios: divisão por 3/7/6 com centavos "quebrados", desconto negativo, taxa sobre 210 com 6 pessoas (dataset).

---

## 8. Progresso e pendências de cálculo

- **Progresso da conta**: `% de itens DIVIDIDO` (card na tela 13) e `X de Y participantes concluíram` (partes fechadas).
- Pendências relacionadas a cálculo:
  - item `DIVISAO_INCOMPLETA`;
  - unidades não distribuídas;
  - personalização incompleta;
  - divergência > 5¢;
  - cobrança `confirmada = false`;
  - participante `NAO_INFORMOU`.

Nenhuma delas é resolvida automaticamente (princípio 8); "não informou" é resolvido só pelo criador com escolha explícita.
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
| Conta | limite prático de 100 itens (avisar acima de 50) |

---

## 2. OCR

- Entrada: JPG/PNG/HEIC (converter), retrato/paisagem.
- **Fallback manual obrigatório** (tela 05) — nunca bloquear o fluxo.
- O resultado é **sugestão**, nunca verdade definitiva (princípio).
- Confiança baixa por campo → destacar campo para conferência (nice-to-have; não bloqueia).
- Fornecedor: decisão técnica (`10-decisoes-aberto.md`). Pode ser API cloud (melhor acurácia) — exige envio da foto a terceiro → ver LGPD §5.
- Idioma: pt-BR; comandas com "SERV/COUVERT/TAXA/DESC" variações.

---

## 3. PWA e dispositivos

- Instalável (manifest + service worker), cache do shell.
- Câmera via `getUserDevice`/input file com `capture` — fallback galeria obrigatório (iOS PWA tem restrições).
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
- **Identidade de re-entrada (token de dispositivo):**
  - token **opaco** guardado em **cookie `HttpOnly` + `Secure` + `SameSite`** — **nunca** em `localStorage` (proteção contra XSS roubando a sessão);
  - **rotação** do token após uso, expiração/renovação e revogação de sessão ("sair deste dispositivo" pós-MVP);
  - o **link da conta** é *bearer secret* (quem tem o link entra) — declarado no modelo de ameaça.
- Sem autenticação forte no MVP → aceito risco de link compartilhado; mitigação: link secreto + "ver resumo" é o pior caso (dados de divisão, não financeiros sensíveis).

---

## 5. Privacidade / LGPD

- **Foto da comanda**: dado pessoal potencial (nome no rodapé da comanda).
- **MVP: sem TTL automático** (decisão registrada em `10` — risco: acúmulo). Enquanto não decidido:
  - tratar como dado efêmero; **não usar para treino/analytics**;
  - expor em política de privacidade: finalidade (dividir a conta), retenção ( indefinida — pendente);
  - suporte a **deleção manual**: ao pedir "apagar minha conta/dados", apagar foto + participante (endpoint mínimo no MVP).
- Dados coletados: nome, avatar, valores da divisão. **Sem e-mail, sem CPF, sem localização.**
- Third-party de OCR: declarar subcontratado; avaliar DPA.

---

## 6. Acessibilidade (WCAG 2.1 AA mín.)

- Contraste ≥ 4.5:1; texto legível (não < 12px).
- Áreas de toque ≥ 44×44px; uso com uma mão (ações na metade inferior).
- **Nunca só cor/emoji**: sempre texto + ícone (✓ Dividido / ⚠ Não dividido).
- Foco visível, navegação por teclado, labels em inputs.
- Leitores de tela: Anúncios de mudança de valor ("seu total atualizou para R$ 64,90") sem poluição (throttled).
- Estados offline/sincronização sempre com texto.

---

## 7. Responsividade

- Mobile-first. Prioridade: celular > tablet > desktop.
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
# 10 — Decisões em Aberto

Itens que **não bloqueiam** a spec funcional, mas precisam de decisão antes (ou durante) da implementação.

---

## 1. Pendências de produto

| # | Tema | Opções | Impacto | Nota |
|---|---|---|---|---|
| D1 | **TTL da conta e destino da foto** | 24h inatividade e apagar · 7 dias + foto cedo · sem TTL | Privacidade/LGPD, custo de storage | **MVP: sem TTL** (decisão). Risco: acúmulo de fotos. Reavaliar antes de produção. |
| D2 | **Reabertura de conta FINALIZADA** | nunca · só o criador · por X horas | UX de erro ("fechei sem querer") | MVP: permanente. |
| D3 | **Remover participante / pré-cadastro removível** | criador pode remover (com regra de órfão) · nunca | Flexibilidade de mesa | MVP: sem remoção. |
| D4 | **"Sair da conta neste dispositivo"** | existe · não existe | Celular compartilhado | MVP: não existe. |
| D5 | **Atribuição a placeholder sem aviso para o criador** | como notificar a mesa que falta alguém | Pendência visual já cobre? | Provável: só pendência. |
| D6 | **Nome/identidade: vincular vaga por link de convite dedicado** | token por vaga vs nome | Colisão de nomes | MVP aceita nome+token dispositivo. |
| D7 | **Histórico pós-MVP** | escopo mínimo (lista + resumo) | — | braindump §74. |
| D8 | **Cardápio/restaurantes pós-MVP** | — | — | braindump §75. |
| D9 | **Pagamento (Pix, terceiros, "Já paguei")** | provedor, momento de disponibilidade, consentimento de "pagar por outro" | Pós-MVP; modelo `Pagamento` já previsto em `02` | braindump §53–54, §62–63. |
| D10 | **Separação de itens (tela)** | UI de "separar" | MVP: fora | braindump §12. |
| D11 | **Avatar** | set de emojis vs upload | MVP: emojis | já no checklist. |
| D12 | **Marca: "Conta Juntos"** | checar domínio (.com.br/.app), registro INPI e homônimos de apps existentes | Nome usado em todo o produto | Review GPT encontrou homônimos para o nome alternativo "Divide Aí" — "Conta Juntos" também precisa de checagem antes do lançamento. |

---

## 2. Pendências técnicas

| # | Tema | Opções | Recomendação provisória |
|---|---|---|---|
| T1 | **Provedor de OCR** | API cloud (Google/Azure/OpenAI-vision) vs on-device | Cloud no MVP (acurácia) — contrata DPA/LGPD (ver `09` §5) |
| T2 | **Transporte realtime** | WebSocket vs SSE | WebSocket (já previsto em `08`); SSE é fallback possível |
| T3 | **Backend/stack** | definir | Fora desta spec (SDD técnica) |
| T4 | **Onde roda o cálculo** | só servidor vs servidor + preview cliente | Preview cliente + **validação final no servidor** (`07` §7) |
| T5 | **Geração do QR** | cliente vs servidor | Cliente (não depende de backend) |
| T6 | **Compressão de imagem** | client-side (canvas) | Sim — antes do upload (`09` §1). |

---

## 3. Pendências de documentação/design

| # | Item | Ação |
|---|---|---|
| M1 | **Regenerar `telas.png`** com a numeração canônica de `04-telas.md` (atual png tem faltas 9/18, duplicata 23, e mistura telas pós-MVP 25/27 no fluxo). | Design |
| M2 | **Dataset antigo** (valores 45,10 / 68,20 / 75,16 / 80 / 65 do braindump) está **proibido** — só dataset canônico de `02`. | Revisão |
| M3 | Exemplo do braindump §17 (serviço pós-desconto) **está incorreto** — corrigido em `07` §2.2. | Feito |
| M4 | Mapear cada item do checklist (`11`) para tela e regra (rastreabilidade). | Feito em `11` |

---

## 4. Riscos aceitos no MVP

1. **Sem TTL** (D1): crescimento de storage + foto retida indefinidamente.
2. **Sem autenticação** (§4 de `09`): link equivocado dá acesso à divisão.
3. **Edição aberta para todos** (`05`): maior chance de conflito — mitigado por versionamento; UX de conflito precisa ser boa.
4. **"Qualquer participante fecha a conta"** (`05` §9): mitigado por guarda de zero pendências + confirmação.
5. **OCR instável em comandas ruins** (T1): mitigado pelo fallback manual obrigatório.
# 11 — Checklist MVP com Critérios de Aceite

Cada item: **[tela]** → **[regra]**. Aceites em Given/When/Then nas regras críticas.

---

## A. Criação e OCR

- [ ] Criar conta **[01→02]**
- [ ] Fotografar / escolher da galeria **[02,03]**
- [ ] OCR com progresso **[04]** `09` §2
- [ ] **Fallback manual obrigatório** (falha → tela 05 → digitar) **[05,06]** `05` §1
- [ ] Conferir comanda: itens, qtd, preços, subtotal, taxas, total **[06]**
- [ ] "Ver comanda" (imagem original p/ validar OCR) **[06,07]**
- [ ] Editar item: nome/qtd/preço unitário (total derivado, somente leitura) **[07]** `07` §1
- [ ] Adicionar/remover/editar taxas e descontos, sem presumir **[08]** `07` §2.1
- [ ] Regra de distribuição por cobrança (proporcional / igual por pessoa) **[08]** `07` §2.4
- [ ] Mesclar itens duplicados do OCR **[06]** `05` §6.4
- [ ] Validação de total com tolerância de 5¢ **[09]** `07` §3
- [ ] Confirmar comanda **[10]**

**Aceites-chave:**

> **A1 — Fallback OCR**
> Given o OCR falhou (timeout/erro)
> When aparece a tela 05 e o usuário escolhe "Digitar manualmente"
> Then a tela 06 abre vazia com "Adicionar item" e a conta pode ser totalmente montada sem OCR

> **A2 — Divergência bloqueia**
> Given subtotal 210 + taxas 21 − descontos 0 = 231 e total impresso 232 (diferença R$ 1,00)
> When o usuário tenta "Confirmar comanda"
> Then a tela 09 exibe Calculado vs **Total impresso (meta)** e só oferece [Corrigir]; a confirmação é impossível até a diferença ≤ R$ 0,05

> **A3 — Tolerância de centavos**
> Given diferença de R$ 0,03
> When o usuário confirma
> Then avança sem tela de divergência e sem pendência; o residual fica em `conta.ajusteArredondamento` e **nenhum valor de item/taxa exibido é alterado**

> **A4 — Unitário é autoridade**
> Given cerveja 4 × R$ 9,00 (total R$ 36,00)
> When o usuário muda a quantidade para 5 na tela 07
> Then o total vira R$ 45,00 e o unitário permanece R$ 9,00 (não existe campo de total editável)

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
- [ ] Confirmar meu consumo (só o próprio confirma) **[22]** `05` §7
- [ ] Detalhe por pessoa **[16]**
- [ ] Modo 1: dividir entre pessoas **[17,18]** `07` §4.1
- [ ] Modo 2: distribuir unidades (nunca > quantidade) **[19]** `07` §4.2
- [ ] Modo 3: personalizar por valor e por % **[20]** `07` §4.3
- [ ] Validação: soma da divisão = valor do item **[19,20]** `07` §4
- [ ] Itens parcialmente/completamente divididos **[14]** `06` §2
- [ ] Item dividido: editar novamente / trocar modo com confirmação **[17,21]** `05` §6.2
- [ ] Editar quantidade de item dividido preserva divisão (excedente = pendência) **[07]** `05` §6.1
- [ ] Atribuir item a placeholder com sinalização **[18]** `05` §4
- [ ] Progresso da conta e por participante **[13,14]** `07` §8

**Aceites-chave:**

> **C1 — Unidades não estouram**
> Given cerveja 4 × R$ 9,00
> When a soma das unidades tenta chegar a 5
> Then o stepper impede (máx. 4) e [Confirmar] só habilita em "4 de 4"

> **C2 — Personalização fecha exata**
> Given item R$ 60,00 com João 30 + Maria 20 (falta R$ 10)
> When o usuário tenta confirmar
> Then botão desabilitado com "A divisão não falta — falta R$ 10,00"; ao colocar Pedro 10 → ✓ confere → confirma

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
- [ ] Garantia Σ = total **`07` §7**
- [ ] Desconto > total da comanda é bloqueado (validação `total ≥ 0`) **[08]** `07` §5.1

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

> **D5 — Ajuste de arredondamento isolado**
> Given comanda com divergência de R$ 0,03 (≤ 5¢)
> When o valor é absorvido
> Then `conta.ajusteArredondamento` guarda o residual e **nenhum item ou taxa exibido muda** (ex.: serviço continua R$ 21,00) e Σ partes = total

> **D6 — Couvert igual por pessoa**
> Given couvert artístico R$ 90,00 com `regraDistribuicao = IGUAL_POR_PESSOA` e 6 participantes
> When a conta é calculada
> Then cada um paga R$ 15,00 (R$ 90 ÷ 6), **independentemente do consumo**, e Σ da cobrança = R$ 90,00

---

## E. Acompanhamento e partes

- [ ] Minha parte em tempo real **[22]**
- [ ] Barra fixa "Minha parte" na conta (valor + estado, toque → 22) **[13,14,15,16,23,24]** `04`
- [ ] Fechar minha parte / parte conferida **[24]** `05` §8
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
- [ ] Pendência "não informou" resolvida **só pelo criador** com escolha explícita (4 opções) **[23]** `05` §7
- [ ] Revisão final com zero pendências **[25]**
- [ ] **Qualquer participante** pode fechar conta **[25]** `05` §9
- [ ] Confirmação + bloqueio pós-fechamento **[26]**
- [ ] Resumo compartilhável **[27]**

**Aceites:**

> **F1 — Fechamento bloqueado**
> Given um item não dividido OU um participante NAO_INFORMOU
> Then [Fechar conta] desabilitado e a pendência aparece em 23

> **F2 — Resolução explícita**
> Given Carlos NAO_INFORMOU
> When o criador abre a pendência
> Then escolhe entre [Marcar R$ 0,00] [Dividir entre todos] [Personalizar] [Desvincular consumos] — nunca há atribuição automática

> **F3 — Fechamento**
> Given zero pendências
> When qualquer participante toca [Fechar conta] e confirma
> Then conta → FINALIZADA; toda edição é rejeitada (servidor 409) e o resumo (27) é gerado com Σ = 231,00

> **F4 — Desvincular consumos (placeholder fantasma)**
> Given Lucas nunca entrou, mas recebeu a cerveja 2 × R$ 9,00 de alguém
> When o criador escolhe [Desvincular consumos]
> Then as cervejas voltam a NAO_DIVIDIDO/pendência e seguem pelo fluxo normal 17–21; a pendência "não informou" de Lucas permanece até resolução

> **F5 — Atribuído ≠ confirmado**
> Given Ana tem R$ 24,20 atribuídos, mas nunca confirmou (Aguardando confirmação)
> Then não gera pendência, e ela própria pode confirmar em Minha parte (ou fechar parte) para virar ✓ Confirmado

---

## G. Confiabilidade

- [ ] Indicador 🟢/🟡/🔴 **`08` §5**
- [ ] Offline: leitura + bloqueio de operações críticas, sem otimismo **`08` §6**
- [ ] Validação no servidor de tudo **`07` §7**, `09` §4
- [ ] Versionamento + UX de conflito (409) **`08` §4**
- [ ] Proteção "unidades > quantidade" **C1**
- [ ] Proteção Σ = total **D1**
- [ ] IDs indevinháveis **`09` §4**
- [ ] Acessibilidade: estados com texto **`09` §6**

> **G1 — Offline não mente**
> Given usuário offline
> When tenta confirmar uma divisão
> Then vê "🔴 Não foi possível confirmar — [Tentar novamente]" e o card **não** mostra ✓ dividido

> **G2 — Conflito**
> Given João e Maria abrem o mesmo item (versão 12)
> When os dois salvam
> Then o segundo recebe 409 com `serverState` → diálogo "A cerveja foi atualizada por João · Valor atual 5 × R$ 9,00 vs Sua alteração 4 × R$ 9,00 · [Usar valor atual] [Editar novamente]"; sem fetch extra, Σ nunca quebra

---

## Fora do MVP (não contar aqui)

Pagamento/Pix, "Já paguei", pagamento por terceiros, histórico, cardápio, push, TTL, remoção de participante, separar itens, múltiplas moedas — ver `01-visao-escopo.md` §5 e `10-decisoes-aberto.md`.
