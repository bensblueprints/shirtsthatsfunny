import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPage } from '@/lib/woo';

export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };

const ALLOWED = ['shipping', 'returns', 'privacy', 'terms', 'about', 'sizing'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug).catch(() => null);
  return page ? { title: page.title } : { title: 'Not found' };
}

export function generateStaticParams() {
  return ALLOWED.map((slug) => ({ slug }));
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  if (!ALLOWED.includes(slug)) notFound();

  const page = await getPage(slug).catch(() => null);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <p className="spec opacity-55">Shirt That&rsquo;s Funny</p>
      <h1 className="display mt-3 text-[var(--text-section)]">{page.title}</h1>

      {/* WordPress owns this copy — edit it in wp-admin, not in the repo. */}
      <div
        className="mt-10 space-y-5 text-sm leading-relaxed opacity-80 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-2xl [&_h2]:uppercase [&_h2]:opacity-100 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
    </article>
  );
}
