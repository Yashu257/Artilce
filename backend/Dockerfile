FROM php:8.3-cli-alpine

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

# Copy backend application
COPY . .

# Set file permissions
RUN chmod -R 755 /var/www/html

# Render dynamically sets PORT environment variable (default 10000)
ENV PORT=10000
EXPOSE 10000

# Launch PHP server bound to all interfaces with router
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} router.php"]
