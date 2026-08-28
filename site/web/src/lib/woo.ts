import 'server-only';

/**
 * Catalogue reads. Runs server-side only — the consumer key never reaches the
 * browser. Cart and checkout go through the Store API instead (see
 * app/api/store/[...path]/route.ts), which is public and cart-token scoped.
 */

const API = process.env.WC_API_URL ?? 'http://cms/wp-json';
const KEY = process.env.WC_CONSUMER_KEY ?? '';
const SECRET = process.env.WC_CONSUMER_SECRET ?? '';

const authHeader = 'Basic ' + Buffer.from(`${KEY}:${SECRET}`).toString('base64');

export class WooError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined>;

async function get<T>(path: string, query: Query = {}, revalidate = 120): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      // WooCommerce only honours basic auth on an SSL request. This hop is
      // container-to-container plain HTTP, but the request that caused it did
      // arrive over TLS, so we forward that fact — wp-config.php turns this
      // header into $_SERVER['HTTPS'] and is_ssl() then agrees.
      'X-Forwarded-Proto': 'https',
    },
    next: { revalidate, tags: ['catalogue'] },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new WooError(
      `Woo ${res.status} on ${path}${body ? ` — ${body.slice(0, 200)}` : ''}`,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

/* Shared vocabulary lives in catalog.ts so client components can use it too. */
export {
  COLOURS,
  SIZES,
  SIZE_LABEL,
  money,
  fromMinor,
} from './catalog';
export type {
  Colour,
  Size,
  ProductSummary,
  Variation,
  ProductDetail,
  SortKey,
} from './catalog';

import {
  SIZES,
  money,
  type Colour,
  type ProductDetail,
  type ProductSummary,
  type Size,
  type SortKey,
} from './catalog';

interface RawProduct {
  id: number;
  slug: string;
  name: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  date_created: string;
  total_sales: number;
  average_rating: string;
  rating_count: number;
  categories: { name: string; slug: string }[];
  attributes: { name: string; slug?: string; options: string[] }[];
  images: { src: string }[];
  price_html: string;
  prices?: { price_range?: { max_amount: string } };
}

function toSummary(p: RawProduct): ProductSummary {
  const attr = (needle: string) =>
    p.attributes.find(
      (a) => (a.slug ?? '').includes(needle) || a.name.toLowerCase() === needle,
    )?.options ?? [];

  const colours = attr('color')
    .map((o) => o.toLowerCase())
    .filter((o): o is Colour => o === 'black' || o === 'white');

  const sizes = attr('size')
    .map((o) => o.toLowerCase())
    .filter((o): o is Size => (SIZES as string[]).includes(o));

  const price = Number(p.price) || 0;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price,
    // Woo reports the min price; 3XL carries a +$4 blank upcharge.
    priceMax: price + 4,
    onSale: p.on_sale,
    categories: p.categories.map((c) => c.slug),
    colours: colours.length ? colours : ['black', 'white'],
    sizes: sizes.length ? sizes : SIZES,
    image: p.images?.[0]?.src ?? null,
    rating: Number(p.average_rating) || 0,
    reviewCount: p.rating_count ?? 0,
    totalSales: p.total_sales ?? 0,
    date: p.date_created,
  };
}

const SORT: Record<SortKey, Query> = {
  featured: { orderby: 'popularity' },
  newest: { orderby: 'date', order: 'desc' },
  'price-asc': { orderby: 'price', order: 'asc' },
  'price-desc': { orderby: 'price', order: 'desc' },
  name: { orderby: 'title', order: 'asc' },
};

export async function getProducts(
  opts: { category?: string; search?: string; sort?: SortKey; perPage?: number } = {},
): Promise<ProductSummary[]> {
  const raw = await get<RawProduct[]>('/wc/v3/products', {
    status: 'publish',
    per_page: opts.perPage ?? 24,
    category: opts.category,
    search: opts.search,
    ...SORT[opts.sort ?? 'featured'],
  });
  return raw.map(toSummary);
}

/** Everything a product page needs, in one round trip. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await get<ProductDetail>(`/stf/v1/product/${slug}`, {}, 60);
  } catch (err) {
    if (err instanceof WooError && err.status === 404) return null;
    throw err;
  }
}

export async function getRelated(slug: string, limit = 4): Promise<ProductSummary[]> {
  const all = await getProducts({ sort: 'featured', perPage: 12 });
  return all.filter((p) => p.slug !== slug).slice(0, limit);
}

export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  return get('/wc/v3/products/categories', { per_page: 20, hide_empty: true });
}

export interface PolicyPage {
  title: string;
  slug: string;
  body: string;
}

export async function getPage(slug: string): Promise<PolicyPage | null> {
  const pages = await get<
    { title: { rendered: string }; slug: string; content: { rendered: string } }[]
  >('/wp/v2/pages', { slug, per_page: 1 }, 900);

  if (!pages.length) return null;

  return {
    title: pages[0].title.rendered,
    slug: pages[0].slug,
    body: pages[0].content.rendered,
  };
}


export interface Review {
  id: number;
  reviewer: string;
  review: string;
  rating: number;
  date_created: string;
  verified: boolean;
}

export async function getReviews(productId: number, limit = 6): Promise<Review[]> {
  try {
    return await get<Review[]>(
      '/wc/v3/products/reviews',
      { product: productId, per_page: limit, status: 'approved' },
      300,
    );
  } catch {
    // Reviews are a nice-to-have; never let them take the product page down.
    return [];
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const products = await getProducts({ perPage: 100 });
  return products.map((p) => p.slug);
}
