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
