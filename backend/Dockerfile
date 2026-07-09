# backend/Dockerfile
# Movings API — Railway/PHP/Apache
# Container dedicado ao backend PHP. Instala extensões MySQL,
# configura Apache para Railway e garante apenas um MPM ativo.

FROM php:8.3-apache

# Instala as extensões necessárias para o backend comunicar com MySQL.
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Apache só pode ter um MPM ativo.
# Para PHP com mod_php, usamos mpm_prefork e desligamos event/worker.
RUN a2dismod -f mpm_event mpm_worker || true \
    && a2enmod mpm_prefork rewrite headers

WORKDIR /var/www/html

# Copia o backend PHP para a pasta pública do Apache.
COPY . /var/www/html

# Entry point adapta a porta do Apache à porta fornecida pelo Railway.
COPY docker/entrypoint.sh /usr/local/bin/movings-entrypoint

RUN chmod +x /usr/local/bin/movings-entrypoint \
    && chown -R www-data:www-data /var/www/html

EXPOSE 8080

ENTRYPOINT ["movings-entrypoint"]
CMD ["apache2-foreground"]
