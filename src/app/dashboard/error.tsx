'use client'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Codex Dashboard Error]', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="panel">
      <div className="ph">
        <div className="pht">Erreur de pilotage</div>
        <div className="phg">// une section du cockpit n&apos;a pas repondu</div>
      </div>
      <div className="panel-body">
        <div className="flex items-start gap-4 mb-5">
          <div className="text-4xl" style={{ color: '#ef4444' }}>⚠</div>
          <div className="flex-1">
            <div className="font-display text-lg font-bold text-white mb-2">
              Impossible de charger cette section
            </div>
            <p className="font-mono text-[11px] text-[#6fa876] leading-relaxed">
              Le cockpit a rencontré une anomalie sur cette page. Les autres sections restent opérationnelles.
              Vous pouvez réessayer ou revenir au tableau de bord.
            </p>
          </div>
        </div>

        {isDev && error?.message && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/30 bg-red-500/5 font-mono text-[11px] text-red-400 break-words">
            {error.message}
            {error.digest && <div className="mt-2 text-[#6fa876]">digest: {error.digest}</div>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={reset} className="btn-action flex-1 sm:flex-initial sm:px-8">
            ↻ Réessayer
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-lg font-display font-bold text-sm tracking-widest uppercase border border-[#233428] text-[#6fa876] hover:text-white transition-all text-center"
          >
            ← Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
