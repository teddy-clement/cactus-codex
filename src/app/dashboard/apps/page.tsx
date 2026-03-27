'use client'
import { useEffect, useState } from 'react'
import type { App } from '@/types'

const STATUS_LABEL: Record<string, string> = { online: 'En ligne', maintenance: 'Maintenance', offline: 'Hors ligne' }
const STATUS_CLS:   Record<string, string> = { online: 'pill-on', maintenance: 'pill-mt', offline: 'pill-of' }

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    fetch('/api/apps').then(r => r.json()).then(setApps).finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function toggleMaintenance(app: App) {
    setToggling(app.id)
    const newStatus = app.status === 'maintenance' ? 'online' : 'maintenance'
    try {
      const res = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status: newStatus }),
      })
      const updated = await res.json()
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))
      showToast(
        newStatus === 'maintenance'
          ? `⚙ ${app.name} — maintenance activée`
          : `✓ ${app.name} — remis en ligne`,
        newStatus === 'maintenance' ? 'wn' : 'ok'
      )
    } catch {
      showToast('Erreur lors de la mise à jour', 'er')
    } finally {
      setToggling(null)
    }
  }

  return (
    <>
      <div className="panel">
        <div className="ph"><div className="pht">Applications gérées</div><div className="phg">// {apps.length} apps enregistrées</div></div>
        <div className="trow thead" style={{ gridTemplateColumns: '2fr 1.8fr 1fr 1.2fr 120px' }}>
          <span>Application</span><span>URL</span><span>Statut</span><span>Uptime 30j</span><span>Action</span>
        </div>
        {loading ? (
          <div style={{ padding: '24px 19px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--tx3)' }}>Chargement...</div>
        ) : apps.map(app => (
          <div key={app.id} className="trow" style={{ gridTemplateColumns: '2fr 1.8fr 1fr 1.2fr 120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{app.name}</span>
              <span className={`env env-${app.env}`}>{app.env.toUpperCase()}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--tx3)' }}>{app.url}</div>
            <div>
              <span className={`pill ${STATUS_CLS[app.status]}`}>
                <span className="pill-dot" />
                {STATUS_LABEL[app.status]}
              </span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: app.status === 'maintenance' ? 'var(--amber)' : 'var(--cc-lit)' }}>
                {app.status === 'maintenance' ? '—' : `${app.uptime ?? 99.9}%`}
              </div>
              {app.status !== 'maintenance' && (
                <div className="upr">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className={`ut ${i === 5 ? 'd' : ''}`} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <button
                className={`tbtn ${app.status === 'maintenance' ? 'on' : ''}`}
                onClick={() => toggleMaintenance(app)}
                disabled={toggling === app.id}
              >
                {toggling === app.id ? '...' : '⚙ Maintenance'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>
      )}

      <style jsx>{`
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .trow{display:grid;align-items:center;padding:11px 19px;gap:13px;border-bottom:1px solid var(--border);transition:background .13s}
        .trow:last-child{border-bottom:none}.trow:not(.thead):hover{background:var(--surface2)}
        .trow.thead{padding:9px 19px;border-bottom:1px solid var(--border2)}.trow.thead span{font-family:'DM Mono',monospace;font-size:8.5px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase}
        .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-family:'DM Mono',monospace;font-size:9.5px;font-weight:500}
        .pill-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
        .pill-on{background:rgba(74,222,128,.09);color:#4ade80;border:1px solid rgba(74,222,128,.2)}
        .pill-mt{background:rgba(245,158,11,.09);color:#f59e0b;border:1px solid rgba(245,158,11,.2)}
        .pill-of{background:rgba(239,68,68,.09);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
        .env{font-family:'DM Mono',monospace;font-size:8px;padding:2px 7px;border-radius:3px;border:1px solid;letter-spacing:.1em;display:inline-block}
        .env-production{background:rgba(56,189,248,.06);color:#38bdf8;border-color:rgba(56,189,248,.18)}
        .env-staging,.env-preview{background:rgba(74,222,128,.06);color:#4ade80;border-color:rgba(74,222,128,.18)}
        .env-cloud{background:rgba(59,130,246,.06);color:#3b82f6;border-color:rgba(59,130,246,.18)}
        .upr{display:flex;gap:2px;margin-top:5px}.ut{flex:1;height:5px;border-radius:1px;background:#1a4a2e;opacity:.7}.ut.d{background:#ef4444;opacity:.8}
        .tbtn{padding:5px 13px;border-radius:5px;font-family:'DM Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.1em;cursor:pointer;border:1px solid var(--border2);background:var(--bg2);color:#6fa876;transition:all .17s}
        .tbtn:hover:not(:disabled){background:rgba(245,158,11,.07);color:#f59e0b;border-color:rgba(245,158,11,.22)}
        .tbtn.on{background:rgba(245,158,11,.09);color:#f59e0b;border-color:rgba(245,158,11,.25)}
        .tbtn:disabled{opacity:.5;cursor:not-allowed}
        .toast-fixed{position:fixed;bottom:20px;right:20px;background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:300;animation:slideUp .3s ease both}
        .toast-ok{border-left:3px solid #4ade80}.toast-wn{border-left:3px solid #f59e0b}.toast-er{border-left:3px solid #ef4444}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  )
}
