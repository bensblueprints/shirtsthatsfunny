'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

/* ─── Store API shapes (the parts we use) ────────────────────────────────── */

export interface CartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  permalink: string;
  images: { thumbnail: string; src: string }[];
  variation: { attribute: string; value: string }[];
  prices: {
    price: string;
    regular_price: string;
    currency_minor_unit: number;
    currency_symbol: string;
  };
  totals: { line_total: string; line_subtotal: string };
}

export interface ShippingRate {
  package_id: number;
  name: string;
  shipping_rates: {
    rate_id: string;
    name: string;
    price: string;
    currency_minor_unit: number;
    selected: boolean;
    delivery_time?: string;
  }[];
}

export interface Cart {
  items: CartItem[];
  items_count: number;
  needs_shipping: boolean;
  shipping_rates?: ShippingRate[];
  coupons: { code: string; totals: { total_discount: string } }[];
  totals: {
    total_items: string;
    total_price: string;
    total_shipping: string | null;
    total_discount: string;
    total_tax: string;
    currency_minor_unit: number;
    currency_symbol: string;
  };
  errors?: { code: string; message: string }[];
}

interface CartContextValue {
  cart: Cart | null;
  count: number;
  loading: boolean;
  busy: boolean;
  error: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (variationId: number, quantity?: number) => Promise<boolean>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: (code: string) => Promise<void>;
  /** Quote shipping for an address without committing to checkout. */
  updateCustomer: (address: Record<string, string>) => Promise<void>;
  selectShippingRate: (rateId: string, packageId?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

async function store(path: string, init?: RequestInit) {
  const res = await fetch(`/api/store/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? 'Something went wrong. Try again.');
  }
  return data;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  // The badge should move the instant you click, not a round trip later.
  const [optimisticCount, bumpCount] = useOptimistic(
    cart?.items_count ?? 0,
    (current, delta: number) => current + delta,
  );

  const refresh = useCallback(async () => {
    try {
      setCart(await store('cart'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cart unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (fn: () => Promise<Cart>) => {
      setError(null);
      try {
        setCart(await fn());
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        return false;
      }
    },
    [],
  );

  const addItem = useCallback(
    async (variationId: number, quantity = 1) => {
      startTransition(() => bumpCount(quantity));
      const ok = await run(() =>
        store('cart/add-item', {
          method: 'POST',
          body: JSON.stringify({ id: variationId, quantity }),
        }),
      );
      if (ok) setDrawerOpen(true);
      return ok;
    },
    [run, bumpCount],
  );

  const updateItem = useCallback(
    async (key: string, quantity: number) => {
      await run(() =>
        store('cart/update-item', {
          method: 'POST',
          body: JSON.stringify({ key, quantity }),
        }),
      );
    },
    [run],
  );

  const removeItem = useCallback(
    async (key: string) => {
      await run(() =>
        store('cart/remove-item', { method: 'POST', body: JSON.stringify({ key }) }),
      );
    },
    [run],
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<string | null> => {
      try {
        setCart(
          await store('cart/apply-coupon', {
            method: 'POST',
            body: JSON.stringify({ code }),
          }),
        );
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'That code did not work.';
      }
    },
    [],
  );

  const removeCoupon = useCallback(
    async (code: string) => {
      await run(() =>
        store('cart/remove-coupon', { method: 'POST', body: JSON.stringify({ code }) }),
      );
    },
    [run],
  );

  const updateCustomer = useCallback(
    async (address: Record<string, string>) => {
      await run(() =>
        store('cart/update-customer', {
          method: 'POST',
          body: JSON.stringify({ shipping_address: address, billing_address: address }),
        }),
      );
    },
    [run],
  );

  const selectShippingRate = useCallback(
    async (rateId: string, packageId = 0) => {
      await run(() =>
        store('cart/select-shipping-rate', {
          method: 'POST',
          body: JSON.stringify({ package_id: packageId, rate_id: rateId }),
        }),
      );
    },
    [run],
  );

  // Lock the page behind the drawer, and let Escape close it.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: cart?.items_count ?? optimisticCount,
      loading,
      busy,
      error,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      updateCustomer,
      selectShippingRate,
      refresh,
    }),
    [
      cart,
      optimisticCount,
      loading,
      busy,
      error,
      drawerOpen,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      updateCustomer,
      selectShippingRate,
      refresh,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>.');
  return ctx;
}

/** Store API returns minor units as strings — never parse these as dollars. */
export function price(value: string | null | undefined, minorUnit = 2): number {
  return Number(value ?? 0) / 10 ** minorUnit;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
