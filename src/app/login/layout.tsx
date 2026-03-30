import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cactus Codex',
  description: 'Connexion au centre de contrôle Cactus Codex.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
