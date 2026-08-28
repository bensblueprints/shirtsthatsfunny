import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter signup.
 *
 * If KLAVIYO_API_KEY and KLAVIYO_LIST_ID are set, the address is subscribed to
 * that list. Without them the endpoint still validates and accepts the address
 * so the form works out of the box — it just has nowhere to send it, and says
 * so in the server log rather than pretending.
 */

const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY;
const KLAVIYO_LIST = process.env.KLAVIYO_LIST_ID;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Crude per-instance throttle. Behind more than one replica, move this to Redis.
const seen = new Map<string, number[]>();
const WINDOW = 60_000;
const LIMIT = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();
  return hits.length > LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { message: 'Slow down a moment, then try again.' },
      { status: 429 },
    );
  }

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };

  if (!email || !EMAIL.test(email)) {
    return NextResponse.json(
      { message: 'That email address does not look right.' },
      { status: 400 },
    );
  }

  if (KLAVIYO_KEY && KLAVIYO_LIST) {
    try {
      const res = await fetch(
        `https://a.klaviyo.com/api/lists/${KLAVIYO_LIST}/relationships/profiles/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Klaviyo-API-Key ${KLAVIYO_KEY}`,
            'Content-Type': 'application/json',
            revision: '2024-10-15',
          },
          body: JSON.stringify({
            data: [{ type: 'profile', attributes: { email } }],
          }),
        },
      );

      if (!res.ok) {
        console.error('[newsletter] Klaviyo rejected the signup:', res.status);
        return NextResponse.json(
          { message: 'We could not save that just now. Try again shortly.' },
          { status: 502 },
        );
      }
    } catch (err) {
      console.error('[newsletter] Klaviyo unreachable:', err);
      return NextResponse.json(
        { message: 'We could not save that just now. Try again shortly.' },
        { status: 502 },
      );
    }
  } else {
    console.warn(
      `[newsletter] No KLAVIYO_API_KEY/KLAVIYO_LIST_ID set — ${email} was accepted but not stored.`,
    );
  }

  return NextResponse.json({ message: "You're on the list." });
}
