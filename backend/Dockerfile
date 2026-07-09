# backend/Dockerfile
# Movings API — Railway/PHP CLI
# Backend PHP simplificado para demo Railway.
# Remove Apache para evitar erros de MPM e arranca diretamente
# o servidor PHP embutido na porta fornecida pelo Railway.

FROM php:8.3-cli

# Extensões necessárias para ligação ao MySQL Railway.
RUN docker-php-ext-install pdo pdo_mysql mysqli

WORKDIR /app

# Copia todos os endpoints PHP para dentro do container.
COPY . /app

# Porta padrão para Railway quando PORT não estiver definida.
EXPOSE 8080

# Railway injeta a variável PORT.
# A app tem de escutar em 0.0.0.0:$PORT.
# O router preserva os endpoints PHP e bloqueia ficheiros internos que o Apache/.htaccess protegia localmente.
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t /app /app/router.php"]
