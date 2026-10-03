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
