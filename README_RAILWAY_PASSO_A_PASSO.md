# Movings — pasta segura para Demo Online no Railway

Esta pasta foi preparada para publicação controlada. Não inclui:
- `.env` local do frontend;
- `db_config.php` local do WAMP;
- `smtp_config.local.php` com credenciais reais;
- `node_modules`;
- `dist`;
- dados JSON antigos em `movings-api/data`.

## Estrutura

```text
frontend/   React + Vite servido por Caddy
backend/    PHP + Apache + API Movings
database/   SQL para importar na base MySQL
```

## Serviços esperados no Railway

Cria 3 serviços dentro do mesmo projeto Railway:

1. `movings-mysql`
2. `movings-backend`
3. `movings-frontend`

## Variáveis do backend

No serviço `movings-backend`, configura:

```env
MOVINGS_ALLOWED_ORIGINS=https://TEU-FRONTEND.up.railway.app
MOVINGS_JWT_SECRET=troca_por_uma_string_privada_com_mais_de_32_caracteres

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=teu_smtp_login_brevo
SMTP_PASS=tua_smtp_key_brevo
SMTP_FROM=noreply@teu-dominio.pt
SMTP_FROM_NAME=Movings
SMTP_REPLY_TO=teu_email_de_suporte@gmail.com
SMTP_REPLY_TO_NAME=Movings
```

A base MySQL do Railway fornece automaticamente `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD` e `MYSQLDATABASE`.

## Variáveis do frontend

No serviço `movings-frontend`, configura:

```env
VITE_PHP_API_URL=https://TEU-BACKEND.up.railway.app
VITE_NODE_API_URL=
```

## Base de dados

Importa no MySQL o ficheiro:

```text
database/install_movings_mysql.sql
```

Depois, se necessário, executa:

```text
database/upgrade_wamp_final.sql
database/upgrade_password_reset.sql
```

## Teste obrigatório

Depois do deploy:

- abrir frontend;
- registar conta;
- login com username;
- login com email;
- criar comentário;
- aprovar no admin;
- editar comentário;
- confirmar que volta para aprovação;
- testar likes/dislikes;
- testar watchlist;
- testar recuperação de password por email.
