# ── WordPress + WooCommerce ─────────────────────────────────────────────────
FROM wordpress:6.9-php8.3-apache AS cms

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl less default-mysql-client \
 && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/conf.d/zz-shirtthatsfunny.ini

# Woo writes logs and product images; make sure the dirs exist and are ours.
RUN mkdir -p /var/www/html/wp-content/uploads \
 && chown -R www-data:www-data /var/www/html/wp-content

RUN a2enmod rewrite headers remoteip

HEALTHCHECK --interval=10s --timeout=5s --retries=12 --start-period=20s \
  CMD curl -fsS -o /dev/null http://localhost/wp-includes/js/wp-embed.min.js || exit 1

# ── WP-CLI, used once at startup to build the store ─────────────────────────
FROM wordpress:cli-php8.3 AS wpcli

USER root
RUN apk add --no-cache bash mariadb-client
USER www-data
