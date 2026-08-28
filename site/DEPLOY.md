# Deploying

Two shapes, depending on whether the box already runs a web server.

---

## A. The box is empty — use `docker-compose.prod.yml`

Brings its own nginx and certbot and takes ports 80/443.

```bash
scp -r shirtthatsfunny/ root@<ip>:/opt/
ssh root@<ip>
cd /opt/shirtthatsfunny

cp .env.example .env
# set SITE_DOMAIN, point PUBLIC_WEB_URL/PUBLIC_CMS_URL at https://<domain>,
# and generate real secrets:
#   openssl rand -hex 24                     (db passwords)
#   openssl rand -hex 32                     (SESSION_SECRET)
#   echo ck_$(openssl rand -hex 20)          (WC_CONSUMER_KEY)
#   echo cs_$(openssl rand -hex 20)          (WC_CONSUMER_SECRET)
chmod 600 .env

# DNS must already point at this box, then:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d <domain> -d www.<domain> -d cms.<domain> --agree-tos -m you@example.com
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart proxy
```

---

## B. The box already runs nginx — use `docker-compose.hetzner.yml`

**This is what shirtthatsfunny.com actually runs on.** The Hetzner host
(`144.76.78.158`, Proxmox/Debian 12) already had a host-level nginx on 80/443
fronting six other projects, with every app bound to a loopback high port. This
override follows that house style instead of fighting for port 80 — it ships
**no** nginx and **no** certbot of its own.

| | |
|---|---|
| Storefront | `127.0.0.1:34000` |
| WordPress | `127.0.0.1:34080` |
| Mailpit | `127.0.0.1:34025` |
| Project dir | `/opt/shirtthatsfunny` |

### Deploy

```bash
cd /c/Users/DELL/shirtthatsfunny
tar --exclude=web/node_modules --exclude=web/.next -czf /tmp/stf.tgz \
  docker-compose*.yml .env.example nginx wordpress scripts web
scp /tmp/stf.tgz hetzner:/opt/shirtthatsfunny/
ssh hetzner 'cd /opt/shirtthatsfunny && tar xzf stf.tgz && rm stf.tgz'
```

Then on the box:

```bash
cd /opt/shirtthatsfunny
C="docker compose -f docker-compose.yml -f docker-compose.hetzner.yml"
$C up -d --build
$C logs -f bootstrap        # wait for "Store seeded."
```

### nginx + TLS on the host

```bash
cp /opt/shirtthatsfunny/nginx/shirtthatsfunny.host.conf \
   /etc/nginx/sites-available/shirtthatsfunny
ln -sfn /etc/nginx/sites-available/shirtthatsfunny \
        /etc/nginx/sites-enabled/shirtthatsfunny

nginx -t          # ALWAYS. Six other sites share this nginx.
systemctl reload nginx

certbot --nginx --redirect -m ben@advancedmarketing.co --agree-tos \
  -d shirtthatsfunny.com -d www.shirtthatsfunny.com -d cms.shirtthatsfunny.com
```

Certbot rewrites the vhost in place to add the TLS blocks and renews itself on a
systemd timer.

### Redeploying a code change

```bash
scp web/src/... hetzner:/opt/shirtthatsfunny/web/src/...
ssh hetzner 'cd /opt/shirtthatsfunny && \
  docker compose -f docker-compose.yml -f docker-compose.hetzner.yml up -d --build web'
```

---

## Things that will bite you

**`cms` needs `target: cms`.** The WordPress Dockerfile has two stages and
wp-cli is last, so without an explicit target Docker builds the wp-cli image and
Apache never starts. The symptom is a crash loop logging *"This does not seem to
be a WordPress installation."*

**WooCommerce requires WordPress 6.9+.** On an older base image `wp plugin
install woocommerce` fails with *"could not be found"*.

**The homepage must not be prerendered at build time.** `docker build` has no
route to the `cms` container, so a build-time prerender bakes the "catalogue
unavailable" page into the image. `app/page.tsx` calls `connection()` to force
request-time rendering; the catalogue fetch is still cached for 120s.

**Catalogue calls 401 without `X-Forwarded-Proto: https`.** Woo only accepts
basic auth over SSL. See the note in README.

**wp-cli exits non-zero when an option value is unchanged.** With `set -e` that
kills the bootstrap on every re-run, which is why config writes go through the
`opt()` helper.

---

## After go-live

- [ ] **Connect Printful** — `WooCommerce → Printful → Connect`, token is in
      `/opt/shirtthatsfunny/.env` as `PRINTFUL_API_TOKEN`. Until this is done no
      order actually gets fulfilled.
- [ ] **Add a real payment gateway** — only cash on delivery is enabled. Install
      Stripe or PayPal in wp-admin; the storefront picks it up automatically.
- [ ] **Point email at a real relay** — `wordpress/php.ini` and the mu-plugin
      currently send to Mailpit. Order confirmations will not reach customers
      until this changes.
- [ ] **Set `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID`** if newsletter signups should
      be stored rather than just accepted.
- [ ] **Back up the volumes** — `shirtthatsfunny_db_data` holds every order.

```bash
# database backup
ssh hetzner 'docker exec shirtthatsfunny-db-1 \
  mariadb-dump -u root -p"$MYSQL_ROOT_PASSWORD" shirtthatsfunny' > backup.sql
```

## Operating it

```bash
C="docker compose -f docker-compose.yml -f docker-compose.hetzner.yml"
$C ps                                    # health
$C logs -f web                           # storefront
$C logs bootstrap                        # what the seeder did
$C up -d --force-recreate bootstrap      # re-seed (idempotent)
$C restart web cms
```
