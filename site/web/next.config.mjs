/** @type {import('next').NextConfig} */
const cms = process.env.NEXT_PUBLIC_CMS_URL ?? 'http://localhost:8080';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'cms' },
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: new URL(cms).hostname },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
