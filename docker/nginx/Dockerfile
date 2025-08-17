# syntax=docker/dockerfile:1

# ==============================================================================
# Nginx Reverse Proxy for Next.js Application
# 
# Features:
# - High-performance reverse proxy for Next.js
# - SSL/TLS termination support
# - Static asset serving with caching
# - Security headers and rate limiting
# - Compression and optimization
# - Health checks and monitoring
# ==============================================================================

# Use the official Nginx image with Alpine for smaller size
ARG NGINX_VERSION=1.26-alpine3.20

FROM nginx:${NGINX_VERSION} AS production

# Install additional packages for security and functionality
RUN apk update && \
    apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create nginx user and set up directories
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/log/nginx \
    /var/run/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /var/run/nginx \
    && chown -R nginx:nginx /etc/nginx

# Switch to non-root user for security
USER nginx

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

# ==============================================================================
# Development Stage - For development with hot reload support
# ==============================================================================
FROM production AS development

# Switch back to root to install development tools
USER root

# Install development tools
RUN apk add --no-cache \
    inotify-tools \
    bash

# Copy development-specific configuration
COPY dev.nginx.conf /etc/nginx/nginx.conf

# Switch back to nginx user
USER nginx

# Override health check for development
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=2 \
    CMD curl -f http://localhost:80/api/health || exit 1

# ==============================================================================
# SSL Stage - Production with SSL support
# ==============================================================================
FROM production AS ssl

# Switch to root for SSL setup
USER root

# Install certbot for SSL certificate management
RUN apk add --no-cache \
    certbot \
    certbot-nginx \
    openssl

# Create SSL directories
RUN mkdir -p /etc/nginx/ssl \
    && chown -R nginx:nginx /etc/nginx/ssl

# Copy SSL-enabled nginx configuration
COPY ssl.nginx.conf /etc/nginx/nginx.conf

# Generate self-signed certificate for development/testing
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set proper permissions
RUN chown -R nginx:nginx /etc/nginx/ssl

# Switch back to nginx user
USER nginx

# Expose HTTPS port in addition to HTTP
EXPOSE 80 443