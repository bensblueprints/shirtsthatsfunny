'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { motion } from 'motion/react';

import { SIZES, SIZE_LABEL } from '@/lib/catalog';

const CATEGORIES = [
  { slug: '', label: 'Everything' },
  { slug: 'best-sellers', label: 'Best sellers' },
  { slug: 'new-in', label: 'New in' },
  { slug: 'deadpan', label: 'Deadpan' },
  { slug: 'low-effort', label: 'Low effort' },
];

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'A–Z' },
];

export default function FilterBar({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const category = params.get('category') ?? '';
  const size = params.get('size') ?? '';
  const sort = params.get('sort') ?? 'featured';

  return (
    <div className="sticky top-[3.6rem] z-30 -mx-4 mb-10 border-y bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Category">
          {CATEGORIES.map((item) => {
            const active = category === item.slug;
            return (
              <button
                key={item.slug || 'all'}
                type="button"
                onClick={() => set('category', item.slug)}
                aria-pressed={active}
                className="spec relative px-3 py-1.5 transition-opacity hover:opacity-100"
                style={{ opacity: active ? 1 : 0.5 }}
              >
                {active && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 -z-10 border"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Size">
          <span className="spec mr-1 opacity-45">Size</span>
          {SIZES.map((option) => {
            const active = size === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => set('size', active ? '' : option)}
                aria-pressed={active}
                className={[
                  'spec border px-2 py-1 transition-colors',
                  active
                    ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                    : 'opacity-55 hover:opacity-100',
                ].join(' ')}
              >
                {SIZE_LABEL[option]}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="spec opacity-45">
            {count} {count === 1 ? 'shirt' : 'shirts'}
          </span>
          <label className="spec flex items-center gap-2">
            <span className="opacity-45">Sort</span>
            <select
              value={sort}
              onChange={(e) => set('sort', e.target.value)}
              className="spec border bg-transparent px-2 py-1 outline-none"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value} className="text-black">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
