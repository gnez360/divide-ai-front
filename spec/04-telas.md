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
