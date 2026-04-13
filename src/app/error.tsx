'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Codex Error]', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0a0f0a' }}>
      <div className="w-full max-w-md text-center">
        <div className="font-display text-6xl font-extrabold mb-4" style={{ color: '#4ade80' }}>⚠</div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-wide">
          Une erreur est survenue
        </h1>
        <p className="font-mono text-xs text-[#6fa876] mb-6">
          // Le cockpit a rencontré une anomalie. Vous pouvez réessayer ou revenir à l&apos;accueil.
        </p>

        {isDev && error?.message && (
          <div className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-500/5 font-mono text-[11px] text-left text-red-400 break-words">
            {error.message}
            {error.digest && <div className="mt-2 text-[#6fa876]">digest: {error.digest}</div>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-lg font-display font-bold text-sm tracking-widest uppercase transition-all"
            style={{ background: '#1a4a2e', color: '#4ade80', border: '1px solid #2d6b45' }}
          >
            ↻ Réessayer
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-lg font-display font-bold text-sm tracking-widest uppercase border border-[#233428] text-[#6fa876] hover:text-white transition-all"
          >
            ← Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
