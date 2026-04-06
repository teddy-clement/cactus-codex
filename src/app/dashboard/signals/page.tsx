'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { AppSignal } from '@/types'

const SEV_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80' }
const SEV_FILL: Record<string, string> = { error: 'rgba(239,68,68,.08)', warn: 'rgba(245,158,11,.08)', info: 'rgba(74,222,128,.06)' }

export default function SignalsPage() {
  const [signals, setSignals] = useState<AppSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all')
  const { showToast } = useToast()

  async function loadSignals(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/signals?limit=50')
      const json = await res.json()
      setSignals(json.data || json)
      if (!silent) setLoading(false)
    } catch {
      if (!silent) { setLoading(false); showToast('Erreur de chargement des signaux', 'er') }
    }
  }

  useEffect(() => { loadSignals() }, [])

  // Auto-refresh toutes les 30s
  useEffect(() => {
    const interval = setInterval(() => loadSignals(true), 30000)
    return () => clearInterval(interval)
  }, [])

  async function refresh() {
    setLoading(true)
    await loadSignals()
    setLoading(false)
    showToast('Signaux rafraîchis', 'ok')
  }

  const filtered = filter === 'all' ? signals : signals.filter(s => s.severity === filter)
  const counts = {
    all: signals.length,
    error: signals.filter(s => s.severity === 'error').length,
    warn: signals.filter(s => s.severity === 'warn').length,
    info: signals.filter(s => s.severity === 'info').length,
  }

  return (
    <>
      <div className="signals-top">
        <div className="filter-group">
          {(['all', 'error', 'warn', 'info'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              style={filter === f ? { borderColor: SEV_COLOR[f] || '#4ade80', color: SEV_COLOR[f] || '#4ade80' } : {}}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Tous' : f} <span className="filter-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={refresh} disabled={loading}>
          {loading ? '…' : '↺ Rafraîchir'}
        </button>
      </div>

      <div className="panel">
        <div className="ph">
          <div className="pht">Signaux structurels</div>
          <div className="phg">// {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {loading && <div className="empty">Chargement…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty">✓ Aucun signal pour ce filtre</div>
        )}

        {!loading && filtered.map(signal => (
          <div key={signal.id} className="signal-row" style={{ borderLeft: `3px solid ${SEV_COLOR[signal.severity] || '#4ade80'}`, background: SEV_FILL[signal.severity] }}>
            <div className="signal-left">
              <span className="sev" style={{ color: SEV_COLOR[signal.severity] }}>{signal.severity.toUpperCase()}</span>
              <span className="sig-type">{signal.signal_type}</span>
            </div>
            <div className="signal-body">
              <div className="sig-title">{signal.title}</div>
              {signal.body && <div className="sig-body">{signal.body}</div>}
              {signal.metadata && Object.keys(signal.metadata).length > 0 && (
                <div className="sig-meta">
                  {Object.entries(signal.metadata).map(([k, v]) => (
                    <span key={k} className="meta-tag"><span className="meta-k">{k}</span>{String(v)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="signal-right">
              <div className="sig-source">{signal.source}</div>
              <time className="sig-time">
                {new Date(signal.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
