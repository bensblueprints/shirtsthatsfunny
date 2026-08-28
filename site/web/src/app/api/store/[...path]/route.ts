import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin proxy in front of the WooCommerce Store API.
 *
 * The browser never talks to WordPress directly. This handler holds the cart
 * identity in an httpOnly cookie and replays it, which means:
 *   · no third-party cookies, so the cart survives Safari and friends
 *   · the CMS hostname stays an implementation detail
 *   · one origin, so no CORS preflight on every cart mutation
 *
 * Woo identifies a guest cart with the `Cart-Token` header (a JWT) and guards
 * mutations with `Nonce`. We capture both from every response and send them
 * back up on the next request.
 */

const UPSTREAM = process.env.WC_API_URL ?? 'http://cms/wp-json';
const CART_COOKIE = 'stf_cart';
const NONCE_COOKIE = 'stf_nonce';

const ALLOWED = new Set([
  'cart',
  'cart/add-item',
  'cart/update-item',
  'cart/remove-item',
  'cart/apply-coupon',
  'cart/remove-coupon',
  'cart/select-shipping-rate',
  'cart/update-customer',
  'checkout',
  'products',
  'order',
]);

function isAllowed(path: string): boolean {
  if (ALLOWED.has(path)) return true;
  // `order/123` and `products/456` are fine; nothing deeper is.
  const [head, tail, ...rest] = path.split('/');
  return rest.length === 0 && ALLOWED.has(head) && /^\d+$/.test(tail ?? '');
}

async function forward(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = segments.join('/');

  if (!isAllowed(path)) {
    return NextResponse.json({ message: 'Not a cart route.' }, { status: 404 });
  }

  const url = new URL(`${UPSTREAM}/wc/store/v1/${path}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers = new Headers({ Accept: 'application/json' });
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const cartToken = req.cookies.get(CART_COOKIE)?.value;
  const nonce = req.cookies.get(NONCE_COOKIE)?.value;
  if (cartToken) headers.set('Cart-Token', cartToken);
  if (nonce) headers.set('Nonce', nonce);

  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'The store is not responding. Try again in a moment.' },
      { status: 503 },
    );
  }

  const payload = await upstream.text();
  const res = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });

  // Persist whatever identity Woo just handed back.
  const secure = process.env.NODE_ENV === 'production';
  const freshToken = upstream.headers.get('cart-token');
  const freshNonce = upstream.headers.get('nonce');

  if (freshToken) {
    res.cookies.set(CART_COOKIE, freshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  if (freshNonce) {
    res.cookies.set(NONCE_COOKIE, freshNonce, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }

  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}

export const dynamic = 'force-dynamic';
