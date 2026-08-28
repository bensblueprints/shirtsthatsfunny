# Shirt That's Funny

Headless t-shirt store. Next.js 15 storefront, WooCommerce back end, everything
in Docker. Two colourways (black, white), six sizes (S–3XL), twelve designs.

**Live:** https://shirtthatsfunny.com · **Admin:** https://cms.shirtthatsfunny.com/wp-admin

---

## Run it locally

```bash
cp .env.example .env      # then edit the passwords and keys
docker compose up -d
docker compose logs -f bootstrap    # watch the store get built
```

| | |
|---|---|
| Storefront | http://localhost:3000 |
| WooCommerce admin | http://localhost:8080/wp-admin |
| Mailpit (catches all outgoing mail) | http://localhost:8025 |

First boot takes 2–4 minutes: it installs WordPress, WooCommerce and Printful,
creates the colour/size attributes, and seeds 12 products × 12 variations. The
storefront shows a "still printing" page until that finishes.

`bootstrap` is a one-shot container that exits when it's done. It's idempotent —
re-run it any time with `docker compose up -d --force-recreate bootstrap`.

## What's in the box

```
docker-compose.yml            dev stack (default)
docker-compose.prod.yml       standalone prod: own nginx + certbot on :80/:443
docker-compose.hetzner.yml    prod on a host that already runs nginx (see DEPLOY.md)
wordpress/                    WP image, php.ini, and the headless mu-plugin
scripts/bootstrap.sh          installs and configures the store
scripts/seed-store.php        attributes, catalogue, shipping, coupons, API key
nginx/                        vhost templates
web/                          Next.js storefront
```

### Services

| Service | What it is |
|---|---|
| `db` | MariaDB 11.4 |
| `cms` | WordPress 6.9 + WooCommerce 11 + Printful, Apache |
| `bootstrap` | one-shot store builder (wp-cli), exits when done |
| `web` | Next.js storefront |
| `mail` | Mailpit — catches order emails in dev |

## How the two halves talk

Two separate paths, on purpose:

**Catalogue** — `web/src/lib/woo.ts`, server-side only, WooCommerce REST v3 with
a read-only consumer key. The key never reaches the browser. There's also a
custom `stf/v1/product/{slug}` endpoint (in the mu-plugin) that returns the
colour/size axes plus every variation in one request, so a product page is one
round trip instead of a fan-out.

**Cart and checkout** — the WooCommerce Store API, proxied through
`/api/store/*`. The proxy holds Woo's `Cart-Token` in an httpOnly cookie and
replays it. That means no third-party cookies, no CORS preflight on every cart
mutation, and the CMS hostname stays private.

> WooCommerce only accepts basic auth on an SSL request. The container-to-container
> hop is plain HTTP, so `woo.ts` sends `X-Forwarded-Proto: https` and
> `wp-config.php` turns that into `$_SERVER['HTTPS']`. Without it every catalogue
> call 401s.

## The design

The product line is two colours, so the site is two colours. The only chromatic
ink anywhere is process cyan and magenta, and it only ever appears as a
**misregistration** — the ghosting you get when a screen is a hair out of
alignment — which resolves into register and vanishes. On a product page,
picking Black or White **inverts the entire page**: the swatch is the preview,
not a control next to one.

Product art is drawn, not photographed. `TeeMockup.tsx` renders an SVG tee and
typesets the slogan onto it, so the catalogue needs zero image assets, stays
sharp at any size, and inverts with the swatch for free. Adding a design is one
line in `scripts/seed-store.php`.

Type: Bricolage Grotesque (display) / Instrument Sans (body) / Martian Mono
(spec and care-label text).

## Store behaviour worth knowing

- **Pricing** — $28–$32 base. 2XL is +$2 and 3XL is +$4, because the blanks
  genuinely cost more. Shown on the product page before you pick a size.
- **Stock** — managed per variation. `I Paused My Game For This` in White/3XL is
  seeded sold out on purpose, so the out-of-stock UI is exercised on real data.
- **Shipping** — $5.95 US standard, free over $60, $16 international.
- **Exit intent** — desktop fires on cursor-leaves-viewport-top; mobile has no
  mouseleave, so it uses a hard flick back to the top. Armed after 8 seconds,
  once per 30 days, and suppressed entirely on `/cart`, `/checkout` and `/order`.
- **Payments** — cash on delivery only out of the box. Real card processing
  needs live keys; install the Stripe or PayPal plugin and it appears at
  checkout automatically.

## Adding a design

Edit `$catalogue` in `scripts/seed-store.php`, then:

```bash
docker compose up -d --force-recreate bootstrap
```

It updates existing products in place and rebuilds their variation sets.

## Environment

Everything is driven from `.env`. The ones that matter:

| Variable | Notes |
|---|---|
| `PUBLIC_WEB_URL` / `PUBLIC_CMS_URL` | must match how browsers actually reach each half |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | written straight into Woo's key table by the seeder, so `.env` is the single source of truth |
| `SESSION_SECRET` | signs the cart-token cookie |
| `PRINTFUL_API_TOKEN` | for connecting Printful in wp-admin |
| `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID` | optional; without them newsletter signups are accepted but not stored, and say so in the log |

`.env` is gitignored. `.env.example` is the template.

## Deploying

See [DEPLOY.md](DEPLOY.md).
