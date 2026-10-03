# Especificação Funcional Completa
## Aplicativo de Divisão Colaborativa de Contas de Restaurante

---

# 1. Visão do produto

Aplicação mobile-first/PWA para dividir contas de restaurantes de forma colaborativa.

O usuário fotografa a comanda, o sistema utiliza OCR para identificar itens e valores, os participantes entram por QR Code ou link e cada pessoa informa o que consumiu.

O sistema calcula automaticamente quanto cada pessoa deve pagar, incluindo taxas, descontos, arredondamentos e demais adicionais.

### Princípio central

> **O usuário informa o que consumiu. O sistema resolve a matemática.**

O usuário não precisa entender:

- proporções;
- rateios;
- percentuais;
- arredondamentos;
- distribuição de taxas;
- cálculos de centavos.

---

# 2. Fluxo principal

```text
Nova conta
    ↓
Fotografar comanda
    ↓
OCR
    ↓
Identificar itens
    ↓
Identificar subtotal
    ↓
Identificar taxas/descontos/adicionais
    ↓
Calcular/validar percentuais
    ↓
Conferir e corrigir
    ↓
Confirmar comanda
    ↓
Gerar QR Code / link
    ↓
Participantes entram
    ↓
Cada pessoa informa o que consumiu
    ↓
Divisão colaborativa em tempo real
    ↓
Cálculo individual
    ↓
Resolver pendências
    ↓
Revisão final
    ↓
Fechar conta ou fechar parte individual
    ↓
Pagamento / Pix
```

---

# 3. Atores

## 3.1 Criador

Pessoa que iniciou a conta.

Pode:

- fotografar a comanda;
- revisar o OCR;
- editar itens;
- editar taxas;
- adicionar/remover itens;
- convidar pessoas;
- acompanhar a divisão;
- resolver pendências;
- fechar a conta.

---

## 3.2 Participante

Pessoa que entra através de QR Code ou link.

Pode:

- informar seu nome;
- visualizar a conta;
- informar o que consumiu;
- participar de itens compartilhados;
- informar quantidades;
- personalizar divisões;
- visualizar sua parte;
- fechar sua própria parte;
- visualizar o status dos demais.

Não precisa:

- instalar aplicativo;
- criar conta;
- informar e-mail;
- fazer login.

---

# 4. Sessão da conta

Cada conta representa uma sessão colaborativa.

Exemplo:

```text
Conta
├── Restaurante
├── Comanda
├── Itens
├── Taxas
├── Descontos
├── Participantes
├── Divisões
├── Pagadores
├── Totais
└── Status
```

A sessão deve possuir um identificador compartilhável através de:

- QR Code;
- link;
- WhatsApp.

---

# 5. Limite inicial

MVP:

**até 6 participantes por conta.**

O limite deve ser configurável para permitir expansão futura.

O criador também faz parte dos participantes.

---

# 6. Tela inicial

```text
Conta Juntos

Divida a conta
sem complicação.

[ 📷 Nova conta ]

[ 🔗 Entrar em uma conta ]
```

---

# 7. Criar nova conta

Ao selecionar "Nova conta":

```text
Nova conta

Como deseja adicionar a comanda?

[ 📷 Tirar foto ]

[ 🖼 Escolher da galeria ]
```

---

# 8. Captura da comanda

A câmera deve:

- orientar o enquadramento;
- permitir nova tentativa;
- permitir confirmar a foto;
- preservar a imagem original.

Após captura:

```text
[ Usar esta foto ]

[ Tirar novamente ]
```

---

# 9. Processamento OCR

O sistema deve tentar identificar:

## Restaurante

- nome;
- endereço, se disponível;
- mesa;
- número da comanda;
- identificadores relevantes.

## Itens

Para cada item:

- nome;
- quantidade;
- preço unitário;
- preço total.

## Valores

- subtotal;
- taxas;
- serviço;
- gorjeta;
- couvert;
- descontos;
- outros adicionais;
- total.

---

# 10. OCR não é fonte definitiva

O resultado do OCR é uma **sugestão estruturada**.

Nunca deve ser considerado automaticamente correto.

O usuário sempre poderá revisar e corrigir.

---

# 11. Conferência da comanda

A tela deve apresentar todos os dados identificados.

Exemplo:

```text
CONFERIR COMANDA

Pizza Margherita
1 × R$ 120,00

Cerveja
4 × R$ 9,00

Refrigerante
4 × R$ 6,00

Batata frita
1 × R$ 30,00

──────────────────

Subtotal
R$ 210,00

Serviço
R$ 21,00

Total
R$ 231,00

[ Confirmar comanda ]
```

---

# 12. Edição manual

Todos os elementos relevantes devem ser editáveis.

O usuário pode:

- alterar nome;
- alterar quantidade;
- alterar preço unitário;
- alterar preço total;
- adicionar item;
- remover item;
- mesclar itens;
- separar itens;
- alterar subtotal;
- alterar taxa;
- adicionar taxa;
- remover taxa;
- alterar desconto;
- adicionar desconto;
- alterar total.

A interface deve priorizar edição rápida.

Campos monetários devem utilizar teclado numérico no celular.

---

# 13. Identificação de taxas

O sistema **não deve presumir uma taxa de serviço**.

A taxa deve ser obtida a partir da própria comanda.

Exemplo:

```text
Subtotal       R$ 210,00
Serviço         R$ 21,00
Total          R$ 231,00
```

O sistema calcula:

```text
21 / 210 = 10%
```

E apresenta:

> Taxa de serviço: 10%

---

# 14. Percentual explicitamente informado

Se a comanda apresentar:

```text
Serviço 10%    R$ 21,00
```

o OCR deve capturar:

```text
percentual = 10%
valor = R$ 21,00
```

O sistema deve validar se os valores são compatíveis.

---

# 15. Taxa sem percentual explícito

Se encontrar:

```text
Serviço       R$ 21,00
```

mas não conseguir determinar o percentual:

```text
⚠ Taxa de serviço identificada

Valor: R$ 21,00

Confira esse valor antes de continuar.
```

O usuário pode corrigir.

---

# 16. Taxas e adicionais

O sistema deve suportar diferentes tipos de cobrança:

- serviço;
- gorjeta;
- couvert;
- taxa de entrega;
- taxa adicional;
- outros acréscimos.

Cada cobrança deve possuir:

- descrição;
- valor;
- percentual, quando aplicável;
- base de cálculo, quando identificável;
- regra de distribuição.

---

# 17. Descontos

Descontos também devem ser identificados.

Exemplo:

```text
Subtotal        R$ 200,00
Desconto         R$ 20,00
Serviço          R$ 18,00
Total           R$ 198,00
```

O desconto deve participar do cálculo final.

---

# 18. Validação da comanda

O sistema deve verificar:

```text
Subtotal
+ adicionais
- descontos
= total
```

Se houver divergência:

```text
⚠ Os valores não conferem.

Calculado: R$ 230,00
Informado: R$ 231,00

[ Corrigir ]
```

O usuário deve resolver ou confirmar manualmente a inconsistência.

---

# 19. Convite

Após confirmar a comanda:

```text
CONVIDE SEUS AMIGOS

Cada pessoa pode entrar
pelo próprio celular.

[ QR CODE ]

[ Compartilhar no WhatsApp ]

[ Copiar link ]
```

---

# 20. Entrada sem instalação

O participante abre o link e informa:

```text
Restaurante Bistrô

Você está entrando
nesta conta.

Como podemos te chamar?

[ Maria ]

[ Entrar ]
```

Nenhum cadastro é obrigatório.

---

# 21. Identidade do participante

Cada participante terá:

- identificador da sessão;
- nome exibido;
- avatar opcional;
- status de presença;
- estado de participação;
- estado de fechamento individual.

---

# 22. Presença

A sessão mostra:

```text
Participantes

🟢 João
🟢 Maria
🟢 Pedro
🟢 Ana
⚪ Carlos
⚪ Lucas
```

Estados:

- online;
- offline;
- conectado recentemente;
- aguardando entrada.

---

# 23. Tela principal

A conta possui duas visões principais:

### Itens

Mostra a comanda e a divisão.

### Pessoas

Mostra os participantes e seus valores.

```text
Restaurante Bistrô

[ Itens ] [ Pessoas ]
```

---

# 24. Lista de itens

Exemplo:

```text
🍕 Pizza
R$ 120,00
✓ Dividido entre 3

🍺 Cerveja
4 × R$ 9,00
3/4 unidades

🥤 Refrigerante
4 × R$ 6,00
4/4 unidades

🍟 Batata
R$ 30,00
⚠ Não dividido
```

---

# 25. Regra fundamental de divisão

Cada item possui sua própria forma de divisão.

Existem três modos:

1. **Dividir entre pessoas**
2. **Distribuir unidades**
3. **Personalizar**

---

# 26. Quantidade e divisão são independentes

Quantidade maior que 1 não significa automaticamente distribuição por unidades.

Exemplo:

```text
2 porções de batata
R$ 40,00
```

Pode ser:

### Compartilhado

João + Maria + Pedro:

```text
R$ 13,33 cada
```

ou:

### Por unidades

```text
João      1 porção
Maria     1 porção
```

A escolha deve ser feita explicitamente.

---

# 27. Interface "Como dividir?"

Ao tocar no item:

```text
Pizza
R$ 120,00

Como dividir?

👥 Dividir entre pessoas

🔢 Distribuir unidades

⚙️ Personalizar
```

---

# 28. Modo: Dividir entre pessoas

Exemplo:

```text
Pizza
R$ 120,00

Quem consumiu?

☑ João
☑ Maria
☑ Pedro
☐ Ana
☐ Carlos
☐ Lucas

3 pessoas

R$ 40,00 por pessoa

[ Confirmar ]
```

---

# 29. Modo: Distribuir unidades

Exemplo:

```text
Refrigerante
4 × R$ 6,00

Distribua as unidades:

João      − 1 +
Maria     − 1 +
Pedro     − 2 +
Ana       − 0 +

4 de 4 distribuídas

[ Confirmar ]
```

Nunca permitir:

```text
5 de 4
```

---

# 30. Modo: Personalizar

Pode ser por:

- valor;
- percentual.

Exemplo:

```text
Sobremesa
R$ 60,00

[ Valor ] [ Percentual ]

João       R$ 30
Maria      R$ 20
Pedro      R$ 10

Total      R$ 60

✓ Divisão confere

[ Confirmar ]
```

---

# 31. Validação da divisão

O sistema deve validar:

```text
Soma das participações = valor do item
```

Caso contrário:

```text
⚠ A divisão não fecha.

Distribuído: R$ 55,00
Item: R$ 60,00
```

---

# 32. Estados dos itens

Um item pode estar:

```text
NÃO_DIVIDIDO
```

```text
EM_DIVISÃO
```

```text
DIVISÃO_INCOMPLETA
```

```text
DIVIDIDO
```

---

# 33. Status visual

### Não dividido

```text
⚠ Ainda não dividido
```

### Parcial

```text
3/4 unidades distribuídas
```

### Completo

```text
✓ Dividido entre 3 pessoas
```

### Personalizado

```text
✓ Divisão personalizada
```

---

# 34. Alteração de item já dividido

O usuário pode corrigir a comanda depois que uma divisão já começou.

Exemplo:

```text
Cerveja
4 → 5 unidades
```

O sistema não deve destruir a divisão existente.

Deve informar:

```text
Este item já possui uma divisão.

A alteração deixará 1 unidade disponível.

[ Continuar ]
[ Cancelar ]
```

---

# 35. Itens duplicados pelo OCR

Se o OCR identificar:

```text
Cerveja   2 × R$9
Cerveja   2 × R$9
```

o usuário poderá:

```text
[ Mesclar itens ]
```

resultando em:

```text
Cerveja
4 × R$9
```

---

# 36. Itens sem quantidade

Itens sem quantidade explícita podem ser tratados como uma unidade.

Exemplo:

```text
Porção de frios
R$ 78,00
```

Pode ser dividida:

- entre pessoas;
- por valor;
- por percentual.

---

# 37. Tempo real

Qualquer alteração confirmada deve atualizar a sessão para todos os participantes.

Eventos relevantes incluem:

- participante entrou;
- participante saiu;
- item alterado;
- divisão alterada;
- quantidade alterada;
- item concluído;
- participante fechou sua parte;
- conta finalizada.

---

# 38. Realtime sem poluição visual

O sistema não deve exibir uma notificação para cada alteração.

Preferência:

**Atualização visual direta nos cards.**

Exemplo:

```text
Cerveja
4/4 unidades

João  1
Maria 1
Pedro 2
```

Em vez de:

```text
João adicionou cerveja.
Maria adicionou cerveja.
Pedro adicionou cerveja.
```

Notificações explícitas devem ser reservadas para eventos importantes.

---

# 39. Indicador de sincronização

A interface deve mostrar:

```text
🟢 Sincronizado
```

```text
🟡 Sincronizando...
```

```text
🔴 Você está offline
```

---

# 40. Comportamento offline

No MVP:

- permitir visualizar o último estado disponível;
- indicar claramente que está offline;
- impedir operações críticas que não possam ser confirmadas;
- não apresentar uma alteração como salva antes da confirmação do servidor.

Exemplo:

```text
🔴 Você está offline.

Não foi possível confirmar esta alteração.

[ Tentar novamente ]
```

Colaboração offline completa fica fora do MVP.

---

# 41. Concorrência

O backend é a fonte única da verdade.

O cliente nunca pode decidir sozinho se uma alteração é válida.

Fluxo:

```text
Celular
   ↓
Solicitação
   ↓
Servidor
   ↓
Validação
   ↓
Atualização atômica
   ↓
Novo estado
   ↓
Broadcast
   ↓
Todos os celulares
```

---

# 42. Conflito de edição

Deve existir controle de versão para alterações concorrentes.

Exemplo:

```text
Item version = 12
```

João e Maria carregam versão 12.

João salva:

```text
version 12 → 13
```

Maria tenta salvar uma operação baseada na versão 12.

O servidor detecta conflito e rejeita/reconcilia a alteração.

O cliente recebe o estado atualizado.

---

# 43. Locks

Locks temporários podem existir para operações específicas, mas não devem bloquear um item simplesmente porque alguém abriu sua tela de edição.

Preferência:

**optimistic concurrency + versionamento.**

Lock explícito pode ser usado somente onde necessário.

---

# 44. Minha parte

Cada participante possui uma visão individual:

```text
MINHA PARTE

Pizza              R$ 40,00
Refrigerante         R$ 6,00
Cerveja              R$ 9,00
Batata              R$ 13,33

Subtotal            R$ 68,33

Serviço 10%          R$ 6,83

TOTAL               R$ 75,16
```

---

# 45. Distribuição proporcional de taxas

Quando aplicável, uma taxa geral deve ser distribuída proporcionalmente ao consumo.

Exemplo:

```text
João      R$ 100
Maria      R$ 50
Pedro      R$ 50

Subtotal R$ 200
Serviço  R$ 20
```

Resultado:

```text
João      R$ 110
Maria     R$ 55
Pedro     R$ 55
```

---

# 46. Distribuição de descontos

Descontos gerais devem, por padrão, ser distribuídos proporcionalmente ao consumo.

O sistema deve deixar claro o critério utilizado.

O usuário poderá corrigir manualmente quando necessário.

---

# 47. Arredondamento

Todos os cálculos monetários devem trabalhar em precisão decimal.

Nunca utilizar `float`/`double` para representar valores monetários.

Quando uma divisão gerar frações de centavos, deve ser utilizado um método determinístico de distribuição.

### Regra inicial

**Largest Remainder Method / Método do Maior Resto.**

Exemplo:

```text
R$ 100 / 3

A 33,333...
B 33,333...
C 33,333...
```

Resultado:

```text
A R$ 33,33
B R$ 33,33
C R$ 33,34
```

Empates devem utilizar critério determinístico.

---

# 48. Garantia financeira

Sempre:

```text
Σ valores individuais = total da conta
```

Não pode existir:

```text
Total da conta: R$ 100,00
Soma das pessoas: R$ 99,99
```

Nem:

```text
Total da conta: R$ 100,00
Soma das pessoas: R$ 100,01
```

---

# 49. Visão Pessoas

```text
PESSOAS

João
2 itens
R$ 45,10

Maria
4 itens
R$ 68,20

Pedro
2 itens
R$ 32,15

Ana
3 itens
R$ 40,30

Carlos
2 itens
R$ 28,00

Lucas
1 item
R$ 17,25
```

---

# 50. Detalhes de uma pessoa

```text
Maria

Pizza                 R$ 40,00
Refrigerante            R$ 6,00
Cerveja                 R$ 9,00
Batata                 R$ 13,33

Subtotal               R$ 68,33
Serviço                 R$ 6,83

TOTAL                  R$ 75,16
```

---

# 51. Participante fechando sua parte

Uma pessoa pode sair antes da conta inteira ser finalizada.

Exemplo:

```text
MINHA PARTE

Total atual:
R$ 87,42

[ Fechar minha parte ]
```

Após confirmação:

```text
✓ Sua parte está fechada

R$ 87,42

Sua divisão não será mais alterada.

[ Pagar via Pix ]
```

A conta dos demais continua aberta.

---

# 52. Estado individual

Cada participante pode possuir:

```text
ABERTO
```

```text
PARTE_FECHADA
```

```text
PAGO
```

O fechamento individual não fecha a conta inteira.

---

# 53. Pessoa pagando por outra

Consumo e pagamento são conceitos independentes.

Exemplo:

```text
Consumo:

João      R$ 80
Maria     R$ 65
```

Mas João decide pagar pelos dois.

Resultado:

```text
Consumo
João      R$ 80
Maria     R$ 65

Pagador
João      R$ 145
```

Maria continua sendo responsável pelo consumo, mas João é o pagador.

---

# 54. Agrupamento de pagamentos

Na etapa final:

```text
QUEM VAI PAGAR?

João       R$ 80
Maria      R$ 65

[ João vai pagar Maria também ]
```

Resultado:

```text
João

Sua parte        R$ 80
Maria            R$ 65
──────────────────────
Total            R$145
```

Essa operação não altera a divisão dos itens.

---

# 55. Progresso da conta

A conta deve apresentar:

```text
90% dividido

██████████████████░░
```

Também:

```text
5 de 6 participantes concluíram
```

---

# 56. Pendências

Antes de fechar, verificar:

- itens não divididos;
- unidades não distribuídas;
- divisões personalizadas incompletas;
- participantes sem consumo;
- taxas não confirmadas;
- divergências financeiras;
- alterações pendentes.

---

# 57. Resolver pendência

Exemplo:

```text
⚠ Batata ainda não foi dividida.

Como resolver?

[ Dividir entre todos ]

[ Escolher pessoas ]

[ Personalizar ]
```

Nenhum item deve ser atribuído automaticamente sem uma regra explícita.

---

# 58. Participante sem consumo

É permitido que alguém participe da conta e consuma:

```text
R$ 0,00
```

Isso é diferente de alguém que ainda não informou o que consumiu.

Estados distintos:

```text
SEM_CONSUMO
```

versus:

```text
NÃO_INFORMOU
```

A interface deve diferenciá-los.

---

# 59. Revisão final

Quando as pendências forem resolvidas:

```text
CONFERIR DIVISÃO

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30
Carlos     R$ 28,00
Lucas      R$ 17,25

──────────────────

Total da conta
R$ 231,00

✓ Todos os itens distribuídos
✓ Taxas confirmadas
✓ Divisão confere

[ Fechar conta ]
```

---

# 60. Fechamento da conta

Antes de finalizar:

```text
Fechar conta?

Depois disso,
a divisão será bloqueada.

[ Voltar ]

[ Fechar conta ]
```

---

# 61. Conta finalizada

```text
🎉 Conta dividida!

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30
Carlos     R$ 28,00
Lucas      R$ 17,25

Total      R$ 231,00
```

A conta entra no estado:

```text
FINALIZADA
```

---

# 62. Pagamento

O pagamento ocorre após a definição dos valores.

Exemplo:

```text
Minha parte

R$ 68,20

[ Pagar via Pix ]

[ Copiar Pix ]

[ Já paguei ]
```

O pagamento não modifica o cálculo da conta.

---

# 63. Pix

Funcionalidade prioritária para o contexto brasileiro.

Possibilidades:

- Pix Copia e Cola;
- QR Code Pix;
- chave Pix;
- integração futura com provedor de pagamentos.

A primeira versão pode simplesmente disponibilizar o Pix do estabelecimento ou outro mecanismo definido pelo produto.

---

# 64. Compartilhar resultado

Após o fechamento:

```text
[ Compartilhar resumo ]
```

Possibilidades:

- WhatsApp;
- copiar texto;
- link.

Exemplo:

```text
Conta Restaurante Bistrô

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30

Total      R$ 231,00
```

---

# 65. Máquina de estados da conta

```text
CRIANDO
   ↓
OCR_PROCESSANDO
   ↓
AGUARDANDO_CONFERENCIA
   ↓
AGUARDANDO_PARTICIPANTES
   ↓
DIVISAO_EM_ANDAMENTO
   ↓
AGUARDANDO_REVISAO
   ↓
FINALIZADA
```

Estado de erro:

```text
OCR_PROCESSANDO
       ↓
      ERRO
       ↓
TENTAR_NOVAMENTE
```

---

# 66. Máquina de estados do item

```text
NAO_DIVIDIDO
      ↓
EM_DIVISAO
      ↓
DIVISAO_INCOMPLETA
      ↓
DIVIDIDO
```

Um item já dividido pode voltar para edição se o usuário alterar a comanda.

---

# 67. Máquina de estados do participante

```text
CONVIDADO
   ↓
ENTROU
   ↓
ATIVO
   ↓
CONCLUIU
   ↓
PARTE_FECHADA
   ↓
PAGO
```

Um participante pode sair da sessão e retornar enquanto ela estiver aberta.

---

# 68. Separação entre consumo e pagamento

Esse é um princípio estrutural do domínio:

```text
CONSUMO
   ≠
PAGAMENTO
```

Uma pessoa pode:

- consumir;
- não pagar;
- pagar por outra pessoa;
- pagar apenas parte;
- pagar sua própria parte + partes de terceiros.

Essa separação deve existir desde o MVP para evitar remodelação futura.

---

# 69. Separação entre item e divisão

Outro princípio estrutural:

```text
ITEM
   ↓
COMO FOI CONSUMIDO?
   ├── compartilhado
   ├── unidades
   └── personalizado
```

Não associar diretamente:

```text
quantidade → modo de divisão
```

porque os conceitos são independentes.

---

# 70. Princípios de UX

### Princípio 1

Perguntar:

> **O que você consumiu?**

e não:

> “Qual percentual você deseja atribuir?”

### Princípio 2

Perguntar:

> **Como dividir este item?**

e não expor conceitos técnicos.

### Princípio 3

O convidado não deve precisar instalar nada.

### Princípio 4

O usuário deve perceber imediatamente quanto está pagando.

### Princípio 5

A matemática deve ficar escondida.

### Princípio 6

O realtime deve ser visual, não intrusivo.

### Princípio 7

O OCR deve ser editável de maneira extremamente rápida.

### Princípio 8

Nenhuma cobrança deve ser presumida silenciosamente.

---

# 71. Estados visuais globais

A interface deve possuir indicadores claros para:

### Sincronizado

```text
🟢 Sincronizado
```

### Sincronizando

```text
🟡 Sincronizando...
```

### Offline

```text
🔴 Você está offline
```

### Pendência

```text
⚠ Ainda falta dividir
```

### Completo

```text
✓ Dividido
```

---

# 72. Requisitos de responsividade

Prioridade:

1. celular;
2. tablet;
3. desktop.

A experiência principal deve ser otimizada para uso **com uma mão e em pé/em uma mesa de restaurante**.

Botões devem possuir áreas de toque confortáveis.

---

# 73. Requisitos de acessibilidade

A interface deve considerar:

- contraste adequado;
- tamanho de texto legível;
- áreas de toque adequadas;
- não depender exclusivamente de cor para representar estados;
- feedback visual e textual;
- suporte a leitores de tela quando possível.

Exemplo:

Não usar somente:

```text
🟢
```

mas:

```text
✓ Dividido
```

---

# 74. Histórico — pós-MVP

Futuramente:

```text
Histórico

Restaurante Bistrô
03/10/2026
R$ 231,00

Pizzaria X
28/09/2026
R$ 420,00
```

Permitir:

- visualizar conta;
- visualizar participantes;
- visualizar itens;
- visualizar pagamentos.

---

# 75. Cardápio — pós-MVP

Possível integração futura com:

- cardápio;
- preços;
- fotos;
- pratos;
- informações do restaurante.

Não deve interferir no fluxo básico.

---

# 76. Funcionalidades fora do MVP

Inicialmente não são necessárias:

- múltiplas moedas;
- controle de despesas domésticas;
- aluguel;
- despesas recorrentes;
- grupos permanentes;
- integração bancária;
- estatísticas financeiras;
- exportação contábil;
- gestão financeira pessoal.

O produto deve permanecer focado em:

> **dividir uma conta de restaurante.**

---

# 77. MVP — requisitos obrigatórios

## Entrada

- [ ] Criar conta
- [ ] Fotografar comanda
- [ ] Selecionar imagem
- [ ] OCR
- [ ] Revisão manual
- [ ] Correção dos itens
- [ ] Identificação de taxas
- [ ] Identificação de descontos
- [ ] Validação do total

## Colaboração

- [ ] QR Code
- [ ] Link
- [ ] Entrada sem cadastro
- [ ] Nome do participante
- [ ] Avatar opcional
- [ ] Presença
- [ ] Atualização em tempo real

## Divisão

- [ ] Dividir entre pessoas
- [ ] Distribuir unidades
- [ ] Personalizar por valor
- [ ] Personalizar por percentual
- [ ] Validação da divisão
- [ ] Itens parcialmente divididos
- [ ] Itens completamente divididos

## Cálculo

- [ ] Subtotal
- [ ] Taxas
- [ ] Descontos
- [ ] Distribuição proporcional
- [ ] Arredondamento
- [ ] Garantia de fechamento exato

## Participantes

- [ ] Minha parte
- [ ] Visão das pessoas
- [ ] Detalhamento individual
- [ ] Fechamento individual
- [ ] Pagamento por terceiros

## Fechamento

- [ ] Pendências
- [ ] Revisão final
- [ ] Fechamento da conta
- [ ] Bloqueio após fechamento
- [ ] Resumo final
- [ ] Compartilhamento

## Confiabilidade

- [ ] Indicador de sincronização
- [ ] Indicador offline
- [ ] Validação no servidor
- [ ] Controle de concorrência
- [ ] Versionamento
- [ ] Proteção contra distribuição acima da quantidade
- [ ] Proteção contra divergência financeira

---

# 78. MVP — fluxo mínimo obrigatório para validação

O primeiro protótipo funcional deve conseguir executar:

```text
1. Guilherme cria conta
          ↓
2. Fotografa comanda
          ↓
3. OCR identifica:
   Pizza R$120
   4 cervejas R$36
   4 refrigerantes R$24
          ↓
4. Usuário corrige/confirma
          ↓
5. Sistema identifica taxa
          ↓
6. Guilherme gera QR
          ↓
7. João entra
8. Maria entra
9. Pedro entra
          ↓
10. João seleciona pizza
11. Maria seleciona pizza
12. Pedro seleciona pizza
          ↓
13. Sistema mostra:
    R$40 para cada
          ↓
14. Cervejas:
    João 1
    Maria 1
    Pedro 2
          ↓
15. Sistema recalcula
          ↓
16. Todos visualizam
    as mudanças em tempo real
          ↓
17. Cada pessoa vê
    sua parte
          ↓
18. Maria fecha sua parte
          ↓
19. João paga Maria também
          ↓
20. Mesa resolve pendências
          ↓
21. Criador revisa
          ↓
22. Fecha conta
          ↓
23. Cada participante
    recebe seu valor final
```

---

# 79. Princípio final do produto

A aplicação deve esconder toda a complexidade de:

- OCR;
- regras de divisão;
- taxas;
- descontos;
- proporções;
- arredondamento;
- concorrência;
- sincronização;
- cálculo individual.

Para o usuário, a experiência deve parecer simplesmente:

```text
📸 Fotografe a conta

      ↓

👥 Convide seus amigos

      ↓

🍽️ Cada um marca o que consumiu

      ↓

💰 Veja sua parte

      ↓

💸 Pague
```

O produto resolve todo o restante automaticamente.

---

# 80. Definição conceitual do domínio

A regra mais importante para a implementação é manter três conceitos separados:

```text
┌─────────────────────────┐
│        COMANDA          │
│ O que o restaurante     │
│ efetivamente cobrou     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│         CONSUMO         │
│ Quem consumiu cada item │
│ e como ele foi dividido │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│        PAGAMENTO        │
│ Quem efetivamente       │
│ pagará cada valor       │
└─────────────────────────┘
```

**Comanda → Consumo → Pagamento**

Essa separação deve orientar todas as decisões funcionais do produto.