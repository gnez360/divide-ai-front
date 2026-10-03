# 10 — Decisões em Aberto

Itens que **não bloqueiam** a spec funcional, mas precisam de decisão antes (ou durante) da implementação.

---

## 1. Pendências de produto

| # | Tema | Opções | Impacto | Nota |
|---|---|---|---|---|
| D1 | **TTL da conta e destino da foto** | 24h inatividade e apagar · 7 dias + foto cedo · sem TTL | Privacidade/LGPD, custo de storage | **MVP: sem TTL** (decisão). Risco: acúmulo de fotos. Reavaliar antes de produção. |
| D2 | **Reabertura de conta FINALIZADA** | nunca · só o criador · por X horas | UX de erro ("fechei sem querer") | MVP: permanente. |
| D3 | **Remover participante / pré-cadastro removível** | criador pode remover (com regra de órfão) · nunca | Flexibilidade de mesa | MVP: sem remoção. |
| D4 | **"Sair da conta neste dispositivo"** | existe · não existe | Celular compartilhado | MVP: não existe. |
| D5 | **Atribuição a placeholder sem aviso para o criador** | como notificar a mesa que falta alguém | Pendência visual já cobre? | Provável: só pendência. |
| D6 | **Nome/identidade: vincular vaga por link de convite dedicado** | token por vaga vs nome | Colisão de nomes | MVP aceita nome+token dispositivo. |
| D7 | **Histórico pós-MVP** | escopo mínimo (lista + resumo) | — | braindump §74. |
| D8 | **Cardápio/restaurantes pós-MVP** | — | — | braindump §75. |
| D9 | **Pagamento (Pix, terceiros, "Já paguei")** | provedor, momento de disponibilidade, consentimento de "pagar por outro" | Pós-MVP; modelo `Pagamento` já previsto em `02` | braindump §53–54, §62–63. |
| D10 | **Separação de itens (tela)** | UI de "separar" | MVP: fora | braindump §12. |
| D11 | **Avatar** | set de emojis vs upload | MVP: emojis | já no checklist. |
| D12 | **Marca: "Conta Juntos"** | checar domínio (.com.br/.app), registro INPI e homônimos de apps existentes | Nome usado em todo o produto | Review GPT encontrou homônimos para o nome alternativo "Divide Aí" — "Conta Juntos" também precisa de checagem antes do lançamento. |

---

## 2. Pendências técnicas

| # | Tema | Opções | Recomendação provisória |
|---|---|---|---|
| T1 | **Provedor de OCR** | API cloud (Google/Azure/OpenAI-vision) vs on-device | Cloud no MVP (acurácia) — contrata DPA/LGPD (ver `09` §5) |
| T2 | **Transporte realtime** | WebSocket vs SSE | WebSocket (já previsto em `08`); SSE é fallback possível |
| T3 | **Backend/stack** | definir | Fora desta spec (SDD técnica) |
| T4 | **Onde roda o cálculo** | só servidor vs servidor + preview cliente | Preview cliente + **validação final no servidor** (`07` §7) |
| T5 | **Geração do QR** | cliente vs servidor | Cliente (não depende de backend) |
| T6 | **Compressão de imagem** | client-side (canvas) | Sim — antes do upload (`09` §1). |

---

## 3. Pendências de documentação/design

| # | Item | Ação |
|---|---|---|
| M1 | **Regenerar `telas.png`** com a numeração canônica de `04-telas.md` (atual png tem faltas 9/18, duplicata 23, e mistura telas pós-MVP 25/27 no fluxo). | Design |
| M2 | **Dataset antigo** (valores 45,10 / 68,20 / 75,16 / 80 / 65 do braindump) está **proibido** — só dataset canônico de `02`. | Revisão |
| M3 | Exemplo do braindump §17 (serviço pós-desconto) **está incorreto** — corrigido em `07` §2.2. | Feito |
| M4 | Mapear cada item do checklist (`11`) para tela e regra (rastreabilidade). | Feito em `11` |

---

## 4. Riscos aceitos no MVP

1. **Sem TTL** (D1): crescimento de storage + foto retida indefinidamente.
2. **Sem autenticação** (§4 de `09`): link equivocado dá acesso à divisão.
3. **Edição aberta para todos** (`05`): maior chance de conflito — mitigado por versionamento; UX de conflito precisa ser boa.
4. **"Qualquer participante fecha a conta"** (`05` §9): mitigado por guarda de zero pendências + confirmação.
5. **OCR instável em comandas ruins** (T1): mitigado pelo fallback manual obrigatório.
