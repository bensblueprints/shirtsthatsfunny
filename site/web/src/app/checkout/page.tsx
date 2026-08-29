'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { useCart, price, formatMoney, type CartItem } from '@/lib/cart';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
] as const;

const EMPTY = {
  first_name: '',
  last_name: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'US',
  phone: '',
};

type Address = typeof EMPTY;

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = true,
  autoComplete,
  className = '',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="spec mb-1.5 block opacity-55">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-cyan)]"
      />
    </div>
  );
}

function attr(item: CartItem, name: string) {
  return item.variation.find((v) => v.attribute.toLowerCase().includes(name))?.value;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading, updateCustomer, selectShippingRate } = useCart();

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<Address>(EMPTY);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardHostRef = useRef<HTMLDivElement>(null);

  const quoted = useRef('');
  const minor = cart?.totals.currency_minor_unit ?? 2;
  const items = cart?.items ?? [];
  const rates = cart?.shipping_rates?.[0]?.shipping_rates ?? [];

  /**
   * Woo can only quote shipping once it knows where the parcel is going, so
   * re-quote whenever the destination changes — but only on the fields that
   * actually affect a rate, and only after typing settles.
   */
  useEffect(() => {
    const key = `${address.country}|${address.state}|${address.postcode}|${address.city}`;
    if (key === quoted.current) return;
    if (!address.country || (address.country === 'US' && !address.state)) return;

    const timer = window.setTimeout(() => {
      quoted.current = key;
      void updateCustomer({
        country: address.country,
        state: address.state,
        postcode: address.postcode,
        city: address.city,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [address.country, address.state, address.postcode, address.city, updateCustomer]);

  // Mount the Stripe card element once the checkout renders.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) return;
      const stripe = await loadStripe(pk);
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;
      const card = stripe.elements().create('card', {
        style: {
          base: { fontSize: '15px', color: '#111', '::placeholder': { color: '#999' } },
          invalid: { color: '#d33' },
        },
      });
      cardElementRef.current = card;
      if (cardHostRef.current) card.mount(cardHostRef.current);
    })();
    return () => {
      cancelled = true;
      cardElementRef.current?.unmount?.();
      cardElementRef.current = null;
    };
  }, []);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setFailure(null);

    const billing = { ...address, email };

    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_address: billing,
          shipping_address: address,
          customer_note: note,
          payment_method: 'stripe',
          payment_data: [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFailure(data?.message ?? 'The order did not go through. Nothing was charged.');
        setPlacing(false);
        return;
      }

      const details = data?.payment_result?.payment_details ?? {};

      // Stripe deferred intent: confirm the card client-side, then finalize.
      const cardEl = cardElementRef.current;
      if (details.payment_intent_secret && stripeRef.current && cardEl) {
        const { error } = await stripeRef.current.confirmCardPayment(details.payment_intent_secret, {
          payment_method: {
            card: cardEl,
            billing_details: {
              name: `${billing.first_name} ${billing.last_name}`.trim(),
              email: billing.email,
              phone: billing.phone || undefined,
            },
          },
        });
        if (error) {
          setFailure(error.message ?? 'The card was declined. Nothing was charged.');
          setPlacing(false);
          return;
        }
        if (details.verification_endpoint) {
          window.location.href = details.verification_endpoint;
          return;
        }
        router.push(`/order/${data.order_id}?key=${data.order_key}`);
        return;
      }

      const redirect = data?.payment_result?.redirect_url;
      if (redirect) {
        // A real gateway (Stripe, PayPal) sends you off-site to pay.
        window.location.href = redirect;
        return;
      }

      router.push(`/order/${data.order_id}?key=${data.order_key}`);
    } catch {
      setFailure('No connection. Your cart is untouched — try again.');
      setPlacing(false);
    }
  }

  if (loading) {
    return <p className="spec mx-auto max-w-[1400px] px-4 py-24 opacity-55 sm:px-8">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-4 py-32 text-center">
        <h1 className="display text-4xl">Nothing to check out</h1>
        <Link
          href="/shop"
          className="spec mt-8 bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)]"
        >
          Shop the rack
        </Link>
      </div>
    );
  }

  const set = (key: keyof Address) => (value: string) =>
    setAddress((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
      <h1 className="display mb-10 text-[var(--text-section)]">Checkout</h1>

      <form onSubmit={placeOrder} className="grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="spec mb-4 border-b pb-2 opacity-55">Contact</h2>
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <p className="spec mt-2 opacity-45">
              For the receipt and the tracking number. Nothing else.
            </p>
          </section>

          <section>
            <h2 className="spec mb-4 border-b pb-2 opacity-55">Ship it to</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" autoComplete="given-name"
                value={address.first_name} onChange={set('first_name')} />
              <Field id="last_name" label="Last name" autoComplete="family-name"
                value={address.last_name} onChange={set('last_name')} />

              <Field id="address_1" label="Address" autoComplete="address-line1"
                className="sm:col-span-2" value={address.address_1} onChange={set('address_1')} />
              <Field id="address_2" label="Apartment, suite (optional)" required={false}
                autoComplete="address-line2" className="sm:col-span-2"
                value={address.address_2} onChange={set('address_2')} />

              <Field id="city" label="City" autoComplete="address-level2"
                value={address.city} onChange={set('city')} />

              <div>
                <label htmlFor="state" className="spec mb-1.5 block opacity-55">
                  State
                </label>
                <select
                  id="state"
                  required
                  value={address.state}
                  onChange={(e) => set('state')(e.target.value)}
                  autoComplete="address-level1"
                  className="w-full border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-cyan)]"
                >
                  <option value="" className="text-black">
                    Choose
                  </option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code} className="text-black">
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <Field id="postcode" label="ZIP" autoComplete="postal-code"
                value={address.postcode} onChange={set('postcode')} />
              <Field id="phone" label="Phone (optional)" required={false} type="tel"
                autoComplete="tel" value={address.phone} onChange={set('phone')} />
            </div>
          </section>

          <section>
            <h2 className="spec mb-4 border-b pb-2 opacity-55">Shipping</h2>
            {rates.length === 0 ? (
              <p className="text-sm opacity-60">
                Fill in your state and ZIP and the options will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {rates.map((rate) => (
                  <li key={rate.rate_id}>
                    <label
                      className="flex cursor-pointer items-center justify-between gap-4 border px-4 py-3.5 transition-colors hover:border-[var(--on-surface)]"
                      style={{
                        borderColor: rate.selected ? 'var(--on-surface)' : undefined,
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping-rate"
                          checked={rate.selected}
                          onChange={() => selectShippingRate(rate.rate_id)}
                          className="accent-[var(--on-surface)]"
                        />
                        <span className="text-sm">{rate.name}</span>
                      </span>
                      <span className="spec tabular-nums">
                        {price(rate.price, rate.currency_minor_unit) === 0
                          ? 'Free'
                          : formatMoney(price(rate.price, rate.currency_minor_unit))}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="spec mb-4 border-b pb-2 opacity-55">Payment</h2>
            <div className="border px-4 py-4">
              <p className="spec mb-2 text-[11px] uppercase tracking-wider opacity-55">
                Credit / Debit Card
              </p>
              <div ref={cardHostRef} style={{ minHeight: 44 }} />
              <p className="spec mt-2 text-[11px] opacity-45">
                Secured by Stripe. Card details never touch our servers.
              </p>
            </div>

            <label htmlFor="note" className="spec mt-6 mb-1.5 block opacity-55">
              Order note (optional)
            </label>
            <textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-cyan)]"
            />
          </section>
        </div>

        {/* ── Summary ─────────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="spec mb-4 opacity-55">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </h2>

          <ul className="divide-y border-t border-b">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 py-4">
                <div
                  className="size-14 shrink-0 border"
                  style={{
                    background:
                      attr(item, 'color')?.toLowerCase() === 'black' ? '#141414' : '#FAFAFA',
                  }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{item.name}</p>
                  <p className="spec mt-1 opacity-55">
                    {attr(item, 'color')} · {attr(item, 'size')} · ×{item.quantity}
                  </p>
                </div>
                <p className="spec tabular-nums">
                  {formatMoney(price(item.totals.line_total, minor))}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2.5 text-sm">
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
              <dd className="tabular-nums">
                {cart?.totals.total_shipping == null
                  ? '—'
                  : price(cart.totals.total_shipping, minor) === 0
                    ? 'Free'
                    : formatMoney(price(cart.totals.total_shipping, minor))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="opacity-65">Tax</dt>
              <dd className="tabular-nums">
                {formatMoney(price(cart?.totals.total_tax, minor))}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t pt-5">
            <span className="spec">Total</span>
            <span className="display text-3xl tabular-nums">
              {formatMoney(price(cart?.totals.total_price, minor))}
            </span>
          </div>

          {failure && (
            <p role="alert" className="spec mt-5 border border-[var(--color-magenta)] p-3 text-[var(--color-magenta)]">
              {failure}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={placing}
            whileTap={{ scale: 0.985 }}
            className="spec mt-6 w-full bg-[var(--on-surface)] py-5 text-[var(--surface)] transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {placing ? 'Placing order…' : 'Place order'}
          </motion.button>

          <p className="spec mt-4 opacity-45">
            By ordering you agree to our{' '}
            <Link href="/pages/terms" className="underline underline-offset-4">
              terms
            </Link>
            .
          </p>
        </aside>
      </form>
    </div>
  );
}
