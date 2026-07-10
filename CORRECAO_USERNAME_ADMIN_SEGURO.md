# Correção — Usernames nas tabelas e admin mais seguro

## Objetivo

Esta correção melhora duas áreas:

1. Tornar a base de dados mais legível, preenchendo `username` nas tabelas que guardam interações por `user_id`.
2. Substituir o admin fraco `admin/admin123` por uma password mais forte e configurável por variável de ambiente.

## Alterações principais

### Base de dados

As tabelas de interações passam a guardar também o `username`, mantendo o `user_id` como chave técnica correta.

Tabelas abrangidas:

- `ratings`
- `comments`
- `pending_comments`
- `favorites`
- `watchlist`
- `movie_requests`
- `user_favorite_genre`
- `user_stats`
- `user_badges`
- `quiz_results`
- `comment_votes`
- `admin_logs`

Notas importantes:

- O `user_id` continua a existir e deve continuar a ser usado como referência técnica.
- O `username` é uma coluna de leitura/gestão para ser mais fácil perceber quem fez cada ação no Railway/MySQL.
- Dados antigos são sincronizados automaticamente no próximo pedido à API, porque `load_store()`/`save_store()` preenchem os usernames.

### Admin

O utilizador admin continua a ser:

```text
username: admin
```

A password deixou de ser `admin123`.

Por omissão, se não definires variável no Railway, passa a ser:

```text
MovingsAdmin#2026!
```

Para produção/demo, recomenda-se definir no serviço backend `Movings`:

```env
MOVINGS_DEMO_ADMIN_PASSWORD=uma-password-forte-tua
MOVINGS_ENABLE_DEMO_ADMIN=false
```

O botão direto de admin foi removido do frontend. Agora o admin entra pelo formulário normal de login.

## Variáveis recomendadas no Railway

No serviço backend `Movings`:

```env
MOVINGS_DEMO_ADMIN_PASSWORD=MovingsAdmin#2026!
MOVINGS_ENABLE_DEMO_ADMIN=false
```

Depois de alterar variáveis, fazer redeploy do backend.

## Como validar

1. Fazer login com:
   - username: `admin`
   - password: valor de `MOVINGS_DEMO_ADMIN_PASSWORD`

2. Criar uma conta normal.

3. Fazer uma avaliação, favorito, watchlist ou comentário.

4. Abrir a base de dados MySQL no Railway e verificar se as tabelas mostram `user_id` e `username`.

