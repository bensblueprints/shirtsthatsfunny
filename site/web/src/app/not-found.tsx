import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg place-items-center px-4 py-32 text-center">
      <p className="spec opacity-55">404</p>
      <h1
        className="display misregister mt-4 text-[clamp(2.5rem,10vw,6rem)]"
        data-text="Out of register"
      >
        Out of register
      </h1>
      <p className="mt-5 text-sm leading-relaxed opacity-70">
        That page is not on the rack. It may have sold out, or the link may have a
        typo in it.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <Link
          href="/shop"
          className="spec bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
        >
          Shop the rack
        </Link>
        <Link
          href="/"
          className="spec border px-8 py-4 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
