'use client'
import { useEffect, useState } from 'react'
import type { App } from '@/types'

export default function MaintenancePage() {
  const [apps, setApps] = useState<App[]>([])
  const [selectedApp, setSelectedApp] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('')
  const [message, setMessage] = useState('🔧 Maintenance en cours. Retour prévu dans ${durée}.')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    fetch('/api/apps').then(r => r.json()).then((data: App[]) => {
      setApps(data)
      if (data.length) setSelectedApp(data[0].id)
    })
  }, [])

  const maintApps = apps.filter(a => a.status === 'maintenance')

  function showToast(msg: string, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function bringOnline(app: App) {
    const res = await fetch('/api/apps', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: 'online' }),
    })
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'online', maintenance_since: null } : a))
      showToast(`✓ ${app.name} remis en ligne`, 'ok')
    }
  }

  async function scheduleMaintenance(e: React.FormEvent) {
    e.preventDefault()
    showToast('⚙ Maintenance planifiée avec succès', 'wn')
  }

  return (
    <>
      {maintApps.length > 0 && maintApps.map(app => (
        <div key={app.id} className="maint-banner">
          <div className="mb-icon">⚠</div>
          <div className="mb-text">
            <div className="mb-title">{app.name} — En maintenance{app.maintenance_since ? ` depuis ${new Date(app.maintenance_since).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
            <div className="mb-sub">
              {app.maintenance_by ? `Déclenchée par ${app.maintenance_by}` : 'Maintenance active'}
              {' · '}{new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
          <button className="btn-online" onClick={() => bringOnline(app)}>Remettre en ligne</button>
        </div>
      ))}

      {maintApps.length === 0 && (
        <div className="no-maint">✓ Aucune application en maintenance actuellement</div>
      )}

      <div className="g2">
        {maintApps.length > 0 && (
          <div className="panel">
            <div className="ph"><div className="pht">Maintenance active</div><div className="phg">// détails</div></div>
            {maintApps.map(app => (
              <div key={app.id} className="panel-body">
                <div className="info-grid">
                  <div>Application :</div><div>{app.name}</div>
                  <div>Environnement :</div><div>{app.env.toUpperCase()}</div>
                  <div>Déclenchée par :</div><div>{app.maintenance_by || '—'}</div>
                  <div>Depuis :</div><div>{app.maintenance_since ? new Date(app.maintenance_since).toLocaleString('fr-FR') : '—'}</div>
                  <div>Message :</div>
                  <div />
                </div>
                <div className="msg-box">{app.maintenance_message}</div>
              </div>
            ))}
          </div>
        )}

        <div className="panel" style={{ gridColumn: maintApps.length === 0 ? '1 / -1' : 'auto' }}>
          <div className="ph"><div className="pht">Planifier une maintenance</div><div className="phg">// schedule</div></div>
          <div className="panel-body">
            <form onSubmit={scheduleMaintenance}>
              <div className="field">
                <label>Application</label>
                <select value={selectedApp} onChange={e => setSelectedApp(e.target.value)}>
                  {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="g2-inner">
                <div className="field">
                  <label>Date & heure début</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Durée estimée</label>
                  <input type="text" placeholder="ex: 1h30" value={duration} onChange={e => setDuration(e.target.value)} required />
                </div>
              </div>
              <div className="field">
                <label>Message utilisateurs</label>
                <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <button type="submit" className="btn">Planifier →</button>
            </form>
          </div>
        </div>
      </div>

      {toast && <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>}

      <style jsx>{`
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}
        .maint-banner{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.18);border-radius:8px;padding:15px 19px;display:flex;align-items:center;gap:13px;margin-bottom:17px}
        .mb-icon{font-size:17px;flex-shrink:0}.mb-text{flex:1}
        .mb-title{font-weight:600;color:#f59e0b;font-size:13px;margin-bottom:2px}
        .mb-sub{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876}
        .btn-online{padding:8px 15px;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:13px;letter-spacing:.08em;cursor:pointer;background:rgba(74,222,128,.08);color:#4ade80;border:1px solid rgba(74,222,128,.22);transition:all .2s;flex-shrink:0}
        .btn-online:hover{background:rgba(74,222,128,.15);box-shadow:0 0 18px rgba(74,222,128,.1)}
        .no-maint{background:rgba(74,222,128,.04);border:1px solid rgba(74,222,128,.12);border-radius:8px;padding:16px 20px;font-family:'DM Mono',monospace;font-size:12px;color:#4ade80;margin-bottom:17px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .panel-body{padding:19px}
        .info-grid{display:grid;grid-template-columns:130px 1fr;gap:4px 12px;font-family:'DM Mono',monospace;font-size:11px;line-height:2}
        .info-grid>:nth-child(odd){color:#384e3c}.info-grid>:nth-child(even){color:#d8eedd}
        .msg-box{margin-top:12px;padding:13px;background:#0a120c;border:1px solid #233428;border-radius:5px;font-family:'DM Mono',monospace;font-size:11px;color:#6fa876;line-height:1.8}
        .field{margin-bottom:15px}
        .field label{display:block;font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px}
        .field input,.field select,.field textarea{width:100%;background:#0a120c;border:1px solid #233428;border-radius:5px;padding:11px 13px;color:#d8eedd;font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .17s}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:#2d6b45;box-shadow:0 0 0 3px rgba(74,222,128,.07)}
        .field select{appearance:none;cursor:pointer}.field textarea{resize:none;line-height:1.6}
        .g2-inner{display:grid;grid-template-columns:1fr 1fr;gap:11px}
        .btn{display:block;width:100%;padding:13px;background:#1a4a2e;color:#4ade80;border:1px solid #2d6b45;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:6px}
        .btn:hover{background:#2d6b45;color:#fff;box-shadow:0 0 26px rgba(74,222,128,.18);transform:translateY(-1px)}
        .toast-fixed{position:fixed;bottom:20px;right:20px;background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:300;animation:slideUp .3s ease both}
        .toast-ok{border-left:3px solid #4ade80}.toast-wn{border-left:3px solid #f59e0b}.toast-er{border-left:3px solid #ef4444}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  )
}
