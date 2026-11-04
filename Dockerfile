# ==============================================================================
# Stage 1: Build React 19 Frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production PHP 8.3 Runtime (Frontend + Backend Unified)
# ==============================================================================
FROM php:8.3-cli-alpine

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

# Copy backend PHP application
COPY backend/ ./

# Copy built frontend production bundle directly into document root
COPY --from=frontend-builder /app/frontend/dist/ ./

# Set permissions
RUN chmod -R 755 /var/www/html

# Render sets PORT dynamically (default 10000)
ENV PORT=10000
EXPOSE 10000

# Start unified server with router
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} router.php"]
