# Conta Juntos: Especificação Funcional do MVP

| Campo | Valor |
|---|---|
| Versão | 2.0 |
| Data | 09/10/2026 |
| Status | Pronta para a SDD técnica (decisões técnicas em aberto listadas em §10.2) |
| Substitui | v1 (preservada em `spec_v1.md`) |
| Base da revisão | `analise_spec_codex.md` (R01 a R19) e `analise_spec_claude.md` (C01 a C20 e itens P3); rastreabilidade no Apêndice A |
| Referência visual | `EDB063B6-4E6A-413A-84EF-DC5F00C4D877.png` (telas 01 a 21); correções pendentes em §10.3. `image.png` está obsoleto |

**Como ler as referências:** `§5.8` aponta para o capítulo 5, seção 8 deste documento. Telas são citadas pelo número canônico com dois dígitos (`tela 06`). Critérios de aceite são citados com o prefixo CA e o identificador do capítulo 11 (`CA-D8`), para não confundir com as decisões D1 a D31 do capítulo 10.

**Regra de precedência:** quando o mockup e esta spec divergirem, vale a spec. Quando duas seções divergirem, vale a regra mais restritiva e a divergência deve ser corrigida no documento.

---

# 1. Visão e escopo

## 1.1 Visão do produto

PWA mobile-first para dividir a conta de restaurante de forma colaborativa.

Uma pessoa fotografa a comanda, o sistema interpreta itens e valores (OCR), a mesa entra por QR Code ou link sem instalar nada e cada pessoa informa o que consumiu. O sistema calcula quanto cada um paga, incluindo taxas, descontos, ajustes combinados pela mesa e arredondamentos.

```text
Fotografe a comanda → Convide a mesa → Cada um marca o que consumiu → Veja sua parte
```

## 1.2 Princípios

1. **O usuário informa o que consumiu. O sistema resolve a matemática.** Ninguém precisa entender proporção, rateio, percentual ou centavos.
2. **Nada é confirmado por silêncio.** Consumo só é confirmado por ação explícita da própria pessoa ou de alguém da mesa agindo em nome dela, com a origem visível.
3. **Nenhuma cobrança é presumida.** Toda taxa ou desconto vem da comanda ou de uma decisão explícita da mesa.
4. **A comanda é conferida contra o total impresso.** O que a mesa decide pagar a mais ou a menos (gorjeta extra, serviço dispensado) fica separado do que o restaurante cobrou.
5. **Nunca existe conta travada sem saída.** Toda pendência tem pelo menos uma ação que a resolve, acessível a quem está na mesa.

## 1.3 Domínio conceitual

```text
┌──────────────┐
│   COMANDA    │  O que o restaurante cobrou (itens, taxas e descontos impressos, total impresso)
└──────┬───────┘
       ▼
┌──────────────┐
│   CONSUMO    │  Quem consumiu cada item, como foi dividido e o que a mesa combinou
│              │  (gorjeta extra, serviço dispensado, couvert entre algumas pessoas)
└──────┬───────┘
       ▼
┌──────────────┐
│  PAGAMENTO   │  Quem efetivamente paga cada valor (pós-MVP; sem entidade nem interface no MVP)
└──────────────┘
```

O MVP termina em "quanto cada um deve" e no resumo compartilhável. A camada de pagamento não tem entidade no modelo do MVP (§10.1 D30): quando entrar, será um acréscimo, sem remodelar comanda nem consumo.

## 1.4 Princípios de UX

1. Perguntar "O que você consumiu?", nunca "Qual percentual deseja atribuir?".
2. Perguntar "Como dividir este item?", sem expor conceitos técnicos.
3. Quem entra não instala nada, não cria conta e não informa e-mail.
4. Cada pessoa vê o tempo todo quanto está pagando ("Minha parte"), e enquanto a divisão não termina o rótulo diz "até agora".
5. A matemática fica escondida, mas é sempre auditável no detalhe da pessoa.
6. O tempo real é visual e não intrusivo: os cards mudam no lugar, sem toast por evento. Banners só para eventos que exigem atenção (§8.6).
7. O OCR é uma sugestão editável de forma rápida, com a foto original sempre à mão.
8. Toda ação feita em nome de outra pessoa mostra quem fez ("Resolvido por Ray em nome de Thais").
9. Status nunca dependem só de cor ou ícone: sempre texto e ícone.

## 1.5 Atores

| Ator | Descrição |
|---|---|
| **Criador** | Quem iniciou a conta. É identificado antes da comanda (nome e avatar) e também é participante da divisão. Tem só duas ações exclusivas: rotacionar o link de convite e excluir a conta (§5.1). |
| **Participante** | Quem entrou pelo link ou QR. Sem cadastro, sem login. Pode editar a comanda, dividir itens, pré-cadastrar vagas, resolver pendências de outras pessoas (com origem visível) e fechar a conta quando não houver pendências. |
| **Convidado pré-cadastrado** | Nome reservado por alguém da mesa (placeholder). Pode receber itens. Não age até entrar; outra pessoa pode confirmar o consumo em nome dele. |

## 1.6 Escopo do MVP

### Dentro do MVP

- Criar conta com identificação do criador; fotografar ou escolher da galeria; OCR com fallback manual; entrada manual sem foto.
- Conferência da comanda: itens, quantidades, preços (por unitário ou por total da linha), taxas e descontos impressos, total impresso obrigatório, tolerância de 5 centavos, ajuste de divergência explícito.
- Convite por QR Code e link; entrada sem cadastro; reentrada pelo mesmo aparelho; recuperação de identidade em outro aparelho com aprovação da mesa ("Sou eu").
- Pré-cadastro de vagas; limite de 6 vagas por conta (configurável); remoção de participante sem consumo.
- Presença, tempo real, indicador de sincronização e estado offline honesto.
- Três modos de divisão: entre pessoas, por unidades, personalizado (valor ou percentual), com salvamento parcial no personalizado.
- Ajustes da mesa: dispensar taxa (total ou para algumas pessoas), gorjeta extra, acréscimos e descontos combinados.
- Minha parte, visão de pessoas, detalhe por pessoa, confirmar meu consumo, fechar minha parte.
- Pendências estruturadas, resolução em nome de outra pessoa, revisão final, fechamento da conta e resumo compartilhável.
- Sair e apagar dados deste dispositivo, anonimizar meus dados, excluir conta (criador), rotacionar link (criador).

### Fora do MVP

- Pagamento (Pix, "Já paguei", pagamento por terceiros) e a entidade de pagamento.
- Histórico de contas, cardápio, restaurantes, múltiplas moedas.
- Despesas domésticas, recorrência, grupos permanentes, integração bancária, estatísticas, exportação contábil.
- Notificações push (lembretes usam o compartilhamento nativo e o WhatsApp).
- Colaboração offline com fila de operações.
- Separar um item em dois, desconto vinculado a um item específico, reabrir conta finalizada, transferir o papel de criador.

Lista consolidada e motivo de cada exclusão em §10.5.

## 1.7 Público e contexto de uso

- Celular em primeiro lugar, uso com uma mão, em pé ou à mesa. Prioridade: celular > tablet > desktop.
- Idioma pt-BR.
- Funciona no navegador sem instalação. Instalar como PWA é opcional e não pode ser requisito de nenhum fluxo (§9.3).

## 1.8 Referência visual

O mockup `EDB063B6-4E6A-413A-84EF-DC5F00C4D877.png` cobre as telas 01 a 21 com a marca "Conta Juntos" e a comanda do dataset canônico (§2.6). As telas 22 a 28, os estados de erro e os diálogos novos desta versão ainda não foram desenhados. A lista de correções do mockup está em §10.3.

---

# 2. Glossário e modelo de dados

## 2.1 Glossário

| Termo | Definição |
|---|---|
| **Conta** | Sessão colaborativa de divisão de uma mesa. Identificada internamente por `id` e acessada pelo link de convite. |
| **Comanda** | O que o restaurante cobrou: itens, quantidades, preços, taxas e descontos impressos e o total impresso. |
| **Total impresso** | Total que aparece na comanda (`totalInformado`). É a referência da conferência e é obrigatório para confirmar a comanda. |
| **Item** | Linha da comanda: nome, quantidade e preço. A autoridade do preço é o unitário ou o total da linha (`modoPreco`, §7.2). |
| **Cobrança** | Taxa (soma) ou desconto (subtrai). Tem escopo **da comanda** (impressa, entra na conferência) ou **da mesa** (combinada pela mesa, fora da conferência). |
| **Ajuste de conciliação** | Diferença de até 5 centavos entre o total impresso e o total da comanda, absorvida automaticamente e rateada (§7.5). Não é uma cobrança armazenada. |
| **Ajuste de divergência** | Cobrança explícita da comanda criada por alguém da mesa quando a diferença passa de 5 centavos e a mesa aceita o total impresso como correto (§7.5.2). |
| **Dispensa** | Decisão da mesa de não pagar uma taxa da comanda, no todo ou para algumas pessoas (ex.: serviço opcional). A taxa continua na conferência; sai do total a pagar (§5.12). |
| **Divisão** | Como um item foi atribuído às pessoas: entre pessoas, por unidades ou personalizado (valor ou percentual). |
| **Atribuição** | Registro de quanto de um item cabe a uma pessoa (presença na lista, unidades, valor fixo ou percentual). |
| **Consumo** | Soma das partilhas de itens de uma pessoa. |
| **Parte** | Total individual: consumo + taxas rateadas − descontos rateados ± ajuste de conciliação, sem as parcelas dispensadas. |
| **Saldo não distribuído** | Diferença entre o total a pagar e a soma das partes. Contém itens sem dono, unidades sobrando, valor faltante de divisões parciais e parcelas de cobranças ainda sem dono. Precisa ser zero para fechar. |
| **Total a pagar** | Total conferido − dispensas + cobranças da mesa (§7.4). É o que a mesa paga ao final. |
| **Confirmar meu consumo** | Ação explícita da própria pessoa dizendo que os itens atribuídos a ela estão corretos. |
| **Resolver em nome de** | Ação explícita de alguém da mesa que confirma ou zera o consumo de outra pessoa, registrando quem fez (§5.9). |
| **Fechar minha parte** | Ação individual que confirma o consumo e marca o valor atual da parte como conferido (`PARTE_CONFERIDA`). Pode reabrir até a conta finalizar. Não fecha a conta. |
| **Fechar conta** | Ação final, de qualquer participante, possível só com zero pendências. Leva a conta a `FINALIZADA`. |
| **Vaga** | Lugar na conta. Limite padrão de 6, contando participantes que entraram e pré-cadastrados. |
| **Placeholder** | Participante pré-cadastrado que ainda não entrou (`CONVIDADO`). |
| **Reivindicação ("Sou eu")** | Pedido de alguém em outro aparelho para assumir um participante já existente, aprovado por outra pessoa da mesa (§5.3.4). |
| **Pendência** | Algo que impede o fechamento. Lista derivada e servida pelo servidor (§2.4). |
| **Revisão** | Contador da conta incrementado a cada mutação aplicada, usado para ordenar eventos e no fechamento (§8.5). |

## 2.2 Entidades

Campos marcados como "derivado" são calculados e servidos pelo servidor e nunca aceitos como entrada.

```text
Conta
├── id: string                       (UUID v4 aleatório; interno, nunca usado como credencial)
├── joinToken: string                (credencial do link, ≥128 bits de segredo; rotacionável; pode ser derivada
│                                     por HMAC em vez de armazenada; §5.2)
├── estado: CRIANDO | OCR_PROCESSANDO | OCR_ERRO | AGUARDANDO_CONFERENCIA | ABERTA | FINALIZADA   (§6.1)
├── criadoPor: participanteId
├── nomeRestaurante?: string         (≤ 60; texto não confiável, §2.5)
├── mesa?: string                    (≤ 20)
├── numeroComanda?: string           (≤ 20)
├── imagemComanda?: referência privada   (sem EXIF; acesso autorizado; purga §9.5)
├── tentativaOcrVigente?: tentativaOcrId (§6.2)
├── totalInformado?: centavos        (obrigatório para confirmar a comanda)
├── limiteVagas: int                 (padrão 6)
├── comandaConfirmadaEm?, finalizadaEm?, criadoEm, atualizadoEm: datetime
├── versao: int                      (dados da conta: restaurante, mesa, totalInformado)
├── revisao: int64                   (§8.5)
├── itens: Item[]
├── cobrancas: Cobranca[]
└── participantes: Participante[]
```

```text
TentativaOcr
├── id: string
├── estado: PROCESSANDO | CONCLUIDA | FALHOU | CANCELADA | EXPIRADA
├── iniciadaEm, finalizadaEm?: datetime
└── codigoErro?: string              (ex.: OCR-04; nunca detalhes internos)
```

```text
Item
├── id: string
├── nome: string                     (1 a 60; texto não confiável)
├── quantidade: int                  (1 a 999)
├── modoPreco: UNITARIO | TOTAL_LINHA                               (§7.2)
├── precoUnitario?: centavos         (autoridade em UNITARIO; informativo em TOTAL_LINHA quando exato)
├── valorTotal: centavos             (autoridade em TOTAL_LINHA; derivado em UNITARIO)
├── modoDivisao?: ENTRE_PESSOAS | UNIDADES | PERSONALIZADO_VALOR | PERSONALIZADO_PERCENTUAL
│                                    (nulo enquanto não houver atribuição)
├── atribuicoes: Atribuicao[]
├── estado: derivado: NAO_DIVIDIDO | DIVISAO_INCOMPLETA | DIVIDIDO | EXCLUIDO (quando excluidoEm existe)  (§6.3)
├── origem: OCR | MANUAL
├── excluidoEm?, excluidoPor?        (item excluído: fora dos cálculos e das listas; restaurável, §5.6.2)
└── versao: int
```

```text
Atribuicao                           (no máximo uma por participante por item; tipo único por item)
├── participanteId
├── unidades?: int ≥ 0               (UNIDADES)
├── valorFixo?: centavos ≥ 0         (PERSONALIZADO_VALOR)
├── percentualBp?: int 0..10000      (PERSONALIZADO_PERCENTUAL; 10000 = 100%)
└── valor: derivado: partilha em centavos (§7.6)
                                     (ENTRE_PESSOAS: basta estar na lista)
```

```text
Cobranca
├── id: string
├── descricao: string                (1 a 40; texto não confiável)
├── tipo: TAXA | DESCONTO            (sinal: TAXA soma, DESCONTO subtrai)
├── escopo: COMANDA | MESA           (§5.12)
├── valor: centavos ≥ 0
├── percentualBp?: int               (quando a comanda informa percentual; 1000 = 10%)
├── baseCalculo: derivado            (total de itens, quando origemValor = CALCULADO_DE_PERCENTUAL)
├── origemValor: IMPRESSO_FIXO | CALCULADO_DE_PERCENTUAL | MANUAL_FIXO
├── origem: OCR | MANUAL | AJUSTE_DIVERGENCIA
├── regraDistribuicao: PROPORCIONAL_CONSUMO | IGUAL_POR_PESSOA
├── participantesRateio?: participanteId[]   (obrigatório para fechar quando IGUAL_POR_PESSOA;
│                                             sempre explícito; sem inclusão automática)
├── dispensa: NENHUMA | TOTAL | PARCIAL      (só TAXA, escopo COMANDA, PROPORCIONAL_CONSUMO)
├── dispensadaPara?: participanteId[]        (quando PARCIAL)
├── confirmada: boolean              (§6.5)
├── motivoRevisao?: OCR_SEM_PERCENTUAL | OCR_SO_PERCENTUAL | PERCENTUAL_INCOMPATIVEL
├── confirmadaPor?: participanteId
└── versao: int
```

```text
Participante
├── id: string
├── nomeExibido: string              (1 a 30; texto não confiável)
├── avatar: { inicial, cor }         (cor de um conjunto fixo; §10.1 D11)
├── estado: CONVIDADO | ATIVO | PARTE_CONFERIDA                      (§6.4)
├── consumoConfirmado: boolean
├── origemConfirmacao?: PROPRIA | EM_NOME_DE
├── confirmadoPor?: participanteId   (quando EM_NOME_DE)
├── confirmadoEm?: datetime
├── versaoConsumo: int               (incrementa quando as atribuições da pessoa mudam; §5.8.2)
├── valorConferido?: centavos        (valor da parte no momento de "Fechar minha parte")
├── conferidaEm?: datetime
├── preCadastradoPor?: participanteId
├── entrouEm?: datetime
├── anonimizado: boolean
└── versao: int                      (nome e avatar)
```

```text
Sessao                               (servidor; o cliente só tem o cookie opaco)
├── id, contaId, participanteId
├── criadaEm, ultimoUsoEm, revogadaEm?: datetime
└── motivoRevogacao?: SAIR | REIVINDICACAO | REMOCAO | EXCLUSAO | EXPIRACAO
```

```text
Reivindicacao                        (§5.3.4)
├── id, contaId
├── participanteAlvo: participanteId
├── estado: PENDENTE | APROVADA | RECUSADA | EXPIRADA
├── solicitadaEm, decididaEm?: datetime
└── decididaPor?: participanteId
```

## 2.3 Valores derivados

Calculados pelo servidor a cada mutação (fórmulas em §7.4 e §7.8) e servidos junto com o estado:

| Derivado | Significado |
|---|---|
| `totalItens` | Soma dos valores dos itens |
| `totalComanda` | Itens + cobranças da comanda (taxas − descontos) |
| `diferenca` | `totalInformado − totalComanda`, com sinal |
| `ajusteConciliacao` | `diferenca` se `|diferenca| ≤ 5`; senão 0 |
| `totalConferido` | `totalComanda + ajusteConciliacao` |
| `totalDispensado` | Soma das parcelas dispensadas |
| `totalMesa` | Cobranças da mesa (taxas − descontos) |
| `totalAPagar` | `totalConferido − totalDispensado + totalMesa` |
| `partes[]` | Por participante: linhas de consumo, cada cobrança rateada, ajuste, dispensas e parte |
| `saldoNaoDistribuido` | `totalAPagar − Σ partes`, com sinal, detalhado por origem |
| `pendencias[]` | §2.4 |
| `progresso` | Itens divididos / total de itens; pessoas confirmadas / participantes |

## 2.4 Pendências

Lista derivada. O cliente nunca infere pendências varrendo o estado: exibe a lista servida.

```text
Pendencia
├── id: string            (determinístico: "<tipo>:<entidadeId>"; estável entre recálculos)
├── tipo: ver tabela
├── entidadeId: string    (item, cobrança, participante ou conta)
├── valorFaltante?: centavos
└── mensagem: string      (texto pronto para a UI)
```

| Tipo | Quando existe | Quem resolve | Ação |
|---|---|---|---|
| `ITEM_NAO_DIVIDIDO` | item com valor > 0 sem atribuição | qualquer participante | dividir (17) |
| `UNIDADES_NAO_DISTRIBUIDAS` | item em UNIDADES com unidades sem dono | qualquer participante | distribuir (19) |
| `DIVISAO_INCOMPLETA` | item personalizado com valor faltante | qualquer participante | completar (20) |
| `PARTICIPANTE_NAO_INFORMOU` | ATIVO sem atribuição e sem confirmação | a pessoa ou alguém em nome dela | §5.9 |
| `PARTICIPANTE_NAO_CONFIRMOU` | ATIVO com atribuição e sem confirmação | a pessoa ou alguém em nome dela | §5.9 |
| `PARTICIPANTE_AGUARDANDO_ENTRADA` | CONVIDADO com atribuição e sem confirmação | alguém em nome dele, ou ele ao entrar | §5.9 |
| `COBRANCA_NAO_CONFIRMADA` | cobrança com `confirmada = false` | qualquer participante | confirmar ou editar (08) |
| `COBRANCA_SEM_RATEIO` | IGUAL_POR_PESSOA sem `participantesRateio`, ou proporcional sem base (`totalItens = 0`) | qualquer participante | definir quem divide (08) |
| `DIVERGENCIA_COMANDA` | `|diferenca| > 5` | qualquer participante | corrigir ou criar ajuste (09) |

Não geram pendência: vaga vazia (CONVIDADO sem atribuição de item e fora de cobranças iguais por pessoa), item de valor zero, pessoa sem itens com confirmação.

Toda pendência bloqueia o fechamento da conta. `COBRANCA_NAO_CONFIRMADA` e `DIVERGENCIA_COMANDA` também bloqueiam a confirmação da comanda (§6.1).

## 2.5 Convenções

- **Dinheiro:** centavos em inteiro de 64 bits. Nunca ponto flutuante. Exibição `R$ 1.234,56`.
- **Datas:** ISO-8601 em UTC; exibição no fuso do aparelho.
- **Tokens e segredos:** 128 bits ou mais, de fonte criptográfica. **IDs de entidades:** UUID v4 (122 bits aleatórios), que não são credenciais. Nenhum ID público é sequencial nem ordenado por tempo.
- **Versões:** toda entidade editável tem `versao`; o participante tem também `versaoConsumo` (§8.3).
- **Texto não confiável:** nome de participante, nome e descrição de item e cobrança, restaurante, mesa e todo texto vindo do OCR. Validado no servidor (tamanho, caracteres de controle) e sempre escapado na renderização, inclusive no texto do resumo (§9.4.6).
- **Exemplos:** todo valor desta spec vem do dataset canônico (§2.6) ou está marcado como **cenário de teste**.

## 2.6 Dataset canônico

### Comanda: Restaurante Bistrô, Mesa 12, Comanda 087

| Item | Qtd | Unitário | Total | modoPreco |
|---|---:|---:|---:|---|
| Pizza Margherita | 1 | 120,00 | 120,00 | UNITARIO |
| Cerveja | 4 | 9,00 | 36,00 | UNITARIO |
| Refrigerante | 4 | 6,00 | 24,00 | UNITARIO |
| Batata frita | 1 | 30,00 | 30,00 | UNITARIO |
| **Total de itens** | | | **210,00** | |

```text
Serviço 10%      R$ 21,00   (impresso: "Serviço 10% 21,00"; IMPRESSO_FIXO, escopo COMANDA, proporcional)
Total impresso   R$ 231,00
Conferência: 210,00 + 21,00 − 0 = 231,00 (diferença 0)
```

### Participantes (6 vagas)

Nery (criador), Ray, Nath, Davi, Thais, Gabriel.

### Divisão canônica

| Item | Modo | Atribuição | Partilhas |
|---|---|---|---|
| Pizza Margherita | Entre pessoas | Nery, Ray, Nath | 40,00 cada |
| Cerveja | Unidades | Nery 1, Ray 1, Nath 1, Davi 1 | 9,00 cada |
| Refrigerante | Unidades | Davi 1, Thais 2, Gabriel 1 | 6,00 / 12,00 / 6,00 |
| Batata frita | Personalizado (valor) | Nery 10,00, Ray 10,00, Nath 10,00 | 10,00 cada |

### Resultado (verificado em centavos)

| Pessoa | Itens | Serviço 10% | **Parte** |
|---|---:|---:|---:|
| Nery | 59,00 | 5,90 | **64,90** |
| Ray | 59,00 | 5,90 | **64,90** |
| Nath | 59,00 | 5,90 | **64,90** |
| Davi | 15,00 | 1,50 | **16,50** |
| Thais | 12,00 | 1,20 | **13,20** |
| Gabriel | 6,00 | 0,60 | **6,60** |
| **Σ** | **210,00** | **21,00** | **231,00** |

```text
Nery:    pizza 40,00 + cerveja 9,00 + batata 10,00   = 59,00
Ray:     pizza 40,00 + cerveja 9,00 + batata 10,00   = 59,00
Nath:    pizza 40,00 + cerveja 9,00 + batata 10,00   = 59,00
Davi:    cerveja 9,00 + refrigerante 6,00            = 15,00
Thais:   refrigerante 12,00 (2 un.)                  = 12,00
Gabriel: refrigerante 6,00                           =  6,00
```

No estado final todos têm o consumo confirmado: cinco pela própria pessoa e Thais por Ray, em nome dela (exemplo de origem visível, §5.9). O saldo não distribuído é zero e não há pendências.

## 2.7 Estados intermediários de referência

Usados em telas e aceites. O serviço proporcional usa como base o total de itens (R$ 210,00) e só distribui centavos de resto quando não há valor sem dono (§7.7.1).

| Estado | Divisões feitas | Partes | Saldo não distribuído |
|---|---|---|---|
| **E-1** | só a pizza (Nery, Ray, Nath) | Nery 44,00 · Ray 44,00 · Nath 44,00 · demais 0,00 | 99,00 (itens 90,00 + serviço 9,00) |
| **E-2** | tudo, menos a batata | Nery 53,90 · Ray 53,90 · Nath 53,90 · Davi 16,50 · Thais 13,20 · Gabriel 6,60 | 33,00 (batata 30,00 + serviço 3,00) |
| **Final** | divisão canônica | §2.6 | 0,00 |

Nos três estados vale `Σ partes + saldo = 231,00`.

---

# 3. Fluxos

Os fluxos formam um grafo, com laços, condicionais e caminhos paralelos. Cada nó cita a tela do capítulo 4.

## 3.1 Visão geral

```text
CRIAÇÃO (criador)
[01 Home] ─Nova conta─▶ [01 Identificação] ─▶ [02 Capturar] ─foto/galeria─▶ [03 Prévia] ─▶ [04 OCR]
                                                 │  ▲                        │ tirar novamente
                                                 │  └────────────────────────┘
                                                 │ digitar manualmente           sucesso │ falha/timeout
                                                 ▼                                       ▼        ▼
                                          [06 Conferir comanda] ◀── digitar ──────── [05 Fallback]
                                             │   ▲      ▲                               │ tentar de novo → [04]
                              editar item ◀──┤   │      │                               └─ tirar outra foto → [02]
                              [07] [08]      │   │ corrigir
                                             ▼   │
                                      [09 Divergência]? ─ajuste de divergência─▶ [06]
                                             │ confere
                                             ▼
                                      [10 Confirmar] ─▶ [11 Convidar] ─▶ [13 Sala]

ENTRADA (qualquer pessoa com o link)
link/QR ─▶ [12 Entrar] ─┬─ mesmo aparelho ───────────────▶ [13 Sala]
                        ├─ nome de vaga pré-cadastrada ──▶ confirma "Sou eu" ─▶ [13]
                        ├─ "Já estou nesta conta" ───────▶ reivindicação ─aprovada─▶ [13]
                        └─ novo participante ────────────▶ [13]   (sem vaga: "Mesa cheia")

DIVISÃO (laço, qualquer participante)
[14 Itens] ⇄ [15 Pessoas] ⇄ [16 Detalhe]
    │ tocar no item
    ▼
[17 Como dividir] ─▶ [18 Entre pessoas] | [19 Unidades] | [20 Personalizar] ─confirmar─▶ [21 Item dividido]

ACOMPANHAMENTO (paralelo, a qualquer momento)
barra "Minha parte" ─▶ [22 Minha parte] ─▶ [24 Fechar minha parte] ─▶ PARTE_CONFERIDA
[23 Pendências] ─resolver─▶ divisão (17–20) | edição (06–09) | resolução em nome (23)

FECHAMENTO (qualquer participante, só com zero pendências)
[23] zero pendências ─▶ [25 Revisão final] ─▶ confirmação ─▶ [26 Conta finalizada] ─▶ [27 Resumo]

OPÇÕES DA CONTA (a partir de 13–16, 22, 23; em 26 e 27 para quem tem sessão)
[28 Opções] ─▶ editar meu nome · sair e apagar · anonimizar · rotacionar link (criador) · excluir conta (criador)
```

## 3.2 Criação (ator: criador)

| Passo | Tela | Condição |
|---|---|---|
| 1 | 01 Home → [Nova conta] → identificação "Como devemos te chamar?" (nome e avatar). O participante criador é criado aqui, antes da comanda; a conta nasce em `CRIANDO` | nome obrigatório |
| 2 | 02 Capturar: [Foto] ou [Galeria] ou [Digitar manualmente] | câmera negada: instrução + galeria + digitar |
| 3 | 03 Prévia: [Usar esta foto] ou [Tirar novamente] | "Tirar novamente" volta ao passo 2 |
| 4 | 04 Processando OCR (cria uma tentativa de OCR; §6.2) | sucesso → 06 · falha ou 20 s → 05 · [Cancelar leitura] → 02 |
| 5 | 05 Fallback: [Tentar de novo] (nova tentativa com a mesma foto), [Tirar outra foto] (volta a 02) ou [Digitar manualmente] | |
| 6 | 06 Conferir comanda, com edição em 07 e 08 a qualquer momento | total impresso obrigatório |
| 7 | 09 Divergência, só quando `|diferenca| > 5 centavos` | [Corrigir valores] ou [Ajuste de divergência] |
| 8 | 10 Confirmar comanda → `ABERTA` | guarda em §6.1 |
| 9 | 11 Convidar → [Ir para a sala] (13) | o criador já é participante |

**Entrada manual:** [Digitar manualmente] em 02 ou 05 abre a 06 vazia, com [Adicionar item], acesso a 08 e o campo Total impresso obrigatório. Toda conta pode ser montada sem OCR.

**Voltar de 06 para 02:** permitido apenas em `AGUARDANDO_CONFERENCIA`, com confirmação "Descartar a leitura e tirar outra foto? As edições serão perdidas." A conta volta a `CRIANDO`.

Depois do passo 8, qualquer participante pode editar a comanda (§5.6).

## 3.3 Entrada e identidade (ator: qualquer pessoa com o link)

```text
abrir link/QR
   │
   ├── conta excluída ou link rotacionado ──▶ "Este link não é mais válido" (sem revelar detalhes)
   ├── conta FINALIZADA, com sessão ─────────▶ 26 com acesso a 28 (anonimizar, sair, excluir)
   ├── conta FINALIZADA, sem sessão ─────────▶ 26/27 somente leitura · [Já estou nesta conta] (reivindicação)
   ├── aparelho com sessão desta conta ─────▶ 13 (mesmo participante, sem pedir nome)
   └── sem sessão ──▶ 12 Entrar
                        │ digita nome (ou toca em "Já estou nesta conta")
                        ├── nome = vaga CONVIDADO ──▶ "Você é Thais, pré-cadastrada por Nery?"
                        │                              [Sou eu] → vincula (CONVIDADO → ATIVO)
                        │                              [Não sou] → segue como novo participante
                        ├── nome = participante ATIVO ─▶ "Já existe Thais nesta conta. É você em outro aparelho?"
                        │                              [Sou eu, pedir acesso] → reivindicação (§5.3.4)
                        │                              [Não sou] → segue como novo participante
                        └── novo participante ──▶ há vaga? sim → ATIVO · não → "Mesa cheia" (§5.4)
                                                     │
                                                     ▼
                                     "Você consumiu algo nesta mesa?"
                                     [Sim, vou marcar] → 13
                                     [Não, só vim acompanhar] → consumo zero confirmado → 13
```

- A comparação de nomes ignora maiúsculas, acentos e espaços nas pontas.
- Ao vincular uma vaga, a pessoa vê em 22 o que já foi atribuído a ela e pode corrigir.
- Abrir o link em outro navegador do mesmo aparelho (app do WhatsApp, Safari, app instalado) é, para o sistema, outro aparelho. O caminho de recuperação é a reivindicação.

## 3.4 Divisão (ator: qualquer participante)

```text
[14 Itens] ─tocar no item─▶ [17 Como dividir?]
                               ├── [18 Entre pessoas] ─confirmar─▶ [21]
                               ├── [19 Unidades] ─────confirmar─▶ [21]
                               └── [20 Personalizar] ─confirmar─▶ [21]
                                                     └ salvar parcial ─▶ [14] (item incompleto)
[21] ─editar novamente─▶ [17]
```

- O que se marca em 18, 19 e 20 é estado local. Só [Confirmar] ou [Salvar parcial] grava, em um único commit.
- Se o item já tem divisão, 17 mostra a divisão atual. Escolher outro modo avisa "Trocar o modo vai substituir a divisão atual de N pessoas". O aviso não grava nada: a divisão antiga só é substituída quando a nova é confirmada (§5.7). Cancelar em qualquer ponto mantém a divisão antiga.
- Unidades: [Confirmar] só habilita com todas as unidades distribuídas.
- Personalizado: [Confirmar] só habilita com soma exata; [Salvar parcial] grava o que foi digitado e deixa a pendência visível.
- Mudanças feitas por outras pessoas atualizam os cards no lugar, sem modal.

## 3.5 Confirmação e conferência (ator: cada participante; paralelo)

```text
[22 Minha parte]
   ├── [Confirmar meu consumo] ─▶ consumo confirmado (próprio)
   ├── [Não consumi nada] ──────▶ consumo zero confirmado (só sem itens atribuídos)
   └── [Fechar minha parte] ─▶ [24] ─▶ PARTE_CONFERIDA (confirma o consumo e o valor visto)
                                          │
                                          ├── atribuições dela mudam ─▶ ATIVO + consumo a confirmar + aviso
                                          ├── valor da parte muda ─────▶ ATIVO + aviso "de R$ X para R$ Y"
                                          └── [Reabrir minha parte] ───▶ ATIVO
```

- Dividir itens nunca confirma o consumo de ninguém, nem o de quem fez a divisão (§5.8).
- Fechar a parte não fecha a conta e não impede a pessoa de continuar editando.

## 3.6 Pendências e resolução

```text
[23 Pendências]
   ├── pendência de item/cobrança/comanda ─▶ "Ir para a falta" (17–20, 08, 09)
   └── pendência pessoal de X ─▶ diálogo de resolução (qualquer participante; §5.9)
           ├── [Confirmar em nome de X]
           ├── [Remover consumo de X e marcar R$ 0,00]
           └── [Editar itens de X] ─▶ 14/17 ─▶ volta ao diálogo, que exige confirmar
```

[Lembrar pessoas] abre o compartilhamento nativo com texto pronto e o link.

## 3.7 Fechamento (ator: qualquer participante)

```text
zero pendências ─▶ [25 Revisão final] ─[Fechar conta]─▶ confirmação ─▶ CAS no servidor (§8.3.5)
                                                                         ├── ok ─▶ [26] ─▶ [27]
                                                                         └── mudou algo ─▶ volta a 25 com o estado novo
```

Depois de `FINALIZADA`, nenhuma edição de comanda, divisão ou participantes. Só anonimizar os próprios dados e excluir a conta (criador) continuam disponíveis (§5.14).

## 3.8 Estados transversais

| Estado | Efeito em todos os fluxos |
|---|---|
| 🟢 Sincronizado | normal |
| 🟡 Sincronizando | há operação sem resposta; os cards afetados aparecem como "pendente" |
| 🔴 Offline | leitura do último estado; operações bloqueadas com [Tentar novamente]; nada aparece como salvo antes do servidor confirmar |

Detalhes em §8.10.

---

# 4. Telas

Cada tela tem: **Ator · Objetivo · Conteúdo · Pré-condição · Transições**. Os valores vêm do dataset canônico (§2.6) ou dos estados de referência (§2.7). Quando o mockup diverge, a correção está em §10.3.

## 4.1 Inventário

As 28 entradas não são 28 telas físicas. Tipos: **Física** (destino de navegação), **Folha** (bottom sheet ou modal), **Estado** (variação de outra tela), **Confirmação**.

| # | Tela | Tipo | No mockup |
|---|---|---|---|
| 01 | Home e identificação do criador | Física + Estado | sim (sem a identificação) |
| 02 | Capturar comanda | Física | sim |
| 03 | Pré-visualização | Estado (02) | sim |
| 04 | Processando OCR | Estado (02) | sim |
| 05 | Fallback do OCR | Estado (04) | sim |
| 06 | Conferir comanda | Física | sim |
| 07 | Editar item | Folha | sim |
| 08 | Taxas, descontos e ajustes da mesa | Física | sim (sem ajustes da mesa) |
| 09 | Divergência | Folha | sim |
| 10 | Confirmar comanda | Confirmação (06) | sim |
| 11 | Convidar participantes | Física | sim |
| 12 | Entrar na conta | Física | sim |
| 13 | Sala da conta | Física (aba) | sim |
| 14 | Conta: itens | Física (aba) | sim |
| 15 | Conta: pessoas | Física (aba) | sim |
| 16 | Detalhe da pessoa | Física | sim |
| 17 | Como dividir este item | Folha | sim |
| 18 | Dividir entre pessoas | Folha (17) | sim |
| 19 | Distribuir unidades | Folha (17) | sim |
| 20 | Personalizar divisão | Folha (17) | sim |
| 21 | Item dividido | Estado (14) | sim |
| 22 | Minha parte | Física | não |
| 23 | Pendências | Física | não |
| 24 | Fechar minha parte | Confirmação (22) | não |
| 25 | Revisão final | Física | não |
| 26 | Conta finalizada | Física | não |
| 27 | Resumo compartilhável | Física | não |
| 28 | Opções da conta | Folha | não |

Navegação principal: 01 → 02 → 06 → 10 → 11 → 13 ⇄ 14 ⇄ 15 → 16 / 22 / 23 → 25 → 26 → 27. Abas fixas na conta aberta: Sala (13), Itens (14), Pessoas (15).

## 4.2 Fase A: criação

### 01 Home
- **Ator:** qualquer pessoa.
- **Objetivo:** criar uma conta ou entrar em uma existente.
- **Conteúdo:** "Conta Juntos · Divida contas sem complicação" · passos "Fotografe a comanda: revise os itens e convide a mesa" e "Cada um marca o que consumiu" · [+ Nova conta] · [Entrar em uma conta] · "Sem cadastro · Sem instalar" · [Como funciona?].
- **Estado "Identificação do criador":** após [Nova conta]: "Como devemos te chamar?" · nome (obrigatório, até 30 caracteres) · avatar (inicial + cor) · [Continuar]. Cria a conta em `CRIANDO` com o criador como participante `ATIVO`.
- **Transições:** Continuar → 02 · [Entrar em uma conta] → campo para colar o link ou ler o QR → 12.

### 02 Capturar comanda
- **Ator:** criador.
- **Conteúdo:** visor com moldura "Posicione a comanda dentro do quadro" · [Galeria] · [Foto] · [Flash] · **[Digitar manualmente]**.
- **Pré:** conta em `CRIANDO`. Câmera negada: instrução para liberar + [Galeria] + [Digitar manualmente].
- **Transições:** foto ou galeria → 03 · Digitar manualmente → 06 vazia.

### 03 Pré-visualização
- **Ator:** criador.
- **Conteúdo:** imagem · selo de nitidez quando disponível ("Imagem nítida") · "Confira se os valores estão legíveis" · [Usar esta foto] · [Tirar novamente].
- **Transições:** Usar → envia a imagem comprimida → 04 · Tirar novamente → 02.

### 04 Processando OCR
- **Ator:** criador.
- **Conteúdo:** miniatura da comanda · "Interpretando sua comanda… Isso pode levar alguns segundos." · checklist: Imagem recebida · Itens e quantidades · Valores e totais · Taxas e descontos · barra de progresso · [Cancelar leitura].
- **Pré:** tentativa de OCR vigente (§6.2).
- **Transições:** sucesso → 06 · falha ou 20 s sem resultado → 05 · Cancelar leitura → 02 (a tentativa é cancelada e qualquer resultado tardio é ignorado).

### 05 Fallback do OCR
- **Ator:** criador.
- **Conteúdo:** "Não conseguimos ler sua comanda" · causas prováveis (desfocada, cortada, pouca luz) · dica para nova foto · [Tentar de novo] · [Tirar outra foto] · [Digitar manualmente] · código do erro ("Erro OCR-04 · nenhuma informação foi salva") · aviso "Você vai informar os itens e o total impresso na próxima tela".
- **Transições:** Tentar de novo → 04 com nova tentativa e a mesma foto · Tirar outra foto → 02 · Digitar manualmente → 06 vazia.

### 06 Conferir comanda ⭐
- **Ator:** criador; depois da confirmação, qualquer participante (pelo [Editar comanda] de 13, 14 e 15).
- **Objetivo:** revisar o que o OCR ou a digitação produziu. É a tela mais importante do produto.
- **Conteúdo:** "Revise antes de convidar a mesa" · lista de itens (nome, `qtd × unitário` ou "total da linha", valor, [Editar]) · [+ Adicionar item] · [Mesclar] quando houver linhas duplicadas · seção recolhida "Itens excluídos (N)" com [Restaurar] (só com a conta aberta) · bloco de cobranças da comanda com acesso a 08 · **Total impresso (campo editável, obrigatório)** · aviso "⚠ N cobranças para conferir" quando houver cobrança não confirmada · [Ver foto] (oculto sem imagem) · [Confirmar comanda].

  ```text
  Pizza Margherita    1 × R$ 120,00   R$ 120,00
  Cerveja             4 × R$   9,00   R$  36,00
  Refrigerante        4 × R$   6,00   R$  24,00
  Batata frita        1 × R$  30,00   R$  30,00
  ─────────────────────────────────────────────
  Subtotal                            R$ 210,00
  Serviço 10%                         R$  21,00
  Total impresso                      R$ 231,00
  [ Confirmar comanda ]
  ```

- **Edição com a conta aberta:** cada salvamento é um commit (sem rascunho). Mudar o total impresso depois da confirmação exige confirmação extra (§5.6.3). Ao surgir diferença acima de 5 centavos, aparece a pendência `DIVERGENCIA_COMANDA` para todos; a conta continua `ABERTA`.
- **Transições:** item → 07 · cobranças → 08 · [Confirmar comanda]: primeiro, com cobrança a conferir → 08 com as cobranças destacadas ("Confira as cobranças antes de continuar"); depois, com diferença > 5 centavos → 09; sem nenhuma das duas → 10 · voltar (só em `AGUARDANDO_CONFERENCIA`) → confirmação de descarte → 02.

### 07 Editar item
- **Ator:** qualquer participante.
- **Conteúdo (folha):** Nome · Quantidade (− / +) · campo de preço conforme `modoPreco` · valor derivado · [Ver comanda original] · [Excluir item] · [Salvar] · [Cancelar]. Teclado numérico nos campos de dinheiro.
  - `UNITARIO`: edita quantidade e preço unitário; "Total derivado" só leitura (4 × R$ 9,00 = R$ 36,00).
  - `TOTAL_LINHA`: edita quantidade e total; unitário informativo, ou "sem preço unitário exato" quando a divisão não é exata (cenário de teste: 3 un. · R$ 10,00). Mudar a quantidade mantém o total, com aviso.
  - Alternar entre `UNITARIO` e `TOTAL_LINHA` faz parte do mesmo salvamento.
- **Regras ao salvar com o item já dividido:** §5.6.1. Excluir item dividido pede "Isso remove R$ X de Nery, Ray e Nath".
- **Transições:** Salvar → aviso de reabertura quando aplicável (§5.11) → 06 · Cancelar → 06.

### 08 Taxas, descontos e ajustes da mesa
- **Ator:** qualquer participante.
- **Conteúdo:** "Nenhuma cobrança é presumida".
  - **Da comanda** (entra na conferência com o total impresso): por cobrança, descrição · valor · percentual e base quando houver · origem do valor (impresso, calculado, manual) · distribuição (Proporcional ao consumo / Igual por pessoa) · quem divide (quando igual) · selo "Confirmada" ou [Confirmar] com o motivo · **"Quem paga esta taxa?"** (só taxa proporcional: Todos / Ninguém (dispensar) / Escolher quem não paga) · editar · remover.
  - **Ajustes da mesa** (fora da conferência): gorjeta extra, acréscimos e descontos combinados, com distribuição e quem divide.
  - [+ Adicionar taxa ou desconto] (pergunta: "Está na comanda?" Sim → escopo comanda · Não → ajuste da mesa).
  - Quadro "Como será dividido?": "A taxa aparece no detalhe de cada pessoa e acompanha as alterações de consumo."

  ```text
  DA COMANDA
  Taxa de serviço   R$ 21,00   10% sobre R$ 210,00 · impresso   ✓ Confirmada
                    Distribuição: Proporcional ao consumo
                    Quem paga: Todos
  AJUSTES DA MESA
  (nenhum)          [ + Adicionar taxa ou desconto ]
  [ Salvar cobranças ]
  ```

- **Cenário de teste (couvert):** "Couvert artístico R$ 90,00 · Igual por pessoa · R$ 15,00 × 6 pessoas". Enquanto ninguém escolher quem divide, mostra "R$ 90,00 · defina quem divide" e gera `COBRANCA_SEM_RATEIO`.
- **Transições:** Salvar → 06 (recalcula a conferência).

### 09 Divergência
- **Ator:** qualquer participante.
- **Condição:** `|diferenca| > 5 centavos` (§7.5).
- **Conteúdo (folha):** "Os valores não conferem" · "Revise os itens, taxas ou total impresso" · Calculado · Total impresso (referência) · Diferença · [Corrigir valores] · [Ajuste de divergência] · explicação do ajuste.

  ```text
  Cenário: refrigerante lido como 4 × R$ 5,75
  Calculado        R$ 230,00
  Total impresso   R$ 231,00
  Diferença        R$   1,00
  [ Corrigir valores ]   [ Ajuste de divergência ]
  ```

- Não existe "Confirmar assim mesmo". Diferenças de até 5 centavos não abrem esta tela (§7.5.1).
- **Transições:** Corrigir valores → 06 · Ajuste de divergência → confirmação "Cria a cobrança 'Ajuste de divergência' de R$ 1,00, dividida proporcionalmente ao consumo" → 06.

### 10 Confirmar comanda
- **Ator:** criador.
- **Conteúdo:** "Tudo pronto para dividir" · checklist: ✓ 4 itens · ✓ Subtotal R$ 210,00 · ✓ Taxas R$ 21,00 · ✓ Total R$ 231,00 · aviso "Após confirmar, qualquer participante poderá ajudar a editar a comanda." · [Confirmar e convidar].
- **Pré:** guarda de §6.1 (total impresso informado, sem divergência acima de 5 centavos, cobranças confirmadas).
- **Transições:** → `ABERTA` → 11.

### 11 Convidar participantes
- **Ator:** qualquer participante.
- **Conteúdo:** "Escaneie ou compartilhe o link" · QR Code · contador "1 de 6 vagas" · link exibido de forma abreviada (ex.: `contajuntos.app/…`) com [Copiar] · [Compartilhar no WhatsApp] · [Copiar link] · bloco "Pré-cadastrar uma vaga: reserve um nome antes da pessoa entrar" com [+ Pré-cadastrar participante] · [Ir para a sala].
- O link completo carrega o `joinToken` no fragmento (§5.2). Nenhum código curto exibido funciona como credencial.
- **Transições:** compartilhar (nativo) · Pré-cadastrar → nome → vaga `CONVIDADO` · Ir para a sala → 13.

## 4.3 Fase B: entrada

### 12 Entrar na conta
- **Ator:** pessoa com o link e sem sessão nesta conta.
- **Conteúdo:** cartão "Restaurante Bistrô · Mesa 12 · 3 de 6 vagas" · "Como podemos te chamar?" · "Sem cadastro e sem e-mail" · nome · avatar · aviso "Ao entrar, você poderá ver e editar a divisão junto com a mesa." · [Entrar na conta] · link [Já estou nesta conta (outro aparelho)].
- **Estados:**
  - **Vaga pré-cadastrada:** "Você é Thais, pré-cadastrada por Nery?" [Sou eu] [Não sou].
  - **Participante existente:** "Já existe Thais nesta conta. É você em outro aparelho?" [Sou eu, pedir acesso] [Não sou] → "Aguardando alguém da mesa aprovar…" (expira em 10 min).
  - **Já estou nesta conta:** lista de participantes; tocar em um nome leva ao estado correspondente acima.
  - **Mesa cheia:** "A mesa está cheia (6 de 6). Peça para alguém remover uma vaga sem consumo." Sem criar participante.
  - **Pergunta de consumo** (novo participante): "Você consumiu algo nesta mesa?" [Sim, vou marcar] [Não, só vim acompanhar].
  - **Link inválido:** "Este link não é mais válido. Peça um novo link a quem está na mesa."
- **Transições:** → 13 · conta finalizada → 26 somente leitura.

### 13 Sala da conta
- **Ator:** participantes.
- **Conteúdo:** "Sala da conta" · [Compartilhar] · contador "6 de 6 participantes" · "Podem começar a dividir agora. Não é preciso esperar todo mundo entrar." · lista com avatar, nome, papel e status (🟢 online · ⚪ offline · 🕓 aguardando entrada · ✓ consumo confirmado · ✓ parte conferida · ⏳ aguardando confirmação · ⚠ não informou) · cartão de progresso ("3 de 4 itens divididos · 4 de 6 pessoas confirmaram · 2 partes conferidas") · [Editar comanda] → 06 · menu ⋯ → 28 · abas Sala / Itens / Pessoas · barra "Minha parte".
- **Por participante (menu):** [Remover da conta] quando a pessoa não tem atribuição, não é o criador nem você (§5.4.3) · [Resolver] quando tem pendência pessoal (§5.9) · [Editar nome] só para vaga pré-cadastrada.
- **Banner de reivindicação:** "Alguém quer entrar como Thais em outro aparelho. [Aprovar] [Recusar]" para todos os conectados, inclusive a própria Thais no aparelho antigo, se ainda estiver conectada.
- **Transições:** → 14 · 15 · 06 · 28.

## 4.4 Fase C: divisão

### 14 Conta: itens
- **Ator:** participantes.
- **Conteúdo:** título "Conta · Bistrô" · abas [Itens] [Pessoas] · por item: inicial, nome, `qtd × preço`, status · "Total da comanda R$ 231,00" · saldo "Ainda não distribuído R$ X" quando houver · [Editar comanda] · barra "Minha parte".
  - Status com texto e ícone: `⚠ Não dividido` · `✓ 3 pessoas` · `✓ 4/4 unidades` · `⚠ 4/5 unidades` · `✓ Personalizado` · `⚠ Faltam R$ 12,00` · `🕓 Aguardando entrada de Thais` (item com placeholder).
- **Estado E-2 (§2.7):**

  ```text
  Pizza Margherita   1 × R$ 120,00   ✓ 3 pessoas
  Cerveja            4 × R$   9,00   ✓ 4/4 unidades
  Refrigerante       4 × R$   6,00   ✓ 4/4 unidades
  Batata frita       1 × R$  30,00   ⚠ Não dividido
  Total da comanda                  R$ 231,00
  Ainda não distribuído             R$  33,00
  Minha parte até agora             R$  53,90  ✓ Consumo confirmado
  ```

- **Transições:** item → 17 · aba → 15 · barra → 22.

### 15 Conta: pessoas
- **Ator:** participantes.
- **Objetivo:** quanto cada um paga e quem ainda precisa confirmar.
- **Conteúdo (final):**

  ```text
  Nery (Eu)   R$ 64,90   ✓ Confirmado
  Ray         R$ 64,90   ✓ Confirmado
  Nath        R$ 64,90   ✓ Confirmado
  Davi        R$ 16,50   ✓ Confirmado
  Thais       R$ 13,20   ✓ Resolvido por Ray (em nome de Thais)
  Gabriel     R$  6,60   ✓ Confirmado
  Total       R$ 231,00
  ```

- **Parte conferida:** quem está em `PARTE_CONFERIDA` mostra também "✓ Parte conferida".
- **Situações de consumo** (texto + ícone, §6.4.3): `✓ Confirmado` · `✓ Resolvido por X (em nome de Y)` · `✓ Sem itens` (com o valor real da parte) · `⏳ Aguardando confirmação` · `⚠ Não informou` · `🕓 Aguardando entrada` · `Vaga vazia`.
- [Editar comanda] → 06 e barra "Minha parte".
- **Transições:** pessoa → 16 · pendência pessoal → diálogo de resolução (§5.9) · Editar comanda → 06.

### 16 Detalhe da pessoa
- **Ator:** participantes (a divisão é transparente para todos).
- **Conteúdo (Nery, final):**

  ```text
  Nery (Eu)          ✓ Confirmado
  Pizza Margherita    R$ 40,00
  Cerveja             R$  9,00
  Batata frita        R$ 10,00
  ─────────────────────────────
  Consumo             R$ 59,00
  Serviço 10%         R$  5,90
  TOTAL               R$ 64,90
  ```

  Linhas adicionais quando existirem: "Ajuste de conciliação ±R$ 0,0X" · "Ajuste de divergência R$ X" · "Serviço 10% R$ 1,50 (dispensado)" riscado · cobranças da mesa ("Gorjeta extra R$ 2,00"). Nota "Transparência da divisão: todos na mesa podem ver este detalhe".
- **Transições:** [Editar meus itens] (própria pessoa) ou [Editar itens de X] → 14 filtrada · [Resolver] quando houver pendência pessoal · voltar → 15.

### 17 Como dividir este item? ⭐
- **Ator:** qualquer participante.
- **Conteúdo (folha):** nome e valor do item · opções: **Dividir entre pessoas** ("Selecione quem consumiu") · **Distribuir unidades** ("Informe quantas unidades por pessoa") · **Personalizar divisão** ("Defina valores ou percentuais") · se já dividido: resumo da divisão atual e aviso de substituição · aviso "Thais está editando este item" quando outra pessoa está na mesma folha (informativo) · [Cancelar].
- **Transições:** → 18 / 19 / 20 · Cancelar → 14.

### 18 Dividir entre pessoas
- **Conteúdo:** marcação por participante (placeholders com "aguardando entrada") · "3 pessoas · R$ 40,00 por pessoa" (pizza) · [Confirmar divisão].
- **Regra:** pelo menos 1 pessoa; valor por pessoa recalculado ao marcar; partilha pelo Maior Resto (§7.6.1).
- **Transições:** Confirmar → 21 · voltar → 17.

### 19 Distribuir unidades
- **Conteúdo:** stepper `− n +` por pessoa · "4 de 4 unidades distribuídas" com barra · "Total distribuído R$ 36,00" · [Confirmar] só habilitado em n de n.
- **Regra:** o stepper é local; nada é gravado a cada toque; sair sem confirmar descarta. Nunca existe "5 de 4". Linha `TOTAL_LINHA` sem unitário exato reparte pelo Maior Resto por pessoa (§7.6.2).
- **Dataset (cerveja):** Nery 1 · Ray 1 · Nath 1 · Davi 1 · Thais 0 · Gabriel 0.
- **Transições:** Confirmar → 21.

### 20 Personalizar divisão
- **Conteúdo:** alternância [Valor] [Percentual] (um modo por item) · campo por participante · "Dividido / Total" · "✓ Divisão confere" ou "⚠ A divisão não fecha: faltam R$ X" (ou "sobram") · [Confirmar] só com soma exata · **[Salvar parcial]**.
- **Dataset (batata, valor):** Nery 10,00 · Ray 10,00 · Nath 10,00 · Davi 0,00 · Thais 0,00 · Gabriel 0,00 → "✓ Divisão confere R$ 30,00".
- **Percentual:** até duas casas decimais; soma exatamente 100%; valores derivados pelo Maior Resto.
- **Salvar parcial:** grava o que foi digitado; o item fica `DIVISAO_INCOMPLETA` com "Faltam R$ X" visível; qualquer pessoa completa depois. Soma acima do total nunca é gravada.
- **Transições:** Confirmar → 21 · Salvar parcial → 14.

### 21 Item dividido
- **Conteúdo:** ✓ · nome, valor e resumo ("R$ 30,00 · dividido entre 3") · partilha por pessoa · confirmação da gravação ("Salvo para toda a mesa") · [Editar novamente] · [Voltar para os itens].
- **Transições:** Editar novamente → 17 · Voltar → 14.

## 4.5 Fase D: acompanhamento

### 22 Minha parte
- **Ator:** o participante deste aparelho.
- **Conteúdo (Nery, final):** mesmo detalhamento de 16 · situação do consumo · ações:
  - [Confirmar meu consumo] quando há itens e o consumo não está confirmado;
  - [Não consumi nada] quando não há itens atribuídos;
  - [Fechar minha parte] → 24;
  - [Reabrir minha parte] quando em `PARTE_CONFERIDA`;
  - [Editar meus itens] → 14 filtrada.
- **Aviso de mudança** (quando a parte reabriu): "Sua parte mudou de R$ 64,90 para R$ 64,65. Confira de novo." ou "Seus itens mudaram. Confirme seu consumo de novo."
- **Transições:** → 24 · → 14 · voltar.

### 23 Pendências
- **Ator:** participantes.
- **Conteúdo:** "Ainda falta resolver" · lista servida (§2.4), cada linha com mensagem e ação · [Lembrar pessoas].

  ```text
  Cenário: estado E-2, com Thais e Gabriel sem confirmar
  ⚠ Batata frita não dividida                      [Ir para a falta]
  ⏳ Thais ainda não confirmou o consumo            [Resolver]
  ⏳ Gabriel ainda não confirmou o consumo          [Resolver]
  [ Lembrar pessoas ]
  ```

- **Diálogo de resolução** (qualquer participante, para outra pessoa; §5.9): título "Resolver por Thais" · consumo atual dela · [Confirmar em nome de Thais] · [Remover consumo de Thais e marcar R$ 0,00] · [Editar itens de Thais] · aviso "Sua ação ficará visível para a mesa".
- Para si mesmo, [Resolver] leva a 22.
- **Transições:** Ir para a falta → 17–20, 08 ou 09 · zero pendências → [Revisar e fechar a conta] → 25.

### 24 Fechar minha parte
- **Ator:** o participante deste aparelho.
- **Conteúdo (confirmação):** detalhamento e total atual · "Ao fechar, você confirma seus itens e o valor de R$ 64,90. Se algo mudar, avisaremos para conferir de novo." · [Fechar minha parte] · [Voltar].
- **Estado após fechar:** "✓ Sua parte foi conferida · R$ 64,90 · Pode mudar até a conta finalizar; avisaremos se mudar." · [Voltar para a conta].
- **Transições:** confirmar → `PARTE_CONFERIDA` · Voltar → 22.

## 4.6 Fase E: fechamento

### 25 Revisão final
- **Ator:** qualquer participante; [Fechar conta] habilitado só com zero pendências.
- **Conteúdo:**

  ```text
  CONFERIR DIVISÃO
  Nery      R$ 64,90
  Ray       R$ 64,90
  Nath      R$ 64,90
  Davi      R$ 16,50
  Thais     R$ 13,20   (resolvido por Ray)
  Gabriel   R$  6,60
  ───────────────────────
  Total da comanda   R$ 231,00
  Total a pagar      R$ 231,00
  ✓ Todos os itens distribuídos
  ✓ Cobranças confirmadas
  ✓ Valores conferem com o total impresso
  ✓ Todos confirmaram (ou foram resolvidos)
  [ Fechar conta ]
  ```

  Quando houver ajustes da mesa, linhas entre os dois totais ("Serviço dispensado −R$ 3,30", "Gorjeta extra +R$ 12,00").
- **Transições:** Fechar conta → confirmação "Depois disso, a divisão será bloqueada para todos" → 26 · rejeição por mudança concorrente → 25 recarregada com aviso "A conta mudou enquanto você revisava" · Voltar → 14.

### 26 Conta finalizada
- **Ator:** todos, inclusive quem abre o link depois.
- **Conteúdo:** "Conta dividida!" · mesma tabela de 25 · data e hora da finalização · "Edição bloqueada" · [Ver resumo] · [Opções da conta] (28) para quem tem sessão · [Já estou nesta conta] para quem não tem (reivindicação, só para acessar as opções de privacidade).
- **Transições:** → 27.

### 27 Resumo compartilhável
- **Ator:** todos.
- **Conteúdo:** resumo em texto · [Compartilhar (WhatsApp)] · [Copiar texto] · [Copiar link] · [Opções da conta] (28) para quem tem sessão.

  ```text
  Conta Juntos · Restaurante Bistrô · Mesa 12 · 09/10/2026
  Nery      R$ 64,90
  Ray       R$ 64,90
  Nath      R$ 64,90
  Davi      R$ 16,50
  Thais     R$ 13,20
  Gabriel   R$  6,60
  Total da comanda   R$ 231,00
  Total a pagar      R$ 231,00
  ```

- O texto é montado com escape de todo texto não confiável (§9.4.6).
- **Transições:** compartilhamento nativo · Home.

## 4.7 Opções da conta

### 28 Opções da conta
- **Ator:** participante deste aparelho.
- **Em `FINALIZADA`:** só aparecem [Sair e apagar dados deste dispositivo], [Anonimizar meus dados] e [Excluir conta] (criador).
- **Conteúdo (folha):** [Editar meu nome e avatar] · [Sair e apagar dados deste dispositivo] · [Anonimizar meus dados] · [Rotacionar link de convite] (só criador) · [Excluir conta] (só criador) · [Como funciona?].
- **Confirmações:**
  - Sair e apagar: "Você sairá deste aparelho e os dados locais serão apagados. A conta continua para a mesa." Para o criador, adiciona: "Para voltar como criador, alguém da mesa precisará aprovar seu acesso."
  - Anonimizar: "Seu nome será trocado por 'Participante 4' e seu avatar removido. Os valores continuam na divisão."
  - Rotacionar link: "O link atual deixa de aceitar novas entradas. Quem já está na conta continua."
  - Excluir conta: "Todos os dados desta conta serão apagados para todos. Digite EXCLUIR para confirmar."
- Regras em §5.14.

## 4.8 Elementos globais

### Indicador de sincronização

| Indicador | Quando |
|---|---|
| 🟢 Sincronizado | conectado e sem operações sem resposta |
| 🟡 Sincronizando… | há operação aguardando resposta; o card afetado fica "pendente" |
| 🔴 Você está offline | sem conexão ou heartbeat falho; operações bloqueadas |

### Banners

Persistentes até a pessoa tocar em "Ok", com agrupamento de eventos repetidos (nunca um toast por evento). A lista canônica de eventos com banner está em §8.6 (categoria "Importante"). Exemplos de texto:
- "Sua parte mudou de R$ 64,90 para R$ 64,65" · "Seus itens mudaram. Confirme seu consumo de novo";
- "Alguém quer entrar como Thais em outro aparelho. [Aprovar] [Recusar]";
- "Thais entrou (vaga pré-cadastrada por Nery)" · "Ray removeu Gabriel da conta (sem consumo)" · "Ray excluiu o item Cerveja [Desfazer]";
- "Ray mudou o total impresso para R$ 230,00" · "Ray criou um ajuste de divergência de R$ 1,00";
- "A conta foi finalizada" · "Esta conta foi excluída".

### Barra "Minha parte"

Presente nas telas da conta aberta (13, 14, 15, 16, 23), não em 01–12 nem em 24–28.

```text
Minha parte até agora   R$ 53,90   ✓ Consumo confirmado     ← há pendências na conta
Minha parte             R$ 64,90   ✓ Consumo confirmado     ← sem pendências
```

- Valor recalculado em tempo real; toque abre 22.
- Rótulo "até agora" enquanto houver qualquer pendência na conta.
- Sufixo: situação do consumo da pessoa (§6.4.3), sempre com texto.

### Acessibilidade de status

Nunca só cor ou ícone: "✓ Dividido", "⚠ Não dividido", "⏳ Aguardando confirmação".

---

# 5. Regras de domínio

## 5.1 Permissões

Toda verificação de permissão é feita no servidor, a partir da sessão (§9.4.4). "Participante" significa alguém com sessão válida nesta conta, em `ATIVO` ou `PARTE_CONFERIDA`. Placeholders (`CONVIDADO`) não agem.

| Ação | Participante | Só o criador | Observação |
|---|:---:|:---:|---|
| Criar conta, fotografar, OCR | (quem cria) | | a conta só existe a partir do criador |
| Editar itens, cobranças, total impresso, dados da conta | ✅ | | edição aberta; total impresso com confirmação extra após `ABERTA` (§5.6.3) |
| Criar ajuste de divergência | ✅ | | §7.5.2 |
| Ajustes da mesa e dispensa de taxa | ✅ | | §5.12 |
| Dividir itens | ✅ | | §5.7 |
| Convidar e compartilhar o link | ✅ | | |
| Pré-cadastrar vaga e editar o nome de uma vaga | ✅ | | §5.4 |
| Remover participante sem consumo | ✅ | | não remove o criador nem a si mesmo (§5.4.3) |
| Editar o próprio nome e avatar | ✅ | | nome e avatar de outros: não |
| Confirmar meu consumo, fechar e reabrir minha parte | ✅ (si mesmo) | | |
| Resolver pendência pessoal de outra pessoa | ✅ | | origem visível e auditada (§5.9) |
| Aprovar ou recusar reivindicação "Sou eu" | ✅ | | nunca pela sessão que fez o pedido (§5.3.4) |
| Fechar a conta | ✅ | | só com zero pendências (§5.13) |
| Sair e apagar dados deste dispositivo, anonimizar meus dados | ✅ (si mesmo) | | §5.14 |
| Rotacionar o link de convite | | ✅ | §5.2 |
| Excluir a conta | | ✅ | §5.14 |

O criador é identificado por `sessão.participanteId == conta.criadoPor`. Ele recupera o papel em outro aparelho pela reivindicação (§5.3.4), porque continua sendo o mesmo participante.

## 5.2 Conta e link de convite

- `conta.id` é interno. A credencial de entrada é o `joinToken`, separado do `id`, com 128 bits ou mais de segredo.
- **Formato do link:** `https://contajuntos.app/entrar#t=<joinToken>`. O token vai no **fragmento** da URL, que o navegador não envia ao servidor nem no cabeçalho `Referer`, e que pré-visualizadores de link (WhatsApp) não recebem.
- **Troca por sessão:** a página de entrada lê o fragmento, envia o token no corpo de uma requisição `POST` e recebe a sessão (§5.3.1). Em seguida remove o fragmento da barra de endereço. O token nunca vai para `localStorage`, logs, analytics ou query string.
- O mesmo link serve para todas as pessoas e continua válido até ser rotacionado.
- **Rotacionar o link (criador):** gera novo `joinToken`. O link antigo deixa de aceitar entradas e passa a mostrar "Este link não é mais válido". Sessões já emitidas continuam. O QR e o link da tela 11 se atualizam para todos.
- **Conta finalizada:** o link continua abrindo o resumo somente leitura (26 e 27).
- **Retenção:** a conta não expira. A foto da comanda é purgada 48 h após a finalização (§9.5).
- O link exibido na interface é uma forma abreviada do link real. Não existe código curto que dê acesso à conta.

## 5.3 Identidade e sessão

Não há login. A identidade é a sessão do navegador.

### 5.3.1 Sessão

- Emitida quando a pessoa cria a conta, entra como novo participante, vincula uma vaga ou tem uma reivindicação aprovada.
- Guardada em cookie opaco `HttpOnly`, `Secure`, `SameSite` e com prefixo `__Host-`. Nunca em `localStorage`.
- Escopo: uma conta e um participante. Um navegador com várias contas tem várias sessões.
- Renovada a cada uso; expira após 30 dias sem uso (valor provisório, §10.2 T11). Pode ser revogada por: sair e apagar, reivindicação aprovada para outro aparelho, remoção do participante, exclusão da conta.
- Revogar uma sessão encerra também a conexão de tempo real aberta com ela (§8.10).

### 5.3.2 Reentrada no mesmo navegador

Abrir o link com sessão válida reconecta ao mesmo participante, sem pedir nome.

Outro navegador conta como outro aparelho, inclusive no mesmo celular: app do WhatsApp, navegador embutido em outros apps, Safari e app instalado na tela inicial podem ter armazenamento separado. Nesses casos vale §5.3.3 ou §5.3.4.

### 5.3.3 Vínculo com vaga pré-cadastrada

- Se o nome digitado em 12 coincide com uma vaga `CONVIDADO` (comparação sem maiúsculas, acentos e espaços nas pontas), a tela pergunta "Você é Thais, pré-cadastrada por Nery?".
- [Sou eu] vincula: `CONVIDADO → ATIVO` com guarda atômica (§5.4.2). A vaga não muda a contagem.
- [Não sou] segue como novo participante, se houver vaga. Nomes iguais são diferenciados pelo avatar.
- Vincular não confirma o consumo. A pessoa vê em 22 o que foi atribuído a ela.
- **Risco aceito (§10.4 RA2):** quem tem o link pode assumir uma vaga homônima. Mitigação: a pergunta de confirmação, o banner "Thais entrou (vaga pré-cadastrada por Nery)", a auditoria e o fato de que o consumo continua a confirmar.

### 5.3.4 Reivindicação "Sou eu"

Para quem já é participante (`ATIVO` ou `PARTE_CONFERIDA`) e perdeu a sessão: troca de aparelho, outro navegador, cookies apagados, "Sair e apagar".

1. Em 12, a pessoa digita o nome de um participante existente ou escolhe o nome em [Já estou nesta conta] e toca em [Sou eu, pedir acesso].
2. O servidor cria uma `Reivindicacao PENDENTE` e mostra a todos os participantes conectados um banner com [Aprovar] e [Recusar]. O próprio alvo, se ainda estiver conectado em outro aparelho, também vê e pode recusar.
3. **Aprovação:** qualquer participante conectado, inclusive o próprio alvo no aparelho antigo; nunca a sessão que fez o pedido. Quem pediu recebe uma sessão do participante alvo; todas as sessões anteriores do alvo são revogadas e o aparelho antigo vê "Seu acesso foi transferido para outro aparelho. Se não foi você, avise a mesa."
4. **Recusa ou expiração** (10 minutos): quem pediu pode tentar de novo ou entrar como novo participante, se houver vaga.
5. Limites: uma reivindicação pendente por participante alvo; três por conta; limite de tentativas por aparelho (§9.4.7).
6. Se o alvo é o criador, a aprovação devolve também os poderes de criador.
7. Toda reivindicação, aprovação e recusa entra na auditoria.

Se não houver ninguém conectado para aprovar, a reivindicação fica pendente até expirar (§10.4 RA6).

### 5.3.5 Sair e apagar dados deste dispositivo

Revoga a sessão no servidor, apaga o cookie e limpa o cache local (estado da conta e imagens). Os dados da conta no servidor não mudam e o participante continua na divisão. Para voltar, a pessoa usa o link e a reivindicação. Para o criador, a confirmação avisa que voltar como criador exigirá a aprovação de alguém da mesa.

## 5.4 Vagas

### 5.4.1 Contagem

- `vagasOcupadas` = número de participantes da conta, em qualquer estado (`CONVIDADO`, `ATIVO`, `PARTE_CONFERIDA`). O criador ocupa uma vaga.
- Limite padrão: 6 (`conta.limiteVagas`, configurável).

### 5.4.2 Comandos e guardas

Cada comando é avaliado de forma atômica no servidor (§8.3).

| Comando | Guarda | Contagem |
|---|---|---|
| Entrar como novo participante | `vagasOcupadas < limite` | +1 |
| Pré-cadastrar vaga | `vagasOcupadas < limite`; nome válido | +1 |
| Vincular vaga ([Sou eu] em vaga) | alvo ainda em `CONVIDADO` | 0 |
| Aprovar reivindicação | reivindicação `PENDENTE` e alvo existente | 0 |
| Remover participante sem consumo | §5.4.3 | −1 |

- Mesa cheia: `422 MESA_CHEIA`, mensagem "A mesa está cheia (6 de 6). Peça para alguém remover uma vaga sem consumo."
- Dois aparelhos vinculando a mesma vaga: o primeiro vence; o segundo recebe `409 VAGA_OCUPADA` e as opções "Já estou nesta conta" ou "Entrar como novo participante".
- Com 6 de 6 vagas ocupadas por pré-cadastros, cada pessoa pré-cadastrada consegue vincular a sua vaga, e uma sétima pessoa nova é recusada.

### 5.4.3 Remover participante sem consumo

Qualquer participante pode remover outro participante X quando:

- X não é o criador e não é quem está removendo;
- X não tem atribuição em nenhum item (itens excluídos não contam);
- X não está em `participantesRateio` nem em `dispensadaPara` de nenhuma cobrança;
- a conta está `ABERTA`.

Efeito: X é apagado da conta, suas sessões são revogadas, a vaga é liberada, todos veem o banner "Ray removeu Gabriel (sem consumo)" e a ação entra na auditoria. X pode entrar de novo pelo link, se houver vaga.

Para retirar alguém que tem itens: primeiro tira-se a pessoa das divisões (editando cada item, §5.7) ou, se ela tiver pendência pessoal, usa-se a ação 2 de §5.9; depois, remove-se a pessoa.

### 5.4.4 Pré-cadastro

- Qualquer participante pode reservar uma vaga com um nome (tela 11). Cria um participante `CONVIDADO` com `preCadastradoPor`.
- O placeholder aparece em todas as listas com "🕓 aguardando entrada" e pode receber itens.
- O nome de uma vaga pode ser corrigido por qualquer participante enquanto ela estiver em `CONVIDADO`.
- Um placeholder que nunca entra pode ter o consumo confirmado por alguém em nome dele (§5.9). Ele aparece no resumo com o valor devido.

## 5.5 Presença

- Estados: `online` (heartbeat ativo) · `offline` (sem heartbeat por 45 s) · `conectado recentemente` (voltou nos últimos 5 min) · `aguardando entrada` (`CONVIDADO`).
- Heartbeat a cada 15 s. Presença é informativa: não bloqueia operações, não muda a `revisao` da conta e não se confunde com confirmação de consumo.

## 5.6 Edição da comanda

A comanda pode ser editada por qualquer participante até a conta finalizar. Cada salvamento é um commit (§8.2). Não existe rascunho nem trava de edição.

### 5.6.1 Item que já tem divisão

Editar preço ou quantidade nunca destrói atribuições.

| Modo | Mudança | Resultado |
|---|---|---|
| qualquer | nome | só o nome muda |
| `ENTRE_PESSOAS` | preço ou quantidade | partilhas recalculadas; as mesmas pessoas |
| `UNIDADES` com `UNITARIO` | preço unitário | partilha = unidades × novo preço |
| `UNIDADES` | aumentar quantidade | unidades novas ficam sem dono (`4/5 unidades`) → `UNIDADES_NAO_DISTRIBUIDAS` |
| `UNIDADES` | reduzir abaixo das unidades distribuídas | **rejeitado (422):** "Há 4 unidades distribuídas; ajuste a divisão antes de reduzir" |
| `UNIDADES` com `TOTAL_LINHA` | quantidade | total mantido; partilhas recalculadas por pessoa (§7.6.2); valem as regras de aumento e redução acima |
| `PERSONALIZADO_VALOR` | aumentar o valor do item | a diferença vira valor faltante → `DIVISAO_INCOMPLETA` |
| `PERSONALIZADO_VALOR` | reduzir abaixo da soma atribuída | **rejeitado (422):** "Há R$ 30,00 atribuídos; ajuste a divisão antes de reduzir" |
| `PERSONALIZADO_PERCENTUAL` | preço ou quantidade | partilhas recalculadas a partir dos percentuais guardados |

- Mudar de `UNITARIO` para `TOTAL_LINHA` mantém o `valorTotal`. Mudar de `TOTAL_LINHA` para `UNITARIO` exige informar o unitário (`valorTotal = quantidade × unitário`). A troca acontece no mesmo commit da edição.
- Editar preço ou quantidade não reabre a confirmação de consumo de ninguém (as atribuições não mudaram), mas pode mudar valores de partes e reabrir partes conferidas (§5.10).
- Toda mudança de valor pode criar ou resolver divergência com o total impresso (§7.5).

### 5.6.2 Excluir item

- Sem divisão: confirmação simples.
- Com divisão: "Isso remove R$ 40,00 de Nery, Ray e Nath. Continuar?".
- Efeito: o item é marcado como excluído (`excluidoEm`, `excluidoPor`) e sai dos cálculos e das listas; as pessoas que tinham atribuição nele precisam confirmar o consumo de novo (§5.8.2); todos veem o banner "Ray excluiu o item Pizza Margherita [Desfazer]".
- **Desfazer (restaurar):** qualquer participante, pelo banner ou pela seção "Itens excluídos" da tela 06, enquanto a conta estiver `ABERTA`. O item volta com os mesmos dados e atribuições, em um novo commit, sujeito a todas as regras de uma mutação comum:
  - as pessoas com atribuição restaurada precisam confirmar o consumo de novo (§5.8.2, regra 1) e partes conferidas podem reabrir, com o aviso ao editor (§5.11);
  - valem as validações de §7.10 (limite de itens, parte negativa, desconto maior que a comanda); se alguma falhar, a restauração é rejeitada com 422;
  - atribuições de participantes removidos depois da exclusão não voltam; o item volta incompleto ou não dividido, com aviso.
- Na finalização, itens excluídos são descartados e não aparecem no resumo.

### 5.6.3 Total impresso

- Obrigatório para confirmar a comanda, venha ela do OCR ou da digitação.
- Com a conta `ABERTA`, mudar o total impresso pede confirmação: "Você está mudando o total impresso de R$ 231,00 para R$ 230,00. Confira na foto." A mudança gera banner para todos ("Ray mudou o total impresso para R$ 230,00") e entra na auditoria.

### 5.6.4 Mesclar linhas duplicadas

- Disponível para duas linhas com o mesmo nome normalizado e o mesmo `modoPreco` (e o mesmo unitário, se `UNITARIO`), quando nenhuma delas tem atribuição.
- Efeito: uma linha com a soma das quantidades (e dos totais, se `TOTAL_LINHA`), em um único commit.

### 5.6.5 Adicionar item e dados da conta

- Itens podem ser adicionados a qualquer momento antes da finalização; entram como `NAO_DIVIDIDO`.
- Restaurante, mesa e número da comanda podem ser editados por qualquer participante.
- Separar um item em dois está fora do MVP.

## 5.7 Divisão de itens e troca de modo

- **Confirmar divisão:** grava em um único commit o modo e o conjunto completo de atribuições do item, com a `versaoBase` do item.
- **Salvar parcial:** só no modo personalizado. Grava valores ou percentuais com soma menor que o total.
- **Trocar de modo:** é o mesmo comando de confirmar, com outro modo. A divisão antiga é substituída no mesmo commit em que a nova é gravada. O aviso da tela 17 não grava nada. Se o commit falhar (409, 422, offline), o item continua com o modo e a divisão antigos. Não há conversão automática entre modos.
- **Validações:**
  - entre pessoas: pelo menos 1 pessoa;
  - unidades: soma das unidades igual à quantidade;
  - personalizado por valor: soma igual ao valor do item para confirmar; menor ou igual para salvar parcial;
  - personalizado por percentual: soma igual a 100% para confirmar; menor ou igual para salvar parcial;
  - todas as pessoas pertencem à conta (placeholders incluídos); sem repetição.
- O modo unidades nunca é gravado incompleto pelo usuário. Ele só fica incompleto por edição da comanda (§5.6.1) ou remoção de consumo (§5.9).
- "Thais está editando este item" é presença informativa. Duas pessoas podem estar na mesma folha; a primeira gravação com base válida vence e a outra recebe 409 (§8.7).
- Quando quem divide está na divisão, a tela 21 mostra "Você está nesta divisão. [Revisar e confirmar meu consumo]", que leva a 22.

## 5.8 Atribuição e confirmação de consumo

### 5.8.1 Dois conceitos separados

- **Atribuição:** qualquer participante atribui itens a qualquer pessoa da conta, inclusive placeholders.
- **Confirmação:** só por ação explícita. A própria pessoa usa [Confirmar meu consumo], [Não consumi nada] ou [Fechar minha parte] (tela 22), ou responde "Não, só vim acompanhar" ao entrar. Outra pessoa da mesa pode resolver em nome dela (§5.9). **Dividir um item nunca confirma o consumo de ninguém**, nem o de quem fez a divisão.

### 5.8.2 Quando a confirmação volta a ser necessária

A `versaoConsumo` de uma pessoa P é incrementada, e `consumoConfirmado` volta a `false`, em todo commit que:

1. cria, remove ou altera uma atribuição de P (presença na lista, unidades, valor fixo, percentual);
2. altera o conjunto de pessoas de um item `ENTRE_PESSOAS` em que P está (a fração de P mudou);
3. troca o modo de um item em que P tem atribuição;
4. exclui um item em que P tem atribuição;
5. inclui ou retira P da lista de quem divide uma cobrança igual por pessoa (`participantesRateio`).

Não reabrem a confirmação de consumo: editar preço ou quantidade de item, editar outros aspectos das cobranças, ajustes da mesa, dispensas, total impresso e ajuste de conciliação. Essas mudanças podem alterar o valor da parte e reabrir a conferência (§5.10).

### 5.8.3 Comandos e efeitos

| Comando | Quem | Guarda | Efeito |
|---|---|---|---|
| Abrir ou cancelar qualquer tela | qualquer | nenhuma | nenhum |
| Confirmar divisão, salvar parcial, trocar modo, excluir ou restaurar item | qualquer | `versaoBase` do item | §5.8.2 para cada pessoa afetada, inclusive o autor |
| Editar preço, quantidade, cobranças, ajustes, total impresso | qualquer | `versaoBase` da entidade | só valores; pode reabrir conferências |
| Confirmar meu consumo | a própria pessoa, com itens | `versaoConsumoBase` | `consumoConfirmado = true`, origem `PROPRIA` |
| Não consumi nada | a própria pessoa, sem itens | `versaoConsumoBase` | `consumoConfirmado = true`, origem `PROPRIA` (consumo zero) |
| "Só vim acompanhar" (entrada) | a própria pessoa | nenhuma | igual a "Não consumi nada" |
| Fechar minha parte | a própria pessoa | `versaoConsumoBase` e `valorVisto` | confirma o consumo (`PROPRIA`) e marca `PARTE_CONFERIDA` com `valorConferido` (§5.10) |
| Reabrir minha parte | a própria pessoa | nenhuma | `PARTE_CONFERIDA → ATIVO`; confirmação de consumo mantida |
| Confirmar em nome de X | outro participante | `versaoConsumoBase` de X | `consumoConfirmado = true`, origem `EM_NOME_DE`, `confirmadoPor` = autor |
| Remover itens de X e confirmar consumo zero | outro participante | `versaoConsumoBase` de X | §5.9, ação 2 |

Se a `versaoConsumoBase` enviada não for a atual, o servidor responde 409 com o estado novo: a pessoa nunca confirma itens que não viu (§8.3.3).

### 5.8.4 Situação de consumo e pendências

"Tem atribuição" significa ter atribuição em algum item ou estar na lista de quem divide uma cobrança igual por pessoa.

| Estado do participante | Tem atribuição? | `consumoConfirmado` | Situação exibida | Pendência |
|---|---|---|---|---|
| `CONVIDADO` | não | false | Vaga vazia | nenhuma |
| `CONVIDADO` | sim | false | 🕓 Aguardando entrada | `PARTICIPANTE_AGUARDANDO_ENTRADA` |
| `ATIVO` | não | false | ⚠ Não informou | `PARTICIPANTE_NAO_INFORMOU` |
| `ATIVO` | sim | false | ⏳ Aguardando confirmação | `PARTICIPANTE_NAO_CONFIRMOU` |
| qualquer | não | true | ✓ Sem itens (com o valor real da parte, normalmente R$ 0,00) | nenhuma |
| qualquer | sim | true | ✓ Confirmado · ou ✓ Resolvido por X (em nome de Y) | nenhuma |

`PARTE_CONFERIDA` sempre tem `consumoConfirmado = true` (§5.10).

## 5.9 Resolução em nome de outra pessoa

Qualquer participante pode resolver a pendência pessoal de outra pessoa X. A ação é sempre explícita, mostra a origem ("✓ Resolvido por Ray (em nome de Thais)", nunca "Confirmado por Thais") e entra na auditoria.

| Pendência de X | Ações disponíveis |
|---|---|
| `PARTICIPANTE_NAO_CONFIRMOU` · `PARTICIPANTE_AGUARDANDO_ENTRADA` | 1. Confirmar em nome de X · 2. Remover itens de X e confirmar consumo zero · 3. Editar itens de X |
| `PARTICIPANTE_NAO_INFORMOU` | 2'. Confirmar consumo zero em nome de X · 3. Atribuir itens a X |

**Ação 1: Confirmar em nome de X.** Mantém as atribuições. `consumoConfirmado = true`, origem `EM_NOME_DE`. Vale também para placeholder que nunca vai entrar (ex.: pessoa sem celular): ele aparece no resumo com o valor devido.

**Ação 2: Remover itens de X e confirmar consumo zero.** Em um único commit, remove todas as atribuições de X e confirma o consumo zero em nome de X. Efeito em cada item:

| Modo do item | Efeito |
|---|---|
| `ENTRE_PESSOAS` | X sai da lista; a partilha é redistribuída entre os restantes pelo Maior Resto; os restantes precisam confirmar o consumo de novo (§5.8.2, regra 2); sem restantes, o item volta a `NAO_DIVIDIDO` |
| `UNIDADES` | as unidades de X ficam sem dono → `UNIDADES_NAO_DISTRIBUIDAS` |
| `PERSONALIZADO_VALOR` · `PERSONALIZADO_PERCENTUAL` | a parcela de X vira valor faltante → `DIVISAO_INCOMPLETA` |

Em qualquer modo, se X era a única pessoa com atribuição no item, o item volta a `NAO_DIVIDIDO` (§6.3). Os itens afetados viram pendências de item, que qualquer pessoa resolve. Cobranças iguais por pessoa em que X participa continuam (a parte de X pode não ser zero). A confirmação mostra o resultado antes de gravar: "Thais ficará sem itens. 2 unidades de Refrigerante (R$ 12,00) ficam sem dono."

**Ação 3: Editar itens de X.** Leva a 14 filtrada pelos itens de X. Ao voltar, o diálogo mostra o consumo atualizado e exige a ação 1 ou 2 para encerrar. Sair sem concluir mantém a pendência, visível para todos.

**Para si mesmo,** [Resolver] leva a 22 (§5.8.3).

Quando X abre o app depois, 22 mostra "Ray confirmou seu consumo em seu nome às 21:40". X pode confirmar por conta própria (a origem passa a `PROPRIA`) ou corrigir os itens (o que reabre a confirmação).

## 5.10 Fechar minha parte

- Disponível para a própria pessoa (`ATIVO`), a qualquer momento, em qualquer situação de consumo.
- O comando leva `versaoConsumoBase` e `valorVisto` (o total exibido em 24). Se algum dos dois não for o atual, o servidor responde 409 e a tela mostra o valor novo.
- Efeito: confirma o consumo (origem `PROPRIA`), muda para `PARTE_CONFERIDA` e grava `valorConferido` e `conferidaEm`.
- **Reabertura automática:** uma parte conferida volta a `ATIVO` quando
  1. a `versaoConsumo` da pessoa muda (os itens dela mudaram; o consumo também precisa ser confirmado de novo); ou
  2. o valor atual da parte fica diferente de `valorConferido`, por qualquer causa (preço, cobrança, dispensa, ajuste, arredondamento).

  A pessoa vê o banner "Sua parte mudou de R$ 64,90 para R$ 64,65. Confira de novo." ou "Seus itens mudaram. Confirme seu consumo de novo."
- **Arredondamento final:** os centavos de resto do rateio só são distribuídos quando não há mais valor de item sem dono (§7.7.1). Nesse momento, partes podem mudar em R$ 0,01 e reabrir. A reabertura por esse motivo ocorre no máximo uma vez por pessoa entre dois momentos de divisão completa.
- **Reabrir voluntariamente:** [Reabrir minha parte] enquanto a conta não estiver finalizada.
- Fechar a parte não fecha a conta e não impede a pessoa de editar.
- Na finalização, os estados ficam congelados como estiverem.

## 5.11 Aviso de reabertura ao editor

Antes de enviar uma mutação que reabriria partes conferidas, a interface mostra quem será afetado: "Esta alteração vai reabrir a parte de Nery e Ray. Continuar?" [Cancelar] interrompe; [Continuar] envia.

- Vale para qualquer mutação: item, divisão, cobrança, dispensa, ajuste, total impresso, resolução em nome.
- O comando leva `reaberturasAceitas[]`. O servidor calcula o conjunto real de partes reabertas. Se ele tiver alguém que não está na lista aceita (porque outra pessoa fechou a parte nesse meio tempo), o servidor responde 409 com o estado novo e a interface mostra o aviso atualizado.
- O cálculo prévio usa a mesma biblioteca de cálculo do servidor (§10.2 T4).
- Sem partes conferidas afetadas, não há aviso.

## 5.12 Ajustes da mesa

O que a mesa decide pagar a mais ou a menos fica fora da conferência com o total impresso. A comanda continua conferindo (231,00 = 231,00) e o total a pagar muda (§7.4).

### 5.12.1 Dispensar uma taxa da comanda

- Só para taxa de escopo `COMANDA` com distribuição proporcional ao consumo (ex.: serviço de 10%, que costuma ser opcional).
- "Quem paga esta taxa?": **Todos** (padrão) · **Ninguém** (dispensa total) · **Escolher quem não paga** (dispensa parcial).
- A taxa continua na conferência. As parcelas dispensadas saem do total a pagar e aparecem riscadas no detalhe ("Serviço 10% R$ 1,50 dispensado").
- Na dispensa parcial, quem entra depois paga normalmente, a menos que alguém o inclua na lista.
- Taxas iguais por pessoa não têm dispensa: escolher quem divide (`participantesRateio`) já define quem paga.

### 5.12.2 Cobranças da mesa

- Escopo `MESA`: gorjeta extra, acréscimos e descontos combinados.
- Valor fixo ou percentual sobre o total de itens; distribuição proporcional ao consumo ou igual por pessoa (com `participantesRateio` explícito).
- Nascem confirmadas, porque são criadas por uma ação explícita.

### 5.12.3 Exemplos (dataset canônico)

| Ajuste | Efeito nas partes | Total a pagar |
|---|---|---:|
| nenhum | §2.6 | 231,00 |
| Davi, Thais e Gabriel não pagam o serviço | Nery, Ray, Nath 64,90 · Davi 15,00 · Thais 12,00 · Gabriel 6,00 | 227,70 |
| Ninguém paga o serviço | Nery, Ray, Nath 59,00 · Davi 15,00 · Thais 12,00 · Gabriel 6,00 | 210,00 |
| Gorjeta extra R$ 12,00, igual entre os 6 | cada parte + 2,00 (Nery 66,90 · Gabriel 8,60) | 243,00 |

### 5.12.4 Exibição

16, 22, 25, 26 e 27 mostram as linhas de ajuste. 25 e 27 mostram "Total da comanda" e "Total a pagar" sempre que forem diferentes.

## 5.13 Fechar a conta

- Qualquer participante pode fechar. O botão só habilita com zero pendências.
- Confirmação obrigatória: "Depois disso, a divisão será bloqueada para todos."
- O comando leva `revisaoBase`. O servidor aplica de forma atômica: `estado = ABERTA ∧ revisao == revisaoBase ∧ pendências = 0` → `FINALIZADA`, com `finalizadaEm`. Caso contrário, 409 com o estado novo, e a tela 25 é recarregada com o aviso "A conta mudou enquanto você revisava".
- Repetir o fechamento de uma conta já finalizada devolve 200 com o estado atual. Essa verificação vem antes do CAS (idempotente).
- Não exige que ninguém tenha fechado a própria parte.
- `FINALIZADA` é permanente no MVP.

## 5.14 Saída, exclusão e anonimização

| Operação | Quem | Estados | Efeito |
|---|---|---|---|
| **Sair e apagar dados deste dispositivo** | a própria pessoa | qualquer | §5.3.5 |
| **Anonimizar meus dados** | a própria pessoa | qualquer, inclusive `FINALIZADA` | nome → "Participante N" (N = ordem de entrada), avatar neutro, `anonimizado = true`. Valores, atribuições e confirmações continuam. É a única mudança permitida depois da finalização. A pessoa pode continuar na conta |
| **Excluir conta** | criador | qualquer, inclusive `FINALIZADA` | confirmação digitada ("EXCLUIR"). Apaga conta, itens, cobranças, participantes, sessões, reivindicações e foto, de imediato. Encerra as conexões abertas; quem estiver conectado vê "Esta conta foi excluída" e o app apaga os dados locais. O link passa a mostrar a mensagem genérica de link inválido. A auditoria guarda só um registro sem dados pessoais (§9.5) |
| **Remover participante sem consumo** | qualquer participante | `ABERTA` | §5.4.3 |

Fechar a aba não é sair: o participante continua na conta com os mesmos dados.

---

# 6. Modelos de estado

Estado de negócio e estado de sincronização (🟢 🟡 🔴) são dimensões independentes.

## 6.1 Conta

```text
                 [Nova conta + identificação]
                            │
                            ▼
                         CRIANDO ◀─────────────── cancelar leitura / descartar leitura
                     │          │
          foto/galeria          │ digitar manualmente
                     ▼          │
              OCR_PROCESSANDO ──┼──falha / tempo esgotado──▶ OCR_ERRO
                     │          │                             │   │
                 sucesso        │          tentar de novo ◀───┘   │ digitar manualmente
                     │          │  (tirar outra foto: OCR_ERRO → CRIANDO)
                     ▼          ▼                                 ▼
              AGUARDANDO_CONFERENCIA ◀────────────────────────────┘
                     │ confirmar comanda (guarda abaixo)
                     ▼
                   ABERTA ──fechar conta (zero pendências + CAS)──▶ FINALIZADA

   Excluir conta (criador), a partir de qualquer estado → dados apagados (sem estado residual)
```

| Transição | Gatilho | Guarda |
|---|---|---|
| (início) → `CRIANDO` | identificação do criador (01) | nome válido |
| `CRIANDO → OCR_PROCESSANDO` | [Usar esta foto] (03) | imagem válida (§9.4.8); cria tentativa (§6.2) |
| `CRIANDO → AGUARDANDO_CONFERENCIA` | [Digitar manualmente] (02) | nenhuma |
| `OCR_PROCESSANDO → AGUARDANDO_CONFERENCIA` | resultado da tentativa vigente | resultado válido pelo schema (§9.2) |
| `OCR_PROCESSANDO → OCR_ERRO` | falha, resultado inválido ou 20 s | nenhuma |
| `OCR_PROCESSANDO → CRIANDO` | [Cancelar leitura] (04) | tentativa cancelada |
| `OCR_ERRO → OCR_PROCESSANDO` | [Tentar de novo] (05) | nova tentativa, mesma imagem |
| `OCR_ERRO → AGUARDANDO_CONFERENCIA` | [Digitar manualmente] (05) | nenhuma |
| `OCR_ERRO → CRIANDO` | [Tirar outra foto] (05) | nenhuma |
| `AGUARDANDO_CONFERENCIA → CRIANDO` | voltar de 06 e confirmar o descarte | descarta itens e cobranças |
| `AGUARDANDO_CONFERENCIA → ABERTA` | [Confirmar e convidar] (10) | `totalInformado` preenchido ∧ sem `DIVERGENCIA_COMANDA` ∧ sem `COBRANCA_NAO_CONFIRMADA` |
| `ABERTA → FINALIZADA` | [Fechar conta] (25) | zero pendências ∧ `revisao == revisaoBase` (§5.13) |

- `ABERTA` cobre todo o período de convite e divisão. Não existe volta a `AGUARDANDO_CONFERENCIA`: edições depois da confirmação ficam em `ABERTA`, e uma divergência nova vira a pendência `DIVERGENCIA_COMANDA`.
- `COBRANCA_SEM_RATEIO` não impede confirmar a comanda (quem divide o couvert só pode ser escolhido depois que as pessoas entram), mas impede fechar a conta.
- O progresso da divisão ("nenhum item dividido ainda") é informação de tela, não estado.
- Em `FINALIZADA` só são aceitas: anonimizar os próprios dados, sair e apagar, excluir a conta (criador), reivindicação "Sou eu" e sua decisão (para recuperar acesso às opções de privacidade), repetir o fechamento (devolve 200 com o estado atual) e leitura. Qualquer outra mutação recebe `422 CONTA_FINALIZADA`.

## 6.2 Tentativa de OCR

```text
PROCESSANDO ──resultado válido──▶ CONCLUIDA
     ├──falha ou resultado inválido──▶ FALHOU
     ├──cancelar leitura / digitar manualmente / nova foto / nova tentativa──▶ CANCELADA
     └──25 s no servidor sem resultado──▶ EXPIRADA
```

- A conta guarda só uma tentativa vigente (`tentativaOcrVigente`).
- Um resultado só é aplicado se a tentativa ainda for a vigente, estiver em `PROCESSANDO` e a conta estiver em `OCR_PROCESSANDO`. Qualquer outro resultado é descartado e registrado em log, sem efeito na comanda.
- A interface desiste aos 20 s (tela 05) e cancela a tentativa. O servidor expira aos 25 s, para cobrir respostas em trânsito.

## 6.3 Item

O estado do item é derivado das atribuições e do valor, a cada commit.

| Estado | Definição |
|---|---|
| `NAO_DIVIDIDO` | sem atribuições (`modoDivisao` nulo) |
| `DIVISAO_INCOMPLETA` | com atribuições e valor sem dono: unidades sem dono (`UNIDADES`) ou valor faltante (personalizado) |
| `DIVIDIDO` | todo o valor do item tem dono |
| `EXCLUIDO` | item marcado como excluído: fora dos cálculos, das listas e das pendências; restaurável enquanto a conta estiver `ABERTA` (§5.6.2) |

```text
NAO_DIVIDIDO ──confirmar divisão──▶ DIVIDIDO
     │                                 ▲   │
     │ salvar parcial     completar    │   │ aumento de quantidade (unidades) ou de valor (personalizado);
     ▼                                 │   │ remoção de consumo (unidades, personalizado)
DIVISAO_INCOMPLETA ────────────────────┘   ▼
     ▲                               DIVISAO_INCOMPLETA
     └───────────────────────────────────────┘

DIVIDIDO ou DIVISAO_INCOMPLETA ──remoção do último participante──▶ NAO_DIVIDIDO
DIVIDIDO ou DIVISAO_INCOMPLETA ──trocar modo (confirmado, atômico)──▶ DIVIDIDO no modo novo
qualquer ──excluir item──▶ EXCLUIDO (fora dos cálculos) ──restaurar──▶ estado recalculado
```

- `ENTRE_PESSOAS` nunca fica incompleto: ou tem pelo menos uma pessoa (`DIVIDIDO`), ou nenhuma (`NAO_DIVIDIDO`).
- `UNIDADES` só fica incompleto por edição da comanda ou por remoção de consumo, nunca por gravação do usuário.
- Item com valor zero não gera pendência em nenhum estado.
- "Fulano está editando" é presença, não estado.

## 6.4 Participante

### 6.4.1 Estados

```text
CONVIDADO ──[Sou eu] na vaga──▶ ATIVO ⇄ PARTE_CONFERIDA
(placeholder)                     │
                                  └── remoção (sem consumo) ──▶ (fora da conta)
CONVIDADO ── remoção (sem consumo) ──▶ (fora da conta)
```

| Estado | Definição |
|---|---|
| `CONVIDADO` | vaga pré-cadastrada que ainda não entrou. Pode ter atribuições e ter o consumo confirmado em seu nome |
| `ATIVO` | entrou e tem ou teve sessão. Pode fazer tudo que §5.1 permite |
| `PARTE_CONFERIDA` | fechou a própria parte. Continua podendo fazer tudo. Volta a `ATIVO` pelas regras de §5.10 |

| Gatilho | Efeito |
|---|---|
| [Sou eu] em vaga | `CONVIDADO → ATIVO` |
| Reivindicação aprovada | estado mantido; sessões antigas revogadas |
| [Fechar minha parte] | `ATIVO → PARTE_CONFERIDA` |
| Itens ou valor da parte mudam | `PARTE_CONFERIDA → ATIVO` + banner |
| [Reabrir minha parte] | `PARTE_CONFERIDA → ATIVO` |
| Conta finalizada | estado congelado |

### 6.4.2 Atributos de confirmação

- `consumoConfirmado`, `origemConfirmacao` (`PROPRIA` ou `EM_NOME_DE`), `confirmadoPor`, `confirmadoEm`.
- `versaoConsumo`: regras de §5.8.2.
- `valorConferido`, `conferidaEm`: só em `PARTE_CONFERIDA`.

### 6.4.3 Situação de consumo (derivada, exibida)

`VAGA_VAZIA` · `AGUARDANDO_ENTRADA` · `NAO_INFORMOU` · `AGUARDANDO_CONFIRMACAO` · `SEM_CONSUMO` · `CONFIRMADO` · `RESOLVIDO_POR_OUTRO`. Tabela de derivação em §5.8.4.

## 6.5 Cobrança

| Situação | `confirmada` |
|---|---|
| Criada pelo OCR com percentual e valor compatíveis (§7.3.2) | true |
| Criada pelo OCR só com valor (`OCR_SEM_PERCENTUAL`) | false |
| Criada pelo OCR só com percentual (`OCR_SO_PERCENTUAL`; valor calculado) | false |
| Criada pelo OCR com percentual e valor incompatíveis (`PERCENTUAL_INCOMPATIVEL`) | false |
| Criada ou editada por uma pessoa (tela 08 ou 09) | true, `confirmadaPor` = autor. Se a checagem de percentual falhar, a tela 08 mostra o aviso antes de salvar e só grava depois de a pessoa tocar em [Manter assim] |
| [Confirmar] na tela 08 | true, `confirmadaPor` = autor |
| Recalculada automaticamente (percentual sobre itens que mudaram) | mantém o valor anterior de `confirmada` |

- O que se confirma em uma cobrança `CALCULADO_DE_PERCENTUAL` é o percentual; o valor acompanha o total de itens.
- Cobrança não confirmada gera `COBRANCA_NAO_CONFIRMADA`, sempre com a ação [Confirmar] ou [Editar] na tela 08 e o motivo exibido.
- Cobrança igual por pessoa sem `participantesRateio` gera `COBRANCA_SEM_RATEIO`.

## 6.6 Efeitos cruzados

| Evento | Conta | Item | Participantes |
|---|---|---|---|
| OCR falha | `OCR_ERRO` | nenhum | nenhum |
| Confirmar divisão | mantém | estado recalculado | §5.8.2 para afetados; partes podem reabrir |
| Editar preço ou quantidade | mantém | estado recalculado | partes podem reabrir (valor) |
| Editar cobrança, dispensa, ajuste, total impresso | mantém | nenhum | partes podem reabrir (valor) |
| Excluir item | mantém | excluído (restaurável) | §5.8.2 regra 4; partes podem reabrir |
| Restaurar item | mantém | estado recalculado | §5.8.2 regra 1; partes podem reabrir |
| Remover consumo de X | mantém | §5.9 | X confirmado com consumo zero; restantes de itens entre pessoas reabrem |
| Fechar minha parte | mantém | nenhum | `ATIVO → PARTE_CONFERIDA` |
| Fechar conta | `FINALIZADA` | congelado | congelados |

Todos os eventos são enviados em tempo real depois do commit (§8.6).

---

# 7. Regras de cálculo

Toda a matemática financeira. O servidor é a autoridade; o cliente usa a mesma biblioteca só para pré-visualizar (§10.2 T4).

## 7.1 Fundamentos

- Valores em centavos, inteiros de 64 bits. Cálculos intermediários com inteiros exatos (produto e divisão inteira, com resto). Nunca ponto flutuante, nunca truncamento intermediário em frações de centavo.
- Percentuais em pontos-base (`bp`): 10% = 1000 bp; 100% = 10000 bp. Na tela, até duas casas decimais.
- **Arredondamento de valor calculado por percentual:** meio para cima, no centavo. `valor = (base × bp + 5000) div 10000`. Ex. (cenário de teste): 10% de R$ 123,45 = 12.345 → R$ 12,35.
- **Partilhas:** sempre pelo Método do Maior Resto (§7.9). Nunca arredondamento individual.
- Limites: total impresso e totais derivados até R$ 999.999,99; quantidade até 999; até 100 itens por conta (§9.1). Com esses limites, nenhum produto intermediário excede 64 bits.
- Exibição em BRL: `R$ 1.234,56`.

## 7.2 Autoridade do preço do item

| `modoPreco` | Autoridade | Derivado | Editar quantidade |
|---|---|---|---|
| `UNITARIO` | `precoUnitario` | `valorTotal = quantidade × precoUnitario` | o unitário fica; o total recalcula (4 × 9,00 → 5 × 9,00 = 45,00) |
| `TOTAL_LINHA` | `valorTotal` | `precoUnitario` só quando `valorTotal` é divisível pela quantidade; senão nulo ("sem preço unitário exato") | o total fica, com aviso |

- OCR: usa `UNITARIO` quando a linha traz `quantidade × unitário = total` consistente; senão `TOTAL_LINHA`.
- Entrada manual: `UNITARIO` por padrão; a pessoa pode trocar na tela 07.
- O campo editável é sempre a autoridade do modo. Nunca se edita um derivado.
- `quantidade ≥ 1`; `valor ≥ 0`.

## 7.3 Cobranças: origem, base e confirmação

### 7.3.1 Origem

- Nunca presumida. Vem do OCR, de uma pessoa (tela 08) ou do ajuste de divergência (tela 09).
- Escopo `COMANDA`: impressa ou que deveria estar impressa; entra na conferência. Escopo `MESA`: decisão da mesa; fora da conferência (§5.12).

### 7.3.2 Base e valor

1. **Valor impresso prevalece** (`IMPRESSO_FIXO`): o valor lido da comanda nunca é recalculado.
2. **Só percentual** (`CALCULADO_DE_PERCENTUAL`): `valor = arredondamento(totalItens × bp / 10000)` (§7.1). A base é o total de itens **antes de descontos**. Recalcula a cada mudança de itens.
3. **Percentual e valor impressos:** o sistema confere `|arredondamento(totalItens × bp / 10000) − valor| ≤ 5 centavos`. Se não conferir, a cobrança fica não confirmada com motivo `PERCENTUAL_INCOMPATIVEL` e a mensagem "O valor impresso não corresponde a 10% dos itens. Confira na foto." A checagem roda na criação pelo OCR (incompatível → não confirmada) e em toda edição da cobrança por uma pessoa (incompatível → aviso antes de salvar; salvar com [Manter assim] confirma). Ela não roda quando os itens mudam depois: essas mudanças são cobertas pela conferência com o total impresso (§7.5).
4. Percentual nunca é aplicado sobre base depois de desconto. Ex. (cenário de teste): itens R$ 200,00, desconto R$ 20,00, serviço 10% sem valor impresso → serviço R$ 20,00 (nunca R$ 18,00).

### 7.3.3 Confirmação

Regras em §6.5.

## 7.4 Totais da conta

```text
totalItens        = Σ valorTotal dos itens
totalComanda      = totalItens + Σ taxas(COMANDA) − Σ descontos(COMANDA)        (inclui ajuste de divergência)
diferenca         = totalInformado − totalComanda                                (com sinal)
ajusteConciliacao = diferenca, se |diferenca| ≤ 5;  0, caso contrário
totalConferido    = totalComanda + ajusteConciliacao
totalDispensado   = Σ parcelas dispensadas das taxas da comanda (§7.7.3)
totalMesa         = Σ taxas(MESA) − Σ descontos(MESA)
totalAPagar       = totalConferido − totalDispensado + totalMesa
```

- `ajusteConciliacao` é sempre recalculado a partir de `totalComanda`, que não o contém. Recalcular várias vezes dá sempre o mesmo resultado.
- Sem divergência, `totalConferido = totalInformado`.

Dataset: `totalItens` 210,00 · `totalComanda` 231,00 · `diferenca` 0 · `totalConferido` 231,00 · `totalAPagar` 231,00.

## 7.5 Conferência com o total impresso

### 7.5.1 Tolerância

| `|diferenca|` | Efeito |
|---|---|
| 0 | confere |
| 1 a 5 centavos | absorvida no `ajusteConciliacao`, rateada proporcionalmente ao consumo (§7.7.4). Sem tela, sem pendência. Itens e cobranças continuam com os valores impressos. Linha "Ajuste de conciliação ±R$ 0,0X" em 16, 22, 25 e 26. Registrada na auditoria |
| acima de 5 centavos | pendência `DIVERGENCIA_COMANDA`. Em `AGUARDANDO_CONFERENCIA` impede confirmar a comanda (tela 09). Em `ABERTA` impede fechar a conta |

A regra usa o **módulo** da diferença: excesso e falta são tratados igualmente.

### 7.5.2 Ajuste de divergência

Quando a diferença passa de 5 centavos, além de corrigir, qualquer participante pode aceitar o total impresso como correto:

- cria uma cobrança de escopo `COMANDA`, `origem = AJUSTE_DIVERGENCIA`, `origemValor = MANUAL_FIXO`, confirmada, descrição "Ajuste de divergência", proporcional ao consumo;
- diferença positiva (falta valor para chegar ao impresso) → `TAXA` com o valor da diferença; negativa → `DESCONTO` com o módulo;
- itens e cobranças impressos continuam intactos;
- depois disso, `diferenca = 0`, `ajusteConciliacao = 0` e a pendência some;
- a linha "Ajuste de divergência R$ X" aparece em 16, 22, 25, 26 e 27; a criação entra na auditoria e gera banner.

Se a comanda mudar depois e uma nova diferença aparecer, o ajuste existente não é recalculado: a pessoa edita o ajuste ou cria outra correção.

### 7.5.3 Subtotal impresso

O MVP não confere o subtotal impresso contra a soma dos itens. Erros que se compensam entre itens e uma taxa com percentual impresso são detectados pela checagem de §7.3.2 (item 3). O subtotal lido pelo OCR é mostrado em 06 só como informação.

## 7.6 Divisão do item

A soma das partilhas de um item `DIVIDIDO` é exatamente o seu valor. Em `DIVISAO_INCOMPLETA`, a soma das partilhas mais o valor sem dono é exatamente o valor do item.

### 7.6.1 Entre pessoas

`partilha = Maior Resto(valor do item, peso 1 para cada pessoa da lista)`, contexto `item.id`. Ex.: pizza R$ 120,00 entre 3 → 40,00 / 40,00 / 40,00. Cenário de teste: R$ 100,00 entre 3 → 33,34 / 33,33 / 33,33 (o centavo extra vai para quem vencer o desempate, §7.9).

### 7.6.2 Unidades

- `UNITARIO`: `partilha = unidades × precoUnitario` (exato); unidades sem dono valem `sem dono × precoUnitario`.
- `TOTAL_LINHA`: partilha por **pessoa**, com peso igual ao número de unidades (não por unidade individual). Com todas as unidades distribuídas: `Maior Resto(valorTotal, pesos = unidades)`. Com unidades sem dono: cada pessoa recebe `(valorTotal × unidades) div quantidade` e o restante fica sem dono.
- Ex. (cenário de teste): 3 un. · R$ 10,00, Nery 2 e Ray 1 → Nery 6,67 · Ray 3,33. Distribuição 1/1/1 → 3,34 / 3,33 / 3,33 pelo desempate.

### 7.6.3 Personalizado por valor

- Partilha = valor fixo digitado. Confirmar exige soma igual ao valor do item; salvar parcial aceita soma menor (faltante = valor − soma). Soma maior nunca é gravada.
- Aceita R$ 0,00 para quem não leva nada.

### 7.6.4 Personalizado por percentual

- Guarda `percentualBp` por pessoa; os valores são sempre derivados do percentual e do valor atual do item.
- Soma de 10000 bp: `Maior Resto(valor do item, pesos = bp)`.
- Soma menor que 10000 bp (parcial): cada pessoa recebe `(valor × bp) div 10000`; o restante é faltante. Percentuais parciais nunca são normalizados para 100%.
- Soma maior que 10000 bp: rejeitada.
- Ex. (cenário de teste): item de R$ 0,01 com 50%/50% → 0,01 / 0,00 pelo desempate; o item passa a R$ 0,02 → 0,01 / 0,01. Batata R$ 30,00 com Nery 30% e Ray 30% salvos como parcial → 9,00 / 9,00, faltam R$ 12,00.

## 7.7 Rateio das cobranças

### 7.7.1 Proporcional ao consumo

- Base fixa: `W = totalItens` (consumo de todos mais o valor sem dono). O peso de cada pessoa é o seu consumo.
- **Enquanto houver valor de item sem dono** (item não dividido, unidades sem dono, faltante): cada pessoa recebe `(valor × consumo) div W`. O restante, incluindo os centavos de resto, fica no saldo não distribuído. Assim, dividir o item de outra pessoa não muda a parcela de quem não está nele.
- **Sem valor sem dono:** `Maior Resto(valor, pesos = consumo)`, contexto `cobranca.id`. É o momento do arredondamento final (§5.10).
- Quem tem consumo zero recebe zero.
- `totalItens = 0` com cobrança proporcional de valor maior que zero: pendência `COBRANCA_SEM_RATEIO`.

Dataset, estado E-1 (só a pizza dividida): serviço de Nery = (2100 × 4000) div 21000 = 400 → R$ 4,00; o serviço sobre os R$ 90,00 sem dono (R$ 9,00) fica no saldo.

### 7.7.2 Igual por pessoa

- `Maior Resto(valor, peso 1 para cada pessoa de participantesRateio)`, contexto `cobranca.id`. Independe do consumo: quem está na lista paga, mesmo com consumo zero.
- `participantesRateio` é sempre explícito: ninguém entra automaticamente, nem quem chega depois. Mudar a lista é editar a cobrança (as partes afetadas reabrem pelas regras de §5.10).
- Validação: só participantes da conta (placeholders incluídos), sem repetição.
- Lista vazia: o valor fica no saldo e gera `COBRANCA_SEM_RATEIO`. É o estado natural de um couvert lido pelo OCR antes de as pessoas entrarem.
- Cenário de teste: couvert R$ 90,00 entre 6 → R$ 15,00 cada.

### 7.7.3 Dispensa

- Dispensa total: a parcela de todos e o valor ainda sem dono são dispensados; `dispensado = valor` da taxa.
- Dispensa parcial: as parcelas calculadas (§7.7.1) das pessoas em `dispensadaPara` são dispensadas. A parcela ainda sem dono fica no saldo e é dispensada quando o item for atribuído a alguém da lista.
- A parcela dispensada aparece no detalhe da pessoa, riscada, e não entra na parte.

### 7.7.4 Ajuste de conciliação

Rateado como uma taxa (diferença positiva) ou um desconto (negativa) proporcional ao consumo (§7.7.1), contexto `conta.id`. Ex.: diferença de +R$ 0,03 no estado final → Nery, Ray e Nath +R$ 0,01 cada (maiores restos).

### 7.7.5 Descontos

Mesmas regras das taxas (proporcional ou igual), subtraindo. O desconto não tem dispensa.

## 7.8 Parte de cada pessoa

```text
consumo_p  = Σ partilhas de itens de p
parte_p    = consumo_p
           + Σ parcelas de taxas (COMANDA e MESA), sem as dispensadas
           − Σ parcelas de descontos (COMANDA e MESA)
           ± parcela do ajuste de conciliação
saldoNaoDistribuido = totalAPagar − Σ parte_p        (com sinal; detalhado por origem na interface)
```

Dataset: Nery = 59,00 + 5,90 = **64,90**.

## 7.9 Método do Maior Resto

Para repartir um total `T ≥ 0` (centavos) entre pessoas `k` com pesos inteiros `w_k ≥ 0` e `W = Σ w_k > 0`:

1. `base_k = (T × w_k) div W` e `resto_k = (T × w_k) mod W` (inteiros exatos).
2. `L = T − Σ base_k` centavos sobram.
3. Os `L` centavos vão, um para cada, às pessoas com maior `resto_k`.
4. **Desempate:** menor valor de `SHA-256(UTF-8(contextoId + ":" + participanteId))`, comparado como texto hexadecimal minúsculo. `contextoId` é `item.id`, `cobranca.id` ou `conta.id`, conforme o que está sendo repartido. O critério não depende de nome nem da ordem da lista.

Mesmo estado de entrada → mesmo resultado, no cliente e no servidor. Para valores negativos (desconto, ajuste negativo), reparte-se o módulo e subtrai-se.

## 7.10 Validações

Avaliadas no servidor em todo commit, sobre o estado resultante. Violação → `422` com a regra e os valores corretos; nada é gravado.

| Regra | Mensagem |
|---|---|
| `totalComanda ≥ 0` e `totalAPagar ≥ 0` | "O desconto é maior que o valor da comanda" |
| `parte_p ≥ 0` para toda pessoa, em qualquer estado da conta | "Esta alteração deixa a parte de Davi negativa. Ajuste os valores." |
| soma das atribuições ≤ valor do item | §5.6.1 (redução bloqueada) |
| soma de unidades ≤ quantidade; soma de percentuais ≤ 100% | §5.7 |
| limites de §9.1 | "A conta aceita até 100 itens" etc. |
| conta `FINALIZADA` (exceto as operações de §6.1) | "A conta já foi finalizada" (`422 CONTA_FINALIZADA`) |

Não existe correção automática de parte negativa (piso em zero): a operação é rejeitada. Com um desconto igual por pessoa, uma pessoa ainda sem itens pode ficar negativa; o desconto só pode ser criado depois que ela tiver consumo suficiente, ou com outra regra de distribuição.

## 7.11 Invariantes

```text
I1. Conta em qualquer estado:
    Σ parte_p + saldoNaoDistribuido = totalAPagar

I2. Para fechar e em FINALIZADA:
    saldoNaoDistribuido = 0
    ∧ |diferenca| ≤ 5           (sem DIVERGENCIA_COMANDA)
    ∧ Σ parte_p = totalAPagar
    ∧ toda parte_p ≥ 0
```

- Um item sem dono é estado esperado, visível como "Ainda não distribuído", e não é erro.
- Violação de I1 é falha interna: o servidor não grava, registra o erro e devolve `500` com o estado correto.
- Tentativa de fechar violando I2 nunca chega a gravar: as pendências impedem (§5.13).

---

# 8. Tempo real e concorrência

## 8.1 Princípios

1. O servidor é a única fonte da verdade. O cliente nunca decide sozinho se uma alteração é válida.
2. Nada aparece como salvo antes da resposta do servidor.
3. Os cards mudam no lugar, sem toast por evento.
4. Sem travas de interface ("alguém abriu a tela de edição"). A proteção vem da serialização no servidor e das guardas de versão.

## 8.2 Modelo de sincronização

```text
Celular → comando (op + versões base + operationId) → Servidor
   → serializa por conta → valida permissões (§5.1) e regras (§7.10)
   → aplica, recalcula derivados e pendências, confere I1
   → grava, incrementa versões e revisão → publica evento → todos os celulares
```

- **Transporte:** REST para comandos; SSE para eventos do servidor (provisório, §10.2 T2). Reconexão com espera crescente.
- **Serialização por conta:** todas as mutações de uma mesma conta são aplicadas uma de cada vez, cada uma em uma transação curta que lê o estado atual da conta inteira, valida e grava. Isso garante que dois commits nunca validem totais a partir de leituras diferentes. Operações em entidades diferentes não recebem 409 por isso: são aplicadas em sequência e cada uma valida o estado deixado pela anterior.
- **Publicação depois do commit:** nenhum evento sai antes de a gravação estar confirmada (outbox ou equivalente; §10.2 T7).
- Cada evento carrega `eventId` (deduplicação) e a `revisao` da conta.

## 8.3 Guardas de concorrência

### 8.3.1 Versão da entidade

- Toda entidade editável tem `versao`. O comando envia `versaoBase` da entidade que a pessoa leu.
- `versaoBase == atual` → aplica e incrementa. `versaoBase < atual` → `409` com `serverState`. Nunca há fusão silenciosa.
- Duas pessoas confirmando a divisão do mesmo item: a primeira com base válida vence; a segunda recebe 409.

### 8.3.2 Validação do agregado

Mesmo com `versaoBase` válida, o comando é rejeitado com `422` se o estado resultante violar §7.10. Ex. (cenário de teste): dois itens de R$ 60,00 e desconto de R$ 100,00 (total R$ 20,00); duas pessoas reduzem itens diferentes em R$ 15,00 ao mesmo tempo. A primeira redução é aplicada (total R$ 5,00); a segunda é avaliada sobre esse estado e rejeitada (total seria −R$ 10,00).

### 8.3.3 Confirmações

| Comando | Guarda | Falha |
|---|---|---|
| Confirmar meu consumo · Não consumi nada · Confirmar em nome de X · Remover itens de X | `versaoConsumoBase` da pessoa alvo | 409: "Os itens mudaram. Confira de novo." |
| Fechar minha parte | `versaoConsumoBase` e `valorVisto == parte atual` | 409 com o valor novo |
| Qualquer mutação que reabra partes conferidas | `reaberturasAceitas[]` contém todas as partes que serão reabertas | 409 com o aviso atualizado (§5.11) |

### 8.3.4 Vagas

Guardas de §5.4.2, avaliadas dentro da serialização da conta.

### 8.3.5 Fechamento

Primeiro: conta já `FINALIZADA` → 200 com o estado atual. Depois: `estado = ABERTA ∧ revisao == revisaoBase ∧ pendências = 0`. Qualquer mutação aplicada entre a leitura da tela 25 e o comando faz o fechamento falhar com 409 e `serverState`.

### 8.3.6 O que muda a revisão

Toda mutação aplicada incrementa `conta.revisao`, inclusive entrada, vínculo de vaga, reivindicação e sua decisão, fechar ou reabrir parte. Não mudam a revisão: presença, heartbeat, leitura e abrir ou fechar telas.

## 8.4 Idempotência

- Todo comando tem `operationId` gerado pelo cliente. Chave única: `(contaId, operationId)`, guardada por 24 h.
- Repetir o mesmo `operationId` devolve o mesmo resultado (status, código e dados do resultado), acompanhado do estado atual da conta, sem executar de novo. Reenvio de rede nunca duplica item, cobrança ou atribuição.

## 8.5 Revisão monotônica e reconexão

- Toda resposta e todo evento carregam a `revisao` do estado que contêm.
- **Regra para todas as fontes** (evento, resposta de comando, resposta repetida por idempotência, `serverState` de erro, snapshot): o cliente só substitui o estado exibido se a `revisao` recebida for maior que a local.
- A resposta do próprio comando sempre encerra o indicador "pendente" daquela operação, mesmo quando sua revisão é antiga e o estado dela não é aplicado.

| Situação | Regra |
|---|---|
| `eventId` já aplicado | ignora |
| `revisao` do evento ≤ local | ignora |
| `revisao` do evento = local + 1 | aplica |
| `revisao` do evento > local + 1 (salto) | aplica, se o evento trouxer o estado completo da conta; senão, busca o snapshot |

- **Início e reconexão sem janela de perda:** o cliente abre o canal de eventos primeiro; o servidor envia como primeiro evento a `revisao` atual. O cliente busca o snapshot e guarda os eventos recebidos nesse meio tempo, aplicando só os de revisão maior que a do snapshot. Se a revisão anunciada for maior que a do snapshot e nenhum evento chegar em 2 s, busca o snapshot de novo.
- Não há replay de eventos no MVP: perda detectada sempre leva a um snapshot.

## 8.6 Eventos e notificações

| Categoria | Eventos | Interface |
|---|---|---|
| Rotina | item, divisão, quantidade, cobrança, ajuste, dispensa alterados | card muda no lugar |
| Presença | entrou, saiu, desconectou | lista atualiza |
| Importante | "Sua parte mudou", "Seus itens mudaram" (só para a própria pessoa), reivindicação aguardando aprovação, "Seu acesso foi transferido para outro aparelho", vaga pré-cadastrada vinculada ("Thais entrou, vaga pré-cadastrada por Nery"), participante removido, item excluído (com [Desfazer]), total impresso alterado, ajuste de divergência criado, conta finalizada, conta excluída | banner até a pessoa dispensar, com agrupamento de repetidos |
| Erro | conflito de versão, operação rejeitada | diálogo ou aviso no card + estado atualizado |

Proibido: um toast por mudança ("Ray adicionou cerveja").

Leitores de tela recebem anúncios de mudança do próprio valor ("Sua parte agora é R$ 64,90"), com limite de frequência.

## 8.7 UX de conflito

- **Operação própria rejeitada (409):**

  ```text
  ⚠ A cerveja foi atualizada por Ray.
  Valor atual:     5 × R$ 9,00    ← serverState
  Sua alteração:   4 × R$ 9,00
  [ Usar valor atual ]   [ Editar novamente ]
  ```

  [Usar valor atual] descarta a tentativa. [Editar novamente] reabre o formulário com os valores atuais; o reenvio é sempre manual, com a nova `versaoBase`.
- **Alteração de outra pessoa chegando:** o card atualiza, sem modal. Se a pessoa estiver com o formulário daquela entidade aberto, os campos mostram "atualizado por Ray" e o envio exige revisão.
- **`serverState`** (409 e 422) contém, sem nenhum token: `contaId`, `revisao`, a entidade atual, partes afetadas, pendências, totais derivados e estado da conta.

## 8.8 OCR assíncrono

Regras de tentativa em §6.2. Resultado tardio de tentativa cancelada, expirada ou substituída nunca altera a comanda nem muda o estado da conta.

## 8.9 Contrato de erros

| HTTP | Quando | Interface |
|---|---|---|
| 400 | payload malformado ou fora do schema | erro de programa: registra, sem oferecer nova tentativa |
| 401 | sessão inexistente, expirada ou revogada | volta à entrada (12) ou mostra "Seu acesso foi transferido para outro aparelho" |
| 403 | ação exclusiva do criador por outra pessoa; ação em nome de outro sem o comando "em nome de" | mensagem genérica, sem vazar estado |
| 404 | conta inexistente, excluída, link rotacionado ou conta diferente da sessão | "Este link não é mais válido" (mesma resposta em todos os casos) |
| 409 | `versaoBase`, `versaoConsumoBase`, `valorVisto`, `reaberturasAceitas`, `revisaoBase` desatualizados; vaga já vinculada | diálogo com `serverState` (§8.7) |
| 422 | regra de domínio (§7.10), `MESA_CHEIA`, `CONTA_FINALIZADA`, redução bloqueada, limite | mensagem da regra e valores corretos |
| 429 | limite de taxa (§9.4.7) | "Muitas tentativas. Aguarde um instante." |
| 500 | falha interna ou violação de I1 | "Não foi possível salvar" + [Tentar novamente] + atualização do estado |
| rede | sem resposta | 🟡 e depois 🔴; nunca assume sucesso |

Não existe resposta de trava de edição: a comanda nunca fica bloqueada porque alguém abriu uma tela.

## 8.10 Sincronização e offline

| Indicador | Condição |
|---|---|
| 🟢 Sincronizado | conectado e sem operação sem resposta |
| 🟡 Sincronizando… | pelo menos uma operação aguardando resposta |
| 🔴 Você está offline | sem rede, ou heartbeat falho |

- **Offline pode:** ver o último estado conhecido.
- **Offline não pode:** confirmar divisão, editar comanda, confirmar consumo, fechar parte ou conta. Mensagem: "🔴 Você está offline. Não foi possível confirmar esta alteração. [Tentar novamente]".
- Nunca mostrar "✓ dividido" ou "✓ confirmado" sem resposta do servidor. Depois de recarregar a página, nada otimista sobrevive.
- Sessão revogada: o servidor encerra a conexão de eventos daquela sessão em até 5 s e passa a responder 401.
- Fila de operações offline está fora do MVP.

---

# 9. Requisitos não funcionais

## 9.1 Performance e limites

| Métrica | Meta do MVP |
|---|---|
| OCR (envio → resultado) | ≤ 8 s p95; progresso visível em < 300 ms |
| Tempo máximo do OCR | 20 s na interface (→ tela 05); 25 s no servidor |
| Confirmação de operação | ≤ 1,5 s p95 até 🟢 |
| Evento até os outros aparelhos | ≤ 500 ms p95 |
| Primeiro carregamento (4G) | ≤ 3 s até interativo |
| Foto | até 10 MB, comprimida no cliente; validada no servidor (§9.4.8) |
| Itens por conta | até 100 (o 101º é rejeitado com 422); aviso na interface a partir de 50 |
| Cobranças por conta | até 20 |
| Quantidade por item | 1 a 999 |
| Valores | totais e itens até R$ 999.999,99; centavos em inteiro de 64 bits |
| Textos | nome de participante ≤ 30; item ≤ 60; cobrança ≤ 40; restaurante ≤ 60 |

## 9.2 OCR

- Entrada: JPG, PNG, HEIC (convertido), retrato ou paisagem. Idioma pt-BR, com as variações usuais ("SERV", "COUVERT", "TAXA", "DESC").
- O resultado é sempre uma sugestão editável (tela 06), nunca verdade.
- **Saída tratada como dado não confiável:** o servidor valida o resultado com schema estrito (tipos, centavos inteiros, quantidades, limites de §9.1, tamanho dos textos). Resultado fora do schema ou acima dos limites é tratado como falha (tela 05), nunca aplicado em parte.
- **Provedor com modelo multimodal (§10.2 T1):** a imagem é entrada não confiável e pode conter texto que tenta manipular a extração. As instruções do sistema ficam separadas da imagem; o modelo não tem ferramentas nem acesso a outros dados; a saída é só o JSON validado.
- Confiança baixa por campo: destacar para conferência (desejável, não bloqueia).
- Fallback manual sempre disponível (02 e 05).

## 9.3 PWA e dispositivos

- Funciona no navegador sem instalação. Manifest e service worker para cache da casca do app; instalar é opcional e nenhum fluxo depende disso.
- Câmera por `getUserMedia` com alternativa de `input type=file` com `capture`; galeria e digitação manual sempre disponíveis.
- Compartilhamento por `navigator.share`, com alternativa de copiar.
- Teclado numérico (`inputmode="decimal"`) nos campos de dinheiro.
- Suporte: iOS Safari 16+, Chrome Android, navegadores de desktop atuais.
- **Identidade entre navegadores:** app instalado, navegador do sistema e navegadores embutidos em outros apps podem ter cookies separados, mesmo no mesmo celular. A recuperação é a reivindicação (§5.3.4). A interface não deve incentivar a instalação no meio de uma conta.

## 9.4 Segurança

### 9.4.1 Modelo de ameaça

- **O link é uma credencial de edição completa** (risco aceito, §10.4 RA1): quem tem o link lê e altera a divisão. O pior caso é dano financeiro à mesa.
- Mitigações: token de 128 bits ou mais no fragmento da URL (§5.2); rotação pelo criador; toda ação em nome de outra pessoa e toda mudança sensível com origem visível e auditada; remoção de entradas sem consumo; limites de taxa.

### 9.4.2 Identificadores e aleatoriedade

`joinToken` e tokens de sessão: 128 bits ou mais de segredo, de fonte criptográfica. `conta.id` e IDs de entidades: UUID v4 (122 bits aleatórios; não são credenciais). Nenhum identificador público é sequencial. Teste: 1000 tentativas de adivinhar não encontram conta.

### 9.4.3 Sessão

- Cookie opaco `HttpOnly`, `Secure`, `SameSite`, prefixo `__Host-`; nunca em `localStorage`.
- Escopo (conta, participante); renovação, expiração e revogação conforme §5.3.1.
- Revogação encerra a conexão de eventos (§8.10).

### 9.4.4 Autorização

- A identidade do autor vem **somente** da sessão. Nenhum comando aceita `participanteId` do autor no corpo. "É criador" é sempre `sessão.participanteId == conta.criadoPor`.
- A conta do comando precisa ser a conta da sessão; caso contrário, 404, a mesma resposta de conta inexistente.
- Todo identificador no corpo (`itemId`, `cobrancaId`, participantes em atribuições, `participantesRateio`, `dispensadaPara`, alvo de resolução ou remoção) precisa pertencer à mesma conta; caso contrário, 422 "referência inválida", a mesma resposta de um ID inexistente.
- Toda validação de regra é feita no servidor (§7.10). O cliente só exibe.

### 9.4.5 CSRF e métodos

- Nenhum `GET` altera estado. Comandos usam `POST`, `PUT`, `PATCH` ou `DELETE`.
- Comandos exigem `SameSite` e verificação de origem (cabeçalho `Origin`) ou token anti-CSRF; o mecanismo final fica para a SDD.

### 9.4.6 Texto não confiável

- Todo texto de §2.5 é validado no servidor (tamanho, sem caracteres de controle) e **escapado na renderização** em todas as telas, inclusive no resumo e no texto copiado ou enviado ao WhatsApp. Nunca inserir texto de usuário como HTML.
- Filtro simples de conteúdo impróprio em nomes (MVP).

### 9.4.7 Limites de taxa

Por aparelho e por conta: criação de conta, entrada pelo link, reivindicações, OCR (ex.: 10 por minuto por conta), comandos em geral. Resposta 429.

### 9.4.8 Upload da foto

- O servidor valida tamanho (≤ 10 MB), tipo pela assinatura do arquivo (não pela extensão), dimensões e decodifica com biblioteca atualizada; HEIC é convertido no servidor.
- Remove todos os metadados (EXIF, inclusive GPS) antes de armazenar ou enviar ao OCR.
- Gera nome interno; nunca usa o nome enviado.
- A imagem só é servida para sessões da conta, por proxy autenticado da API ou por URL assinada de até 5 min; nunca por URL pública.

### 9.4.9 Logs e auditoria

- Logs nunca contêm `joinToken`, cookies, sessões ou o texto completo da comanda.
- Auditoria: criação, confirmação da comanda, mudança do total impresso, ajuste de divergência, dispensas, resoluções em nome de outra pessoa, vínculo de vaga, reivindicações e decisões, remoções, exclusão de item, fechamento, rotação de link, anonimização e exclusão da conta. Campos: ação, `participanteId` do autor, alvo, data e hora e IP como HMAC com chave secreta (nunca hash simples, que é reversível no espaço de endereços IPv4).
- Cabeçalhos de segurança (CSP, HSTS, `Referrer-Policy: no-referrer` na página de entrada) são aplicados de forma centralizada pela infraestrutura.

## 9.5 Privacidade e LGPD

- **Dados coletados:** nome exibido, avatar, consumo e valores, foto da comanda. Sem e-mail, sem CPF, sem localização (metadados removidos, §9.4.8).
- **Foto:** dado pessoal em potencial (nome no rodapé da comanda). Sem uso para treino ou analytics. Purgada automaticamente 48 h após `finalizadaEm`, e imediatamente na exclusão da conta.
- **Provedor de OCR:** declarado como suboperador; contrato com retenção zero ou mínima e sem uso para treino (§10.2 T1).
- **Retenção:** dados textuais da divisão até a exclusão da conta. Log de auditoria por 90 dias (provisório, §10.2 T11); após a exclusão da conta, só o registro mínimo sem dados pessoais.
- **Direitos do titular no MVP:** excluir conta (criador), anonimizar meus dados (qualquer pessoa sobre si), sair e apagar dados deste dispositivo (§5.14).
- **Dados locais:** cache da conta e imagens apagados ao sair, ao ser removido, ao ter a sessão transferida e na exclusão da conta.
- Política de privacidade com finalidade (dividir a conta), retenções acima e o provedor de OCR.

## 9.6 Acessibilidade (WCAG 2.1 AA, no mínimo)

- Contraste ≥ 4,5:1; texto ≥ 12 px.
- Áreas de toque ≥ 44 × 44 px; ações principais na metade inferior.
- Status com texto e ícone, nunca só cor.
- Foco visível, navegação por teclado, rótulos em todos os campos; foco preso em diálogos e folhas, que fecham com Esc e devolvem o foco ao gatilho.
- Zoom de 200% sem perda de conteúdo (sem `user-scalable=no`).
- Leitores de tela: anúncio de mudança do próprio valor com limite de frequência; estados de sincronização sempre em texto.

## 9.7 Responsividade

- Funcional a partir de 320 px de largura, sem rolagem horizontal.
- Tablet e desktop: mais colunas, mesma hierarquia.

## 9.8 Operação e observabilidade

- Disponibilidade alvo: 99% no MVP.
- Health check; logs de erro de OCR, 409, 422 e 500.
- Métricas: sucesso e tempo do OCR; contas que nunca dividiram; **contas travadas** (`ABERTA` há mais de 2 h com pendências pessoais); reivindicações pedidas, aprovadas e expiradas; remoções; tempo entre confirmar a comanda e fechar a conta.
- Backup: dado de vida curta; RPO baixo não é crítico no MVP.

## 9.9 Idioma

pt-BR fixo no MVP. Textos centralizados para facilitar tradução futura.

---

# 10. Decisões e riscos

**Status:** DECIDIDA (aplicada nesta spec) · PROVISÓRIA (vale até revisão com dados reais) · ABERTA · PÓS-MVP.

## 10.1 Decisões de produto

| # | Tema | Decisão | Status | Onde |
|---|---|---|---|---|
| D1 | Retenção | Conta sem expiração; foto purgada 48 h após a finalização; dados textuais até a exclusão | DECIDIDA | §5.2, §9.5 |
| D2 | Reabrir conta finalizada | Não no MVP | DECIDIDA (MVP) | §5.13 |
| D3 | Remover participante | Só sem consumo, por qualquer participante, com origem visível. Para quem tem itens: remover o consumo antes | DECIDIDA (revista na v2) | §5.4.3 |
| D4 | Sair e apagar dados deste dispositivo | No MVP | DECIDIDA | §5.3.5 |
| D5 | Itens para placeholder | Permitido e sinalizado; pendência `PARTICIPANTE_AGUARDANDO_ENTRADA` | DECIDIDA | §5.4.4 |
| D6 | Vínculo de vaga por nome | Mantido, com confirmação "Você é X?"; risco aceito | DECIDIDA | §5.3.3 |
| D7 | Histórico de contas | Fora do MVP | PÓS-MVP | |
| D8 | Cardápio e restaurantes | Fora do MVP | PÓS-MVP | |
| D9 | Pagamento (Pix, terceiros, "Já paguei") | Fora do MVP | PÓS-MVP | §1.3 |
| D10 | Separar item em dois | Fora do MVP | PÓS-MVP | §5.6.5 |
| D11 | Avatar | Inicial do nome + cor de um conjunto fixo (como no mockup); sem upload | DECIDIDA (revista na v2) | §2.2 |
| D12 | Marca | "Conta Juntos" (adotada no mockup); verificação de domínio e registro antes do lançamento | ABERTA | |
| D13 | Salvar parcial no personalizado | Sim, com pendência visível | DECIDIDA | §5.7 |
| D14 | Limite de vagas | 6, configurável; revisar com uso real | PROVISÓRIA | §5.4 |
| D15 | Criador | Identificado antes da comanda; poderes exclusivos só para rotacionar link e excluir conta | DECIDIDA (revista na v2) | §5.1 |
| D16 | Nome "Fechar minha parte" | Mantido; rótulo "Minha parte até agora" enquanto houver pendências | DECIDIDA | §4.8 |
| D17 | Consumo não confirmado | Bloqueia o fechamento; qualquer participante pode resolver em nome da pessoa, com origem visível | DECIDIDA (revista na v2) | §5.9 |
| D18 | Autoridade do preço | `modoPreco`: unitário ou total da linha | DECIDIDA | §7.2 |
| D19 | Diferença acima de 5 centavos | Corrigir ou ajuste de divergência explícito; sem "Confirmar assim mesmo" | DECIDIDA | §7.5 |
| D20 | Confirmação de consumo | Só explícita; dividir itens nunca confirma | DECIDIDA (nova) | §5.8 |
| D21 | Ações de resolução | Três ações que encerram: confirmar em nome, remover itens e confirmar zero, editar e confirmar | DECIDIDA (nova) | §5.9 |
| D22 | Ajustes da mesa | No MVP: dispensa de taxa (total ou parcial) e cobranças da mesa fora da conferência | DECIDIDA (nova) | §5.12 |
| D23 | Recuperar identidade | Reivindicação "Sou eu" aprovada por outra pessoa da mesa; vale para o criador | DECIDIDA (nova) | §5.3.4 |
| D24 | Base do rateio proporcional | Total de itens; centavos de resto só com tudo distribuído | DECIDIDA (nova) | §7.7.1 |
| D25 | Quem divide cobranças iguais | Sempre explícito; ninguém é incluído ou excluído automaticamente | DECIDIDA (nova) | §7.7.2 |
| D26 | Subtotal impresso | Não conferido no MVP | DECIDIDA (nova) | §7.5.3 |
| D27 | Desfazer exclusão de item | Restaurar item excluído enquanto a conta estiver aberta, como mutação comum | DECIDIDA (detalhada na v2) | §5.6.2 |
| D28 | Estados da conta | `AGUARDANDO_PARTICIPANTES` e `DIVISAO_EM_ANDAMENTO` unificados em `ABERTA` | DECIDIDA (nova) | §6.1 |
| D29 | Instalação do PWA | Opcional; nenhum fluxo depende dela | DECIDIDA (nova) | §9.3 |
| D30 | Entidade de pagamento | Não existe no modelo do MVP | DECIDIDA (nova) | §1.3 |
| D31 | Entrada só para acompanhar | Pergunta "Você consumiu algo?" na entrada; "Não" confirma consumo zero | DECIDIDA (nova) | §3.3 |

## 10.2 Decisões técnicas

| # | Tema | Decisão ou recomendação | Status |
|---|---|---|---|
| T1 | Provedor de OCR | Serviço em nuvem com modelo multimodal, saída em JSON com schema estrito, sem ferramentas; contrato com retenção zero ou mínima e sem treino | PROVISÓRIA |
| T2 | Transporte | REST para comandos + SSE para eventos; WebSocket como alternativa | PROVISÓRIA |
| T3 | Stack | A definir na SDD técnica | ABERTA |
| T4 | Cálculo | Uma única biblioteca de cálculo, usada no servidor (autoridade) e no cliente (prévia e aviso de reabertura) | DECIDIDA |
| T5 | QR Code | Gerado no cliente | DECIDIDA |
| T6 | Imagem | Compressão no cliente; validação, conversão e remoção de metadados no servidor | DECIDIDA |
| T7 | Eventos depois do commit | Outbox ou equivalente; nenhum evento antes da gravação | DECIDIDA (detalhe na SDD) |
| T8 | Concorrência | Serialização de mutações por conta no servidor + `versaoBase` por entidade | DECIDIDA |
| T9 | Credencial do link | `joinToken` separado de `conta.id`, no fragmento da URL, trocado por sessão via `POST` | DECIDIDA |
| T10 | Desempate do Maior Resto | SHA-256 de `contextoId:participanteId`, comparação hexadecimal | DECIDIDA |
| T11 | Prazos | Sessão expira após 30 dias sem uso; auditoria por 90 dias; idempotência por 24 h; reivindicação expira em 10 min | PROVISÓRIA |
| T12 | Proteção CSRF | `SameSite` + verificação de `Origin` ou token anti-CSRF | ABERTA (SDD) |

## 10.3 Pendências de design

### 10.3.1 Correções no mockup atual (`EDB063B6-4E6A-413A-84EF-DC5F00C4D877.png`)

| Tela | Correção |
|---|---|
| 01 | Desenhar o estado "Como devemos te chamar?" do criador |
| 02 | Adicionar [Digitar manualmente] |
| 06 | Total impresso como campo editável; acesso explícito a 08; aviso de cobrança a conferir |
| 08 | Acrescentar "Quem paga esta taxa?", origem do valor, quem divide (taxa igual) e a seção "Ajustes da mesa" |
| 09 | Acrescentar [Ajuste de divergência]; o fundo mostra "Pizza 1 × R$ 10,00" com valor R$ 120,00, use um erro coerente (refrigerante 4 × R$ 5,75) |
| 10 | Rótulo "Confirmar convinda" → "Confirmar comanda" |
| 11 | Contador logo após a criação: "1 de 6 vagas"; [Entrar na conta] → [Ir para a sala] (o criador já é participante); link exibido de forma abreviada |
| 12 | "(Eu)" é marcação da interface, não parte do nome; acrescentar [Já estou nesta conta] e os estados de vínculo, reivindicação, mesa cheia e "Você consumiu algo?" |
| 13 | Menu ⋯ (tela 28), cartão de progresso, status de consumo por pessoa, banner de reivindicação, ações "Remover" e "Resolver" |
| 14 | Com a batata não dividida (estado E-2), a barra deve mostrar "Minha parte até agora R$ 53,90" e a linha "Ainda não distribuído R$ 33,00" |
| 15 | Valores somam R$ 325,51; o correto é 64,90 · 64,90 · 64,90 · 16,50 · 13,20 · 6,60 = 231,00 |
| 21 | Acrescentar o atalho "Você está nesta divisão. Revisar e confirmar meu consumo" |
| todas da conta | Indicador 🟢 🟡 🔴 |

### 10.3.2 A desenhar

- Telas 22 a 28.
- Estados: OCR cancelado, câmera negada, mesa cheia, link inválido, reivindicação (pedido, espera, aprovação, recusa), diálogo de resolução, aviso de reabertura ao editor, conflito 409, offline, conta excluída.
- Banners globais (§4.8).

### 10.3.3 Documentação

- `image.png` (mockup anterior, marca "Divide Aí", dataset antigo) está obsoleto e não deve orientar design nem testes.
- Renomear o mockup atual para um nome estável (ex.: `telas.png`) e atualizar §1.8.

## 10.4 Riscos aceitos no MVP

| # | Risco | Mitigação |
|---|---|---|
| RA1 | O link é credencial de edição completa | token forte no fragmento, rotação, origem visível, auditoria, remoção de entradas vazias |
| RA2 | Alguém com o link assume uma vaga pré-cadastrada homônima | confirmação "Você é X?", banner, consumo continua a confirmar |
| RA3 | Uma pessoa aprova por engano a reivindicação de outra | o alvo conectado também vê e pode recusar; o aparelho antigo é avisado; auditoria |
| RA4 | Edição aberta gera mais conflitos | serialização, versões, UX de conflito |
| RA5 | Qualquer participante fecha a conta | zero pendências + CAS + confirmação |
| RA6 | Pessoa sozinha na conta perde a sessão | sem ninguém para aprovar a reivindicação; a pessoa cria outra conta |
| RA7 | OCR instável em comandas ruins | fallback manual e entrada sem foto |
| RA8 | Retenção dos dados textuais sem prazo | exclusão e anonimização disponíveis |
| RA9 | Mesas com mais de 6 pessoas | limite configurável; revisar com dados (D14) |
| RA10 | Criador perde a sessão e ninguém aprova | só rotacionar link e excluir conta ficam indisponíveis; a divisão segue normalmente |
| RA11 | Depois da finalização, quem perdeu a sessão depende de alguém da mesa aprovar a reivindicação para anonimizar os próprios dados | reivindicação aceita em `FINALIZADA`; o criador pode excluir a conta inteira |

## 10.5 Fora do MVP

| Item | Motivo |
|---|---|
| Pagamento, Pix, "Já paguei", pagamento por terceiros | escopo; camada futura sobre o consumo |
| Histórico, cardápio, restaurantes, múltiplas moedas | escopo |
| Despesas domésticas, recorrência, grupos, integração bancária, estatísticas, exportação | escopo |
| Notificações push | lembretes por compartilhamento nativo e WhatsApp |
| Colaboração offline com fila | complexidade; MVP é leitura offline |
| Separar item, desconto vinculado a item | sem tela no MVP; usar personalizado ou editar o item |
| Reabrir conta finalizada | D2 |
| Transferir o papel de criador | a reivindicação cobre a perda de sessão |
| Conferência do subtotal impresso | D26 |
| Rascunho de edição da comanda em lote | cada salvamento é um commit |

---

# 11. Checklist do MVP e critérios de aceite

Cada item aponta para a tela e a regra. Valores fora do dataset canônico estão marcados como **cenário de teste**.

## 11.A Criação e OCR

- [ ] Criar conta com identificação do criador **[01]** §3.2
- [ ] Fotografar, escolher da galeria ou digitar manualmente **[02, 03]** §3.2
- [ ] OCR com progresso, cancelamento e tentativa vigente **[04]** §6.2
- [ ] Fallback manual **[05, 06]** §3.2
- [ ] Conferir comanda com total impresso obrigatório **[06]** §5.6.3
- [ ] Ver a foto original **[06, 07]**
- [ ] Editar item conforme `modoPreco` **[07]** §7.2
- [ ] Cobranças da comanda: origem, percentual, distribuição, confirmação **[08]** §7.3, §6.5
- [ ] Mesclar linhas duplicadas **[06]** §5.6.4
- [ ] Tolerância de 5 centavos e ajuste de divergência **[09]** §7.5
- [ ] Confirmar comanda **[10]** §6.1

> **CA-A1. Fallback do OCR**
> Given o OCR falhou ou passou de 20 s
> When a pessoa toca em [Digitar manualmente] na tela 05
> Then a tela 06 abre vazia, com [Adicionar item], acesso a 08 e o campo Total impresso obrigatório, e a conta pode ser montada inteira sem OCR

> **CA-A2. Entrada manual sem foto**
> Given a pessoa está na tela 02
> When toca em [Digitar manualmente]
> Then a conta vai de `CRIANDO` para `AGUARDANDO_CONFERENCIA` sem imagem e [Ver foto] fica oculto

> **CA-A3. Divergência bloqueia**
> Given (cenário de teste) refrigerante lido como 4 × R$ 5,75: calculado R$ 230,00, total impresso R$ 231,00
> When a pessoa toca em [Confirmar comanda]
> Then a tela 09 mostra Calculado, Total impresso e Diferença R$ 1,00, oferece só [Corrigir valores] e [Ajuste de divergência], e a confirmação é impossível enquanto `|diferença| > 5 centavos`
> And corrigir o unitário para R$ 6,00 zera a diferença e libera a confirmação

> **CA-A4. Tolerância de centavos**
> Given (cenário de teste) total impresso R$ 231,03 com a comanda do dataset
> When a comanda é confirmada
> Then não há tela de divergência nem pendência; `ajusteConciliacao = +3`; no estado final Nery, Ray e Nath ficam com R$ 64,91 e os demais não mudam; o serviço continua R$ 21,00; a linha "Ajuste de conciliação +R$ 0,01" aparece em 16 e 22 para quem recebeu

> **CA-A5. Ajuste de conciliação estável**
> Given diferenças de +3 e −3 centavos
> When a conta é recalculada repetidas vezes
> Then o ajuste é sempre +3 ou −3, nunca 1,5 ou alternando com 0
> And diferenças de +6 e −6 centavos geram `DIVERGENCIA_COMANDA`

> **CA-A6. Ajuste de divergência**
> Given o cenário de A3
> When alguém escolhe [Ajuste de divergência] e confirma
> Then é criada a cobrança "Ajuste de divergência", `TAXA`, R$ 1,00, escopo comanda, confirmada e proporcional; itens e serviço não mudam; a diferença fica zero; a pendência some; há banner e registro de auditoria

> **CA-A7. Autoridade do preço**
> Given cerveja 4 × R$ 9,00 em `UNITARIO`
> When a quantidade muda para 5 na tela 07
> Then o total vira R$ 45,00 e o unitário fica R$ 9,00
> And (cenário de teste) a linha `TOTAL_LINHA` "3 un. · R$ 10,00" é válida, com o total editável e "sem preço unitário exato"

> **CA-A8. Resultado de OCR atrasado**
> Given a tentativa A passou de 20 s e a pessoa escolheu digitar manualmente (ou iniciou a tentativa B com outra foto)
> When o resultado de A chega
> Then ele é descartado, a comanda manual (ou o resultado de B) não muda e o estado da conta não muda

> **CA-A9. Limite de itens**
> Given uma conta com 100 itens
> When alguém adiciona o 101º
> Then recebe 422 "A conta aceita até 100 itens"
> And (cenário de teste) um resultado de OCR com mais de 100 linhas é tratado como falha (tela 05)

> **CA-A10. Cobranças do OCR**
> Given o OCR leu "Serviço 10% R$ 21,00" com itens de R$ 210,00
> Then a cobrança nasce confirmada
> And (cenário de teste) "Serviço R$ 21,00" sem percentual nasce não confirmada com o motivo exibido em 08, e [Confirmar comanda] leva a 08 até alguém confirmar a cobrança

> **CA-A11. Total impresso depois da confirmação**
> Given a conta está `ABERTA`
> When Ray muda o total impresso de R$ 231,00 para R$ 230,00
> Then a interface pede confirmação antes de enviar, todos veem o banner "Ray mudou o total impresso para R$ 230,00", surge `DIVERGENCIA_COMANDA` e a mudança fica na auditoria

## 11.B Entrada, identidade e vagas

- [ ] QR Code, link e WhatsApp **[11]** §5.2
- [ ] Pré-cadastro por qualquer participante **[11]** §5.4.4
- [ ] Limite de 6 vagas **[11, 12]** §5.4
- [ ] Entrada sem cadastro com pergunta de consumo **[12]** §3.3
- [ ] Reentrada no mesmo navegador **[12]** §5.3.2
- [ ] Vínculo com vaga pré-cadastrada **[12]** §5.3.3
- [ ] Reivindicação "Sou eu" **[12, 13]** §5.3.4
- [ ] Remover participante sem consumo **[13]** §5.4.3
- [ ] Sala com presença, progresso e contador **[13]** §5.5

> **CA-B1. Reentrada**
> Given Ray entrou no navegador X
> When reabre o link no navegador X
> Then volta como o mesmo participante, sem pedir nome

> **CA-B2. Mesa cheia**
> Given 6 vagas ocupadas por pessoas que já entraram
> When uma pessoa nova abre o link
> Then vê "A mesa está cheia (6 de 6)…" e nenhum participante é criado

> **CA-B3. Vaga reservada com mesa cheia**
> Given Nery e cinco vagas pré-cadastradas (6 de 6)
> When cada pessoa pré-cadastrada entra e confirma [Sou eu]
> Then todas vinculam a própria vaga sem mudar a contagem
> And uma sétima pessoa nova recebe "Mesa cheia"

> **CA-B4. Corrida pela mesma vaga**
> Given a vaga "Thais" em `CONVIDADO`
> When dois aparelhos confirmam [Sou eu] ao mesmo tempo
> Then um vincula e o outro recebe 409 "Esta vaga já foi ocupada" com as opções "Já estou nesta conta" e "Entrar como novo participante"

> **CA-B5. Corrida pela última vaga nova**
> Given 5 vagas ocupadas
> When dois aparelhos entram como novos ao mesmo tempo
> Then só um ocupa a sexta vaga e o outro recebe "Mesa cheia"

> **CA-B6. Vínculo por nome**
> Given a vaga "Thais" pré-cadastrada por Nery, com refrigerante atribuído
> When alguém digita "thais" na tela 12
> Then vê "Você é Thais, pré-cadastrada por Nery?"; [Sou eu] vincula e a pessoa vê em 22 o refrigerante atribuído, ainda "⏳ Aguardando confirmação"; [Não sou] cria outro participante, se houver vaga

> **CA-B7. Reivindicação com aprovação**
> Given Davi está `ATIVO` com consumo confirmado e perdeu a sessão (outro aparelho)
> When ele escolhe "Davi" em [Já estou nesta conta] e pede acesso
> Then todos os conectados veem o banner de aprovação; quando Ray aprova, o novo aparelho entra como o mesmo Davi (mesmo `participanteId`, mesma vaga, consumo e confirmação preservados) e as sessões antigas de Davi são revogadas
> And sem aprovação em 10 min a reivindicação expira

> **CA-B8. Criador recupera o papel**
> Given Nery (criadora) usou "Sair e apagar"
> When volta pelo link e Ray aprova a reivindicação
> Then Nery volta como criadora e pode rotacionar o link e excluir a conta

> **CA-B9. Remover participante sem consumo**
> Given (cenário de teste) uma pessoa entrou duas vezes por engano e a mesa está 6 de 6
> When Ray remove o participante duplicado, que não tem itens
> Then a vaga é liberada, as sessões dele são revogadas, todos veem o banner e um convidado real consegue entrar
> And remover alguém com itens, o criador ou a si mesmo não é permitido

> **CA-B10. Só vim acompanhar**
> Given uma pessoa nova entra
> When responde "Não, só vim acompanhar"
> Then fica `✓ Sem itens · R$ 0,00` e não gera pendência

> **CA-B11. Rotação do link**
> Given o criador rotacionou o link
> When alguém abre o link antigo
> Then vê "Este link não é mais válido"; quem já estava na conta continua; o QR e o link de 11 mostram o link novo para todos

> **CA-B12. Conta finalizada pelo link**
> Given a conta está `FINALIZADA`
> When alguém abre o link
> Then vê 26 e 27 somente leitura, sem tela de entrada

## 11.C Divisão

- [ ] Itens com status em texto e ícone **[14]** §6.3
- [ ] Pessoas com situação de consumo **[15]** §5.8.4
- [ ] Detalhe por pessoa **[16]**
- [ ] Dividir entre pessoas **[17, 18]** §7.6.1
- [ ] Distribuir unidades, sem gravar por toque **[19]** §7.6.2
- [ ] Personalizar por valor e por percentual, com salvar parcial **[20]** §7.6.3, §7.6.4
- [ ] Troca de modo atômica **[17, 21]** §5.7
- [ ] Edição de item já dividido sem destruir a divisão **[07]** §5.6.1
- [ ] Atribuir itens a placeholder, sinalizado **[18–20]** §5.4.4

> **CA-C1. Unidades não estouram**
> Given cerveja 4 × R$ 9,00
> When a soma no stepper tenta chegar a 5
> Then o stepper não permite, nada é gravado por toque, [Confirmar] só habilita em "4 de 4" e grava tudo em um commit

> **CA-C2. Personalizado fecha exato**
> Given batata R$ 30,00 com Nery 10,00 e Ray 10,00
> When a pessoa tenta confirmar
> Then [Confirmar] fica desabilitado com "A divisão não fecha: faltam R$ 10,00"; com Nath 10,00 aparece "✓ Divisão confere" e confirma
> And [Salvar parcial] com Nery e Ray grava o item como `DIVISAO_INCOMPLETA` com "Faltam R$ 10,00"

> **CA-C3. Troca de modo atômica**
> Given a pizza dividida entre Nery, Ray e Nath
> When alguém escolhe "Distribuir unidades" em 17, vê o aviso de substituição e cancela em 19
> Then a divisão entre as três pessoas continua intacta
> And se confirmar em 19, o modo e as atribuições novas substituem os antigos em um único commit; uma falha (409, 422, offline) deixa tudo como antes

> **CA-C4. Quantidade não define o modo**
> Given (cenário de teste) "2 porções de batata, R$ 40,00"
> Then os três modos estão disponíveis

> **CA-C5. Percentual guardado**
> Given (cenário de teste) item de R$ 0,01 dividido 50% / 50% entre Nery e Ray
> Then as partilhas são 0,01 e 0,00, pelo desempate
> When o item passa a R$ 0,02
> Then as partilhas são 0,01 e 0,01
> And salvar 30% / 30% na batata deixa 9,00 / 9,00 e "Faltam R$ 12,00"; soma acima de 100% é rejeitada

> **CA-C6. Redução de item personalizado**
> Given a batata com Nery, Ray e Nath em 10,00 cada (valor fixo)
> When alguém muda o valor da batata para R$ 25,00
> Then recebe 422 "Há R$ 30,00 atribuídos; ajuste a divisão antes de reduzir" e nada muda
> And mudar para R$ 36,00 deixa a batata `DIVISAO_INCOMPLETA` com "Faltam R$ 6,00", sem apagar as atribuições

> **CA-C7. Aumento de quantidade em unidades**
> Given cerveja 4/4 distribuída
> When alguém muda a quantidade para 5
> Then a divisão fica intacta e o item mostra "⚠ 4/5 unidades" com `UNIDADES_NAO_DISTRIBUIDAS`
> And reduzir para 3 com 4 unidades distribuídas é rejeitado com 422

> **CA-C8. Unidades por total da linha**
> Given (cenário de teste) 3 un. · R$ 10,00 em `TOTAL_LINHA`, Nery 2 e Ray 1
> Then Nery 6,67 e Ray 3,33, somando R$ 10,00; trocar a ordem das pessoas não muda o resultado

> **CA-C9. Excluir e restaurar item**
> Given a pizza dividida entre Nery, Ray e Nath, todos confirmados
> When Davi exclui a pizza e confirma "Isso remove R$ 40,00 de Nery, Ray e Nath"
> Then a pizza sai dos cálculos; surge `DIVERGENCIA_COMANDA` (calculado R$ 111,00 = itens 90,00 + serviço 21,00, contra R$ 231,00); Nery, Ray e Nath voltam a "⏳ Aguardando confirmação"; todos veem "Davi excluiu o item Pizza Margherita [Desfazer]"
> When Ray toca em [Desfazer]
> Then a pizza volta com a mesma divisão, a divergência some e Nery, Ray e Nath continuam precisando confirmar o consumo

## 11.D Cálculo

- [ ] Rateio por regra, exibido por pessoa **[08, 16, 22]** §7.7
- [ ] Base pré-desconto e valor impresso prevalecem **[08]** §7.3.2
- [ ] Maior Resto determinístico **§7.9**
- [ ] Invariantes I1 e I2 **§7.11**
- [ ] Rejeições de §7.10 **[08]**
- [ ] Ajustes da mesa e dispensa **[08]** §5.12

> **CA-D1. Dataset fecha**
> Given a comanda e a divisão de §2.6
> Then as partes são Nery 64,90 · Ray 64,90 · Nath 64,90 · Davi 16,50 · Thais 13,20 · Gabriel 6,60
> And Σ itens 210,00 · Σ serviço 21,00 · Σ partes 231,00 · saldo 0

> **CA-D2. Maior Resto**
> Given (cenário de teste) R$ 100,00 entre 3 pessoas
> Then 33,34 / 33,33 / 33,33; o centavo extra vai para o menor hash de `contextoId:participanteId`; a mesma entrada dá sempre o mesmo resultado, no cliente e no servidor

> **CA-D3. Percentual antes do desconto**
> Given (cenário de teste) itens R$ 200,00, desconto R$ 20,00 e serviço 10% sem valor impresso
> Then o serviço é R$ 20,00, nunca R$ 18,00

> **CA-D4. Arredondamento do percentual**
> Given (cenário de teste) itens R$ 123,45 e serviço 10% sem valor impresso
> Then o serviço é R$ 12,35

> **CA-D5. Desconto maior que a comanda**
> Given (cenário de teste) desconto de R$ 50,00 em uma comanda de R$ 30,00
> When alguém salva
> Then recebe 422 "O desconto é maior que o valor da comanda"

> **CA-D6. Parte negativa**
> Given (cenário de teste) A com consumo R$ 100,00, B com consumo zero, taxa igual R$ 100,00 entre A e B e desconto proporcional R$ 180,00
> Then as partes seriam A −30,00 e B 50,00 (total R$ 20,00)
> And a operação que produziria esse estado é rejeitada com 422, sem piso automático

> **CA-D7. Estado parcial**
> Given só a pizza dividida (estado E-1)
> Then Nery, Ray e Nath têm R$ 44,00 cada, os demais R$ 0,00, e o saldo é R$ 99,00 (itens 90,00 + serviço 9,00); Σ partes + saldo = 231,00
> And dividir a cerveja entre Nery, Ray, Nath e Davi não muda o serviço de quem não está na cerveja

> **CA-D8. Arredondamento final**
> Given (cenário de teste) A e B com R$ 10,00 cada, R$ 10,00 sem dono e serviço de R$ 1,00
> Then A e B pagam R$ 0,33 de serviço e R$ 0,34 ficam no saldo
> When o item sem dono é atribuído a C
> Then os centavos de resto são distribuídos pelo Maior Resto (um dos três paga R$ 0,34) e a soma do serviço é exatamente R$ 1,00

> **CA-D9. Taxa igual por pessoa**
> Given (cenário de teste) couvert R$ 90,00 igual por pessoa, ainda sem quem divide
> Then o valor fica no saldo e há `COBRANCA_SEM_RATEIO` ("defina quem divide")
> When alguém escolhe as 6 pessoas
> Then cada uma paga R$ 15,00, independentemente do consumo, e Σ = R$ 90,00; as 6 precisam confirmar o consumo de novo (§5.8.2, regra 5)
> And quem entra depois não é incluído automaticamente; incluir é editar a cobrança
> And uma vaga pré-cadastrada que está só na lista do couvert gera `PARTICIPANTE_AGUARDANDO_ENTRADA`, não "Vaga vazia"

> **CA-D10. Dispensa parcial do serviço**
> Given o estado final do dataset
> When a mesa marca que Davi, Thais e Gabriel não pagam o serviço
> Then a conferência continua 231,00 = 231,00; as partes são Nery, Ray, Nath 64,90 · Davi 15,00 · Thais 12,00 · Gabriel 6,00; o total a pagar é R$ 227,70; o detalhe deles mostra o serviço riscado como dispensado

> **CA-D11. Dispensa total**
> Given o estado final do dataset
> When a mesa escolhe "Ninguém paga" no serviço
> Then o total a pagar é R$ 210,00, sem divergência, e 25 e 27 mostram "Total da comanda R$ 231,00" e "Total a pagar R$ 210,00"

> **CA-D12. Gorjeta extra**
> Given o estado final do dataset
> When alguém cria o ajuste da mesa "Gorjeta extra" de R$ 12,00, igual entre os 6
> Then cada parte sobe R$ 2,00 (Nery 66,90; Gabriel 8,60), o total a pagar é R$ 243,00 e a conferência com o total impresso não muda

> **CA-D13. Linha sem unitário exato**
> Given (cenário de teste) 3 un. totalizando R$ 10,00 em `TOTAL_LINHA`, distribuídas 1/1/1
> Then a linha é válida e as partilhas somam exatamente R$ 10,00

> **CA-D14. Ajuste de conciliação positivo e negativo**
> Testar +0,01 · +0,05 · −0,01 · −0,05 sobre o estado final: resultado determinístico, linha exibida para quem recebeu, nenhuma parte negativa, Σ partes = total impresso

## 11.E Confirmação e partes

- [ ] Minha parte em tempo real **[22]**
- [ ] Barra "Minha parte (até agora)" **[13–16, 23]** §4.8
- [ ] Confirmar meu consumo e não consumi nada **[22]** §5.8
- [ ] Fechar e reabrir minha parte **[22, 24]** §5.10
- [ ] Reabertura automática com aviso **§5.10**
- [ ] Aviso de reabertura ao editor **§5.11**

> **CA-E1. Comanda muda com parte conferida**
> Given Nery em `PARTE_CONFERIDA` com R$ 64,90 no estado final
> When Ray muda a cerveja de 4 para 5
> Then antes de enviar, Ray vê "Esta alteração vai reabrir a parte de Nery…" (e de quem mais estiver conferido)
> And depois de confirmar: a divisão da cerveja fica intacta (4/5); o serviço é recalculado sobre R$ 219,00 e a parte de Nery vira R$ 64,65 "até agora"; Nery volta a `ATIVO` com o banner "Sua parte mudou de R$ 64,90 para R$ 64,65"; o consumo dela continua confirmado (os itens dela não mudaram); surgem `UNIDADES_NAO_DISTRIBUIDAS` e `DIVERGENCIA_COMANDA` (calculado R$ 240,00, impresso R$ 231,00)

> **CA-E2. Dividir não confirma**
> Given Ray atribuiu um refrigerante a Thais e ela está "⏳ Aguardando confirmação"
> When Thais divide outro item incluindo a si mesma
> Then ela continua "⏳ Aguardando confirmação"; a tela 21 mostra o atalho para revisar o consumo; só [Confirmar meu consumo] em 22 confirma

> **CA-E3. Confirmação de itens que mudaram**
> Given Thais abriu 22 com `versaoConsumo` 7
> When Ray muda a atribuição dela antes de ela tocar em [Confirmar meu consumo]
> Then o servidor responde 409 e a tela mostra os itens novos; nada é confirmado

> **CA-E4. Fechar parte com valor desatualizado**
> Given Nery abriu 24 com R$ 64,90
> When outra pessoa muda o serviço antes de ela confirmar
> Then o fechamento recebe 409 e a tela mostra o valor novo

> **CA-E5. Mudança só de taxa**
> Given Nery confirmou o consumo e fechou a parte
> When Ray muda a distribuição do serviço para igual por pessoa
> Then o consumo de Nery continua confirmado; a parte vira R$ 62,50 (59,00 + 3,50) e reabre com aviso

> **CA-E6. Corrida no aviso de reabertura**
> Given Ray aceitou o aviso "vai reabrir a parte de Nery"
> When Davi fecha a própria parte antes do envio de Ray, e a mudança de Ray também afeta Davi
> Then o servidor responde 409 e Ray vê o aviso atualizado com Nery e Davi

> **CA-E7. Fechar parte confirma o consumo**
> Given Gabriel com refrigerante atribuído e consumo não confirmado
> When ele fecha a própria parte em 24
> Then fica `PARTE_CONFERIDA` com consumo confirmado (origem própria) e `valorConferido = 6,60`

> **CA-E8. Mudança de atribuição**
> Given Nath confirmou o consumo
> When alguém tira Nath da pizza
> Then Nath e as outras pessoas da pizza (Nery, Ray) voltam a "⏳ Aguardando confirmação"

## 11.F Pendências e fechamento

- [ ] Lista de pendências servida, com ações **[23]** §2.4
- [ ] Lembrar pessoas por compartilhamento **[23]**
- [ ] Resolução em nome de outra pessoa **[15, 16, 23]** §5.9
- [ ] Revisão final com zero pendências **[25]** §5.13
- [ ] Qualquer participante fecha **[25]**
- [ ] Bloqueio depois do fechamento **[26]**
- [ ] Resumo compartilhável **[27]**

> **CA-F1. Fechamento bloqueado**
> Given um item não dividido, ou um participante "⚠ Não informou", ou "⏳ Aguardando confirmação", ou "🕓 Aguardando entrada" com itens, ou `COBRANCA_SEM_RATEIO`, ou `DIVERGENCIA_COMANDA`
> Then [Fechar conta] fica desabilitado e a pendência aparece em 23 com uma ação

> **CA-F2. Toda ação de resolução encerra**
> Given Thais "⏳ Aguardando confirmação" com R$ 12,00 de refrigerante
> When Ray usa [Confirmar em nome de Thais]
> Then Thais fica "✓ Resolvido por Ray (em nome de Thais)", nunca "Confirmado por Thais", e a pendência some
> And [Remover itens de Thais e confirmar consumo zero] deixa Thais `✓ Sem itens · R$ 0,00`, as 2 unidades de refrigerante sem dono e a pendência de unidades no item
> And [Editar itens de Thais] leva a 14 e, ao voltar, o diálogo só encerra com a ação 1 ou 2

> **CA-F3. Fechamento**
> Given zero pendências
> When qualquer participante toca em [Fechar conta] e confirma
> Then a conta fica `FINALIZADA`, toda edição recebe 422 "A conta já foi finalizada" e o resumo mostra Σ R$ 231,00

> **CA-F4. Placeholder que nunca entra**
> Given (cenário de teste) a vaga "Lucas", pré-cadastrada, com 2 cervejas (R$ 18,00) e sem celular
> When Ray confirma o consumo em nome de Lucas
> Then a pendência some; Lucas aparece em 25 e 27 com o valor dele e "resolvido por Ray"; a conta pode fechar

> **CA-F5. Remover consumo em item entre pessoas**
> Given a divisão canônica, com Nery e Ray confirmados e Nath "⏳ Aguardando confirmação"
> When Davi remove os itens de Nath e confirma consumo zero em nome dela
> Then a pizza fica entre Nery e Ray (R$ 60,00 cada) e os dois voltam a "⏳ Aguardando confirmação"; a cerveja fica "⚠ 3/4 unidades"; a batata fica "⚠ Faltam R$ 10,00"; Nath fica `✓ Sem itens · R$ 0,00` (resolvido por Davi)

> **CA-F6. CAS do fechamento**
> Given zero pendências na revisão 40
> When A abre 25 e B edita um item antes de A confirmar
> Then o fechamento de A recebe 409 e 25 recarrega com "A conta mudou enquanto você revisava"; nunca existe conta finalizada com mudança posterior

> **CA-F7. Fechamento simultâneo**
> Given zero pendências
> When duas pessoas fecham ao mesmo tempo
> Then há uma única finalização e as duas veem sucesso

> **CA-F8. Nenhuma conta sem saída**
> Given qualquer combinação de pendências
> Then cada pendência tem pelo menos uma ação disponível a algum participante conectado, que não seja só o criador

## 11.G Sincronização e concorrência

- [ ] Indicador 🟢 🟡 🔴 **§8.10**
- [ ] Offline sem otimismo **§8.10**
- [ ] Serialização por conta e validação do agregado **§8.2, §8.3.2**
- [ ] Versões e UX de conflito **§8.3, §8.7**
- [ ] Idempotência **§8.4**
- [ ] Revisão monotônica para todas as fontes e reconexão sem janela **§8.5**

> **CA-G1. Offline não mente**
> Given a pessoa está offline
> When tenta confirmar uma divisão
> Then vê "🔴 Não foi possível confirmar esta alteração. [Tentar novamente]" e o card não mostra "✓ dividido"; depois de recarregar, nada otimista aparece

> **CA-G2. Conflito no mesmo item**
> Given Ray e Nath abrem a cerveja na versão 12
> When os dois salvam
> Then o segundo recebe 409 e vê "A cerveja foi atualizada por Ray · Valor atual 5 × R$ 9,00 · Sua alteração 4 × R$ 9,00 · [Usar valor atual] [Editar novamente]", sem busca extra; Σ nunca quebra

> **CA-G3. Operações não relacionadas**
> Given Ray edita a pizza e Nath edita a batata ao mesmo tempo
> Then as duas são aplicadas, sem 409

> **CA-G4. Validação do agregado**
> Given (cenário de teste) dois itens de R$ 60,00 e desconto de R$ 100,00
> When duas pessoas reduzem itens diferentes em R$ 15,00 ao mesmo tempo
> Then só a primeira é aplicada; a segunda recebe 422 "O desconto é maior que o valor da comanda"

> **CA-G5. Idempotência**
> Given um comando foi gravado e a resposta se perdeu
> When o cliente reenvia o mesmo `operationId`
> Then recebe a resposta original e nada é duplicado

> **CA-G6. Eventos fora de ordem e salto**
> Given o cliente está na revisão 50
> When recebe a revisão 52 antes da 51
> Then nunca aplica estado parcial: aplica a 52 se ela trouxer o estado completo (senão, busca o snapshot) e ignora a 51 quando chegar

> **CA-G7. Resposta antiga não regride**
> Given o cliente recebeu a revisão 42 por evento
> When chega a resposta do próprio comando com estado da revisão 40
> Then o indicador "pendente" da operação some e o estado exibido continua na revisão 42

> **CA-G8. Snapshot sem janela**
> Given o cliente buscou o snapshot da revisão 40 e a revisão 41 foi gravada antes de o canal de eventos abrir
> When nenhuma outra mudança acontece
> Then o cliente chega à revisão 41 (pelo primeiro evento com a revisão atual) e não fica em 🟢 com o estado antigo

> **CA-G9. Atualização sem recarregar**
> Given Ray e Nath estão na tela 14
> When Ray divide a batata
> Then o card muda no aparelho de Nath sem recarregar e sem toast

## 11.H Segurança e privacidade

- [ ] Token no fragmento, troca por sessão via `POST` **§5.2**
- [ ] Sessão com escopo de conta e revogação **§5.3.1, §9.4.3**
- [ ] Autorização pela sessão e IDs da mesma conta **§9.4.4**
- [ ] Texto não confiável escapado **§9.4.6**
- [ ] Upload validado e sem metadados **§9.4.8**
- [ ] Auditoria **§9.4.9**
- [ ] Sair e apagar, anonimizar, excluir conta **[28]** §5.14
- [ ] Purga da foto **§9.5**

> **CA-H1. IDs não enumeráveis**
> Given 1000 tentativas de adivinhar link ou ID
> Then nenhuma encontra conta, e as tentativas recebem 429 depois do limite

> **CA-H2. Token fora de logs e do Referer**
> Given alguém abre o link de convite
> Then o `joinToken` não aparece em logs de acesso, no cabeçalho `Referer` nem em requisições de pré-visualização de link; depois da entrada, a barra de endereço não mostra o token

> **CA-H3. Escopo da sessão**
> Given uma sessão da conta A
> When ela tenta ler ou alterar a conta B, ou referenciar em A um participante de B
> Then recebe 404 (outra conta) ou 422 (ID de outra conta no corpo), exatamente as mesmas respostas de uma conta ou ID inexistente

> **CA-H4. Identidade só pela sessão**
> Given Ray envia "Confirmar meu consumo" com o `participanteId` de Thais no corpo
> Then o campo é ignorado ou rejeitado, e só o consumo de Ray pode ser confirmado por esse comando

> **CA-H5. Sessão revogada**
> Given Davi teve a sessão transferida para outro aparelho
> Then o aparelho antigo perde a conexão de eventos em até 5 s, recebe 401 e mostra "Seu acesso foi transferido para outro aparelho"

> **CA-H6. Texto malicioso**
> Given (cenário de teste) um item chamado `<img src=x onerror=alert(1)>`
> Then ele aparece como texto literal em todas as telas, no resumo e no texto copiado

> **CA-H7. Upload**
> Given (cenário de teste) um arquivo com extensão `.jpg` que não é imagem, ou com mais de 10 MB
> Then o servidor rejeita
> And uma foto válida com GPS no EXIF é armazenada sem metadados, e a imagem só é entregue a quem tem sessão na conta

> **CA-H8. Excluir conta**
> Given Nery (criadora) exclui a conta e confirma digitando "EXCLUIR"
> Then todos os dados e a foto são apagados, as conexões abertas recebem "Esta conta foi excluída" e limpam os dados locais, e o link mostra "Este link não é mais válido"
> And outra pessoa que não seja a criadora recebe 403 ao tentar excluir

> **CA-H9. Anonimizar**
> Given a conta `FINALIZADA`
> When Gabriel anonimiza os próprios dados
> Then o nome vira "Participante 6", o avatar fica neutro e os valores do resumo não mudam

> **CA-H10. Purga da foto**
> Given a conta finalizada às 22:00
> Then 48 h depois a foto é apagada do armazenamento, [Ver foto] some e o resumo continua disponível

> **CA-H11. Sair e apagar**
> Given Thais usa "Sair e apagar dados deste dispositivo"
> Then o cookie, a sessão no servidor e o cache local são apagados; o participante continua na conta; voltar exige o link e a reivindicação

## 11.I Não funcionais

- [ ] Fluxo principal usável só com leitor de tela
- [ ] Status sempre com texto
- [ ] Foto até 10 MB comprimida no cliente
- [ ] Câmera negada: instrução, galeria e digitação manual
- [ ] Falha de envio da foto: nova tentativa e fallback manual sem perder dados
- [ ] Valores de R$ 999.999,99 sem estouro nem quebra de layout
- [ ] Zoom de 200% e largura de 320 px sem cortes
- [ ] Reenvio de rede não duplica cobrança nem item

## 11.J Propriedades (testes gerados)

Para qualquer conta válida gerada aleatoriamente dentro dos limites de §9.1:

- nenhuma parte < 0 no estado servido;
- Σ partilhas de um item ≤ valor do item; item `DIVIDIDO` ⇒ igualdade;
- I1 sempre; I2 sempre que a conta finaliza;
- mesma entrada ⇒ mesmo resultado (inclusive desempates), no cliente e no servidor;
- recalcular duas vezes ⇒ mesmo estado (inclusive `ajusteConciliacao`);
- dividir um item não altera a parcela de cobrança proporcional de quem não está nele enquanto houver valor sem dono;
- nenhum produto intermediário excede 64 bits.

---

# Apêndice A. Rastreabilidade das análises

Onde cada achado de `analise_spec_codex.md` (R) e `analise_spec_claude.md` (C) foi tratado nesta versão.

## A.1 Achados do Codex

| ID | Tema | Tratamento | Onde |
|---|---|---|---|
| R01 | Ajuste de conciliação circular | `totalComanda` sem ajuste; ajuste derivado dele; módulo para a tolerância; rateio proporcional definido | §7.4, §7.5.1, §7.7.4, aceites CA-A4, CA-A5, CA-D14 |
| R02 | Percentual não persistido | `percentualBp` guardado; valor derivado; parcial sem normalização; soma > 100% rejeitada | §2.2, §7.6.4, aceite CA-C5 |
| R03 | Redução de item personalizado | redução abaixo do atribuído rejeitada com 422; aumento vira faltante | §5.6.1, aceite CA-C6 |
| R04 | Vaga reservada com mesa cheia | comandos separados: vincular não conta vaga; criar conta vaga | §5.4.2, aceite CA-B3 |
| R05 | Qual ação confirma o consumo | tabela de comandos e efeitos; só confirmação explícita | §5.8, aceites CA-E2, CA-E7 |
| R06 | Resoluções sem resultado consistente | três ações que encerram; "desvincular como etapa" removido | §5.9, aceites CA-F2, CA-F4 |
| R07 | Confirmação de estado não visto | `versaoConsumoBase` e `valorVisto` | §8.3.3, aceites CA-E3, CA-E4 |
| R08 | Resultado atrasado de OCR | tentativa vigente; resultados de outras tentativas descartados | §6.2, aceite CA-A8 |
| R09 | Atomicidade entre entidades | serialização de mutações por conta e validação do agregado | §8.2, §8.3.2, aceite CA-G4 |
| R10 | Resposta HTTP antiga regride o estado | revisão monotônica para todas as fontes | §8.5, aceite CA-G7 |
| R11 | Elegibilidade com estados diferentes | quem divide é sempre explícito; consumo zero só no proporcional | §7.7.1, §7.7.2, aceite CA-D9 |
| R12 | Ciclo de confirmação de cobranças | `confirmada` booleano com regras por origem; recálculo mantém confirmação; incompatibilidade de percentual tratada na criação e na edição; mudanças posteriores de itens cobertas pela conferência | §6.5, §7.3.2, aceite CA-A10 |
| R13 | 403 e 423 contra edição aberta | 423 removido; 403 só para ações do criador, outra conta ou "em nome de" sem o comando | §8.9, §5.1 |
| R14 | Desempate em unidades indivisíveis | partilha por pessoa com peso em unidades; hash definido | §7.6.2, §7.9, aceite CA-C8 |
| R15 | Piso contra rejeição de parte negativa | piso removido; sempre 422 | §7.10, aceite CA-D6 |
| R16 | Exclusão e anonimização | três operações com ator, estados e efeitos; anonimizar é exceção à imutabilidade | §5.14, aceites CA-H8, CA-H9, CA-H11 |
| R17 | Aceites errados | limite 100/101 (CA-A9); E1 reescrito com divergência e pool (CA-E1); parte negativa com dois participantes (CA-D6) | §11 |
| R18 | Subtotal impresso | não conferido no MVP; checagem de percentual cobre o caso principal | §7.5.3, D26 |
| R19 | Snapshot e eventos | canal aberto antes do snapshot; primeiro evento com a revisão atual | §8.5, aceite CA-G8 |

## A.2 Achados do Claude

| ID | Tema | Tratamento | Onde |
|---|---|---|---|
| C01 | Confirmação por toque | removida; dividir nunca confirma | §5.8.1, D20, aceite CA-E2 |
| C02 | Opções de resolução que não resolvem | três ações finais; opções duplicadas removidas | §5.9, D21, aceite CA-F2 |
| C03 | Placeholder que nunca entra | confirmar em nome de placeholder | §5.9, aceite CA-F4 |
| C04 | Identidade sem recuperação | reivindicação "Sou eu" com aprovação; aviso ao criador ao sair | §5.3.4, §5.3.5, D23, aceites CA-B7, CA-B8 |
| C05 | Vagas esgotadas | remoção de participante sem consumo por qualquer participante | §5.4.3, D3, aceite CA-B9 |
| C06 | Base do rateio e reabertura em cascata | base = total de itens; centavos de resto só no fim; regra única de reabertura; `reaberturasAceitas` | §7.7.1, §5.10, §5.11, D24, aceites CA-D7, CA-D8, CA-E6 |
| C07 | Cobranças decididas pela mesa | escopo `MESA` e dispensa de taxa | §5.12, D22, aceites CA-D10, CA-D11, CA-D12 |
| C08 | Texto não confiável e OCR multimodal | escape universal; schema estrito do OCR | §2.5, §9.2, §9.4.6, aceite CA-H6 |
| C09 | Credencial do link | `joinToken` separado, no fragmento, rotacionável; `tokenConvite` e código curto removidos | §5.2, T9, aceites CA-B11, CA-H2 |
| C10 | Escopo de autorização | identidade só pela sessão; IDs da mesma conta; revogação encerra eventos | §9.4.4, §8.10, aceites CA-H3, CA-H4, CA-H5 |
| C11 | Foto e auditoria | EXIF removido, URL assinada, validação no servidor, retenção no provedor, HMAC do IP | §9.4.8, §9.4.9, §9.5, aceites CA-H7, CA-H10 |
| C12 | Aceite de troca de modo | aviso não grava; troca atômica no confirmar | §5.7, aceite CA-C3 |
| C13 | Total impresso editável sem trilha | confirmação, banner e auditoria | §5.6.3, aceite CA-A11 |
| C14 | Cobrança igual criada antes das pessoas | lista explícita, pendência `COBRANCA_SEM_RATEIO`, sem exclusão por confirmação | §7.7.2, §2.4, D25, aceite CA-D9 |
| C15 | Pendência derivada com campos persistidos | id determinístico; sem campos de resolução nem severidade | §2.4 |
| C16 | Máquinas de estado incompletas | máquinas reescritas; estado do item derivado; `ABERTA` | §6.1, §6.3, D28 |
| C17 | Entrada manual sem foto; total sem OCR | [Digitar manualmente] em 02; total impresso sempre obrigatório | §3.2, §5.6.3, aceites CA-A1, CA-A2 |
| C18 | Precisão e desempate | inteiros exatos; meio para cima no percentual; SHA-256 | §7.1, §7.9, T10, aceites CA-D2, CA-D4 |
| C19 | Desfazer exclusão sem regra | exclusão lógica e restauração especificadas | §2.2, §5.6.2, §6.3, D27, aceite CA-C9 |
| C20 | Quem só acompanha trava a conta | pergunta de consumo na entrada | §3.3, D31, aceite CA-B10 |

## A.3 Itens de consistência (P3)

| Item | Tratamento |
|---|---|
| Tela 23 dizia "só o criador resolve" | qualquer participante resolve; a própria pessoa usa 22 (§4.5) |
| Mesmo estado com ícones diferentes | situações de consumo com rótulo único (§5.8.4) |
| Valores fora do dataset sem marca | todos marcados como cenário de teste (§2.5) |
| "O criador vira participante" na tela 11 | o criador já é participante; botão [Ir para a sala] (§4.2) |
| Pré-cadastro restrito ao criador na tela comum | qualquer participante pré-cadastra (§5.1) |
| Referências trocadas (H13/H14, tela 05, tela 04, "regra 9.1") | numeração única por seção e aceites renumerados (§11) |
| Edição após finalização com 409 | 422 `CONTA_FINALIZADA` (§6.1, §8.9) |
| Referências a revisões externas não rastreáveis | removidas; este apêndice é a única rastreabilidade |
| "Nunca negativo em módulo" | fórmula reescrita (§7.4) |
| `totalDistribuido` obsoleto | removido; "Ainda não distribuído" nomeado (§2.3) |
| Falta de `finalizadaEm` | adicionado (§2.2) |
| Item de valor zero exigia divisão | não gera pendência (§2.4, §6.3) |
| Presença incrementando revisão | proibido (§8.3.6) |
| `quantidadeCobrada` redundante | removido (§2.2) |
| `Pagamento` armazenado sem uso | entidade removida do MVP (D30) |
| Instalação do PWA como requisito | opcional (D29) |
