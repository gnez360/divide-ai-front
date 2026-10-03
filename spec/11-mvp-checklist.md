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
