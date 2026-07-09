# Correção de login/frontend Railway

Esta correção torna o frontend funcional em produção Railway:

- O frontend passa a usar `/api/php` em produção, evitando fallbacks locais WAMP.
- O Caddy do frontend faz reverse proxy de `/api/php/*` para o backend PHP.
- O login deixa de mostrar mensagens antigas de WAMP em produção.
- O backend pode criar/ativar o admin de demo em produção quando `MOVINGS_ENABLE_DEMO_ADMIN=true`.

## Variáveis Railway necessárias

### Serviço frontend (`gleaming-quietude`)
```env
PHP_API_URL=https://movings-production.up.railway.app
```

`VITE_PHP_API_URL` pode ficar vazio ou `/api/php`.

### Serviço backend (`Movings`)
```env
MOVINGS_ALLOWED_ORIGINS=*
MOVINGS_ENABLE_DEMO_ADMIN=true
```

Para demo pública real, troca `*` pelo domínio exato do frontend quando estiver final.
