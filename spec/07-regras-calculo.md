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
