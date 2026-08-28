import type { Colour } from '@/lib/catalog';

/**
 * The product photography is the product.
 *
 * Every shirt in the catalogue is the same blank in one of two colours with
 * type on the chest, so drawing it beats photographing it: the art is always
 * in register, it inverts with the colour swatch for free, it stays sharp at
 * any size, and adding a design to the store means adding a line of text.
 */

const BODY =
  'M148 34c-20-8-40-4-52 4L26 82c-8 6-10 16-4 24l36 52c5 7 14 9 21 4l17-12v274c0 8 6 14 14 14h180c8 0 14-6 14-14V150l17 12c7 5 16 3 21-4l36-52c6-8 4-18-4-24l-70-44c-12-8-32-12-52-4-8 28-20 42-52 42s-44-14-52-42z';

const COLLAR = 'M152 40c8 28 22 40 48 40s40-12 48-40';
const HEM = 'M96 402h208';
const CUFF_L = 'M30 92l52 34';
const CUFF_R = 'M370 92l-52 34';

/** Break a slogan the way a printer would: balanced lines, no orphans. */
function typeset(slogan: string, maxChars: number): string[] {
  const words = slogan.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  // A single trailing word on its own line reads as a mistake. Pull one back.
  if (lines.length > 1) {
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    if (last.split(' ').length === 1 && last.length <= 3) {
      const prevWords = prev.split(' ');
      if (prevWords.length > 1) {
        lines[lines.length - 1] = `${prevWords.pop()} ${last}`;
        lines[lines.length - 2] = prevWords.join(' ');
      }
    }
  }

  return lines;
}

interface Props {
  slogan: string;
  colour: Colour;
  /** Set on cards so the hover state can drive the print. */
  className?: string;
  /** Decorative in grids; the name is already in the card. */
  ariaHidden?: boolean;
}

export default function TeeMockup({ slogan, colour, className = '', ariaHidden }: Props) {
  const isBlack = colour === 'black';

  const cloth = isBlack ? '#141414' : '#FAFAFA';
  const shade = isBlack ? '#000000' : '#DFDFDB';
  const seam = isBlack ? '#2E2E2E' : '#D2D2CC';
  const ink = isBlack ? '#F4F5F3' : '#0B0B0B';

  const PRINT_WIDTH = 172;
  const lines = typeset(slogan, 15);
  const longest = Math.max(...lines.map((l) => l.length));

  // Bricolage sits near 0.5em average advance at these weights.
  const fontSize = Math.min(30, Math.max(13, PRINT_WIDTH / (longest * 0.5)));
  const leading = fontSize * 1.02;
  const blockTop = 232 - ((lines.length - 1) * leading) / 2;

  const id = `tee-${colour}`;

  return (
    <svg
      viewBox="0 0 400 460"
      className={className}
      role={ariaHidden ? 'presentation' : 'img'}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : `${slogan} on a ${colour} t-shirt`}
    >
      <defs>
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={shade} stopOpacity="0.55" />
          <stop offset="18%" stopColor={shade} stopOpacity="0" />
          <stop offset="82%" stopColor={shade} stopOpacity="0" />
          <stop offset="100%" stopColor={shade} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <path d={BODY} fill={cloth} stroke={seam} strokeWidth="1.5" />
      <path d={BODY} fill={`url(#${id}-fold)`} />

      <g fill="none" stroke={seam} strokeWidth="1.5" strokeLinecap="round">
        <path d={COLLAR} />
        <path d={HEM} opacity="0.6" />
        <path d={CUFF_L} opacity="0.5" />
        <path d={CUFF_R} opacity="0.5" />
      </g>

      <g
        fill={ink}
        fontFamily="var(--font-display), Arial Black, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="-0.02em"
        textAnchor="middle"
      >
        {lines.map((line, i) => (
          <text key={i} x="200" y={blockTop + i * leading}>
            {line.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
