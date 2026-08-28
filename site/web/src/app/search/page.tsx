import type { Metadata } from 'next';
import { Suspense } from 'react';

import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import SearchField from '@/components/SearchField';
import { getProducts, type ProductSummary } from '@/lib/woo';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Find a shirt.',
};

type Params = Promise<{ q?: string | string[] }>;

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? '';

  let results: ProductSummary[] = [];
  let failed = false;

  if (query) {
    try {
      results = await getProducts({ search: query, perPage: 48 });
    } catch {
      failed = true;
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
      <h1 className="display text-[var(--text-section)]">Search</h1>

      <Suspense fallback={<div className="mt-8 h-12" />}>
        <SearchField />
      </Suspense>

      {query && (
        <p className="spec mt-6 opacity-55">
          {failed
            ? 'Search is unavailable right now.'
            : `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${query}”`}
        </p>
      )}

      {query && !failed && results.length === 0 && (
        <div className="py-20">
          <p className="display text-3xl">Nothing matched that</p>
          <p className="mt-3 max-w-md text-sm opacity-65">
            We only print twelve designs, so the search has a small haystack. Try a
            single word, or just browse the rack.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {results.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 0.05}>
              <ProductCard product={product} index={i} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
