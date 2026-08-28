export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-10 w-52 animate-pulse bg-[var(--surface-2)]" />
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} aria-hidden="true">
            <div className="aspect-[400/460] animate-pulse bg-[var(--surface-2)]" />
            <div className="mt-4 h-3 w-3/4 animate-pulse bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
