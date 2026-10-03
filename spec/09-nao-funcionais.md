# 09 — Requisitos Não Funcionais

---

## 1. Performance

| Métrica | Meta (MVP) |
|---|---|
| OCR (envio → resultado) | ≤ 8s p95; UI de progresso em < 300ms |
| Timeout de OCR | 20s → tela 05 (fallback) |
| Confirmação de operação (salvar divisão) | ≤ 1,5s p95 até 🟢 |
| Broadcast (servidor → outros clientes) | ≤ 500ms p95 |
| First load do PWA (4G) | ≤ 3s até interativo |
| Tamanho máximo da foto | 10 MB (comprimir client-side antes do envio) |
| Conta | servidor valida **máx. 100 itens** (422 acima); avisar na UI acima de 50 |
| Dinheiro | **int64 centavos** (nunca float); limite de conta ≤ R$ 999.999,99 validado no servidor |

---

## 2. OCR

- Entrada: JPG/PNG/HEIC (converter), retrato/paisagem.
- **Fallback manual obrigatório** (tela 05) — nunca bloquear o fluxo.
- O resultado é **sugestão**, nunca verdade definitiva (princípio).
- Confiança baixa por campo → destacar campo para conferência (nice-to-have; não bloqueia).
- Fornecedor: decisão técnica (`10-decisoes-aberto.md`). Pode ser API cloud (melhor acurácia) — exige envio da foto a terceiro → ver LGPD §5. **Recomendação T1:** provedor com visão multimodal consolidada (ex.: OpenAI Vision / Google Cloud Vision) em vez de parser próprio.
- Idioma: pt-BR; comandas com "SERV/COUVERT/TAXA/DESC" variações.

---

## 3. PWA e dispositivos

- Instalável (manifest + service worker), cache do shell.
- Câmera via **`navigator.mediaDevices.getUserMedia`** + input file com `capture` — fallback galeria obrigatório (iOS PWA tem restrições); negação de permissão → estado de erro com instrução (tela 04).
- Share nativo (`navigator.share`) com fallback copiar.
- Teclado numérico em campos monetários (`inputmode="decimal"`).
- Suporte: iOS Safari 16+, Chrome Android, desktop moderno (prioridade: celular).

---

## 4. Segurança

- **IDs indevinháveis** (≥128 bits aleatórios) para conta e convite — o código legível da tela é display; o link real não é enumerável.
- Rate limit em: OCR (ex.: 10/min por conta), criação de conta, entrada por link.
- Nomes/avatar: sanitizar (sem HTML/JS), limite de tamanho (nome ≤ 30 chars), moderação básica de conteúdo impróprio (filtro simples MVP).
- Validação **sempre no servidor** (itens, divisões, Σ = total, permissões) — cliente só UI.
- Transporte: HTTPS obrigatório (PWA + câmera).
- **Modelo de ameaça (correto, P0-15):** o **link é credencial de edição completa e irreversível** — quem obtém o link pode ler e alterar a divisão inteira; o cenário de "pior caso" é dano financeiro na conta da mesa, não só leitura. Mitigações: link secreto ≥128 bits, rotação de `joinToken` opcional pelo criador, revogação da conta, auditoria de mudanças. Ameaça aceita e documentada (sem autenticação forte no MVP).
- **Fluxo do link (join):** link de convite carrega `joinToken` → servidor valida **uma vez** → troca por **cookie de sessão `HttpOnly`** → o front limpa o token da URL (`history.replaceState`). O token de convite **nunca** persiste em `localStorage`.
- **Identidade de re-entrada (token de dispositivo):**
  - token **opaco** guardado em **cookie `HttpOnly` + `Secure` + `SameSite`** (e `__Host-`/`__Secure-` prefix quando possível) — **nunca** em `localStorage`;
  - **rotação** do token após uso, expiração/renovação e **revogação de sessão** — "Sair e apagar dados deste dispositivo" está **no MVP** (decisão 5 da 2ª rodada): apaga cookie + cache local do dispositivo e **revoga a sessão no servidor**; dados da conta no servidor ficam intactos;
  - CSRF: mutações exigem header customizado (não-curl) além de `SameSite`; Sem GET state-changing.
  - **Auditoria**: log de eventos sensíveis (criação, resolução de pendência pelo criador, fechamento, exclusão) com `participanteId`, IP-hash e timestamp.
- **Risco D6 aceito (decisão 3 da 2ª rodada):** "nome igual à vaga" vincula — pessoa errada pode assumir atribuições de uma vaga homônima. Registrado como risco aceito (`10` D6); mitigação: avatar + pendência de confirmação obrigatória antes de fechar (05 §7).

---

## 5. Privacidade / LGPD

- **Foto da comanda**: dado pessoal potencial (nome no rodapé da comanda).
- **TTL decidido (10-D1, 2ª rodada):** `imagemComanda` é **purgada automaticamente 48h após a conta FINALIZADA** (job de retenção); dados textuais da divisão permanecem (são necessários para o resumo). Enquanto a conta está viva:
  - tratar como dado efêmero; **não usar para treino/analytics**;
  - expor em política de privacidade: finalidade (dividir a conta), retenção (foto 48h pós-fechamento; divisão até deleção);
- **Direitos do titular (P0-17), 3 operações distintas no MVP:**
  1. **Excluir conta** (só criador): apaga itens/cobranças/partes/foto — participantes são notificados;
  2. **Anonimizar participante** (qualquer um de si mesmo): nome → "Participante excluído", avatar removido, valores preservados (a conta precisa fechar);
  3. **Revogar sessão deste dispositivo** (qualquer participante): "Sair e apagar dados deste dispositivo" (§4).
- Dados coletados: nome, avatar, valores da divisão. **Sem e-mail, sem CPF, sem localização.**
- Third-party de OCR: declarar subcontratado; avaliar DPA.
- Fotos em cache local do PWA (IndexedDB/cache storage): apagadas no logout/revogação (§4).

---

## 6. Acessibilidade (WCAG 2.1 AA mín.)

- Contraste ≥ 4.5:1; texto legível (não < 12px).
- Áreas de toque ≥ 44×44px; uso com uma mão (ações na metade inferior).
- **Nunca só cor/emoji**: sempre texto + ícone (✓ Dividido / ⚠ Não dividido).
- Foco visível, navegação por teclado, labels em inputs; **focus trap** em diálogos (modal fecha por Esc e devolve foco ao gatilho).
- Zoom do navegador até **200% sem perda de conteúdo** (sem `user-scalable=no`).
- Leitores de tela: Anúncios de mudança de valor ("seu total atualizou para R$ 64,90") sem poluição (throttled).
- Estados offline/sincronização sempre com texto.

---

## 7. Responsividade

- Mobile-first. Prioridade: celular > tablet > desktop.
- Funcional em **320px** de largura (sem scroll horizontal indesejado).
- Contexto de uso: em pé/na mesa, uma mão.
- Tablet/desktop: layout com mais colunas mantendo a mesma hierarquia.

---

## 8. Disponibilidade e operação

- MVP: uptime alvo 99% (fase de validação).
- Health check + logs de erro (OCR falho, 409s, operações rejeitadas).
- Backup: dado efêmero; RPO baixo não crítico no MVP.
- Observabilidade mínima: taxa de sucesso do OCR, tempo de OCR, churn de contas que nunca dividiram.

---

## 9. i18n

- MVP: **pt-BR fixo** (sem framework de i18n necessário; manter strings centralizadas para facilitar futuro).

---

## 10. Acessibilidade de teste (aceites não funcionais)

- [ ] Fluxo completo usável só com leitor de tela (navegação principal).
- [ ] Todos os status de item com texto (não só cor).
- [ ] Foto ≤ 10 MB comprimida client-side.
- [ ] IDs de conta não enumeráveis (teste: 1000 tentativas não acham conta).
- [ ] Câmera negada → estado de erro com instrução e fallback de galeria sempre disponível.
- [ ] Upload de foto falhou/timeout → retry + fallback OCR manual acessível (tela 05) sem perda de dados.
- [ ] OCR com timeout (20s) → tela 05 preenchida com o que foi digitado, nada descartado.
- [ ] Conta com 100 itens → 422 do servidor tratado com mensagem clara; 101º item não é aceito.
- [ ] Valores extremos (R$ 999.999,99) sem overflow/quebra de layout.
- [ ] Zoom 200% e viewport 320px sem conteúdo cortado.
- [ ] "Sair e apagar dados deste dispositivo" limpa cookie + cache e derruba a sessão (re-entrada pede link de novo).
- [ ] Duplicação de envio (retry de rede) não cria cobrança/item duplicado (`operationId`).
