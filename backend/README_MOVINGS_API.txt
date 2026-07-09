MOVINGS - VERSÃO FINAL CORRIGIDA

Este zip tem duas pastas:

1) Movings
   É o site React/Vite.

2) movings-api
   É a API PHP para meter no WAMP.
   Esta versão NÃO usa MySQL/phpMyAdmin. Guarda contas, comentários, ratings e favoritos num ficheiro local:
   C:\wamp64\www\movings-api\data\movings_store.json

====================
COMO INSTALAR A API
====================

1. Fecha o WAMP.
2. Vai a:
   C:\wamp64\www

3. Apaga completamente a pasta antiga:
   C:\wamp64\www\movings-api

4. Copia a pasta nova deste zip chamada:
   movings-api

5. Cola em:
   C:\wamp64\www

Tem de ficar assim:
   C:\wamp64\www\movings-api\auth.php
   C:\wamp64\www\movings-api\comments.php
   C:\wamp64\www\movings-api\admin.php
   C:\wamp64\www\movings-api\data\movings_store.json

Não pode ficar assim:
   C:\wamp64\www\movings-api\movings-api\auth.php
   C:\wamp64\www\movings-api\php\auth.php

6. Liga o WAMP.

7. Abre no browser:
   http://127.0.0.1/movings-api/health.php

Tem de aparecer status ok.

8. Abre uma vez:
   http://127.0.0.1/movings-api/reset_movings_mysql.sql

Isto garante o admin sem apagar contas nem comentários.

====================
COMO ABRIR O SITE
====================

1. Entra na pasta:
   Movings

2. Abre o terminal dentro dessa pasta.

3. Corre:
   npm install
   npm run dev

4. Abre o link que aparecer, normalmente:
   http://localhost:8080

====================
LOGIN ADMIN
====================

Username:
   admin

Email:
   admin@movings.local

Password:
   admin123

Podes entrar com username ou email.

====================
O QUE FOI CORRIGIDO
====================

- Login por username e email.
- Signup funcional.
- Comentários vão para aprovação do admin.
- Comentários aprovados aparecem no filme/série certo.
- Admin panel com pendentes e aprovados.
- Botão para aprovar, rejeitar e apagar comentários aprovados.
- Badge visual de role admin/user.
- Badges do perfil funcionam com primeira avaliação e primeiro comentário aprovado.
- Botão de apagar conta remove também comentários, ratings, favoritos e votos associados.
- API sem dependência do MySQL para evitar DB Offline no WAMP.
- Catálogo local em código com 40 filmes e 40 séries, total de 80 títulos.
- Login corrigido para admin e para qualquer utilizador registado.
- Tabelas user_favorite_genre e user_stats funcionais no ficheiro local.
- Ratings, comentários, favoritos e géneros guardam media_title para mostrar o nome do filme/série sem procurar IDs manualmente.

====================
DEBUG
====================

Para ver contas e comentários guardados:
   http://127.0.0.1/movings-api/health.php

Se o site estiver estranho depois de trocares ficheiros, abre a consola do browser e corre:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
