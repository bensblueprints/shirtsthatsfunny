import Link from 'next/link';

import Newsletter from '@/components/Newsletter';

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { href: '/shop', label: 'All shirts' },
      { href: '/shop?category=best-sellers', label: 'Best sellers' },
      { href: '/shop?category=new-in', label: 'New in' },
      { href: '/shop?category=deadpan', label: 'Deadpan' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { href: '/sizing', label: 'Size chart' },
      { href: '/pages/shipping', label: 'Shipping' },
      { href: '/pages/returns', label: 'Returns' },
      { href: '/cart', label: 'Your cart' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/pages/about', label: 'About' },
      { href: '/pages/privacy', label: 'Privacy' },
      { href: '/pages/terms', label: 'Terms' },
    ],
  },
];

/** Real garment care symbols — the footer of a shirt is its care label. */
function CareSymbols() {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 };
  return (
    <div className="flex items-center gap-5 opacity-55" aria-hidden="true">
      {/* wash at 30 */}
      <svg viewBox="0 0 24 24" className="size-5">
        <path d="M3 7h18l-2 12H5L3 7z" {...stroke} />
        <path d="M3 7c3 3 5-1 8 1s5-2 10 -1" {...stroke} />
      </svg>
      {/* do not bleach */}
      <svg viewBox="0 0 24 24" className="size-5">
        <path d="M12 4l8 15H4l8-15z" {...stroke} />
        <path d="M5 5l14 14" {...stroke} />
      </svg>
      {/* tumble dry low */}
      <svg viewBox="0 0 24 24" className="size-5">
        <rect x="3" y="5" width="18" height="14" {...stroke} />
        <circle cx="12" cy="12" r="4.5" {...stroke} />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      </svg>
      {/* iron, low */}
      <svg viewBox="0 0 24 24" className="size-5">
        <path d="M3 16h16c0-5-3-8-8-8H6l-3 8z" {...stroke} />
        <circle cx="10" cy="19" r="0.8" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p
              className="display misregister misregister-hover text-5xl sm:text-6xl"
              data-text="STF"
            >
              STF
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-70">
              Two colours because a third colour is a decision, and decisions are
              exhausting.
            </p>
            <div className="mt-8">
              <Newsletter />
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="spec mb-4 opacity-55">{column.heading}</h2>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-opacity hover:opacity-55"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col-reverse gap-6 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="spec opacity-55">
            © {new Date().getFullYear()} Shirt That&rsquo;s Funny · Wilmington, DE
          </p>
          <div className="flex items-center gap-8">
            <a
              href={`${process.env.NEXT_PUBLIC_CMS_URL ?? 'https://cms.shirtthatsfunny.com'}/wp-admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="spec opacity-55 transition-opacity hover:opacity-100"
            >
              Admin
            </a>
            <span className="spec opacity-55">5.3oz · 100% cotton</span>
            <CareSymbols />
          </div>
        </div>
      </div>
    </footer>
  );
}
