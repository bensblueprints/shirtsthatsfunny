import type { Metadata } from 'next';
import Link from 'next/link';

import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Sizing',
  description: 'Measurements for every size, S through 3XL. Unisex fit, true to size.',
};

/** Body width and length are measured flat, in inches, as a printer would. */
const CHART = [
  { size: 'S', chest: 18, length: 28, sleeve: 8 },
  { size: 'M', chest: 20, length: 29, sleeve: 8.5 },
  { size: 'L', chest: 22, length: 30, sleeve: 9 },
  { size: 'XL', chest: 24, length: 31, sleeve: 9.5 },
  { size: '2XL', chest: 26, length: 32, sleeve: 10 },
  { size: '3XL', chest: 28, length: 33, sleeve: 10.5 },
];

const cm = (inches: number) => Math.round(inches * 2.54);
const widest = CHART[CHART.length - 1].chest;

export default function SizingPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-8">
      <header className="max-w-xl">
        <p className="spec opacity-55">One unisex cut</p>
        <h1 className="display mt-3 text-[var(--text-section)]">Size chart</h1>
        <p className="mt-5 text-sm leading-relaxed opacity-75">
          Lay a shirt you already like flat, measure it pit to pit, and match that
          number to the chest column. That is more reliable than measuring yourself.
        </p>
      </header>

      {/* ── The run, drawn to scale ───────────────────────────────────────── */}
      <Reveal className="mt-14">
        <h2 className="spec mb-5 opacity-55">Chest, to scale</h2>
        <ul className="space-y-2.5">
          {CHART.map((row) => (
            <li key={row.size} className="flex items-center gap-4">
              <span className="spec w-10 shrink-0">{row.size}</span>
              <div className="h-7 flex-1 bg-[var(--surface-2)]">
                <div
                  className="h-full bg-[var(--on-surface)]"
                  style={{ width: `${(row.chest / widest) * 100}%` }}
                />
              </div>
              <span className="spec w-24 shrink-0 text-right tabular-nums">
                {row.chest}&Prime; / {cm(row.chest)}cm
              </span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ── Full measurements ─────────────────────────────────────────────── */}
      <Reveal className="mt-16">
        <h2 className="spec mb-5 opacity-55">Every measurement</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Garment measurements in inches and centimetres for sizes S through 3XL
            </caption>
            <thead>
              <tr className="border-y">
                <th scope="col" className="spec py-3 text-left">Size</th>
                <th scope="col" className="spec py-3 text-right">Chest (flat)</th>
                <th scope="col" className="spec py-3 text-right">Length</th>
                <th scope="col" className="spec py-3 text-right">Sleeve</th>
              </tr>
            </thead>
            <tbody>
              {CHART.map((row) => (
                <tr key={row.size} className="border-b">
                  <th scope="row" className="spec py-3.5 text-left">{row.size}</th>
                  <td className="py-3.5 text-right tabular-nums">
                    {row.chest}&Prime; <span className="opacity-45">/ {cm(row.chest)}cm</span>
                  </td>
                  <td className="py-3.5 text-right tabular-nums">
                    {row.length}&Prime; <span className="opacity-45">/ {cm(row.length)}cm</span>
                  </td>
                  <td className="py-3.5 text-right tabular-nums">
                    {row.sleeve}&Prime; <span className="opacity-45">/ {cm(row.sleeve)}cm</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="spec mt-4 opacity-45">
          Tolerance ±0.5&Prime;. 2XL is $2 up and 3XL is $4 up — that is the blank cost,
          not a markup.
        </p>
      </Reveal>

      <Reveal className="mt-16 grid gap-8 border-t pt-10 sm:grid-cols-2">
        <div>
          <h2 className="display text-2xl">Between sizes?</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-70">
            Take the larger one. The cut is straight rather than tapered, so sizing up
            reads as relaxed instead of baggy.
          </p>
        </div>
        <div>
          <h2 className="display text-2xl">Got it wrong?</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-70">
            Wrong size is on us. We pay the return shipping and send the right one.{' '}
            <Link href="/pages/returns" className="underline underline-offset-4">
              How returns work
            </Link>
            .
          </p>
        </div>
      </Reveal>

      <Link
        href="/shop"
        className="spec mt-14 inline-block bg-[var(--on-surface)] px-8 py-4 text-[var(--surface)] transition-opacity hover:opacity-85"
      >
        Shop the rack
      </Link>
    </div>
  );
}
