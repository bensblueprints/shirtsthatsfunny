'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import TeeMockup from '@/components/TeeMockup';
import { useCart } from '@/lib/cart';
import {
  COLOURS,
  SIZES,
  SIZE_LABEL,
  money,
  type Colour,
  type ProductDetail,
  type Size,
} from '@/lib/catalog';

export default function ProductBuyBox({ product }: { product: ProductDetail }) {
  const { addItem, busy } = useCart();

  const [colour, setColour] = useState<Colour>('black');
  const [size, setSize] = useState<Size | null>(null);
  const [nudge, setNudge] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const variation = size ? product.variations[`${colour}|${size}`] : undefined;
  const available = (s: Size) => product.variations[`${colour}|${s}`]?.in_stock ?? false;

  /**
   * The whole page takes the colour of the garment. The swatch isn't a control
   * next to a preview — it is the preview.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.garment = colour;
    return () => {
      delete root.dataset.garment;
    };
  }, [colour]);

  // If the chosen size is sold out in the new colour, don't silently keep it.
  useEffect(() => {
    if (size && !available(size)) setSize(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colour]);

  async function add() {
    setFailed(null);

    if (!size) {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 600);
      document.getElementById('size-run')?.scrollIntoView({ block: 'center' });
      return;
    }
    if (!variation) return;

    const ok = await addItem(variation.id, 1);
    if (!ok) setFailed('That did not go into the cart. Try once more.');
  }

  const displayPrice = variation?.price ?? product.price_min;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
      {/* ── The garment ─────────────────────────────────────────────────── */}
      <div className="relative border bg-[var(--surface-2)]">
        <div className="absolute inset-0 halftone" aria-hidden="true" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={colour}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.015 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <TeeMockup slogan={product.slogan} colour={colour} className="w-full" />
          </motion.div>
        </AnimatePresence>

        <p className="spec absolute bottom-4 left-4 opacity-45">
          {variation?.sku ?? `STF · ${colour}`}
        </p>
      </div>

      {/* ── The decision ────────────────────────────────────────────────── */}
      <div className="lg:pt-6">
        <p className="spec opacity-55">
          {product.categories.includes('best-sellers') ? 'Best seller' : 'Unisex tee'}
        </p>

        <h1 className="display mt-3 text-[clamp(2rem,5.5vw,3.75rem)]">{product.name}</h1>

        <div className="mt-5 flex items-baseline gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={displayPrice}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="display text-3xl tabular-nums"
            >
              {money(displayPrice)}
            </motion.p>
          </AnimatePresence>
          {!size && product.price_max > product.price_min && (
            <span className="spec opacity-50">
              S–XL · 2XL +$2 · 3XL +$4
            </span>
          )}
        </div>

        {/* Colour */}
        <fieldset className="mt-9">
          <legend className="spec mb-3 opacity-55">
            Colour — <span className="opacity-100">{colour}</span>
          </legend>
          <div className="flex gap-3">
            {COLOURS.map((option) => {
              const selected = option === colour;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColour(option)}
                  aria-pressed={selected}
                  className="group relative size-14 border transition-transform hover:scale-[1.04]"
                  style={{ background: option === 'black' ? '#141414' : '#FAFAFA' }}
                >
                  <span className="sr-only">{option}</span>
                  {selected && (
                    <motion.span
                      layoutId="swatch-ring"
                      className="absolute -inset-1.5 border border-[var(--on-surface)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Size */}
        <fieldset id="size-run" className="mt-9">
          <legend className="spec mb-3 flex w-full items-center justify-between gap-4 opacity-55">
            <span>
              Size {size && <span className="opacity-100">— {SIZE_LABEL[size]}</span>}
            </span>
            <Link href="/sizing" className="underline underline-offset-4 hover:opacity-100">
              Size chart
            </Link>
          </legend>

          <motion.div
            animate={nudge ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {SIZES.map((option) => {
              const inStock = available(option);
              const selected = option === size;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={!inStock}
                  onClick={() => setSize(option)}
                  aria-pressed={selected}
                  className={[
                    'spec relative border py-3 transition-colors',
                    selected
                      ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                      : inStock
                        ? 'hover:bg-[var(--on-surface)] hover:text-[var(--surface)]'
                        : 'cursor-not-allowed opacity-35',
                  ].join(' ')}
                  title={inStock ? undefined : 'Sold out in this colour'}
                >
                  {SIZE_LABEL[option]}
                  {!inStock && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <span className="h-px w-[130%] rotate-[-24deg] bg-current" />
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          {size && !available(size) && (
            <p className="spec mt-3 text-[var(--color-magenta)]">
              Sold out in {colour}. It is in stock in the other colour.
            </p>
          )}
        </fieldset>

        {/* Add */}
        <button
          type="button"
          onClick={add}
          disabled={busy || (size !== null && !variation?.in_stock)}
          className="spec mt-9 w-full bg-[var(--on-surface)] py-5 text-[var(--surface)] transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {busy ? 'Adding…' : size ? `Add to cart — ${money(displayPrice)}` : 'Pick a size'}
        </button>

        {failed && (
          <p role="alert" className="spec mt-3 text-[var(--color-magenta)]">
            {failed}
          </p>
        )}

        <dl className="mt-10 divide-y border-t border-b">
          {[
            ['Fabric', '5.3oz ring-spun cotton, pre-shrunk'],
            ['Print', 'Water-based ink, soft hand'],
            ['Fit', 'Unisex, straight body, true to size'],
            ['Ships', 'In 2 business days'],
          ].map(([term, description]) => (
            <div key={term} className="flex gap-6 py-3.5">
              <dt className="spec w-20 shrink-0 opacity-55">{term}</dt>
              <dd className="text-sm opacity-85">{description}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-sm leading-relaxed opacity-70">{product.description}</p>
      </div>
    </div>
  );
}
