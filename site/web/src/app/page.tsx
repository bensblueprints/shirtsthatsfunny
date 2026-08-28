import Link from 'next/link';
import { connection } from 'next/server';

import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import TeeMockup from '@/components/TeeMockup';
import StoreOffline from '@/components/StoreOffline';
import { getProducts, SIZES, SIZE_LABEL, type ProductSummary } from '@/lib/woo';

export default async function HomePage() {
  // Render at request time, not at build time: `docker build` has no route to
  // the CMS container, so prerendering here would bake the "catalogue
  // unavailable" state into the image. The catalogue fetch itself is still
  // cached for 120s, so this costs a render, not a round trip.
  await connection();

  let products: ProductSummary[] = [];
  let offline = false;

  try {
    products = await getProducts({ sort: 'featured', perPage: 8 });
  } catch {
    offline = true;
  }

  if (offline) return <StoreOffline />;

  const hero = products[0];

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-4 pt-10 pb-16 sm:px-8 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="spec opacity-55">Screen-printed in small runs</p>

            <h1 className="display mt-5 text-[var(--text-hero)]">
              <span className="misregister block" data-text="Two colours.">
                Two colours.
              </span>
              <span className="misregister block" data-text="Six sizes.">
                Six sizes.
              </span>
              <span className="misregister block" data-text="One joke.">
                One joke.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-relaxed opacity-75">
              We print funny shirts on black or white cotton, S through 3XL. That is
              the entire range, and it is on purpose.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="spec bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
              >
                Shop the rack
              </Link>
              <Link
                href="/sizing"
                className="spec border px-8 py-4 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
              >
                Size chart
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full border bg-[#141414]" />
                <span className="size-3 rounded-full border bg-[#FAFAFA]" />
              </div>
              <span className="spec opacity-45">Black or white. That is the palette.</span>
            </div>
          </div>

          {hero && (
            <Link
              href={`/product/${hero.slug}`}
              className="group relative block border bg-[var(--surface-2)]"
            >
              <div className="absolute inset-0 halftone" aria-hidden="true" />
              <TeeMockup
                slogan={hero.name}
                colour="black"
                ariaHidden
                className="w-full transition-opacity duration-500 group-hover:opacity-0"
              />
              <TeeMockup
                slogan={hero.name}
                colour="white"
                ariaHidden
                className="absolute inset-0 w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="spec absolute bottom-4 left-4 opacity-50">
                Hover to flip the colourway
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ── The size run, as a band ─────────────────────────────────────── */}
      <section className="overflow-hidden border-y bg-[var(--on-surface)] py-5 text-[var(--surface)]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4">
          {SIZES.map((size) => (
            <span key={size} className="display text-3xl sm:text-5xl">
              {SIZE_LABEL[size]}
            </span>
          ))}
        </div>
      </section>

      {/* ── The rack ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
          <h2 className="display text-[var(--text-section)]">The rack</h2>
          <Link
            href="/shop"
            className="spec underline underline-offset-4 transition-opacity hover:opacity-55"
          >
            All {products.length >= 8 ? '12' : products.length} shirts →
          </Link>
        </Reveal>

        <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 0.06}>
              <ProductCard product={product} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Why two colours ─────────────────────────────────────────────── */}
      <section className="border-t">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-20 sm:px-8 lg:grid-cols-3">
          {[
            {
              heading: 'Two colours',
              body: 'Black ink on white, white ink on black. Every design works in both because we do not draw anything that needs a gradient.',
            },
            {
              heading: 'Six sizes',
              body: 'S through 3XL in one unisex cut. The bigger blanks cost us more, so 2XL is $2 up and 3XL is $4 up. No surprise at checkout.',
            },
            {
              heading: 'One joke',
              body: 'A shirt gets one line. If it needs a paragraph on the back to land, it was not funny enough for the front.',
            },
          ].map((item, i) => (
            <Reveal key={item.heading} delay={i * 0.08}>
              <div className="border-t pt-5">
                <h3 className="display text-2xl">{item.heading}</h3>
                <p className="mt-3 text-sm leading-relaxed opacity-70">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
