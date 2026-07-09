MOVINGS - REMETENTE BREVO / EVITAR @BREVOSEND.COM

OBJETIVO
Fazer o Gmail mostrar um remetente profissional, por exemplo:

  Movings <noreply@movings.pt>

e, opcionalmente, receber respostas em:

  movings@gmail.com

IMPORTANTE
Se usares um email gratuito como movings@gmail.com no campo From/SMTP_FROM,
a Brevo pode substituir o remetente por um endereço @brevosend.com para cumprir
requisitos de autenticação e entregabilidade.

A solução correta para produção é:
1. Ter um domínio próprio, por exemplo movings.pt.
2. Autenticar esse domínio na Brevo com DKIM/DMARC.
3. Criar/verificar um sender na Brevo, por exemplo noreply@movings.pt.
4. Usar esse sender em SMTP_FROM.
5. Usar movings@gmail.com apenas como SMTP_REPLY_TO, se quiseres receber respostas lá.


FICHEIROS ALTERADOS

1) movings-api/smtp_config.php
   - Agora é seguro e não guarda credenciais reais.
   - Carrega automaticamente movings-api/smtp_config.local.php se existir.
   - Define a configuração Brevo por defeito.

2) movings-api/smtp_config.local.example.php
   - Novo ficheiro exemplo.
   - Deves copiar para smtp_config.local.php e preencher com os dados reais.

3) movings-api/mailer.php
   - Adicionado suporte a Reply-To.
   - O From continua a ser o email autenticado/verificado.
   - O Reply-To pode ser movings@gmail.com.

4) movings-api/README_BREVO_SMTP.txt
   - Agora mostra no JSON o smtp_from, smtp_from_name e smtp_reply_to.

5) movings-api/README_BREVO_SMTP.txt
   - Agora mostra no diagnóstico o smtp_from, smtp_from_name e smtp_reply_to.

6) movings-api/.gitignore
   - Protege smtp_config.local.php, logs e a mailbox local.


COMO CONFIGURAR NA PASTA

1. Abre:

   movings-api/smtp_config.local.example.php

2. Faz uma cópia com este nome:

   movings-api/smtp_config.local.php

3. Edita o novo ficheiro local:

   define('SMTP_USER', 'COLOCA_AQUI_O_SMTP_LOGIN_DA_BREVO');
   define('SMTP_PASS', 'COLOCA_AQUI_A_SMTP_KEY_DA_BREVO');
   define('SMTP_FROM', 'noreply@movings.pt');
   define('SMTP_FROM_NAME', 'Movings');
   define('SMTP_REPLY_TO', 'movings@gmail.com');

4. Substitui:
   - SMTP_USER pelo SMTP login da Brevo.
   - SMTP_PASS pela SMTP key da Brevo.
   - SMTP_FROM pelo sender verificado na Brevo.
   - SMTP_REPLY_TO pelo email onde queres receber respostas.


CONFIGURAÇÃO RECOMENDADA

Produção:

   define('SMTP_FROM', 'noreply@movings.pt');
   define('SMTP_FROM_NAME', 'Movings');
   define('SMTP_REPLY_TO', 'movings@gmail.com');

Resultado esperado no Gmail:

   Movings <noreply@movings.pt>

Quando alguém clicar em responder, responde para:

   movings@gmail.com


CONFIGURAÇÃO APENAS PARA TESTE

Podes tentar usar:

   define('SMTP_FROM', 'movings@gmail.com');

Mas esse email tem de ser criado/verificado como sender na Brevo.
Mesmo assim, por ser um email gratuito, a Brevo pode substituir por @brevosend.com.
Por isso, não recomendo isto para produção.


O QUE FAZER NA BREVO

1. Entra na Brevo.
2. Vai a Settings.
3. Vai a Senders, Domains, IPs.
4. Abre Domains.
5. Adiciona o teu domínio, por exemplo movings.pt.
6. Autentica o domínio com os registos DNS que a Brevo pedir:
   - Brevo code
   - DKIM
   - DMARC
7. Espera a Brevo marcar o domínio como autenticado.
8. Vai a Senders.
9. Clica em Add a sender.
10. Cria:
    - From name: Movings
    - From email: noreply@movings.pt
11. Confirma/verifica o sender.
12. Vai a SMTP & API > SMTP.
13. Cria uma SMTP key nova.
14. Copia:
    - SMTP login
    - SMTP key
15. Cola esses dados no teu smtp_config.local.php.


TESTAR

1. Reinicia o WAMP.
2. Abre:

   http://127.0.0.1/movings-api/README_BREVO_SMTP.txt

3. Confirma que aparece:
   - smtp_from = noreply@movings.pt
   - smtp_from_name = Movings
   - smtp_reply_to = movings@gmail.com

4. Testa envio:

   http://127.0.0.1/movings-api/README_BREVO_SMTP.txt?to=o-teu-email@gmail.com

5. Depois testa a recuperação de password no site.


SEGURANÇA

A SMTP key que estava anteriormente na pasta deve ser revogada/rodada na Brevo.
Nunca publiques smtp_config.local.php.
