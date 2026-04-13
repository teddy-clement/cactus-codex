/** @type {import('next').NextConfig} */

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://cotrain-vbeta.vercel.app').split(',').map(s => s.trim())

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/bcrypt'],
  },

  images: {
    unoptimized: true,
  },

  async headers() {
    return [
      // ── Routes publiques consommées par les apps clientes (CORS) ──
      {
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: ALLOWED_ORIGINS.join(',') },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,x-codex-ingest-key' },
          { key: 'Access-Control-Max-Age',       value: '86400' },
        ],
      },
      // ── Sécurité globale (hors CSP, désormais gérée dynamiquement dans le middleware) ──
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
