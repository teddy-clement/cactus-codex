'use client'
import { useEffect, useState, useCallback } from 'react'

type SentBroadcast = {
  id: string
  titre: string
  message: string
  niveau: 'faible' | 'moyen' | 'important'
  expires_at: string
  created_by: string
  created_at: string
  delivered: boolean
  error: string | null
}

type ActiveBroadcast = {
  id: number
  titre: string
  message: string
  niveau: 'faible' | 'moyen' | 'important'
  created_by: string
  created_at: string
  expires_at: string
  actif: boolean
}

const NIV_COLOR = { important: '#ef4444', moyen: '#f59e0b', faible: '#4ade80' }
const NIV_FILL  = { important: 'rgba(239,68,68,.07)', moyen: 'rgba(245,158,11,.07)', faible: 'rgba(74,222,128,.05)' }

export default function BroadcastsPage() {
  // ── Formulaire envoi ──
  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [niveau, setNiveau] = useState<'faible' | 'moyen' | 'important'>('moyen')
  const [expiresH, setExpiresH] = useState('4')
  const [saving, setSaving] = useState(false)

  // ── Historique envois Codex ──
  const [history, setHistory] = useState<SentBroadcast[]>([])

  // ── Broadcasts actifs dans CoTrain ──
  const [active, setActive] = useState<ActiveBroadcast[]>([])
  const [loadingActive, setLoadingActive] = useState(true)
  const [stoppingId, setStoppingId] = useState<number | null>(null)
  const [cotrainError, setCotrainError] = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  function showToast(msg: string, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Charge l'historique local Codex
  useEffect(() => {
    fetch('/api/broadcasts')
      .then(r => r.json())
      .then((data: SentBroadcast[]) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Charge les broadcasts actifs dans CoTrain
  const loadActive = useCallback(async () => {
    setLoadingActive(true)
    setCotrainError(null)
    try {
      const res = await fetch('/api/cotrain-broadcasts')
      if (!res.ok) {
        const err = await res.json()
        setCotrainError(err.error || `Erreur ${res.status}`)
        setActive([])
      } else {
        const data: ActiveBroadcast[] = await res.json()
        setActive(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      setCotrainError(`CoTrain injoignable : ${String(e)}`)
      setActive([])
    }
    setLoadingActive(false)
  }, [])

  useEffect(() => { loadActive() }, [loadActive])

  // Stopper un broadcast actif
  async function stopBroadcast(id: number, titre: string) {
    setStoppingId(id)
    const res = await fetch('/api/cotrain-broadcasts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setStoppingId(null)
    if (res.ok) {
      setActive(prev => prev.filter(b => b.id !== id))
      showToast(`✓ Broadcast "${titre}" arrêté`, 'ok')
    } else {
      const err = await res.json()
      showToast(err.error || 'Erreur lors de l\'arrêt', 'er')
    }
  }

  // Envoyer un nouveau broadcast
  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim() || !message.trim()) { showToast('Titre et message requis', 'er'); return }
    setSaving(true)
    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: titre.trim(), message: message.trim(), niveau, expires_in_hours: Number(expiresH) || 4 }),
    })
    const payload = await res.json()
    setSaving(false)
    if (res.ok || res.status === 207) {
      const newEntry: SentBroadcast = {
        id: crypto.randomUUID(),
        titre: titre.trim(), message: message.trim(), niveau,
        expires_at: new Date(Date.now() + (Number(expiresH) || 4) * 3600000).toISOString(),
        created_by: 'Moi', created_at: new Date().toISOString(),
        delivered: payload.ok === true,
        error: payload.detail || null,
      }
      setHistory(prev => [newEntry, ...prev])
      setTitre(''); setMessage('')
      showToast(payload.ok ? '✓ Broadcast envoyé dans CoTrain' : `⚠ Enregistré mais livraison échouée`, payload.ok ? 'ok' : 'wn')
      // Rafraîchir la liste active
      setTimeout(loadActive, 1500)
    } else {
      showToast(payload.error || 'Erreur', 'er')
    }
  }

  return (
    <>
      {/* ── BLOC 1 : Messages actifs dans CoTrain ── */}
      <div className="panel active-panel" style={{ marginBottom: 17 }}>
        <div className="ph">
          <div className="pht">
            Messages actifs dans CoTrain
            {active.length > 0 && <span className="active-count">{active.length}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {loadingActive && <span className="phg">Chargement…</span>}
            <button className="refresh-btn" onClick={loadActive} disabled={loadingActive}>↺</button>
          </div>
        </div>

        {cotrainError && (
          <div className="cotrain-error">
            ⚠ Impossible de joindre CoTrain : {cotrainError}
          </div>
        )}

        {!loadingActive && !cotrainError && active.length === 0 && (
          <div className="empty">✓ Aucun broadcast actif en ce moment dans CoTrain</div>
        )}

        {active.map(b => (
          <div key={b.id} className="active-row" style={{ borderLeft: `3px solid ${NIV_COLOR[b.niveau]}`, background: NIV_FILL[b.niveau] }}>
            <div className="active-badge" style={{ color: NIV_COLOR[b.niveau] }}>{b.niveau.toUpperCase()}</div>
            <div className="active-body">
              <div className="active-titre">{b.titre}</div>
              <div className="active-msg">{b.message}</div>
              <div className="active-meta">
                Par {b.created_by} · expire {new Date(b.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              className="stop-btn"
              onClick={() => stopBroadcast(b.id, b.titre)}
              disabled={stoppingId === b.id}
            >
              {stoppingId === b.id ? '…' : '⏹ Arrêter'}
            </button>
          </div>
        ))}
      </div>

      {/* ── BLOC 2 : Envoi + Historique ── */}
      <div className="g2">
        <div className="panel">
          <div className="ph"><div className="pht">Envoyer un broadcast</div><div className="phg">// vers CoTrain</div></div>
          <div className="panel-body">
            <form onSubmit={send}>
              <div className="field">
                <label>Titre</label>
                <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="ex: Mise à jour déployée" required />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Texte visible par les agents…" required />
              </div>
              <div className="g2-inner">
                <div className="field">
                  <label>Niveau</label>
                  <select value={niveau} onChange={e => setNiveau(e.target.value as typeof niveau)}>
                    <option value="important">🔴 Important</option>
                    <option value="moyen">🟡 Moyen</option>
                    <option value="faible">🟢 Faible</option>
                  </select>
                </div>
                <div className="field">
                  <label>Durée (heures)</label>
                  <input type="number" min="1" max="72" value={expiresH} onChange={e => setExpiresH(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Envoi…' : '📢 Envoyer vers CoTrain →'}
              </button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Historique envoyés</div><div className="phg">// {history.length} entrée{history.length !== 1 ? 's' : ''}</div></div>
          {history.length === 0 && <div className="empty">Aucun broadcast envoyé.</div>}
          {history.map(b => (
            <div key={b.id} className="bc-row" style={{ borderLeft: `3px solid ${NIV_COLOR[b.niveau]}`, background: NIV_FILL[b.niveau] }}>
              <div className="bc-left">
                <span className="bc-niveau" style={{ color: NIV_COLOR[b.niveau] }}>{b.niveau.toUpperCase()}</span>
                <span className={`bc-status ${b.delivered ? 'ok' : 'fail'}`}>{b.delivered ? '✓ livré' : '✗ échec'}</span>
              </div>
              <div className="bc-body">
                <div className="bc-titre">{b.titre}</div>
                <div className="bc-msg">{b.message}</div>
                {b.error && <div className="bc-err">{b.error}</div>}
              </div>
              <div className="bc-right">
                <time className="bc-time">{new Date(b.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                <div className="bc-exp">exp. {new Date(b.expires_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>}

      <style jsx>{`
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}
        .g2-inner{display:grid;grid-template-columns:1fr 1fr;gap:11px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .active-panel{border-color:rgba(245,158,11,.3)}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em;display:flex;align-items:center;gap:10px}
        .active-count{background:#ef4444;color:#fff;border-radius:999px;font-size:10px;font-weight:800;padding:1px 7px;font-family:'DM Mono',monospace}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .refresh-btn{padding:5px 10px;border-radius:5px;font-size:12px;cursor:pointer;background:rgba(74,222,128,.06);color:#4ade80;border:1px solid rgba(74,222,128,.2);transition:all .18s}
        .refresh-btn:hover:not(:disabled){background:rgba(74,222,128,.14)}
        .refresh-btn:disabled{opacity:.4;cursor:not-allowed}
        .cotrain-error{padding:14px 20px;font-family:'DM Mono',monospace;font-size:11px;color:#f59e0b;background:rgba(245,158,11,.06);border-bottom:1px solid rgba(245,158,11,.15)}
        .empty{padding:16px 20px;font-family:'DM Mono',monospace;font-size:11px;color:#384e3c}
        .active-row{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px}
        .active-row:last-child{border-bottom:none}
        .active-badge{font-family:'DM Mono',monospace;font-size:9px;font-weight:800;letter-spacing:.12em;flex-shrink:0;width:70px}
        .active-body{flex:1;min-width:0}
        .active-titre{font-size:13px;font-weight:700;color:#d8eedd;margin-bottom:2px}
        .active-msg{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}
        .active-meta{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c}
        .stop-btn{flex-shrink:0;padding:7px 13px;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:12px;letter-spacing:.08em;cursor:pointer;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.25);transition:all .18s}
        .stop-btn:hover:not(:disabled){background:rgba(239,68,68,.18);box-shadow:0 0 14px rgba(239,68,68,.12)}
        .stop-btn:disabled{opacity:.4;cursor:not-allowed}
        .panel-body{padding:19px}
        .field{margin-bottom:15px}
        .field label{display:block;font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px}
        .field input,.field select,.field textarea{width:100%;background:#0a120c;border:1px solid #233428;border-radius:5px;padding:11px 13px;color:#d8eedd;font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .17s;box-sizing:border-box}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:#2d6b45;box-shadow:0 0 0 3px rgba(74,222,128,.07)}
        .field textarea{resize:none;line-height:1.6}
        .btn{display:block;width:100%;padding:13px;background:#1a4a2e;color:#4ade80;border:1px solid #2d6b45;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:6px}
        .btn:hover:not(:disabled){background:#2d6b45;color:#fff;box-shadow:0 0 26px rgba(74,222,128,.18)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .bc-row{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px}
        .bc-row:last-child{border-bottom:none}
        .bc-left{display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:75px}
        .bc-niveau{font-family:'DM Mono',monospace;font-size:9px;font-weight:800;letter-spacing:.12em}
        .bc-status{font-family:'DM Mono',monospace;font-size:9px}
        .bc-status.ok{color:#4ade80}.bc-status.fail{color:#ef4444}
        .bc-body{flex:1;min-width:0}
        .bc-titre{font-size:12px;font-weight:700;color:#d8eedd;margin-bottom:2px}
        .bc-msg{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bc-err{font-family:'DM Mono',monospace;font-size:10px;color:#ef4444;margin-top:2px}
        .bc-right{flex-shrink:0;text-align:right}
        .bc-time{font-family:'DM Mono',monospace;font-size:9px;color:#6fa876;display:block}
        .bc-exp{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;margin-top:1px}
        .toast-fixed{position:fixed;bottom:20px;right:20px;background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;z-index:300;animation:slideUp .3s ease both}
        .toast-ok{border-left:3px solid #4ade80}.toast-wn{border-left:3px solid #f59e0b}.toast-er{border-left:3px solid #ef4444}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  )
}
