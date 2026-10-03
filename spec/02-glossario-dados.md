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
