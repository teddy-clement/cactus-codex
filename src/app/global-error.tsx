'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Codex Global Error]', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#0a0f0a', color: '#d8eedd', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: '#4ade80', marginBottom: 16 }}>⚠</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '0.02em' }}>
              Erreur critique
            </h1>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6fa876', marginBottom: 24 }}>
              // Le cockpit a rencontré une anomalie critique. Merci de réessayer.
            </p>

            {isDev && error?.message && (
              <div style={{ marginBottom: 24, padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)', fontFamily: 'monospace', fontSize: 11, textAlign: 'left', color: '#fca5a5', wordBreak: 'break-word' }}>
                {error.message}
                {error.digest && <div style={{ marginTop: 8, color: '#6fa876' }}>digest: {error.digest}</div>}
              </div>
            )}

            <button
              onClick={reset}
              style={{
                padding: '12px 28px',
                borderRadius: 8,
                fontFamily: 'sans-serif',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                background: '#1a4a2e',
                color: '#4ade80',
                border: '1px solid #2d6b45',
              }}
            >
              ↻ Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
