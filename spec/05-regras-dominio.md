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
