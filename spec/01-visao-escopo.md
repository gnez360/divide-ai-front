# 01 — Visão e Escopo

## 1. Visão do produto

PWA mobile-first para dividir contas de restaurante de forma colaborativa.

O usuário fotografa a comanda, o sistema interpreta (OCR) itens e valores, os participantes entram por QR Code ou link sem instalar nada e cada pessoa informa o que consumiu. O sistema calcula quanto cada um deve pagar, incluindo taxas, descontos e arredondamentos.

### Princípio central

> **O usuário informa o que consumiu. O sistema resolve a matemática.**

O usuário não precisa entender proporções, rateios, percentuais, arredondamentos, distribuição de taxas nem cálculos de centavos.

### Princípio final

Para o usuário, a experiência deve ser:

```text
📸 Fotografe a conta → 👥 Convide → 🍽️ Cada um marca o que consumiu → 💰 Veja sua parte
```

O produto resolve todo o restante automaticamente.

---

## 2. Domínio conceitual

Três conceitos separados orientam todas as decisões funcionais:

```text
┌───────────────────────┐
│       COMANDA         │  O que o restaurante cobrou
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│       CONSUMO         │  Quem consumiu cada item e como foi dividido
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│      PAGAMENTO        │  Quem efetivamente pagará cada valor
└───────────────────────┘
```

**Comanda → Consumo → Pagamento.**

No MVP a camada PAGAMENTO existe no modelo de dados (para não remodelar depois), mas **não possui interface**: não há Pix, nem "Já paguei", nem pagamento por terceiros. A interface termina em "quanto cada um deve" + resumo compartilhável.

---

## 3. Princípios de UX

1. Perguntar **"O que você consumiu?"**, nunca "Qual percentual deseja atribuir?".
2. Perguntar **"Como dividir este item?"**, nunca expor conceitos técnicos.
3. O convidado não instala nada, não cria conta, não informa e-mail.
4. O usuário deve perceber imediatamente quanto está pagando.
5. A matemática fica escondida.
6. O realtime é visual, não intrusivo (atualização direta nos cards, não toast por evento).
7. O OCR deve ser editável de maneira extremamente rápida.
8. **Nenhuma cobrança deve ser presumida silenciosamente** (nenhuma taxa inventada, nenhum item atribuído automaticamente).
9. **Nada é confirmado por silêncio**: atribuição feita por terceiros não confirma o consumo; a conta só fecha com zero pendências e resoluções explícitas (`05` §7).

---

## 4. Atores

| Atores | Descrição |
|---|---|
| **Criador** | Quem iniciou a conta (identificado **antes** da comanda — `10` D15). Pré-cadastra participantes, edita comanda, resolve pendências de participantes ("não informou"/"não confirmou"/aguardando entrada) com **origem visível** ("Resolvido por X"). |
| **Participante** | Quem entra por link/QR ou foi pré-cadastro pelo criador. Sem cadastro, sem login. |

**No MVP, criador e participante têm as mesmas permissões de edição de comanda e divisão** (decisão: edição aberta). As diferenças do criador são: pré-cadastro de participantes e resolução explícita de pendências de terceiros (ver `05-regras-dominio.md`).

O criador **também é um participante** da divisão.

---

## 5. Escopo do MVP

### Dentro do MVP

- Criar conta, fotografar/selecionar comanda, OCR com **fallback manual obrigatório**.
- Revisão e edição completa (itens, taxas, descontos), validação de total com tolerância de 5 centavos.
- Convite por QR Code/link, entrada sem cadastro (token de dispositivo), pré-cadastro pelo criador.
- Limite de **6 vagas por conta** (entrados + pré-cadastros), configurável.
- Presença, tempo real, indicador de sincronização, estado offline honesto.
- Três modos de divisão: entre pessoas / distribuir unidades / personalizar (valor ou %).
- Minha parte, visão de pessoas, detalhe por pessoa, fechar minha parte.
- Pendências (inclui "não confirmou" bloqueando), revisão final, fechamento da conta, resumo compartilhável.
- **[Ajuste de comanda]** na divergência > 5¢ (cobrança explícita, sem "Confirmar assim mesmo").
- **[Sair e apagar dados deste dispositivo]** (revoga sessão + cache local).
- Regras de cálculo: taxas, descontos, distribuição proporcional, arredondamento determinístico, invariantes (parcial e de fechamento).

### Fora do MVP

- **Pagamento**: Pix, "Já paguei", pagamento por terceiros, status PAGO (pós-MVP).
- Histórico de contas, cardápio/restaurantes, múltiplas moedas.
- Despesas domésticas, aluguel, recorrência, grupos permanentes.
- Integração bancária, estatísticas, exportação contábil, gestão financeira.
- Notificações push (o "Lembrar pessoas" do MVP usa compartilhar/WhatsApp com texto pronto).
- Colaboração offline completa (MVP: leitura do último estado + bloqueio de operações críticas).

### Pós-MVP registrado em `10-decisoes-aberto.md`

Purga da foto 48h pós-fechamento (decidida — `10` D1), TTL da conta por inatividade, provedor de OCR, provedor de realtime, histórico, cardápio.

---

## 6. Público e contexto de uso

- Mobile-first, uso **com uma mão, em pé ou na mesa do restaurante**.
- Prioridade de responsividade: celular > tablet > desktop.
- Idioma: pt-BR.
- Funciona como PWA (instalável, câmera, share nativo).

---

## 7. Referências

- Braindump original: `braindump-spec.md` (80 seções).
- Telas originais: `braindump-telas.md` + `telas.png` (regenerar com numeração canônica — ver `10-decisoes-aberto.md`).
- Fluxo: `03-fluxos.md` · Telas: `04-telas.md` · Regras: `05` a `08`.
