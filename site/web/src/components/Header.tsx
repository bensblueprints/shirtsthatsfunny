'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'motion/react';

import { useCart } from '@/lib/cart';

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/shop?category=new-in', label: 'New in' },
  { href: '/sizing', label: 'Sizing' },
  { href: '/pages/about', label: 'About' },
];

export default function Header() {
  const { count, openDrawer } = useCart();
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setStuck(y > 24));
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-[padding,background-color] duration-300"
      style={{
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        paddingBlock: stuck ? '0.5rem' : '0.9rem',
      }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 sm:px-8">
        <Link
          href="/"
          className="display misregister misregister-hover text-xl sm:text-2xl shrink-0"
          data-text="STF"
        >
          STF
          <span className="sr-only">Shirt That&rsquo;s Funny — home</span>
        </Link>

        <span className="spec hidden lg:block opacity-55">
          Shirt That&rsquo;s Funny — est. two colours
        </span>

        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href.split('?')[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="spec relative py-1 transition-opacity hover:opacity-60"
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-0.5 left-0 h-px w-full bg-current"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/search"
            className="spec p-2 transition-opacity hover:opacity-60"
            aria-label="Search shirts"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" strokeLinecap="round" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            className="spec flex items-center gap-2 border px-3 py-2 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
            aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          >
            Cart
            <span className="relative inline-flex min-w-5 justify-center tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 md:hidden"
            aria-expanded={menuOpen}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="size-5" stroke="currentColor" strokeWidth="1.6">
              <path d={menuOpen ? 'M5 5l14 14M19 5L5 19' : 'M3 7h18M3 17h18'} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden md:hidden"
          >
            <ul className="flex flex-col border-t px-4 pt-2 pb-4 sm:px-8">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="display block py-3 text-3xl">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
