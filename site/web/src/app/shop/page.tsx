import type { Metadata } from 'next';
import { Suspense } from 'react';

import FilterBar from '@/components/FilterBar';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import StoreOffline from '@/components/StoreOffline';
import { getProducts, SIZES, type ProductSummary, type Size, type SortKey } from '@/lib/woo';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Every shirt we print. Black or white, S through 3XL.',
};

export const revalidate = 120;

type Params = Promise<{ [key: string]: string | string[] | undefined }>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const category = one(params.category);
  const sort = (one(params.sort) ?? 'featured') as SortKey;
  const size = one(params.size) as Size | undefined;

  let products: ProductSummary[] = [];

  try {
    products = await getProducts({ category, sort, perPage: 48 });
  } catch {
    return <StoreOffline />;
  }

  if (size && SIZES.includes(size)) {
    products = products.filter((p) => p.sizes.includes(size));
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-8">
      <header className="mb-8">
        <p className="spec opacity-55">Everything we print</p>
        <h1 className="display mt-3 text-[var(--text-section)]">The rack</h1>
      </header>

      <Suspense fallback={<div className="h-14" />}>
        <FilterBar count={products.length} />
      </Suspense>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-3xl">Nothing matches that</p>
          <p className="mt-3 text-sm opacity-65">
            Try a different size, or clear the filters and start again.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 0.05}>
              <ProductCard product={product} index={i} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
