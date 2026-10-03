# 10 — Decisões em Aberto

Itens que **não bloqueiam** a spec funcional, mas precisam de decisão antes (ou durante) da implementação. **Status**: DECIDIDA (já aplicada na spec) · PROVISÓRIA (vale até revisão) · ABERTA · PÓS-MVP.

---

## 1. Pendências de produto

| # | Tema | Opções | Status | Responsável | Nota |
|---|---|---|---|---|---|
| D1 | **TTL da conta e destino da foto** | 24h inatividade · 7 dias + foto cedo · purga da foto pós-fechamento | **DECIDIDA** (2ª rodada) | Produto/LGPD | Foto `imagemComanda` purgada **48h após FINALIZADA**; dados textuais permanecem até deleção (`09 §5`). Conta sem TTL. |
| D2 | **Reabertura de conta FINALIZADA** | nunca · só o criador · por X horas | ABERTA | Produto | MVP: permanente. |
| D3 | **Remover participante / pré-cadastro removível** | criador pode remover · nunca | **DECIDIDA** | Produto | MVP: **sem remoção de participantes**; vaga/placeholder **vazio** é removível antes da divisão (`05 §4`). |
| D4 | **"Sair e apagar dados deste dispositivo"** | existe · não existe | **DECIDIDA** (2ª rodada) | Produto | **No MVP**: revoga sessão + apaga cookie/cache local; servidor intacto (`05 §11`, `09 §4/§5`). |
| D5 | **Atribuição a placeholder sem aviso para o criador** | como notificar a mesa que falta alguém | **DECIDIDA** | Produto | Pendência `PARTICIPANTE_AGUARDANDO_ENTRADA` cobre (`07 §8`). |
| D6 | **Nome/identidade: vincular vaga por nome + token** | token por vaga vs nome | **DECIDIDA** (2ª rodada) | Produto/Seg | **Nome + token de dispositivo mantidos**; risco de colisão deliberada **aceito** (ver §4) e mitigado pela confirmação obrigatória (`05 §3`, `09 §4`). |
| D7 | **Histórico pós-MVP** | escopo mínimo (lista + resumo) | PÓS-MVP | Produto | braindump §74. |
| D8 | **Cardápio/restaurantes pós-MVP** | — | PÓS-MVP | Produto | braindump §75. |
| D9 | **Pagamento (Pix, terceiros, "Já paguei")** | provedor, momento, consentimento | PÓS-MVP | Produto | modelo `Pagamento` já previsto em `02`; braindump §53–54, §62–63. |
| D10 | **Separação de itens (tela)** | UI de "separar" | ABERTA | Produto | MVP: fora; braindump §12. |
| D11 | **Avatar** | set de emojis vs upload | **DECIDIDA** | Design | MVP: emojis. |
| D12 | **Marca: "Conta Juntos"** | checar domínio/INPI/homônimos | ABERTA | Produto/Docs | Review encontrou homônimos para "Divide Aí"; "Conta Juntos" também precisa de checagem antes do lançamento. |
| D13 | **Personalizado: [Salvar parcial]** | salvar incompleto vs só completo | **DECIDIDA** (2ª rodada) | Produto | **Sim**: grava incompleto → `DIVISAO_INCOMPLETA` + pendência visível; qualquer um completa depois (tela 20 · Gemini 1.3). |
| D14 | **Limite de vagas = 6** | 6 · 8 · sem limite | **DECIDIDA** (2ª rodada) | Produto | **Manter 6** no MVP (decisão vigente); risco de churn registrado (§4); revisar com dados reais. |
| D15 | **Identidade do criador antes da comanda** | mini-step na criação vs só ao entrar | **DECIDIDA** (2ª rodada) | Produto | Mini-step "Como devemos te chamar?" (tela 01) → `criadoPor` sempre existe; **"só o criador resolve pendências" permanece**; perda de sessão do criador = risco (§4); transferência de papel/coadmin = pós-MVP. |
| D16 | **Copy provisória das partes** | "Fechar minha parte" vs "Fechar/Conferir…" | **DECIDIDA** (2ª rodada) | Produto/UX | Mantém nome "Fechar minha parte"; pós: "conferida com o estado atual — pode mudar até finalizar"; barra: "Minha parte **até agora**" enquanto houver pendências (04 · 02 glossário). |
| D17 | **⏳ Aguardando confirmação × fechamento** | bloqueia + override · aprovação tácita | **DECIDIDA** (2ª rodada) | Produto | **Bloqueia** (pendência `PARTICIPANTE_NAO_CONFIRMOU`); criador resolve em nome da pessoa com origem "Resolvido por X"; aprovação tácita acabou (`05 §7`). |
| D18 | **Autoridade do preço de item** | unitário · total da linha · os dois | **DECIDIDA** (2ª rodada) | Produto | `modoPreco: TOTAL_LINHA \| UNITARIO` — OCR/total é autoridade quando não há unitário exato; unidades indivisíveis rateiam por Maior Resto (`07 §1/§4.2`). |
| D19 | **Divergência > 5¢** | só corrigir · + ajuste explícito | **DECIDIDA** (2ª rodada) | Produto | **+ [Ajuste de comanda]** (tela 09 · `07 §3.1`): cria cobrança explícita; continua **sem "Confirmar assim mesmo"**. |

---

## 2. Pendências técnicas

| # | Tema | Opções | Recomendação provisória | Status |
|---|---|---|---|---|
| T1 | **Provedor de OCR** | API cloud (Google/Azure/OpenAI-vision) vs on-device | Cloud no MVP (acurácia) — contrata DPA/LGPD (ver `09 §5`); recomendação de nota técnica: visão multimodal consolidada | PROVISÓRIA |
| T2 | **Transporte realtime** | WebSocket vs SSE | **REST (mutações) + SSE (down-channel)** — 2ª rodada (Gemini T1/T2); WebSocket registrado como alternativa | PROVISÓRIA |
| T3 | **Backend/stack** | definir | Fora desta spec (SDD técnica) | ABERTA |
| T4 | **Onde roda o cálculo** | só servidor vs servidor + preview cliente | Preview cliente + **validação final no servidor** (`07 §7`) | **DECIDIDA** |
| T5 | **Geração do QR** | cliente vs servidor | Cliente (não depende de backend) | **DECIDIDA** |
| T6 | **Compressão de imagem** | client-side (canvas) | Sim — antes do upload (`09 §1`). | **DECIDIDA** |
| T7 | **Nota técnica: broadcast pós-commit** | outbox vs evento síncrono na transação | Garantir que nenhum evento sai antes do commit (2ª rodada, `08 §2`) — detalhar na SDD técnica | NOTA |

---

## 3. Pendências de documentação/design

| # | Item | Ação |
|---|---|---|
| M1 | **Regenerar `telas.png`** com a numeração canônica de `04-telas.md` (atual png tem faltas 9/18, duplicata 23, e mistura telas pós-MVP 25/27 no fluxo). | Design |
| M2 | **Dataset antigo** (valores 45,10 / 68,20 / 75,16 / 80 / 65 do braindump) está **proibido** — só dataset canônico de `02`. | Revisão |
| M3 | Exemplo do braindump §17 (serviço pós-desconto) **está incorreto** — corrigido em `07` §2.2. | Feito |
| M4 | Mapear cada item do checklist (`11`) para tela e regra (rastreabilidade). | Feito em `11` |
| M5 | **Adiados para a SDD técnica** (2ª rodada): modelo completo de versões de confirmação do P0-04 (aqui só `consumoConfirmado` + reset + origem); "sessão de rascunho" para edição em lote da comanda (P0-12); renomear entidade `Conta` → `SessaoDivisao` (3.1 — adiado, alto churn de referências); estado `PARTE_CONFERIDA` derivado de `confirmadaNaVersao` (6.3 — adiado). | SDD técnica |
| M6 | Regras de evento/dedupe (`08 §4.4`), outbox pós-commit (T7) e contrato `serverState` — detalhar na SDD técnica. | SDD técnica |

---

## 4. Riscos aceitos no MVP

1. **Retenção de dados textuais** (D1): a foto é purgada em 48h, mas a divisão (nomes + valores) permanece até deleção manual — mitigação: operações de direito do titular (`09 §5`).
2. **Link é credencial de edição completa** (`09 §4`): link equivocado/divulgado dá poder de ler **e alterar** a divisão inteira — mitigação: link ≥128 bits indevinhável + auditoria; sem autenticação forte no MVP.
3. **Edição aberta para todos** (`05`): maior chance de conflito — mitigado por versionamento; UX de conflito precisa ser boa.
4. **"Qualquer participante fecha a conta"** (`05` §9): mitigado por guarda de zero pendências + CAS + confirmação.
5. **OCR instável em comandas ruins** (T1): mitigado pelo fallback manual obrigatório.
6. **Colisão deliberada de nome em vaga** (D6): pessoa errada pode assumir atribuições de vaga homônima — mitigação: avatar + confirmação obrigatória antes de fechar (D17).
7. **Sessão do criador perdida** (D15): só o criador resolve pendências de terceiros — se o dispositivo dele morrer no meio da mesa, as pendências ficam travadas; transferência de papel/coadmin é pós-MVP.
8. **Limite de 6 vagas** (D14): mesas maiores não cabem — risco de churn; revisar com uso real.
