import Link from 'next/link';

import TeeMockup from '@/components/TeeMockup';
import { money, type ProductSummary } from '@/lib/catalog';

/**
 * Both colourways are rendered and cross-faded on hover — the card previews
 * the only choice the product actually offers. No JavaScript involved.
 */
export default function ProductCard({
  product,
  index = 0,
}: {
  product: ProductSummary;
  index?: number;
}) {
  const number = String(index + 1).padStart(2, '0');

  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden border bg-[var(--surface-2)]">
          <div className="absolute inset-0 halftone" aria-hidden="true" />

          <div className="relative transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]">
            <TeeMockup
              slogan={product.name}
              colour="black"
              ariaHidden
              className="w-full transition-opacity duration-500 group-hover:opacity-0"
            />
            <TeeMockup
              slogan={product.name}
              colour="white"
              ariaHidden
              className="absolute inset-0 w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </div>

          <span className="spec absolute top-3 left-3 opacity-40">{number}</span>

          {product.categories.includes('new-in') && (
            <span className="spec absolute top-3 right-3 bg-[var(--on-surface)] px-2 py-1 text-[var(--surface)]">
              New
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <h3 className="max-w-[80%] text-sm leading-snug font-medium">{product.name}</h3>
          <p className="spec shrink-0 tabular-nums">{money(product.price)}</p>
        </div>
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full border bg-[#141414]" />
          <span className="size-2.5 rounded-full border bg-[#FAFAFA]" />
        </div>
        <span className="spec opacity-45">S–3XL</span>
      </div>
    </article>
  );
}
