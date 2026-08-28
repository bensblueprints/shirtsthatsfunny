'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';

import { formatMoney, price } from '@/lib/cart';

interface Order {
  id: number;
  status: string;
  billing_address: { first_name: string; email: string };
  items: {
    key: string;
    name: string;
    quantity: number;
    totals: { line_total: string };
    variation: { attribute: string; value: string }[];
  }[];
  totals: {
    total_price: string;
    total_shipping: string | null;
    total_tax: string;
    currency_minor_unit: number;
  };
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = useSearchParams().get('key');

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setError('This link is missing its order key. Check the link in your email.');
      return;
    }

    fetch(`/api/store/order/${id}?key=${encodeURIComponent(key)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? 'Order not found.');
        setOrder(data);
      })
      .catch((err: Error) => setError(err.message));
  }, [id, key]);

  const minor = order?.totals.currency_minor_unit ?? 2;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="spec opacity-55">Order #{id}</p>

        <h1
          className="display misregister mt-4 text-[clamp(2.25rem,8vw,4.5rem)]"
          data-text="On the press"
        >
          On the press
        </h1>

        {error ? (
          <p role="alert" className="mt-6 text-sm text-[var(--color-magenta)]">
            {error}
          </p>
        ) : !order ? (
          <p className="spec mt-6 opacity-55">Looking it up…</p>
        ) : (
          <>
            <p className="mt-6 max-w-md text-sm leading-relaxed opacity-75">
              Thanks{order.billing_address.first_name ? `, ${order.billing_address.first_name}` : ''}.
              We sent a receipt to {order.billing_address.email}. It prints and ships
              within two business days, and you will get tracking when it does.
            </p>

            <ul className="mt-10 divide-y border-t border-b">
              {order.items.map((item) => (
                <li key={item.key} className="flex items-start gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.name}</p>
                    <p className="spec mt-1 opacity-55">
                      {item.variation.map((v) => v.value).join(' · ')} · ×{item.quantity}
                    </p>
                  </div>
                  <p className="spec tabular-nums">
                    {formatMoney(price(item.totals.line_total, minor))}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="spec">Total paid</span>
              <span className="display text-3xl tabular-nums">
                {formatMoney(price(order.totals.total_price, minor))}
              </span>
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="spec bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
              >
                Keep shopping
              </Link>
              <Link
                href="/pages/shipping"
                className="spec border px-8 py-4 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
              >
                Shipping info
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
