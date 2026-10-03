## Fluxo principal

### 1. Home
**Objetivo:** iniciar ou entrar em uma conta.

- Nova conta
- Entrar em conta
- Histórico (futuro)

---

### 2. Capturar comanda
**Objetivo:** fotografar a conta.

- Câmera
- Enquadramento da comanda
- Tirar foto
- Escolher da galeria

---

### 3. Pré-visualização da comanda
**Objetivo:** confirmar a imagem antes do OCR.

- Foto
- Tirar novamente
- Usar esta foto

---

### 4. Processando OCR
**Objetivo:** mostrar que a comanda está sendo interpretada.

```text
Lendo sua comanda...

Identificando:
✓ Itens
✓ Quantidades
✓ Valores
⏳ Taxas e descontos
```

---

### 5. Conferir comanda — OCR
**Uma das telas mais importantes do produto.**

Mostra:

- itens;
- quantidades;
- preços;
- subtotal;
- taxas;
- descontos;
- total.

Exemplo:

```text
Pizza             R$ 120,00
Cerveja            R$ 36,00
Refrigerante       R$ 24,00
Batata             R$ 30,00

Subtotal          R$ 210,00
Serviço 10%        R$ 21,00
Total             R$ 231,00
```

---

### 6. Editar item da comanda
Bottom sheet/modal para:

- nome;
- quantidade;
- preço unitário;
- preço total.

Também permite excluir.

---

### 7. Adicionar/editar taxas e descontos
Tela específica para:

- serviço;
- couvert;
- gorjeta;
- outras taxas;
- descontos.

Mostra o percentual quando puder ser calculado.

Exemplo:

```text
Serviço
R$ 21,00

Base: R$ 210,00
Percentual: 10%

✓ Confirmado
```

---

### 8. Divergência da comanda
Aparece quando:

```text
Subtotal + taxas - descontos ≠ total
```

Permite corrigir ou confirmar manualmente.

---

### 9. Confirmar comanda
Resumo final antes de abrir a sessão.

```text
✓ 8 itens
✓ Subtotal
✓ Taxas
✓ Descontos
✓ Total

[ Confirmar e convidar ]
```

---

# Entrada dos participantes

### 10. Convidar participantes

```text
Convide seus amigos

[ QR CODE ]

[ Compartilhar no WhatsApp ]

[ Copiar link ]
```

---

### 11. Entrar na conta
Tela acessada pelo link/QR.

```text
Restaurante Bistrô

Como podemos te chamar?

[ Maria ]

[ Entrar ]
```

Sem cadastro.

---

### 12. Sala aguardando participantes

Mostra:

```text
Participantes

🟢 Guilherme
🟢 Maria
🟢 João

Aguardando...

3/6 participantes
```

Pode começar a divisão imediatamente, sem precisar esperar todos.

---

# Divisão colaborativa

### 13. Conta — visão de itens

**Tela principal da sessão.**

Tabs:

```text
[ Itens ] [ Pessoas ]
```

Exemplo:

```text
🍕 Pizza
R$ 120
✓ 3 pessoas

🍺 Cerveja
4 × R$ 9
3/4 distribuídas

🥤 Refrigerante
4 × R$ 6
4/4 distribuídas

🍟 Batata
R$ 30
⚠ Não dividida
```

---

### 14. Conta — visão de pessoas

```text
João
R$ 45,10

Maria
R$ 68,20

Pedro
R$ 32,15

Ana
R$ 40,30
```

Mostra também quem ainda não informou o consumo.

---

### 15. Como dividir este item?

Essa é a tela-chave da nossa UX.

```text
Pizza
R$ 120,00

Como dividir?

👥 Dividir entre pessoas

🔢 Distribuir unidades

⚙️ Personalizar
```

---

### 16. Dividir entre pessoas

Exemplo da pizza:

```text
Quem consumiu?

☑ João
☑ Maria
☑ Pedro
☐ Ana
☐ Carlos
☐ Lucas

3 pessoas

R$ 40,00 cada

[ Confirmar ]
```

---

### 17. Distribuir unidades

Exemplo dos refrigerantes:

```text
Refrigerante
4 × R$ 6

João       − 1 +
Maria      − 1 +
Pedro      − 2 +

4/4 unidades

[ Confirmar ]
```

---

### 18. Personalizar divisão

Pode alternar entre:

```text
[ Valor ] [ % ]
```

Exemplo:

```text
João       R$ 60
Maria      R$ 30
Pedro      R$ 30

Total      R$ 120

✓ Divisão confere

[ Confirmar ]
```

---

### 19. Detalhes do item dividido

Depois da configuração:

```text
🍕 Pizza
R$ 120

João       R$ 40
Maria      R$ 40
Pedro      R$ 40

✓ Dividido entre 3
```

Essa tela/card também deve permitir editar novamente.

---

# Acompanhamento

### 20. Minha parte

A tela individual do participante:

```text
MINHA PARTE

Pizza             R$ 40,00
Cerveja            R$ 9,00
Refrigerante       R$ 6,00
Batata            R$ 13,33

Subtotal          R$ 68,33
Serviço 10%        R$ 6,83

TOTAL             R$ 75,16
```

O total deve atualizar em tempo real.

---

### 21. Detalhes de uma pessoa

Na aba Pessoas, tocar em alguém abre:

```text
Maria

Pizza             R$ 40,00
Cerveja            R$ 9,00
Batata            R$ 13,33

Subtotal          R$ 62,33
Serviço            R$ 6,23

Total             R$ 68,56
```

---

### 22. Pendências da conta

Uma tela agregadora para mostrar o que falta:

```text
Ainda falta resolver:

⚠ Batata não dividida
⚠ 1 cerveja não distribuída
⚠ Carlos ainda não informou o consumo

[ Resolver pendências ]
```

---

# Fechamento

### 23. Fechar minha parte

Para quem precisa ir embora antes:

```text
MINHA PARTE

R$ 87,42

Depois de fechar,
sua divisão não será alterada.

[ Fechar minha parte ]
```

Depois:

```text
✓ Sua parte está fechada

R$ 87,42

[ Pagar via Pix ]
```

A mesa continua aberta.

---

### 24. Revisão final da conta

Antes do fechamento global:

```text
REVISAR CONTA

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30
Carlos     R$ 28,00
Lucas      R$ 17,25

Total     R$ 231,00

✓ Todos os itens divididos
✓ Taxas confirmadas
✓ Valores conferem

[ Fechar conta ]
```

---

### 25. Pagamento por terceiros

Essa é uma tela adicional importante.

```text
QUEM VAI PAGAR?

João
Sua parte          R$ 80

Maria              R$ 65

[ João também paga Maria ]
```

Resultado:

```text
João vai pagar:

Sua parte          R$ 80
Maria              R$ 65
──────────────────────
Total              R$145
```

---

### 26. Conta finalizada

```text
🎉 Conta dividida!

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30

Total      R$ 231,00
```

A conta fica bloqueada para alterações.

---

### 27. Pagamento / Pix

```text
Minha parte

R$ 68,20

[ Pagar via Pix ]

[ Copiar Pix ]

[ Já paguei ]
```

---

### 28. Resumo compartilhável

```text
Restaurante Bistrô

João       R$ 45,10
Maria      R$ 68,20
Pedro      R$ 32,15
Ana        R$ 40,30

Total      R$ 231,00

[ Compartilhar ]
```

---

# Fluxo visual completo

Eu representaria o protótipo final assim:

```text
01 HOME
   ↓
02 CAPTURA
   ↓
03 PRÉVIA
   ↓
04 OCR
   ↓
05 CONFERIR COMANDA
   ↓
06 EDITAR ITEM
   ↓
07 TAXAS / DESCONTOS
   ↓
08 DIVERGÊNCIA
   ↓
09 CONFIRMAR COMANDA
   ↓
10 CONVIDAR
   ↓
11 ENTRAR NA CONTA
   ↓
12 PARTICIPANTES
   ↓
13 ITENS ←──────────────┐
   ↓                    │
14 PESSOAS              │
   ↓                    │
15 COMO DIVIDIR         │
   ├── 16 PESSOAS ──────┤
   ├── 17 UNIDADES ─────┤
   └── 18 PERSONALIZAR ─┤
                         │
19 ITEM DIVIDIDO ────────┘
   ↓
20 MINHA PARTE
   ↓
21 DETALHE PESSOA
   ↓
22 PENDÊNCIAS
   ↓
23 FECHAR MINHA PARTE ──→ PIX
   ↓
24 REVISÃO FINAL
   ↓
25 PAGAMENTO POR TERCEIROS
   ↓
26 CONTA FINALIZADA
   ↓
27 PIX
   ↓
28 RESUMO / COMPARTILHAR
```
