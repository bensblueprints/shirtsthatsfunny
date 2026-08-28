#!/usr/bin/env bash
# Builds the store on first boot. Safe to re-run — every step checks first.
set -euo pipefail

cd /var/www/html
WP="wp --path=/var/www/html --no-color"

# The container user has no home directory, so point wp-cli at a writable cache.
export WP_CLI_CACHE_DIR=/tmp/wp-cli-cache
mkdir -p "$WP_CLI_CACHE_DIR"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

# wp-cli exits non-zero when an option's value already matches what you're
# setting, which set -e would turn into a fatal error on every re-run. These
# are all non-critical config writes, so treat "unchanged" as success.
opt() { $WP option update "$@" >/dev/null 2>&1 || true; }

say "Waiting for WordPress files"
for _ in $(seq 1 60); do
  [ -f wp-settings.php ] && break
  sleep 2
done

if $WP core is-installed 2>/dev/null; then
  say "WordPress already installed — checking the store is still complete"
else
  say "Installing WordPress"
  $WP core install \
    --url="${PUBLIC_CMS_URL}" \
    --title="${SITE_TITLE}" \
    --admin_user="${WP_ADMIN_USER}" \
    --admin_password="${WP_ADMIN_PASSWORD}" \
    --admin_email="${WP_ADMIN_EMAIL}" \
    --skip-email
fi

say "Core settings"
opt blogdescription "Two colours. Six sizes. One joke."
opt permalink_structure '/%postname%/'
opt timezone_string 'America/New_York'
opt default_comment_status 'closed'
$WP rewrite flush --hard

# The bundled themes are dead weight on a headless install, but WordPress
# needs exactly one active theme to boot.
$WP theme activate twentytwentyfour 2>/dev/null || true
for t in twentytwentythree twentytwentytwo twentytwentyone; do
  $WP theme is-installed "$t" 2>/dev/null && $WP theme delete "$t" || true
done

say "WooCommerce"
if ! $WP plugin is-installed woocommerce 2>/dev/null; then
  $WP plugin install woocommerce --activate
else
  $WP plugin activate woocommerce || true
fi

# Skip the setup wizard — we configure everything ourselves below.
opt woocommerce_onboarding_profile '{"skipped":true}' --format=json
opt woocommerce_task_list_hidden yes
opt woocommerce_allow_tracking no

say "Printful (print-on-demand fulfilment)"
# Pushes orders to Printful, syncs their catalogue and handles live shipping
# rates. Needs connecting to a Printful account once from wp-admin:
#   WooCommerce -> Printful -> Connect
if ! $WP plugin is-installed printful-shipping-for-woocommerce 2>/dev/null; then
  $WP plugin install printful-shipping-for-woocommerce --activate
else
  $WP plugin activate printful-shipping-for-woocommerce || true
fi

say "Store configuration"
opt woocommerce_store_address    '1 Print Shop Way'
opt woocommerce_store_city       'Wilmington'
opt woocommerce_default_country  'US:DE'
opt woocommerce_store_postcode   '19801'
opt woocommerce_currency         'USD'
opt woocommerce_price_thousand_sep ','
opt woocommerce_price_decimal_sep  '.'
opt woocommerce_weight_unit      'lbs'
opt woocommerce_dimension_unit   'in'
opt woocommerce_enable_guest_checkout 'yes'
opt woocommerce_enable_coupons       'yes'
opt woocommerce_calc_taxes           'yes'
opt woocommerce_enable_reviews       'yes'
opt woocommerce_manage_stock         'yes'
opt woocommerce_notify_low_stock_amount '5'
opt woocommerce_cart_redirect_after_add 'no'

say "Seeding attributes, products, shipping, coupons and API keys"
$WP eval-file /scripts/seed-store.php

say "Done"
$WP option get woocommerce_currency >/dev/null
printf '\n  Storefront : %s\n  WP admin   : %s/wp-admin  (%s)\n  Products   : %s\n\n' \
  "${PUBLIC_WEB_URL}" "${PUBLIC_CMS_URL}" "${WP_ADMIN_USER}" \
  "$($WP post list --post_type=product --format=count)"
