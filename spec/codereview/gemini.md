Esta é uma especificação de altíssimo nível. A separação clara das camadas de domínio (Comanda → Consumo → Pagamento), o tratamento de concorrência otimista com autoridade no backend (serverState), a precisão matemática em centavos e a estratégia determinística de arredondamento (Maior Resto com hash) mostram uma maturidade técnica excelente.
No entanto, como em todo Code/Spec Review, existem furos lógicos, casos de borda e pontos de fricção que podem quebrar a experiência do usuário (UX) ou gerar bugs no backend.
Abaixo apresento o review completo estruturado por criticidade.
🚨 1. Riscos Críticos (Furos na Lógica de Produto)
1.1. O "Celular Sem Bateria" (Sessão Presa)
 * Onde: 09 §4 (Token em cookie HttpOnly) + 10 D4 (Sair da conta fora do MVP).
 * O Problema: Em um restaurante, é muito comum o celular de alguém estar sem bateria ou sem sinal. Se João pedir o celular da Maria emprestado para preencher a parte dele, ele não conseguirá. O celular da Maria está preso à sessão dela por um cookie HttpOnly in-acessível via JS. Como não há botão de "Sair", Maria teria que ir nas configurações do navegador e limpar os cookies do site para João poder usar.
 * Solução recomendada para o MVP: Incluir um botão simples de "Sair deste dispositivo" (limpa o cookie e dá reload), ou permitir alternar para um participante "Visitante" temporário.
1.2. A Matemática Errada do Restaurante (Divergência Ríspida)
 * Onde: 07 §3 e 04 (Tela 09).
 * O Problema: A spec define que se |Σ calculado − total impresso| > 0,05, a tela 09 bloqueia o fluxo sem opção de "Confirmar assim mesmo". Mas restaurantes erram somas de comanda frequentemente (ex: o garçom somou R$ 100 de itens, mas cobrou R$ 110 na maquininha). Se a comanda real estiver matematicamente errada, o usuário será forçado a inventar um item falso (ex: "Erro do garçom - R$ 10,00") ou alterar o preço de um item que ele consumiu apenas para fazer o software aceitar o avanço.
 * Solução recomendada: Adicionar a opção "O restaurante somou errado. Lançar diferença como 'Ajuste de Comanda'". Isso cria automaticamente uma taxa/desconto chamada "Ajuste de divergência" que rateia o erro, permitindo o avanço sem mentir os valores originais.
1.3. Inconsistência no "Salvar Parcial" (Divisão Personalizada)
 * Onde: 07 §4.3 e 07 §4.2.
 * O Problema: Se eu divido um item por Unidades, posso deixar 4 de 5 distribuídas, o que gera o estado DIVISAO_INCOMPLETA (que é tratado perfeitamente como pendência). Mas se eu divido por Valor Personalizado (ex: Garrafa de Vinho de R$ 150), a spec diz: Confirmar só com soma = valor do item (tolerância 0). Isso significa que se eu preencher os meus R$ 50, eu não posso salvar minha parte e ir ao banheiro. Sou obrigado a preencher a parte dos outros ou cancelar tudo.
 * Solução recomendada: Permitir que o modo Personalizado também seja salvo de forma parcial (ex: total R$ 150, distribuídos R$ 50). O item entra em DIVISAO_INCOMPLETA (gera pendência "Falta R$ 100") e outro participante pode abrir depois e preencher o resto.
⚠️ 2. Alertas de UX e Fluxo (Atritos)
2.1. O Limite de 6 Vagas
 * Onde: 05 §4.
 * O Problema: Hard limit de 6 vagas contando pré-cadastros e pessoas reais. Mesas de restaurante com 7 ou 8 pessoas são extremamente comuns. Bloquear o 7º participante de entrar no link com um erro "Mesa Cheia" impedirá que o app seja usado na maioria das confraternizações, o que gera churn (abandono do app).
 * Sugestão: Se houver limitação de backend/UI, mude para um soft limit (ex: "Acima de 6 pessoas a tela pode ficar espremida"), ou aumente o hard limit para pelo menos 15.
2.2. Efeito Cascata de "Parte Alterada" (Notification Fatigue)
 * Onde: 05 §6.3 (Sua parte foi alterada).
 * O Problema: A UX exige que, ao alterar um item de alguém que já fechou a parte, a parte seja reaberta com um alerta. Em uma conta grande onde o criador está resolvendo várias pendências de 3 pessoas que já deram "Fechar", ele vai gerar dezenas de reaberturas.
 * Sugestão: O aviso de "Sua parte foi reaberta" não deve ser modal/intrusivo na tela da vítima. Um banner amarelo (já previsto) é suficiente. Certifique-se de que o debounce no backend evite disparar 5 avisos se o criador editar 5 itens da pessoa em 10 segundos.
2.3. Fechamento Fantasma (Aguardando Confirmação)
 * Onde: 05 §7 e 05 §9.
 * O Ponto: A spec diz que AGUARDANDO_CONFIRMACAO não gera pendência, e o fechamento só exige "zero pendências". Isso significa que se João marcar os itens da Ana, ela ficará como ⏳ Aguardando confirmação, e a conta pode ser encerrada sem que Ana nunca tenha olhado o celular.
 * Avaliação: Do ponto de vista de produto, isso é bom (evita que uma pessoa desatenta trave a mesa toda). Só estou ressaltando para confirmar que isso foi intencional: a mesa pode ser fechada com aprovação tácita.
🏗️ 3. Pontos de Arquitetura e Engenharia
3.1. Condição de Corrida (Race Condition) no Fechamento
 * Onde: 06 §1 e 08.
 * O Cenário:
   * A conta tem zero pendências.
   * Cliente A clica em "Fechar conta" (envia request ao servidor).
   * Quase simultaneamente (ms de diferença), Cliente B adiciona +1 refrigerante (gera pendência).
 * Solução: O mutex e a checagem não podem ser apenas de versão. No endpoint de POST /conta/fechar, o backend deve re-calcular o estado inteiro e garantir que lista_pendencias == 0 no momento do lock. O erro 409 precisa estar muito bem instrumentado para este caso específico (ex: "Não foi possível fechar, João acabou de adicionar um item").
3.2. Versionamento Granular vs Global
 * Onde: 08 §4.
 * O Cenário: Um usuário edita a Quantidade do item Pizza. A Item.versao sobe. Mas isso altera indiretamente o valor distribuído na conta. A Conta.versao também sobe?
 * Solução: Como o cliente sempre manda versaoBase do contexto, defina claramente no contrato de API que mutações em filhos (Itens, Cobranças) não precisam estourar a Conta.versao, exceto se alterarem o status fundamental da conta. Caso contrário, um item alterado geraria 409 para quem está tentando adicionar um participante (pois a versão global da conta mudou).
3.3. Arredondamento Determinístico - Nota Máxima 🏆
 * Onde: 07 §6.
 * Avaliação: A escolha de usar hash(participanteId + contexto) para resolver empates no método do Maior Resto é brilhante. Evita viés alfabético, não sobrecarrega sempre o mesmo pagador, evita estados flutuantes no frontend e não exige locks extras. Excelente padrão de engenharia financeira.
📝 4. Recomendações para "Decisões em Aberto" (Sec 10)
 * D1 (TTL da Conta): A recomendação de manter sem TTL no MVP é perigosa pela LGPD (fotos de comandas podem conter dados como placa de veículo, nome do garçom, CPF de quem fez a reserva).
   * Veredito sugerido: Implemente um cronjob diário: Contas em estado FINALIZADA há mais de 48h têm sua imagemComanda apagada do S3/Blob, mantendo apenas os dados textuais. Isso resolve o custo de storage e 90% da LGPD com esforço quase nulo.
 * T1 (Provedor de OCR): OpenAI Vision (GPT-4o) ou Google Cloud Document AI costumam performar maravilhosamente para comandas amassadas. Dado que há fallback manual, priorize velocidade e custo.
 * T2 (WebSocket vs SSE): Para este app, onde reads e broadcasts são abundantes, mas writes (mutations) são requisições transacionais (REST com retry), SSE (Server-Sent Events) é muito mais resiliente. Websockets caem na troca 4G/Wi-fi, geram overhead de handshake. Use endpoints REST padrão para envio de ações, e um canal SSE apenas para ouvir o JSON de diff/estado atualizado. É mais barato e confiável no mobile.
Resumo do Status do Review
Aprovado com ressalvas. O documento está maduro o suficiente para ser fatiado em épicos e tasks para engenharia, desde que os pontos 1.1 (Re-entrada por celular de terceiros), 1.2 (Erro de cálculo do restaurante) e 1.3 (Divisão personalizada parcial) sejam corrigidos nas regras de negócio antes do início do desenvolvimento.
