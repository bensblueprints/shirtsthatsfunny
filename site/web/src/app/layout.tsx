import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, Martian_Mono } from 'next/font/google';

import '@/styles/globals.css';

import { CartProvider } from '@/lib/cart';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ExitIntent from '@/components/ExitIntent';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
});

const martian = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-martian',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shirtthatsfunny.com';
const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? "Shirt That's Funny";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteTitle} — two colours, six sizes, one joke`,
    template: `%s · ${siteTitle}`,
  },
  description:
    'Funny t-shirts printed in black or white, S through 3XL. Water-based ink on ring-spun cotton. Free shipping over $60.',
  openGraph: {
    type: 'website',
    siteName: siteTitle,
    url: siteUrl,
    title: `${siteTitle} — two colours, six sizes, one joke`,
    description: 'Funny t-shirts in black or white. S through 3XL.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${martian.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-[var(--on-surface)] focus:text-[var(--surface)] focus:px-4 focus:py-2 spec"
        >
          Skip to content
        </a>

        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <ExitIntent />
        </CartProvider>
      </body>
    </html>
  );
}
