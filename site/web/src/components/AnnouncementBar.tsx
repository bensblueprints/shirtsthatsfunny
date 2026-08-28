const threshold = process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? '60';

/**
 * A print-shop crawl. The separator is a registration mark, because that's the
 * mark a printer actually puts between plates.
 */
const NOTICES = [
  `Free shipping over $${threshold}`,
  'Printed and shipped in 2 business days',
  '30-day returns, worn or not',
  'Water-based ink, S–3XL',
];

function Run() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {NOTICES.map((notice) => (
        <span key={notice} className="flex items-center">
          <span className="spec px-6 py-2 whitespace-nowrap">{notice}</span>
          <svg viewBox="0 0 12 12" className="size-2.5 shrink-0 opacity-70">
            <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export default function AnnouncementBar() {
  return (
    <div className="overflow-hidden border-b bg-[var(--on-surface)] text-[var(--surface)]">
      <p className="sr-only">
        Free shipping over ${threshold}. Orders ship in two business days. 30-day returns.
      </p>
      <div className="flex w-max crawl">
        <Run />
        <Run />
      </div>
    </div>
  );
}
