# Movings — WAMP + MySQL

Esta versão usa MySQL real no WAMP através da pasta `movings-api`.

## Instalação rápida

1. Copia as pastas para:

```txt
C:\wamp64\www\Movings
C:\wamp64\www\movings-api
```

2. Importa o SQL:

```bat
cd C:\wamp64\bin\mysql\mysql8.0.31\bin
mysql -u root < C:\wamp64\www\movings-api\install_movings_mysql.sql
```

Se a tua pasta MySQL tiver outra versão, troca `mysql8.0.31` pela tua pasta real.

3. Testa:

```txt
http://localhost/movings-api/health.php
```

Tem de aparecer `mode: mysql_wamp`.

4. Login admin:

```txt
admin
admin123
```

## Migração dos dados antigos em JSON

```txt
http://localhost/movings-api/install_movings_mysql.sql
```

Para forçar substituição da BD pelos dados do JSON:

```txt
http://localhost/movings-api/install_movings_mysql.sql?force=1
```
