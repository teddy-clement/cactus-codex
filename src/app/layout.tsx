import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CACTUS CODEX — Control Center',
  description: 'Panneau de gestion sécurisé — cactus-codex.com',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
