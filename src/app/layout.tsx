import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cactus Codex',
  description: 'Centre de contrôle applicatif et supervision technique.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cactus Codex',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#07120e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Force la lecture du header x-nonce pour que Next.js applique automatiquement
  // le nonce a ses propres inline scripts/styles (runtime bootstrap, hydration).
  headers().get('x-nonce')

  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
