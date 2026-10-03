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
| Conta | limite prático de 100 itens (avisar acima de 50) |

---

## 2. OCR

- Entrada: JPG/PNG/HEIC (converter), retrato/paisagem.
- **Fallback manual obrigatório** (tela 05) — nunca bloquear o fluxo.
- O resultado é **sugestão**, nunca verdade definitiva (princípio).
- Confiança baixa por campo → destacar campo para conferência (nice-to-have; não bloqueia).
- Fornecedor: decisão técnica (`10-decisoes-aberto.md`). Pode ser API cloud (melhor acurácia) — exige envio da foto a terceiro → ver LGPD §5.
- Idioma: pt-BR; comandas com "SERV/COUVERT/TAXA/DESC" variações.

---

## 3. PWA e dispositivos

- Instalável (manifest + service worker), cache do shell.
- Câmera via `getUserDevice`/input file com `capture` — fallback galeria obrigatório (iOS PWA tem restrições).
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
- **Identidade de re-entrada (token de dispositivo):**
  - token **opaco** guardado em **cookie `HttpOnly` + `Secure` + `SameSite`** — **nunca** em `localStorage` (proteção contra XSS roubando a sessão);
  - **rotação** do token após uso, expiração/renovação e revogação de sessão ("sair deste dispositivo" pós-MVP);
  - o **link da conta** é *bearer secret* (quem tem o link entra) — declarado no modelo de ameaça.
- Sem autenticação forte no MVP → aceito risco de link compartilhado; mitigação: link secreto + "ver resumo" é o pior caso (dados de divisão, não financeiros sensíveis).

---

## 5. Privacidade / LGPD

- **Foto da comanda**: dado pessoal potencial (nome no rodapé da comanda).
- **MVP: sem TTL automático** (decisão registrada em `10` — risco: acúmulo). Enquanto não decidido:
  - tratar como dado efêmero; **não usar para treino/analytics**;
  - expor em política de privacidade: finalidade (dividir a conta), retenção ( indefinida — pendente);
  - suporte a **deleção manual**: ao pedir "apagar minha conta/dados", apagar foto + participante (endpoint mínimo no MVP).
- Dados coletados: nome, avatar, valores da divisão. **Sem e-mail, sem CPF, sem localização.**
- Third-party de OCR: declarar subcontratado; avaliar DPA.

---

## 6. Acessibilidade (WCAG 2.1 AA mín.)

- Contraste ≥ 4.5:1; texto legível (não < 12px).
- Áreas de toque ≥ 44×44px; uso com uma mão (ações na metade inferior).
- **Nunca só cor/emoji**: sempre texto + ícone (✓ Dividido / ⚠ Não dividido).
- Foco visível, navegação por teclado, labels em inputs.
- Leitores de tela: Anúncios de mudança de valor ("seu total atualizou para R$ 64,90") sem poluição (throttled).
- Estados offline/sincronização sempre com texto.

---

## 7. Responsividade

- Mobile-first. Prioridade: celular > tablet > desktop.
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
