Movings - Recuperação de palavra-passe

Fluxo atual preservado:
- O utilizador pede recuperação em /auth.
- A API cria um token seguro na tabela password_resets.
- O email real é enviado pelo mailer SMTP configurado localmente.
- O link abre /reset-password?token=...
- A nova password é gravada com password_hash().

1) Copia as pastas para o WAMP:
   C:\wamp64\www\Movings
   C:\wamp64\www\movings-api

2) Confirma a base de dados:
   - No phpMyAdmin, a base de dados deve chamar-se movings.
   - A tabela password_resets deve existir.
   - Se faltar, executa o ficheiro SQL de upgrade de password reset incluído na pasta da API.

3) Testa a API:
   http://localhost/movings-api/health.php
   http://localhost/movings-api/health.php
   http://localhost/movings-api/README_BREVO_SMTP.txt

4) Teste funcional obrigatório antes da PAP:
   - Vai a /auth.
   - Clica em "Esqueceste-te da palavra-passe?"
   - Escreve o email de uma conta existente.
   - Confirma se o email chega à caixa de entrada/spam.
   - Abre o link recebido.
   - Define uma nova password.
   - Faz login com a nova password.

Notas importantes:
- Não publiques smtp_config.local.php no GitHub.
- Se o envio falhar por "Unauthorized IP", verifica as definições de segurança/IP autorizado na Brevo.
- Em produção, define domínio público no frontend_url e configura MOVINGS_ALLOWED_ORIGINS no backend.
