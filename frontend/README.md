# Movings

Movings é um site de avaliações de filmes feito em React + TypeScript, com backend PHP e base de dados MySQL/MariaDB para WAMP.

## Funcionalidades principais

- Ver filmes e séries
- Ver detalhes de cada título
- Criar conta e fazer login
- Avaliar filmes
- Comentar
- Marcar favoritos
- Ver estatísticas no perfil
- Fazer quiz de perfil de utilizador

## Instalação

```bash
npm install
npm run dev
```

## Base de dados

No phpMyAdmin, importa:

```text
database/movings.sql
```

Depois copia `backend/php` para:

```text
C:\wamp64\www\movings-api
```

O frontend usa por defeito:

```text
http://127.0.0.1/movings-api
```

Podes mudar isso no ficheiro `.env`.

## Build

```bash
npm run build
```

## Estrutura

```text
src/              frontend
backend/php/      API em PHP
database/         script SQL para phpMyAdmin
public/           ficheiros públicos
```
