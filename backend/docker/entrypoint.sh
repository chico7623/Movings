#!/usr/bin/env sh
set -e

# Railway injeta a variável PORT. Apache precisa escutar nessa porta.
: "${PORT:=8080}"

sed -ri "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

exec "$@"
