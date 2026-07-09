# Movings — publicação segura

Este pacote continua preparado para WAMP/PAP, mas já está mais limpo para uma demo controlada.

## Antes de publicar online

1. Usa sempre HTTPS.
2. Define `MOVINGS_ALLOWED_ORIGINS` com o domínio real do frontend.
3. Define `MOVINGS_JWT_SECRET` com uma string forte e privada.
4. Mantém fora de GitHub público:
   - `db_config.php`
   - `smtp_config.local.php`
   - `.env`
   - logs
   - backups SQL
5. Faz backup da base de dados antes de qualquer deploy.
6. Bloqueia endpoints de manutenção/debug; esta versão já removeu os endpoints de teste/reset que não eram necessários para runtime.

## Fluxo de comentários

- Comentário novo: fica pendente.
- Comentário aprovado editado pelo utilizador: cria uma revisão pendente.
- Admin aprova a revisão: o comentário original é atualizado sem perder likes/replies.
- Admin rejeita a revisão: o comentário antigo continua publicado.
