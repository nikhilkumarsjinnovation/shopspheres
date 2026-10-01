/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"),
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "img-src 'self' data: blob: https:",
            "media-src 'self' data: blob:",
            "worker-src 'self' blob:",
            "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default nextConfig;
