Code Review completo da Spec SDD Funcional

1. Parecer geral

Status da revisão: REQUEST CHANGES

A especificação apresenta uma base acima da média:

* O escopo do MVP está bem delimitado.
* A separação conceitual Comanda → Consumo → Pagamento é correta.
* O fallback manual do OCR foi tratado como obrigatório.
* Dinheiro em centavos inteiros e servidor como autoridade são decisões adequadas.
* O comportamento offline é honesto.
* A preocupação com acessibilidade, concorrência e edição colaborativa aparece desde a especificação funcional.
* O dataset canônico fecha aritmeticamente:
    * itens: R$ 210,00;
    * serviço: R$ 21,00;
    * partes: R$ 231,00.

Entretanto, a spec ainda não está determinística o suficiente para iniciar a implementação sem decisões adicionais. Os principais problemas estão em:

1. conservação financeira durante estados incompletos;
2. confirmação e consentimento dos participantes;
3. cobrança igual por pessoa;
4. identidade sem autenticação;
5. edição concorrente de um agregado financeiro;
6. fechamento individual e finalização irreversível;
7. modelagem de preços reais de comandas;
8. segurança do link compartilhável;
9. inconsistências diretas entre documentos e critérios de aceite.

⸻

2. Bloqueadores do MVP — P0

P0-01 — A invariante financeira torna os estados parciais impossíveis

Onde

07 — Regras de Cálculo, §7:

Verificação em todo commit de divisão/edição: se Σ partes ≠ total, rejeita a operação.

Ao mesmo tempo, a spec permite:

* itens NAO_DIVIDIDO;
* 4/5 unidades;
* DIVISAO_INCOMPLETA;
* participantes que ainda não informaram;
* cobranças proporcionais quando ainda existe consumo sem atribuição;
* edição de comanda que cria divergência temporária.

Problema

Durante uma divisão parcial, a soma das partes naturalmente não é igual ao total da conta.

Exemplo:

Comanda: R$ 231,00
Somente a pizza foi dividida: R$ 120,00
Σ partes atuais: aproximadamente R$ 132,00 com serviço
Saldo ainda não distribuído: restante da comanda

A regra atual obrigaria o servidor a rejeitar o primeiro item dividido.

Correção obrigatória

Definir duas invariantes diferentes:

Enquanto a conta estiver aberta:
Σ partes provisórias
+ saldo de itens não distribuídos
+ saldo de cobranças ainda não rateáveis
+ ajuste ainda não alocado
= total da conta
No fechamento:
saldo não distribuído = 0
Σ partes finais = total impresso

O modelo precisa expor explicitamente:

valorItensAtribuidos
valorItensNaoAtribuidos
valorCobrancasRateadas
valorCobrancasNaoRateadas
saldoNaoDistribuido

Uma divergência esperada de fluxo não deve gerar 500. 500 deve representar falha interna do servidor, não regra de negócio.

⸻

P0-02 — O ajusteArredondamento não possui regra de distribuição

Onde

07, §3:

O residual de até 5 centavos é guardado na conta e aplicado no rateio pelo Maior Resto.

Problema

O Método do Maior Resto precisa de uma quota ou de pesos. A spec não define:

* quais participantes são elegíveis;
* se a divisão é proporcional ao consumo ou igual;
* como distribuir um ajuste negativo;
* o que acontece se o participante escolhido tiver parte de R$ 0,00;
* como evitar uma parte negativa;
* em qual linha o ajuste aparece no detalhe individual.

Além disso, absorver até 5 centavos sem mostrar nada contradiz:

Nenhuma cobrança deve ser presumida silenciosamente.

Correção obrigatória

Renomear o campo para algo semanticamente mais preciso:

ajusteConciliacao = totalInformado - totalCalculado

Definir o ajuste como um componente financeiro explícito:

Ajuste de conciliação  +R$ 0,03

A regra recomendada é:

1. alocar somente entre participantes com parte positiva;
2. usar uma base explícita, como proporção do consumo;
3. distribuir o módulo do valor;
4. aplicar o sinal depois da distribuição;
5. impedir parte individual negativa;
6. mostrar o ajuste no detalhe das pessoas afetadas;
7. registrar o ajuste no resumo da conta, ainda que de forma discreta.

⸻

P0-03 — A validação global de descontos permite partes individuais negativas

Onde

07, §5.1:

Bloquear somente quando Σ itens + Σ taxas − Σ descontos < 0.

Problema

O total global pode ser positivo enquanto uma pessoa fica com valor negativo.

Exemplo válido segundo a regra atual:

Pessoa A consome:              R$ 100,00
Pessoa B consome:              R$   0,00
Taxa igual por pessoa:         R$ 100,00 → R$ 50,00 para cada
Desconto proporcional:        R$ 180,00 → todo para A
Parte A = 100 + 50 - 180 = -R$ 30,00
Parte B =   0 + 50       =  R$ 50,00
Total global = R$ 20,00

A validação global passa, mas a parte de A fica negativa em R$ 30,00.

A guarda atual de “até 1 centavo por arredondamento” não resolve esse cenário.

Correção obrigatória

Escolher uma regra normativa:

* bloquear qualquer configuração que produza parte negativa; ou
* limitar o desconto à parte disponível de cada pessoa e redistribuir o excedente; ou
* restringir descontos a uma base/elegibilidade explícita.

A regra mais simples para o MVP é:

Nenhuma parte individual pode ficar negativa.
Se uma cobrança produzir parte negativa,
a operação é rejeitada antes do commit.

Essa validação deve ocorrer após o cálculo completo de todas as taxas, descontos e ajustes.

⸻

P0-04 — consumoConfirmado: boolean não representa o estado real

Problemas

O booleano não consegue responder:

* qual versão do consumo foi confirmada;
* se a confirmação ocorreu antes ou depois de uma alteração;
* se foi a própria pessoa que confirmou;
* se foi uma resolução forçada pelo criador;
* se somente as taxas mudaram;
* se o consumo permaneceu igual, mas o total da parte mudou.

Exemplo:

1. Maria confirma o consumo.
2. Outro participante altera uma atribuição de Maria.
3. Maria não está em PARTE_CONFERIDA.
4. A regra de reabertura atual só menciona participantes em PARTE_CONFERIDA.
5. Maria pode continuar aparecendo como ✓ Confirmado, apesar de o consumo atual nunca ter sido confirmado.

Também há uma contradição conceitual:

Só o próprio participante confirma o seu consumo.

Mas o criador pode resolver a situação por outra pessoa. Um booleano não distingue essas origens.

Correção obrigatória

Separar as dimensões e usar versões:

Participante
├── cicloVida: CONVIDADO | ATIVO
├── papel: CRIADOR | PARTICIPANTE
├── versaoConsumoAtual
├── versaoConsumoConfirmada?
├── origemConfirmacao?: PROPRIO_PARTICIPANTE | RESOLUCAO_CRIADOR
├── versaoParteAtual
└── versaoParteConferida?

Estados derivados:

consumo confirmado:
versaoConsumoConfirmada == versaoConsumoAtual
parte conferida:
versaoParteConferida == versaoParteAtual

Qualquer alteração nas atribuições deve incrementar versaoConsumoAtual.

Qualquer alteração no valor final, incluindo taxa, desconto ou ajuste, deve incrementar versaoParteAtual.

Fechar minha parte deve confirmar atomicamente:

* o consumo atual;
* a parte atual;
* as respectivas versões.

⸻

P0-05 — O fechamento viola o princípio central do produto

Onde

Princípio central:

O usuário informa o que consumiu.

Regra atual:

* terceiros podem atribuir consumo a qualquer participante;
* AGUARDANDO_CONFIRMACAO não gera pendência;
* o fechamento da conta não exige confirmação dos participantes;
* qualquer participante pode finalizar permanentemente.

Problema

Uma pessoa pode:

1. receber itens atribuídos por outra pessoa;
2. nunca abrir ou revisar sua parte;
3. não gerar pendência;
4. ter a conta finalizada irreversivelmente por terceiro.

Nesse cenário, não foi “o usuário” que informou o que consumiu.

Correção obrigatória

Existem duas alternativas coerentes:

Alternativa recomendada

AGUARDANDO_CONFIRMACAO bloqueia o fechamento para participantes que já entraram na conta.

O criador pode aplicar um override explícito:

Consumo não confirmado por Ana.
Resolver em nome dela?
[Cancelar] [Resolver como criador]

A UI deve mostrar a origem:

✓ Confirmado por Ana
ou
✓ Resolvido por Guilherme

Alternativa de produto

Alterar o princípio para:

A mesa informa colaborativamente o consumo; a confirmação individual é opcional.

Essa alternativa muda significativamente a promessa do produto e precisa de decisão explícita de produto.

⸻

P0-06 — “Fechar minha parte” não permite que a pessoa vá embora com segurança

Onde

A spec afirma:

A pessoa revisou o próprio total naquele instante; ela pode ir embora.

Também permite:

* fechar a parte com pendências globais;
* edições posteriores;
* inclusão de participantes;
* mudança de taxas;
* reabertura automática;
* nenhuma notificação push no MVP.

Problema

A pessoa pode fechar a parte, sair do restaurante e nunca receber o aviso de que o valor mudou.

O banner “Sua parte foi alterada” só funciona se ela voltar a abrir a PWA ou mantiver a sessão conectada.

Portanto, a frase “ela pode ir embora” não é garantida pelo produto.

Correção obrigatória

Escolher uma das opções:

1. Renomear para “Conferir minha parte”, remover a promessa de valor final e mostrar “valor até agora”.
2. Permitir fechamento apenas com zero pendências globais.
3. Congelar efetivamente a parte individual e obrigar que mudanças futuras sejam absorvidas por outros.
4. Incluir uma notificação confiável, o que está fora do MVP.

Para o MVP, a opção mais coerente é:

“Conferir minha parte”
Sua parte foi conferida com o estado atual da conta.
Ela ainda pode mudar até a conta ser finalizada.

Enquanto houver pendência:

Minha parte até agora: R$ 64,90

⸻

P0-07 — IGUAL_POR_PESSOA não define quem é uma “pessoa”

Questões não respondidas

A divisão inclui:

* criador ainda sem nome?
* placeholders?
* participantes que nunca entraram?
* pessoas marcadas com R$ 0,00?
* participantes offline?
* pessoas que entraram depois da cobrança?
* alguém explicitamente isento de couvert?

A spec afirma:

Recalcula quando a contagem muda.

Isso faz a entrada de uma nova pessoa mudar silenciosamente as partes de todos.

Também existe uma contradição:

* o criador pode marcar alguém como R$ 0,00;
* mas uma cobrança igual por pessoa continuará cobrando essa pessoa.

Correção obrigatória

Cada cobrança igual por pessoa precisa ter um conjunto de elegibilidade:

Cobranca
├── regraDistribuicao: IGUAL_POR_PESSOA
├── participantesElegiveis: participanteId[]
└── quantidadeCobrada: int

Recomendação:

* a lista é confirmada pelo usuário;
* novos participantes não entram automaticamente;
* qualquer mudança de elegibilidade é uma edição explícita;
* partes afetadas são reabertas;
* Marcar R$ 0,00 deve informar se a pessoa continua ou não elegível para cobranças por pessoa.

⸻

P0-08 — A vinculação de placeholders é contraditória e insegura

Contradição direta

03 e 05 afirmam:

Nome igual ao placeholder vincula à vaga.

Mas 05, §3 também afirma:

Nunca vincular por nome sozinho.

10, D6 mantém a decisão como aberta, embora o restante da spec já dependa dela.

Risco

Qualquer pessoa pode digitar o nome “Maria” e assumir:

* as atribuições de Maria;
* a identidade de Maria;
* a capacidade de confirmar ou fechar a parte dela.

Correção obrigatória

Usar convite dedicado, aleatório e de uso único:

ConviteVaga
├── participantePlaceholderId
├── tokenHash
├── usadoEm?
└── expiradoEm?

Regras:

* nome nunca vincula automaticamente;
* o link dedicado vincula à vaga;
* o link geral cria novo participante;
* opcionalmente, o criador pode aprovar manualmente uma reivindicação;
* duas tentativas simultâneas de reivindicar a mesma vaga devem ser serializadas no servidor.

⸻

P0-09 — O criador não possui um fluxo de identidade definido

Problema

O modelo exige:

Conta.criadoPor: participanteId

O criador ocupa uma das seis vagas.

Entretanto, nenhuma tela antes da captura pede o nome do criador. A tela 11 afirma:

[Entrar na conta] — o criador vira participante.

Nesse momento, criadoPor já deveria existir.

Problema adicional

A justificativa da edição aberta afirma que o criador pode sair da mesa. Porém:

* somente o criador resolve NAO_INFORMOU;
* não há transferência de papel;
* não há recuperação de sessão;
* não há login;
* perder o token do criador pode impedir o fechamento para sempre.

Correção obrigatória

Definir um dos fluxos:

01 Home
→ identificar criador
→ criar participante CRIADOR
→ criar sessão e cookie
→ capturar comanda

Ou criar um participante provisório e exigir identificação antes do convite.

Também é necessária uma estratégia contra o ponto único de falha:

* transferir papel de criador;
* permitir coadministrador;
* permitir que qualquer participante resolva pendências após confirmação reforçada;
* ou fornecer um recovery token separado.

⸻

P0-10 — Versionamento por entidade não protege o agregado financeiro

Problema

Uma operação em um item pode alterar simultaneamente:

* item;
* conta;
* partes de várias pessoas;
* cobranças percentuais;
* pendências;
* estados de confirmação;
* ajuste de conciliação.

Somente verificar Item.versao não protege contra uma alteração concorrente em:

* cobrança;
* participante;
* total da conta;
* fechamento;
* entrada de uma nova pessoa.

Corridas críticas

1. Uma pessoa fecha a conta enquanto outra salva uma divisão.
2. Duas pessoas ocupam a sexta vaga simultaneamente e a conta termina com sete.
3. Uma pessoa reivindica um placeholder enquanto outra também reivindica.
4. Uma cobrança é alterada enquanto um item é salvo.
5. O frontend verifica zero pendências e outra operação cria uma pendência antes do fechamento.

Correção obrigatória

Adicionar uma revisão monotônica do agregado:

Conta.revisao: int64

Toda mutação financeira deve:

1. receber contaRevisaoBase;
2. executar em transação;
3. bloquear ou comparar atomicamente a revisão;
4. recalcular todo o agregado afetado;
5. validar invariantes;
6. incrementar a revisão;
7. persistir tudo;
8. publicar o evento após o commit.

O fechamento deve executar atomicamente:

estado != FINALIZADA
AND conta.revisao == revisaoBase
AND pendenciasAtivas == 0

A proteção precisa funcionar entre múltiplas instâncias do backend; um mutex somente em memória não é suficiente.

⸻

P0-11 — Não existe idempotência de mutações

Cenário

1. O cliente envia “Adicionar item”.
2. O servidor salva.
3. A resposta se perde.
4. O cliente mostra erro e reenvia.
5. O item é duplicado.

O mesmo vale para:

* criar conta;
* entrar;
* ocupar vaga;
* adicionar cobrança;
* confirmar divisão;
* fechar parte;
* finalizar conta;
* iniciar OCR.

Correção obrigatória

Toda mutação deve receber:

operationId: UUID

O servidor deve garantir unicidade por conta/sessão:

(contaId, operationId)

Uma repetição deve retornar o resultado original, sem executar novamente.

Eventos realtime também precisam de:

eventId
contaRevisao

para deduplicação e ordenação.

⸻

P0-12 — A edição pós-confirmação precisa de uma transação de rascunho

Problema

Depois de a comanda estar em divisão, alterar um item pode criar uma divergência maior que cinco centavos.

Exemplo:

1. usuário adiciona um item de R$ 20,00;
2. pretende corrigir o total impresso logo depois;
3. o primeiro save deixa a conta divergente;
4. a regra financeira diz que a operação deve ser rejeitada;
5. o segundo ajuste nunca pode ser realizado.

O mesmo acontece quando duas correções precisam ser feitas juntas.

Correção obrigatória

Criar uma sessão de edição da comanda:

Editar comanda
├── alterações locais em rascunho
├── preview do impacto
├── lista de pessoas que serão reabertas
└── Salvar alterações como um único commit

O commit deve conter:

* revisão base da conta;
* conjunto completo de mudanças;
* confirmação de reabertura;
* resultado final conciliado.

A tela 06 também precisa de um caminho explícito de acesso depois do convite. Atualmente, a matriz permite editar a comanda, mas a navegação principal não mostra claramente como abrir essa edição.

⸻

P0-13 — precoUnitario como única autoridade não representa comandas reais

Problema

É comum uma linha impressa conter:

3 unidades — total R$ 10,00

Não existe um preço unitário inteiro em centavos que satisfaça:

3 × preçoUnitário = R$ 10,00

Também existem:

* itens por peso;
* promoções de linha;
* combos;
* desconto já aplicado na linha;
* arredondamento do restaurante;
* quantidade fracionária.

O modelo atual torna essas comandas impossíveis sem falsificar os dados.

Correção obrigatória

A autoridade recomendada para OCR de comanda é o total da linha:

Item
├── quantidade
├── valorTotal: centavos
├── precoUnitarioInformado?: centavos
└── modoPreco: TOTAL_LINHA | UNITARIO

Para distribuição de unidades quando o total não for divisível, distribuir o total da linha pelo Maior Resto.

Alternativamente, o MVP pode exigir que o usuário transforme essas linhas em quantidade 1, mas essa limitação precisa ser declarada e testada explicitamente.

A quantidade também precisa ser definida como:

* estritamente inteira no MVP; ou
* decimal exato para itens por peso.

⸻

P0-14 — Estados parciais de unidades não possuem operação que os crie

Contradição

A tela 19 afirma:

Confirmar só habilita em n/n.

Por outro lado, a spec mostra:

* 3/4 unidades;
* uma unidade ainda não distribuída;
* DIVISAO_INCOMPLETA;
* pendência de unidades sobrando.

Problema

Não está definido se os steppers salvam individualmente ou se toda a modal é um formulário atômico.

Correção obrigatória

Escolher um modelo:

Recomendado para o MVP

* alterações da modal são locais;
* somente n/n é salvo;
* estados parciais persistidos só aparecem quando uma edição posterior aumenta a quantidade, por exemplo, 4/4 → 4/5.

Nesse caso, remover exemplos que sugerem persistência inicial de 3/4.

Alternativa

Adicionar Salvar progresso, persistindo explicitamente uma divisão incompleta. Isso aumenta a complexidade de concorrência e precisa de critérios próprios.

EM_DIVISAO não deve ser estado persistido do item. Ele é uma informação efêmera de presença, e pode haver mais de uma pessoa editando ao mesmo tempo.

⸻

P0-15 — O modelo de ameaça do link compartilhável está incorreto

Onde

09, §4:

O pior caso é ver o resumo.

Problema

Quem possui o link pode, segundo a própria spec:

* entrar na conta;
* ver a imagem da comanda;
* editar itens;
* editar taxas e descontos;
* atribuir consumos;
* convidar mais pessoas;
* finalizar permanentemente a conta.

O pior caso não é leitura: é alteração completa e irreversível.

Correção obrigatória

Separar:

id interno da conta
token de entrada
token de vaga
sessão do participante
capacidade do criador
token de resumo final, se aplicável

Fluxo recomendado:

1. URL contém um joinToken aleatório.
2. O servidor valida o token e cria uma sessão.
3. A sessão é guardada em cookie HttpOnly.
4. O token é removido da URL com history.replaceState.
5. Tokens são armazenados com hash no servidor.
6. Logs, analytics e traces nunca registram tokens.
7. Aplicar Referrer-Policy: no-referrer.
8. Não carregar scripts terceiros nas rotas com segredo.
9. Proteger mutações contra CSRF.
10. Registrar auditoria de ator e operação.

O risco aceito deve dizer claramente:

Qualquer pessoa com o link pode entrar e, após criar uma sessão, editar a divisão.

⸻

P0-16 — Placeholder, NAO_INFORMOU e dataset canônico se contradizem

Contradição do dataset

A tela 15 mostra:

Carlos R$ 6,60 ⚠ Não informou

E explica:

Nada atribuído e nada confirmado.

Entretanto, o dataset atribui a Carlos:

Refrigerante R$ 6,00
Serviço      R$ 0,60

Pelas regras da própria spec, Carlos deveria estar em:

⏳ Aguardando confirmação

Contradição de placeholders

A regra geral afirma:

valor atribuído + consumoConfirmado=false
→ AGUARDANDO_CONFIRMACAO
→ não gera pendência

Mas a regra de placeholder afirma:

placeholder com itens que nunca entrou
→ PARTICIPANTE_NAO_INFORMOU
→ gera pendência

Correção obrigatória

Definir uma tabela normativa:

Ciclo de vida	Tem atribuição	Confirmação atual	Resultado
CONVIDADO	qualquer	não	AGUARDANDO_ENTRADA, sempre bloqueia fechamento
ATIVO	não	não	NAO_INFORMOU, bloqueia
ATIVO	sim	não	AGUARDANDO_CONFIRMACAO
ATIVO	qualquer	sim, versão atual	CONFIRMADO
qualquer	resolvido pelo criador	override atual	RESOLVIDO_PELO_CRIADOR

Também é necessário decidir se AGUARDANDO_CONFIRMACAO bloqueia o fechamento, conforme o P0-05.

No dataset canônico, Carlos deve ser corrigido para “Aguardando confirmação” ou marcado explicitamente como confirmado.

⸻

P0-17 — A deleção de dados é incompatível com o modelo funcional atual

Onde

09, §5:

Apagar foto + participante por endpoint mínimo.

Mas:

* remover participante está fora do MVP;
* um participante pode ter atribuições;
* apagar a entidade pode deixar consumo órfão;
* não existe autenticação forte para validar o solicitante;
* a conta pode estar finalizada;
* outros participantes dependem do resumo.

Correção obrigatória antes de produção externa

Definir operações diferentes:

Excluir conta inteira
→ apaga foto, participantes, sessões e dados derivados
Anonimizar participante
→ remove nome/avatar/token, mantém identificador técnico e valores
Revogar sessão
→ remove somente acesso daquele dispositivo

Também é necessário definir:

* quem pode solicitar;
* como comprovar posse sem login;
* efeito em backups;
* efeito no provedor de OCR;
* prazo de execução;
* comportamento da conta após anonimização.

“Sem TTL” pode ser aceitável em um protótipo interno, mas não deve permanecer como decisão indefinida em uma versão destinada a produção externa.

⸻

3. Problemas importantes — P1

3.1 Modelo de domínio não reflete a separação conceitual

A spec declara:

Comanda → Consumo → Pagamento

Porém, o modelo coloca itens, cobranças, imagem e total diretamente em Conta, enquanto Pagamento recebe uma entidade própria.

Recomendação:

SessaoDivisao
├── Comanda
│   ├── itens
│   ├── cobrancas
│   ├── totalImpresso
│   └── imagem
├── Participantes
├── Rateio/Consumo
└── estado da sessão

O nome Conta também é ambíguo: em alguns trechos significa a sessão colaborativa e, na UI, significa a conta do restaurante. SessaoDivisao reduz erros de implementação.

⸻

3.2 totalDistribuido está nomeado incorretamente

O modelo define:

totalDistribuido = Σ itens

Isso é subtotal de itens, não total distribuído.

São métricas diferentes:

subtotalItens
valorItensAtribuidos
valorItensNaoAtribuidos
totalCalculado
totalImpresso

⸻

3.3 Atribuicao não suporta percentual corretamente

O modelo não possui campo de percentual:

Atribuicao
├── tipo: PERCENTUAL
└── valor

Para PERCENTUAL, valor não é autônomo; é derivado.

Adicionar algo como:

percentualBasisPoints?: int
valorCalculado: centavos

Também definir:

* precisão máxima;
* arredondamento;
* intervalo válido;
* proibição de misturar VALOR_FIXO e PERCENTUAL no mesmo item.

⸻

3.4 Falta arredondamento para calcular o valor total de uma taxa percentual

O Maior Resto resolve a distribuição de um valor já conhecido, mas não define como calcular:

10% de R$ 10,05 = R$ 1,005

É necessário definir o arredondamento do próprio valor da cobrança:

* half-up;
* half-even;
* truncamento;
* conciliação pelo total impresso.

A decisão precisa ser única e testável.

⸻

3.5 Cobranca.valor não informa se é fixo ou recalculável

Não é possível saber se uma cobrança:

* veio impressa como valor fixo;
* veio somente como percentual;
* foi digitada manualmente;
* deve recalcular quando o subtotal muda.

Adicionar:

origemValor:
  IMPRESSO_FIXO
  CALCULADO_DE_PERCENTUAL
  MANUAL_FIXO

Se a cobrança for calculada por percentual e a base mudar:

* recalcular valor;
* invalidar confirmação da cobrança;
* recalcular partes;
* reabrir partes conferidas afetadas.

⸻

3.6 Cobranca.confirmada também precisa ser versionada

Editar descrição, valor, base, percentual, regra ou elegibilidade deve invalidar a confirmação anterior.

Usar:

versao
confirmadaNaVersao?
confirmadaPor?

⸻

3.7 Pendencia é descrita simultaneamente como derivada e persistida

A entidade é “derivada”, mas possui:

resolvida
resolvidaEm
resolvidaPor

Existem dois modelos possíveis:

1. Pendências atuais são calculadas e desaparecem quando resolvidas.
2. Pendências são workflow persistido com histórico.

Recomendação:

* PendenciaAtual como projeção derivada;
* EventoResolucaoPendencia para auditoria;
* não manter pendências resolvidas na lista ativa.

⸻

3.8 O limite configurável de participantes não está no modelo

O limite é “6, configurável”, mas Conta não possui:

limiteParticipantes

O valor deve ser capturado na criação da conta. Uma alteração global de configuração não pode reduzir uma conta já existente de seis para quatro participantes.

⸻

3.9 Tokens não devem pertencer diretamente ao payload de Participante

dispositivoToken e tokenConvite não devem aparecer em broadcasts ou no estado geral da conta.

Criar entidades separadas:

SessaoParticipante
ConviteConta
ConviteVaga

Armazenar somente hashes dos tokens no servidor.

⸻

3.10 Cookie versus localStorage está contraditório

03 e 05 mencionam localStorage/cookie.

09 determina:

Nunca localStorage; somente cookie HttpOnly.

A regra de segurança deve prevalecer em todos os documentos.

Também é necessário definir:

* valor de SameSite;
* escopo por conta;
* múltiplas contas no mesmo navegador;
* múltiplas abas;
* rotação sem invalidar requisições concorrentes;
* revogação.

⸻

3.11 Remoção de placeholder está simultaneamente dentro e fora do MVP

05, §4:

Remoção antes da divisão é permitida.

Logo depois:

Remover participantes está fora do MVP.

É necessário separar:

Excluir placeholder ainda não utilizado

de:

Remover participante ativo ou com atribuições

Recomendação:

* permitir excluir placeholder sem atribuições;
* bloquear exclusão com atribuições;
* participante ativo continua não removível no MVP.

Sem isso, um pré-cadastro digitado por engano pode ocupar permanentemente uma das seis vagas.

⸻

3.12 As ações de resolução de “não informou” não têm algoritmo

As opções:

* Dividir entre todos;
* Personalizar;
* Desvincular consumos;

não informam como manipular as atribuições por item.

Questões:

* A divisão acontece item a item?
* Uma unidade inteira pode ser fracionada?
* O modo do item será trocado?
* O que ocorre com percentuais?
* “Dividir entre todos” inclui a própria pessoa?
* Se a pessoa não tem atribuição, qual é o “valor dela” a redistribuir?

A operação precisa ser definida como transformação concreta das atribuições.

Uma alternativa mais segura para o MVP é remover os atalhos agregados e encaminhar o criador para os itens afetados.

⸻

3.13 Desvincular consumos não resolve a pendência apresentada

F4 afirma:

1. o criador escolhe Desvincular consumos;
2. os itens voltam a incompletos;
3. a pendência “não informou” permanece.

Mas a ação aparece como uma das opções de resolução da pendência.

Definir uma das opções:

* a ação não é uma resolução, apenas uma etapa;
* ou desvincular também marca o placeholder como “não participou”;
* ou, depois de desvincular, a UI exige uma segunda decisão no mesmo fluxo.

⸻

3.14 Troca de modo deveria ser atômica

O fluxo atual pode:

1. apagar a divisão antiga;
2. abrir a nova modalidade;
3. usuário cancelar;
4. item permanecer sem divisão.

Recomendação:

* manter a divisão antiga enquanto a nova é editada;
* substituir somente quando a nova divisão válida for confirmada;
* apresentar a confirmação destrutiva no commit final.

⸻

3.15 PARTE_CONFERIDA contradiz as permissões de edição

06 afirma:

Vê tudo, não edita a própria parte.

03 e 05 afirmam:

Continua podendo editar; a edição reabre a parte.

A segunda regra parece ser a intenção correta. Atualizar a máquina de estados.

⸻

3.16 Definir precisamente quem é “afetado” por uma edição

Não basta verificar se a pessoa consumia o item editado.

Também afetam partes:

* taxa proporcional;
* desconto proporcional;
* cobrança igual por pessoa;
* mudança da lista de participantes elegíveis;
* ajuste de conciliação;
* mudança de arredondamento que transfere um centavo;
* alteração de quantidade de participantes.

A regra segura é:

Após recalcular, comparar o valor e as revisões antes/depois.
Se a parte da pessoa mudou, incrementar versaoParteAtual.

Não tentar inferir pelo tipo da operação no frontend.

⸻

3.17 O alerta prévio de reabertura precisa ser validado pelo servidor

A lista “Maria e Pedro serão reabertos” pode ficar obsoleta antes do save.

Fluxo recomendado:

1. cliente envia mutação com confirmarReabertura=false;
2. servidor calcula o impacto;
3. se houver partes conferidas afetadas, retorna REOPEN_CONFIRMATION_REQUIRED;
4. payload contém nomes, valores e revisão;
5. cliente confirma;
6. reenvia com a mesma revisão e confirmarReabertura=true;
7. se algo mudou, recebe conflito e recomeça.

⸻

3.18 O total manual não possui campo ou transição definida

O fallback manual abre a tela 06 vazia, mas não está explícito como o usuário informa:

* total impresso;
* subtotal impresso;
* número da comanda;
* restaurante;
* situação em que não existe total legível.

O total informado precisa ser editável e possuir critério de obrigatoriedade.

⸻

3.19 A tela para editar a comanda após o convite não está exposta

A matriz de permissões permite edição completa a qualquer momento, mas as telas 13–15 não mostram claramente:

[Editar comanda]

É necessário definir:

* onde a ação aparece;
* se abre a tela 06 em modo de edição;
* como funciona o rascunho;
* como voltar sem salvar;
* como conflitos são tratados.

⸻

3.20 Entrada em uma conta finalizada não está definida

A tela 12 exige que a conta não esteja finalizada.

Ao abrir um link de uma conta finalizada, o comportamento deveria ser:

Conta finalizada → abrir resumo somente leitura

e não “link inválido” ou tentativa de entrada.

⸻

3.21 O código curto da Home contradiz o segredo de 128 bits

A Home permite entrar com “link/código”, mas o código AB12CD é declarado apenas visual.

É necessário:

* aceitar somente colagem do link completo; ou
* criar um código de entrada real com entropia suficiente; ou
* implementar pareamento com confirmação do criador.

Um código real de seis caracteres não oferece a mesma proteção de um segredo de 128 bits.

⸻

3.22 A entidade Pagamento não deveria ser persistida no MVP

Ela duplica valorDevido, que já é derivado, e tenta antecipar um domínio ainda não definido.

Manter apenas um contrato de extensão futuro é mais seguro do que persistir uma estrutura que provavelmente precisará ser remodelada.

⸻

3.23 O frontend precisa saber que valores abertos são provisórios

Enquanto houver itens sem divisão, a barra não deve apresentar simplesmente:

Minha parte R$ 64,90 ✓

Recomendação:

Minha parte até agora R$ 64,90
A conta ainda possui 2 pendências.

O símbolo de confirmado também precisa diferenciar:

* consumo confirmado;
* parte conferida;
* valor finalizado.

⸻

4. Concorrência e realtime

4.1 Eventos precisam de ordenação global

Versões por entidade não impedem eventos de entidades diferentes de chegarem fora de ordem.

Cada resposta e evento deve conter:

contaRevisao
eventId
actor
occurredAt

Regra do cliente:

* revisão igual à próxima esperada: aplicar;
* revisão antiga: ignorar;
* salto de revisão: buscar snapshot completo;
* evento duplicado: ignorar.

⸻

4.2 serverState precisa incluir o agregado afetado

Uma alteração de item muda valores de pessoas, cobranças e pendências. Retornar somente o Item não é suficiente.

O payload de sucesso ou conflito deve incluir, no mínimo:

contaRevisao
entidadeAtualizada
partesAfetadas
pendenciasAtuais
totaisDaConta
estadoDaConta

Ou retornar um snapshot completo sanitizado, considerando o limite de cem itens.

Tokens e campos internos nunca devem fazer parte desse snapshot.

⸻

4.3 “Editar novamente” não deve reenviar automaticamente

Após um 409, o botão deve:

* abrir o formulário com o estado atual do servidor;
* preservar a tentativa anterior apenas como rascunho visual;
* exigir nova confirmação do usuário.

Repetir automaticamente a operação contra uma nova versão pode sobrescrever uma alteração que o usuário ainda não avaliou.

⸻

4.4 Códigos de erro precisam ser normalizados

Sugestão:

Situação	Código
Versão obsoleta	409 CONFLICT
Conta finalizada	409 ou 423 LOCKED, decisão única
Regra funcional inválida	422 UNPROCESSABLE ENTITY
Não autorizado	403 FORBIDDEN
Sessão inválida	401 UNAUTHORIZED
Limite de vagas	409 ACCOUNT_FULL
Invariante interna quebrada	500, rollback e alerta operacional

Não usar 500/409 como opções intercambiáveis.

⸻

4.5 Broadcast deve ocorrer somente depois do commit

A sequência precisa ser:

validar
→ transação
→ persistir
→ commit
→ publicar evento

Nunca publicar antes do commit.

Para robustez, a implementação técnica deve considerar outbox transacional ou mecanismo equivalente.

⸻

5. Segurança e privacidade

5.1 Sessões e capacidades

O servidor deve derivar participanteId e papel a partir da sessão. O cliente nunca deve poder enviar livremente:

actorParticipanteId
souCriador=true

Tokens devem:

* ter alta entropia;
* ser armazenados com hash;
* não aparecer em logs;
* não aparecer em eventos;
* possuir revogação;
* ser diferentes para conta, vaga e sessão.

⸻

5.2 CSRF e cookies

Como as mutações usam cookie HttpOnly, definir:

* Secure;
* SameSite=Lax ou Strict;
* política de domínio e path;
* token CSRF ou validação equivalente para requisições mutáveis;
* proteção contra subdomínios não confiáveis.

⸻

5.3 Foto da comanda

Adicionar requisitos:

* armazenamento privado;
* URL temporária/assinada;
* remoção de EXIF, inclusive localização;
* validação real do formato, não somente extensão;
* limite de dimensões e tamanho descomprimido;
* não incluir foto em cache offline;
* não enviar a analytics;
* expiração conforme política definida.

A afirmação “sem localização” só é verdadeira depois de remover metadados da imagem.

⸻

5.4 Cache offline e dispositivo compartilhado

A spec permite cache da última conta e não inclui “sair deste dispositivo”.

Isso mantém:

* nomes;
* valores;
* resumo;
* sessão;
* possivelmente imagem;

em um celular compartilhado.

Recomendação: trazer para o MVP uma ação mínima:

Sair e apagar dados deste dispositivo

Ela pode:

* revogar a sessão;
* limpar caches da conta;
* manter os dados no servidor.

⸻

5.5 Auditoria

Como todos podem editar, registrar ao menos:

operationId
contaId
actorParticipanteId
tipoOperacao
entidadesAfetadas
revisaoAnterior
novaRevisao
timestamp

Sem guardar token, conteúdo da foto ou dados desnecessários.

A auditoria é necessária para:

* conflito “atualizado por João”;
* investigação de fechamento;
* reabertura de partes;
* erros financeiros;
* abuso do link.

⸻

6. Máquinas de estado

6.1 Máquina da conta

Esta transição é inválida ou não explicada:

AGUARDANDO_CONFERENCIA → DIVISAO_EM_ANDAMENTO

“Editar itens na sala” não é o mesmo que confirmar uma divisão, e a sala só deveria existir depois da confirmação da comanda.

qualquer → DIVISAO_EM_ANDAMENTO também precisa excluir:

* CRIANDO;
* OCR_PROCESSANDO;
* OCR_ERRO;
* FINALIZADA.

Sugestão de estados:

CRIANDO
OCR_PROCESSANDO
CONFERINDO_COMANDA
COMANDA_CONFIRMADA
DIVISAO_EM_ANDAMENTO
FINALIZADA

“Aguardando participantes” pode ser um estado derivado da presença, não necessariamente um estado persistido da conta.

⸻

6.2 Máquina do item

EM_DIVISAO não é um estado exclusivo do item, porque várias pessoas podem editar ao mesmo tempo.

Tratar como presença efêmera:

editoresAtivos: participanteId[]

A exclusão de um item também não deveria causar:

DIVIDIDO → NAO_DIVIDIDO

O item deixa de existir ou recebe um tombstone de auditoria.

⸻

6.3 Máquina do participante

Hoje ela mistura quatro dimensões diferentes:

1. ciclo de vida: convidado/ativo;
2. presença: online/offline;
3. confirmação de consumo;
4. conferência da parte.

Essas dimensões devem ser independentes.

PARTE_CONFERIDA pode ser um estado derivado da revisão, não necessariamente o estado principal do participante.

⸻

7. Revisão das regras financeiras

7.1 Percentuais devem usar representação exata

decimal é insuficientemente específico.

Definir uma escala, por exemplo:

10000 basis points = 100,00%

Ou usar decimal exato serializado como string.

Nunca usar float no frontend ou backend para validar a soma.

⸻

7.2 Descontos devem ser armazenados como magnitude positiva

A regra deveria ser:

Cobranca.valor >= 0
Cobranca.tipo define o sinal

Evita combinações ambíguas como DESCONTO -R$ 10,00.

⸻

7.3 Maior Resto com valores negativos

Para descontos e ajustes negativos:

1. distribuir o valor absoluto;
2. aplicar o sinal na composição final.

Não aplicar diretamente floor sobre quotas negativas, pois o resultado não é equivalente ao comportamento esperado para centavos.

⸻

7.4 Empate por hash precisa ser especificado

Definir:

* algoritmo, por exemplo SHA-256;
* serialização canônica;
* separador entre IDs;
* ordenação dos bytes;
* versão do algoritmo.

Exemplo:

SHA256("v1|participanteId|contextoTipo|contextoId")

Isso evita resultados diferentes entre linguagens ou versões do backend.

⸻

7.5 O aceite D2 não pode fixar quem recebe o centavo

Com três participantes e restos iguais, o hash decide quem recebe R$ 33,34.

O aceite correto é:

O multiconjunto final é:
{R$ 33,33, R$ 33,33, R$ 33,34}
E o mesmo participante recebe o centavo extra
para a mesma combinação de IDs e contexto.

⸻

7.6 Comportamento do percentual após mudança de preço

Definir por modo:

Modo	Mudança de preço/total
Entre pessoas	mantém pessoas e recalcula valores
Unidades	mantém unidades e recalcula valores
Personalizado por percentual	mantém percentuais e recalcula valores
Personalizado por valor fixo	mantém valores e vira incompleto
Item excluído	remove atribuições e reabre afetados

⸻

7.7 Rateio proporcional durante divisão incompleta

É necessário decidir se taxas proporcionais serão:

* completamente rateadas entre o consumo já atribuído, gerando valor provisório volátil; ou
* parcialmente mantidas como saldo não rateado até todos os itens serem distribuídos.

A primeira opção é mais simples, mas a UI precisa dizer “até agora”. Se ninguém tiver consumo atribuído, a cobrança proporcional permanece integralmente não rateada.

⸻

8. Inconsistências documentais diretas

Tema	Trecho A	Trecho B	Correção
Vincular placeholder	Nome igual vincula	Nunca vincular só por nome	Token dedicado
Token do dispositivo	localStorage/cookie	Nunca localStorage	Cookie HttpOnly
Remover placeholder	Permitido antes da divisão	Fora do MVP	Permitir só placeholder vazio ou remover
Parte conferida	Não edita a própria parte	Pode editar e reabre	Adotar segunda regra
Carlos	R$ 6,60 atribuído	“Nada atribuído”	Aguardando confirmação
Desvincular	Opção de resolução	Pendência permanece	Transformar em etapa ou resolver completamente
Invariante	Σ partes = total em todo commit	Estados incompletos permitidos	Invariante com saldo
Unidades	Confirmar só em n/n	3/4 persistido	Escolher modelo
Criador	criadoPor obrigatório	Só vira participante na tela 11	Criar identidade antes
Link	Pior caso é leitura	Link permite editar/fechar	Corrigir ameaça
Total	Participantes podem editar	Não há campo/transição clara	Adicionar edição explícita
Conta finalizada	Link exige conta ativa	Finalizada continua acessível	Rota somente leitura

⸻

9. Problemas nos exemplos e critérios de aceite

9.1 A regra do dataset canônico não está sendo cumprida

Há valores externos sem a marca obrigatória “exemplo ilustrativo”, incluindo:

* couvert de R$ 90,00;
* calculado R$ 230,00 contra R$ 231,00;
* R$ 100,00 dividido por três;
* subtotal R$ 200,00;
* item R$ 60,00;
* desconto de R$ 50,00 em conta de R$ 30,00;
* Lucas com cervejas.

Ou todos esses exemplos devem receber a marca, ou a regra deve ser flexibilizada para permitir cenários de teste claramente identificados.

⸻

9.2 Erro textual em C2

Atual:

A divisão não falta — falta R$ 10,00

Correto:

A divisão não fecha — faltam R$ 10,00

⸻

9.3 getUserDevice está incorreto

Em 09, §3, o nome correto da API é:

navigator.mediaDevices.getUserMedia(...)

Além do fallback por <input type="file" capture>.

⸻

9.4 Teste de sete participantes está fora do limite funcional

A divisão por sete pode permanecer como teste unitário da biblioteca matemática, mas deve ser identificada como tal, pois a conta do MVP limita participantes a seis.

⸻

9.5 Teste de IDs não enumeráveis é fraco

“Mil tentativas não encontram uma conta” não comprova 128 bits de entropia.

Os aceites devem verificar:

* uso de CSPRNG;
* tamanho efetivo;
* ausência de contador ou timestamp previsível;
* rejeição de tokens malformados;
* rate limit;
* ausência de vazamento em logs e referrer.

⸻

9.6 O checklist não cobre estados vazios e falhas essenciais

Adicionar critérios para:

* permissão de câmera negada;
* upload falhou;
* imagem inválida;
* HEIC não convertido;
* OCR cancelado;
* conta inexistente;
* convite inválido;
* vaga já reivindicada;
* mesa cheia por corrida concorrente;
* sessão expirada;
* conta finalizada;
* conta excluída;
* conflito ao salvar rascunho;
* timeout após commit;
* múltiplas abas;
* reconnect com gap de revisão.

⸻

10. Testes obrigatórios adicionais

H1 — Conservação em estado parcial

Given apenas parte dos itens foi dividida
Then Σ partes provisórias + saldo não distribuído = total
And o commit é aceito

H2 — Confirmação invalidada por nova atribuição

Given Maria confirmou consumo na versão 8
When uma atribuição de Maria muda e a versão vira 9
Then Maria deixa de aparecer como confirmada

H3 — Mudança somente de taxa

Given Maria confirmou o consumo e conferiu a parte
When a taxa muda sem alterar itens
Then a confirmação de consumo continua válida
And a conferência da parte é invalidada

H4 — Override do criador

Given Ana não confirmou
When o criador resolve em nome dela
Then o estado mostra “Resolvido por Guilherme”
And não “Confirmado por Ana”

H5 — Placeholder com atribuição

Given Lucas é CONVIDADO e possui R$ 18,00 atribuídos
Then o fechamento continua bloqueado
Until Lucas entra ou o criador resolve explicitamente

H6 — Couvert e participante com zero consumo

Given couvert igual por pessoa
And Carlos informou consumo zero
Then a spec determina explicitamente
se Carlos está ou não na lista de elegíveis

H7 — Entrada após couvert confirmado

Given cinco participantes e couvert confirmado
When a sexta pessoa entra
Then o couvert não muda silenciosamente

H8 — Parte individual negativa

Usar o cenário de R$ 100,00 de consumo, R$ 100,00 de taxa igual e R$ 180,00 de desconto proporcional. A operação deve ser rejeitada ou redistribuída por uma regra normativa.

H9 — Ajuste positivo e negativo

Testar:

+R$ 0,01
+R$ 0,05
-R$ 0,01
-R$ 0,05

Verificando:

* elegibilidade;
* determinismo;
* exibição;
* ausência de parte negativa;
* soma final.

H10 — Linha não divisível por quantidade

Given 3 unidades totalizando R$ 10,00
Then a linha pode ser representada
And a divisão de unidades soma exatamente R$ 10,00

H11 — Corrida da última vaga

Given cinco vagas ocupadas
When dois dispositivos entram simultaneamente
Then somente um ocupa a sexta vaga
And o outro recebe ACCOUNT_FULL

H12 — Corrida entre edição e fechamento

Given zero pendências na revisão 40
When A fecha a conta e B altera um item simultaneamente
Then somente uma ordem válida é persistida
And nunca existe conta finalizada com mutação posterior

H13 — Timeout depois de commit

Given a operação foi persistida e a resposta se perdeu
When o cliente reenvia o mesmo operationId
Then recebe o resultado original
And não duplica dados

H14 — Eventos fora de ordem

Given o cliente recebe revisão 52 antes da 51
Then não aplica estado incompleto
And solicita snapshot autoritativo

H15 — Troca de modo cancelada

Given divisão atual válida
When o usuário inicia outro modo e cancela
Then a divisão anterior permanece intacta

H16 — Criador perde a sessão

Definir e testar o comportamento de uma conta com pendência exclusiva do criador quando a sessão dele não está mais disponível.

H17 — Exclusão e anonimização

Testar que nenhuma atribuição fica órfã e que foto, sessão e caches seguem a política definida.

H18 — Propriedades matemáticas

Executar testes baseados em propriedades:

para qualquer comanda válida:
- nenhuma parte < 0
- Σ alocações do item <= valor do item
- item DIVIDIDO implica igualdade
- conta FINALIZADA implica Σ partes = total
- o mesmo input gera o mesmo arredondamento
- nenhuma operação excede int64

⸻

11. Requisitos não funcionais que precisam ficar mensuráveis

As metas de performance precisam declarar:

* dispositivo de referência;
* condição de rede;
* payload médio;
* quantidade de usuários simultâneos;
* período da medição;
* tamanho da amostra;
* se a métrica é cliente, servidor ou ponta a ponta.

Outros ajustes:

* limite de cem itens deve ser validado no servidor;
* definir tamanho máximo de nomes de itens e cobranças;
* usar inteiros de 64 bits para centavos;
* definir valor monetário máximo;
* não armazenar foto no service worker;
* testar reflow em 320 CSS px e zoom de 200%;
* adicionar focus trap e retorno de foco em modais;
* fornecer alternativa textual ao QR Code;
* testar a barra fixa com teclado virtual aberto;
* respeitar preferências de tamanho de texto do sistema;
* não tratar 12 px como garantia suficiente de acessibilidade.

⸻

12. Decisões em aberto que realmente bloqueiam

A seção 10 mistura decisões abertas com decisões já tomadas.

Adicionar coluna:

Status: ABERTA | DECIDIDA | ADIADA | FORA_DO_MVP
Responsável
Data
ADR

Itens que precisam ser resolvidos antes da implementação:

1. D6 — reivindicação de placeholder;
2. elegibilidade de cobranças iguais por pessoa;
3. confirmação obrigatória ou opcional para fechamento;
4. semântica real de “Fechar minha parte”;
5. autoridade de preço da linha;
6. edição de comanda por rascunho;
7. comportamento de descontos que geram parte negativa;
8. distribuição do ajuste de conciliação;
9. recuperação ou delegação do papel de criador;
10. deleção/anonimização;
11. política de cache e saída de dispositivo;
12. comportamento de conta finalizada aberta em outro dispositivo.

D1, D2, D3, D4 e outras já possuem decisão de MVP e não deveriam permanecer classificadas simplesmente como “em aberto”.

⸻

13. Ordem recomendada para correção

Etapa 1 — Fechar decisões de produto

Resolver:

* confirmação individual;
* fechamento individual;
* papel do criador;
* placeholders;
* cobranças por pessoa;
* finalização por qualquer participante.

Etapa 2 — Normalizar o modelo

Separar:

* sessão;
* comanda;
* atribuições;
* projeção das partes;
* sessões/tokens;
* revisões de consumo e parte.

Etapa 3 — Reescrever as invariantes financeiras

Documentar:

* estado parcial;
* estado final;
* ajuste;
* valores negativos;
* percentual;
* cobranças não rateáveis.

Etapa 4 — Definir o agregado concorrente

Adicionar:

* contaRevisao;
* transações;
* idempotência;
* ordenação de eventos;
* fechamento CAS;
* entrada atômica.

Etapa 5 — Corrigir fluxos e telas

Adicionar:

* identidade do criador;
* edição de comanda pós-convite;
* rascunho;
* total manual;
* estados provisórios;
* conta finalizada;
* erros e vazios.

Etapa 6 — Corrigir segurança e privacidade

Separar tokens, remover localStorage, proteger URLs, definir cache, auditoria, revogação e deleção.

Etapa 7 — Atualizar critérios de aceite

Incluir os testes H1–H18 e corrigir os exemplos canônicos.

Etapa 8 — Regenerar o material visual

Somente depois das decisões anteriores, regenerar telas.png. Caso contrário, o material visual ficará desatualizado novamente.

⸻

14. Critério para aprovação da próxima versão

A próxima versão poderá ser considerada pronta para SDD técnica quando:

* não houver comportamento definido por nome de participante;
* o criador possuir identidade e recuperação/delegação;
* a confirmação tiver versão e origem;
* o fechamento não contradizer o princípio central;
* partes provisórias forem diferenciadas de partes finais;
* o saldo não distribuído estiver modelado;
* descontos nunca produzirem parte negativa sem regra explícita;
* cobranças iguais possuírem elegibilidade;
* preço de linha não divisível puder ser representado;
* todas as mutações do agregado forem transacionais e idempotentes;
* o fechamento for atomicamente protegido contra outras mutações;
* o link compartilhável tiver modelo de ameaça correto;
* os estados de placeholder estiverem normalizados;
* o dataset canônico não possuir estados contraditórios;
* os critérios de aceite cobrirem corridas, retries e versões;
* as decisões abertas tiverem responsável e status.

⸻

15. Conclusão

A especificação demonstra um bom domínio do problema e já possui vários elementos que normalmente faltam em uma primeira versão: fallback, concorrência, acessibilidade, centavos inteiros, pendências estruturadas e delimitação de MVP.

O principal problema não é falta de conteúdo, mas excesso de regras que ainda não convergem para um único comportamento determinístico.

Os quatro pontos mais críticos são:

1. a invariante financeira atual impede estados parciais;
2. o modelo de confirmação pode mostrar dados obsoletos como confirmados;
3. o fechamento permite cobrar alguém que nunca confirmou o consumo;
4. a concorrência por entidade não protege o agregado financeiro.

Até esses pontos serem corrigidos, iniciar a implementação tende a transferir decisões de produto para o código, produzir regras diferentes entre frontend e backend e gerar retrabalho significativo durante os testes de integração.

Parecer final: não aprovar para implementação ainda; aprovar a visão e solicitar alterações na especificação.