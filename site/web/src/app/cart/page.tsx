'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useCart, price, formatMoney, type CartItem } from '@/lib/cart';

function attr(item: CartItem, name: string) {
  return item.variation.find((v) => v.attribute.toLowerCase().includes(name))?.value;
}

function CouponField() {
  const { cart, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const applied = cart?.coupons ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    const failure = await applyCoupon(code.trim());
    setPending(false);
    setError(failure);
    if (!failure) setCode('');
  }

  return (
    <div className="mt-6">
      {applied.length > 0 && (
        <ul className="mb-3 space-y-2">
          {applied.map((coupon) => (
            <li key={coupon.code} className="spec flex items-center justify-between border px-3 py-2">
              <span>{coupon.code.toUpperCase()} applied</span>
              <button
                type="button"
                onClick={() => removeCoupon(coupon.code)}
                className="underline underline-offset-4 opacity-60 hover:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-stretch border">
        <label htmlFor="coupon" className="sr-only">
          Discount code
        </label>
        <input
          id="coupon"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Discount code"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:opacity-40"
        />
        <button
          type="submit"
          disabled={pending}
          className="spec shrink-0 border-l px-4 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)] disabled:opacity-50"
        >
          {pending ? 'Checking' : 'Apply'}
        </button>
      </form>

      {error && (
        <p role="alert" className="spec mt-2 text-[var(--color-magenta)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();

  const items = cart?.items ?? [];
  const minor = cart?.totals.currency_minor_unit ?? 2;

  if (loading) {
    return <p className="spec mx-auto max-w-[1400px] px-4 py-24 opacity-55 sm:px-8">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-32 text-center">
        <h1 className="display text-[clamp(2rem,7vw,3.5rem)]">Your cart is empty</h1>
        <p className="mt-4 text-sm opacity-65">
          Twelve shirts. Two colours. Six sizes. It is not a hard decision.
        </p>
        <Link
          href="/shop"
          className="spec mt-8 bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
        >
          Shop the rack
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
      <h1 className="display mb-10 text-[var(--text-section)]">Your cart</h1>

      <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <ul className="divide-y border-t border-b">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.key}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-5 py-6">
                  <div
                    className="size-24 shrink-0 border"
                    style={{
                      background:
                        attr(item, 'color')?.toLowerCase() === 'black' ? '#141414' : '#FAFAFA',
                    }}
                    aria-hidden="true"
                  />

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium">{item.name}</h2>
                      <p className="spec mt-1.5 opacity-55">
                        {attr(item, 'color')} · {attr(item, 'size')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center border">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity === 1
                              ? removeItem(item.key)
                              : updateItem(item.key, item.quantity - 1)
                          }
                          className="px-3 py-1.5 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
                          aria-label="One fewer"
                        >
                          −
                        </button>
                        <span className="spec min-w-8 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(item.key, item.quantity + 1)}
                          className="px-3 py-1.5 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
                          aria-label="One more"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="spec underline underline-offset-4 opacity-55 hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <p className="spec shrink-0 tabular-nums">
                    {formatMoney(price(item.totals.line_total, minor))}
                  </p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="spec mb-4 opacity-55">Summary</h2>

          <dl className="space-y-2.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="opacity-65">Subtotal</dt>
              <dd className="tabular-nums">
                {formatMoney(price(cart?.totals.total_items, minor))}
              </dd>
            </div>
            {price(cart?.totals.total_discount, minor) > 0 && (
              <div className="flex justify-between">
                <dt className="opacity-65">Discount</dt>
                <dd className="tabular-nums">
                  −{formatMoney(price(cart?.totals.total_discount, minor))}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="opacity-65">Shipping</dt>
              <dd className="spec opacity-65">Worked out at checkout</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t pt-5">
            <span className="spec">Total</span>
            <span className="display text-3xl tabular-nums">
              {formatMoney(price(cart?.totals.total_price, minor))}
            </span>
          </div>

          <CouponField />

          <Link
            href="/checkout"
            className="spec mt-6 block bg-[var(--on-surface)] py-4 text-center text-[var(--surface)] transition-opacity hover:opacity-85"
          >
            Checkout
          </Link>

          <Link
            href="/shop"
            className="spec mt-3 block text-center underline underline-offset-4 opacity-60 hover:opacity-100"
          >
            Keep shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
