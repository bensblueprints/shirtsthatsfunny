/**
 * Catalogue vocabulary shared by server and client.
 *
 * Kept apart from woo.ts on purpose: that module is `server-only` because it
 * carries the REST credentials, and client components still need the sizes,
 * the colours and the money formatter.
 */

export type Colour = 'black' | 'white';
export type Size = 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl';

export const COLOURS: Colour[] = ['black', 'white'];
export const SIZES: Size[] = ['s', 'm', 'l', 'xl', '2xl', '3xl'];

export const SIZE_LABEL: Record<Size, string> = {
  s: 'S',
  m: 'M',
  l: 'L',
  xl: 'XL',
  '2xl': '2XL',
  '3xl': '3XL',
};

export interface ProductSummary {
  id: number;
  slug: string;
  name: string;
  price: number;
  priceMax: number;
  onSale: boolean;
  categories: string[];
  colours: Colour[];
  sizes: Size[];
  image: string | null;
  rating: number;
  reviewCount: number;
  totalSales: number;
  date: string;
}

export interface Variation {
  id: number;
  price: number;
  regular_price: number;
  in_stock: boolean;
  sku: string;
}

export interface ProductDetail {
  id: number;
  slug: string;
  name: string;
  description: string;
  short: string;
  slogan: string;
  price_min: number;
  price_max: number;
  axes: { color?: string[]; size?: string[] };
  /** Keyed `${colour}|${size}` */
  variations: Record<string, Variation>;
  categories: string[];
  image: string | null;
  rating: number;
  review_count: number;
}

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

export function money(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Store API returns integer minor units plus the divisor to apply. */
export function fromMinor(value: string | number, minorUnit = 2): number {
  return Number(value) / 10 ** minorUnit;
}
