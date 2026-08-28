/**
 * Shown when the catalogue call fails. On a fresh `docker compose up` this is
 * what you see for the ninety seconds the bootstrap container is still
 * installing WooCommerce, so it tells you that rather than saying "error".
 */
export default function StoreOffline() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
      <p className="spec opacity-55">Catalogue unavailable</p>

      <h1 className="display misregister mt-4 text-[clamp(2rem,7vw,4rem)]" data-text="Still printing">
        Still printing
      </h1>

      <p className="mt-5 text-sm leading-relaxed opacity-70">
        The storefront can&rsquo;t reach WooCommerce. On a first run the store is
        usually still being built — give it a minute and reload.
      </p>

      <div className="spec mt-8 w-full border p-5 text-left opacity-70">
        <p className="mb-3 opacity-55">If it persists, check:</p>
        <ul className="space-y-2">
          <li>docker compose logs -f bootstrap</li>
          <li>docker compose ps</li>
          <li>WC_CONSUMER_KEY / WC_CONSUMER_SECRET in .env</li>
        </ul>
      </div>
    </div>
  );
}
