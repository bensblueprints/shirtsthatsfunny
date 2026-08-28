'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

const COUPON = process.env.NEXT_PUBLIC_EXIT_COUPON ?? 'FUNNY10';
const STORAGE_KEY = 'stf.exit-intent';
const COOLDOWN_DAYS = 30;

/** Never interrupt someone who is already buying. */
const SUPPRESSED = ['/checkout', '/cart', '/order'];

function seenRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw) as { at: number };
    return Date.now() - at < COOLDOWN_DAYS * 864e5;
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* private mode — the popup just shows again next visit */
  }
}

export default function ExitIntent() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const armed = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const suppressed = SUPPRESSED.some((p) => pathname.startsWith(p));

  const trigger = useCallback(() => {
    if (!armed.current || seenRecently()) return;
    armed.current = false;
    remember();
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (suppressed || seenRecently()) return;

    // Give people a moment to actually look at the site first.
    const arm = window.setTimeout(() => {
      armed.current = true;
    }, 8000);

    // Desktop: the cursor leaves through the top of the viewport, which in
    // practice means the tab bar, the address bar, or the close button.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };

    // Mobile has no mouseleave. A hard flick back to the top of the page is
    // the closest honest equivalent to "I'm done here".
    let lastY = window.scrollY;
    let lastT = Date.now();
    const onScroll = () => {
      const now = Date.now();
      const dy = window.scrollY - lastY;
      const dt = now - lastT;
      if (dt > 0 && dy < -60 && Math.abs(dy) / dt > 1.6 && window.scrollY < 320) {
        trigger();
      }
      lastY = window.scrollY;
      lastT = now;
    };

    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(arm);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    };
  }, [suppressed, trigger]);

  // Modal hygiene: scroll lock, Escape, focus in and focus back out.
  useEffect(() => {
    if (!open) return;

    const restoreFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      restoreFocus?.focus?.();
    };
  }, [open, close]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COUPON);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={close}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[3px]"
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-[90] grid place-items-center p-4">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-title"
              initial={{ opacity: 0, y: 26, rotate: -0.8 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 16, rotate: 0.4 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="relative w-full max-w-lg border bg-[var(--surface)] p-8 sm:p-10"
            >
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="spec absolute top-4 right-4 p-2 opacity-55 transition-opacity hover:opacity-100"
                aria-label="Close"
              >
                Close
              </button>

              <p className="spec opacity-55">Before you go</p>

              <h2
                id="exit-title"
                className="display misregister mt-3 text-[clamp(2rem,7vw,3.25rem)]"
                data-text="Take 10% off"
              >
                Take 10% off
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-75">
                It works on your first order, on any shirt, in either colour. We are
                not going to pretend it expires in ten minutes.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <code className="spec border border-dashed px-5 py-3 text-base tracking-[0.3em]">
                  {COUPON}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="spec border px-5 py-3 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
                >
                  {copied ? 'Copied' : 'Copy code'}
                </button>
              </div>

              <a
                href="/shop"
                className="spec mt-6 block bg-[var(--on-surface)] py-4 text-center text-[var(--surface)] transition-opacity hover:opacity-85"
              >
                Shop the rack
              </a>

              <p aria-live="polite" className="sr-only">
                {copied ? 'Discount code copied to clipboard' : ''}
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
