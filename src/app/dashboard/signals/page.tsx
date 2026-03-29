'use client'
import { useEffect, useState } from 'react'
import type { AppSignal } from '@/types'

const SEV_COLOR: Record<string, string> = { error: '#ef4444', warn: '#f59e0b', info: '#4ade80' }
const SEV_FILL: Record<string, string> = { error: 'rgba(239,68,68,.08)', warn: 'rgba(245,158,11,.08)', info: 'rgba(74,222,128,.06)' }

export default function SignalsPage() {
  const [signals, setSignals] = useState<AppSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  function showToast(msg: string, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/signals')
      .then(r => r.json())
      .then((data: AppSignal[]) => { setSignals(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function refresh() {
    setLoading(true)
    const res = await fetch('/api/signals')
    const data: AppSignal[] = await res.json()
    setSignals(data)
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
      <div className="top-row">
        <div className="filter-group">
          {(['all', 'error', 'warn', 'info'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              style={filter === f ? { borderColor: SEV_COLOR[f] || '#4ade80', color: SEV_COLOR[f] || '#4ade80' } : {}}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Tous' : f} <span className="count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={refresh} disabled={loading}>
          {loading ? '…' : '↺ Rafraîchir'}
        </button>
      </div>

      <div className="panel">
        <div className="ph">
          <div className="pht">Signaux structurels — CoTrain</div>
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

      {toast && <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>}

      <style jsx>{`
        .top-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px;gap:12px}
        .filter-group{display:flex;gap:8px}
        .filter-btn{padding:7px 14px;border-radius:5px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;cursor:pointer;background:transparent;color:#6fa876;border:1px solid #233428;transition:all .18s}
        .filter-btn:hover{border-color:#2d6b45;color:#d8eedd}
        .filter-btn.active{background:rgba(74,222,128,.06)}
        .count{margin-left:6px;opacity:.6}
        .refresh-btn{padding:7px 14px;border-radius:5px;font-family:'DM Mono',monospace;font-size:10px;cursor:pointer;background:rgba(74,222,128,.06);color:#4ade80;border:1px solid rgba(74,222,128,.2);transition:all .18s}
        .refresh-btn:hover:not(:disabled){background:rgba(74,222,128,.12)}
        .refresh-btn:disabled{opacity:.4;cursor:not-allowed}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .empty{padding:20px;font-family:'DM Mono',monospace;font-size:11px;color:#384e3c}
        .signal-row{padding:13px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:14px}
        .signal-row:last-child{border-bottom:none}
        .signal-left{display:flex;flex-direction:column;align-items:flex-start;gap:4px;flex-shrink:0;width:90px}
        .sev{font-family:'DM Mono',monospace;font-size:9px;font-weight:800;letter-spacing:.15em}
        .sig-type{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.08em}
        .signal-body{flex:1;min-width:0}
        .sig-title{font-size:12px;font-weight:600;color:#d8eedd;margin-bottom:3px}
        .sig-body{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sig-meta{display:flex;flex-wrap:wrap;gap:5px}
        .meta-tag{font-family:'DM Mono',monospace;font-size:9px;background:#0a120c;border:1px solid #233428;border-radius:3px;padding:1px 6px;color:#384e3c}
        .meta-k{color:#2d6b45;margin-right:4px}
        .signal-right{flex-shrink:0;text-align:right}
        .sig-source{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.1em}
        .sig-time{font-family:'DM Mono',monospace;font-size:9px;color:#6fa876;display:block;margin-top:3px}
        .toast-fixed{position:fixed;bottom:20px;right:20px;background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;z-index:300;animation:slideUp .3s ease both}
        .toast-ok{border-left:3px solid #4ade80}.toast-er{border-left:3px solid #ef4444}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  )
}
