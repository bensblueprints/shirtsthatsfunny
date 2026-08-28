import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import ProductBuyBox from '@/components/ProductBuyBox';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import { getProduct, getRelated, getReviews, money } from '@/lib/woo';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug).catch(() => null);
  if (!product) return { title: 'Not found' };

  return {
    title: product.name,
    description: `${product.name} — printed on a black or white unisex tee, S through 3XL. ${money(product.price_min)}.`,
    openGraph: { title: product.name, description: product.short },
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
            fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </span>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelated(slug, 4).catch(() => []),
    getReviews(product.id).catch(() => []),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: Object.values(product.variations)[0]?.sku,
    brand: { '@type': 'Brand', name: "Shirt That's Funny" },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: product.price_min,
      highPrice: product.price_max,
      offerCount: Object.keys(product.variations).length,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="spec mb-8 flex gap-2 opacity-55">
        <Link href="/" className="hover:opacity-100">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/shop" className="hover:opacity-100">
          Shop
        </Link>
        <span aria-hidden="true">/</span>
        <span className="opacity-70">{product.name}</span>
      </nav>

      <ProductBuyBox product={product} />

      {/* ── Reviews ─────────────────────────────────────────────────────── */}
      <section className="mt-24 border-t pt-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="display text-[var(--text-section)]">What people say</h2>
          {product.review_count > 0 && (
            <div className="flex items-center gap-3">
              <Stars rating={product.rating} />
              <span className="spec opacity-55">
                {product.rating.toFixed(1)} · {product.review_count} reviews
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="max-w-md text-sm leading-relaxed opacity-60">
            No reviews on this one yet. Buy it, wear it somewhere with people, and
            report back.
          </p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id} className="border-t pt-4">
                <Stars rating={review.rating} />
                <div
                  className="mt-3 text-sm leading-relaxed opacity-80"
                  dangerouslySetInnerHTML={{ __html: review.review }}
                />
                <p className="spec mt-4 opacity-50">
                  {review.reviewer}
                  {review.verified && ' · verified buyer'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Related ─────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="display mb-8 border-b pb-5 text-[var(--text-section)]">
            Also funny
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {related.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.06}>
                <ProductCard product={item} index={i} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
