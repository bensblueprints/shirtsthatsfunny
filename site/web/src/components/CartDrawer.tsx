'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import { useCart, price, formatMoney, type CartItem } from '@/lib/cart';

const THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 65);

function attr(item: CartItem, name: string): string | undefined {
  return item.variation.find((v) => v.attribute.toLowerCase().includes(name))?.value;
}

function Stepper({ item }: { item: CartItem }) {
  const { updateItem, removeItem } = useCart();

  return (
    <div className="flex items-center border">
      <button
        type="button"
        onClick={() =>
          item.quantity === 1 ? removeItem(item.key) : updateItem(item.key, item.quantity - 1)
        }
        className="px-2.5 py-1 text-sm transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
        aria-label={item.quantity === 1 ? `Remove ${item.name}` : `One fewer ${item.name}`}
      >
        −
      </button>
      <span className="spec min-w-7 text-center tabular-nums">{item.quantity}</span>
      <button
        type="button"
        onClick={() => updateItem(item.key, item.quantity + 1)}
        className="px-2.5 py-1 text-sm transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
        aria-label={`One more ${item.name}`}
      >
        +
      </button>
    </div>
  );
}

/** Progress toward free shipping — the one number people act on. */
function ShippingMeter({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / THRESHOLD) * 100);

  return (
    <div className="border-t px-5 py-4">
      <p className="spec mb-2">
        {remaining > 0
          ? `${formatMoney(remaining)} away from free shipping`
          : 'Shipping is on us'}
      </p>
      <div className="h-1 w-full bg-[var(--surface-2)]">
        <motion.div
          className="h-full bg-[var(--on-surface)]"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 30 }}
        />
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, loading, error } = useCart();

  const items = cart?.items ?? [];
  const minor = cart?.totals.currency_minor_unit ?? 2;
  const subtotal = price(cart?.totals.total_items, minor);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
            aria-label="Close cart"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed top-0 right-0 z-[70] flex h-dvh w-full max-w-[26rem] flex-col border-l bg-[var(--surface)]"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="display text-2xl">Your cart</h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="spec p-1 transition-opacity hover:opacity-55"
                aria-label="Close cart"
              >
                Close
              </button>
            </div>

            {error && (
              <p role="alert" className="spec border-b px-5 py-3 text-[var(--color-magenta)]">
                {error}
              </p>
            )}

            {loading ? (
              <p className="spec p-5 opacity-55">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <p className="display text-3xl leading-none">Nothing in here yet</p>
                <p className="text-sm opacity-65">
                  Twelve shirts, two colours, six sizes. Go pick one.
                </p>
                <Link
                  href="/shop"
                  onClick={closeDrawer}
                  className="spec border px-5 py-3 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
                >
                  Shop the rack
                </Link>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto divide-y">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.key}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-4 p-5">
                        <div
                          className="size-16 shrink-0 border"
                          style={{
                            background:
                              attr(item, 'color')?.toLowerCase() === 'black'
                                ? '#141414'
                                : '#FAFAFA',
                          }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{item.name}</p>
                          <p className="spec mt-1 opacity-55">
                            {attr(item, 'color')} · {attr(item, 'size')}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <Stepper item={item} />
                            <span className="spec tabular-nums">
                              {formatMoney(price(item.totals.line_total, minor))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {items.length > 0 && (
              <>
                <ShippingMeter subtotal={subtotal} />
                <div className="border-t p-5">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="spec">Subtotal</span>
                    <span className="display text-2xl tabular-nums">
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                  <p className="spec mb-4 opacity-55">
                    Shipping and tax worked out at checkout
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeDrawer}
                    className="spec block bg-[var(--on-surface)] py-4 text-center text-[var(--surface)] transition-opacity hover:opacity-85"
                  >
                    Checkout
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeDrawer}
                    className="spec mt-3 block text-center underline underline-offset-4 opacity-60 hover:opacity-100"
                  >
                    View full cart
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
