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
