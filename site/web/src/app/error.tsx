'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[storefront]', error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-32 text-center">
      <p className="spec opacity-55">Something broke</p>
      <h1 className="display mt-4 text-[clamp(2rem,8vw,4rem)]">Misprint</h1>
      <p className="mt-5 text-sm leading-relaxed opacity-70">
        This page did not load. Your cart is untouched.
      </p>
      <button
        type="button"
        onClick={reset}
        className="spec mt-9 bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
      >
        Try again
      </button>
      {error.digest && <p className="spec mt-6 opacity-35">Ref {error.digest}</p>}
    </div>
  );
}
