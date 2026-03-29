'use client'
import { useEffect, useState } from 'react'

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

const NIV_COLOR = { important: '#ef4444', moyen: '#f59e0b', faible: '#4ade80' }
const NIV_FILL = { important: 'rgba(239,68,68,.07)', moyen: 'rgba(245,158,11,.07)', faible: 'rgba(74,222,128,.05)' }

export default function BroadcastsPage() {
  const [history, setHistory] = useState<SentBroadcast[]>([])
  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [niveau, setNiveau] = useState<'faible' | 'moyen' | 'important'>('moyen')
  const [expiresH, setExpiresH] = useState('4')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  function showToast(msg: string, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetch('/api/broadcasts')
      .then(r => r.json())
      .then((data: SentBroadcast[]) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

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
      showToast(payload.ok ? '✓ Broadcast envoyé dans CoTrain' : `⚠ Enregistré mais livraison échouée : ${payload.detail}`, payload.ok ? 'ok' : 'wn')
    } else {
      showToast(payload.error || 'Erreur', 'er')
    }
  }

  return (
    <>
      <div className="g2">
        {/* ── Formulaire ── */}
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
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Texte du broadcast visible par les agents…" required />
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

        {/* ── Info ── */}
        <div className="panel info-panel">
          <div className="ph"><div className="pht">Comment ça fonctionne</div><div className="phg">// documentation</div></div>
          <div className="panel-body">
            <div className="doc-block">
              <div className="doc-title">📡 Canal de diffusion</div>
              <p>Ce formulaire envoie un broadcast directement dans CoTrain via son endpoint webhook sécurisé. Le message apparaît immédiatement dans la messagerie et les notifications de tous les agents connectés.</p>
            </div>
            <div className="doc-block">
              <div className="doc-title">🔴 Niveaux</div>
              <p><strong>Important</strong> — popup immédiate + notif urgente<br /><strong>Moyen</strong> — bandeau visible<br /><strong>Faible</strong> — info discrète</p>
            </div>
            <div className="doc-block">
              <div className="doc-title">⚙ Prérequis</div>
              <p>Variables d'env requises :<br /><code>COTRAIN_WEBHOOK_URL</code><br /><code>COTRAIN_WEBHOOK_SECRET</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historique ── */}
      <div className="panel" style={{ marginTop: 17 }}>
        <div className="ph"><div className="pht">Historique des broadcasts envoyés</div><div className="phg">// {history.length} entrée{history.length !== 1 ? 's' : ''}</div></div>
        {history.length === 0 && <div className="empty">Aucun broadcast envoyé pour le moment.</div>}
        {history.map(b => (
          <div key={b.id} className="bc-row" style={{ borderLeft: `3px solid ${NIV_COLOR[b.niveau]}`, background: NIV_FILL[b.niveau] }}>
            <div className="bc-left">
              <span className="bc-niveau" style={{ color: NIV_COLOR[b.niveau] }}>{b.niveau.toUpperCase()}</span>
              <span className={`bc-status ${b.delivered ? 'ok' : 'fail'}`}>{b.delivered ? '✓ livré' : '✗ échec'}</span>
            </div>
            <div className="bc-body">
              <div className="bc-titre">{b.titre}</div>
              <div className="bc-msg">{b.message}</div>
              {b.error && <div className="bc-err">Erreur : {b.error}</div>}
            </div>
            <div className="bc-right">
              <div className="bc-by">{b.created_by}</div>
              <time className="bc-time">{new Date(b.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
              <div className="bc-exp">exp. {new Date(b.expires_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>}

      <style jsx>{`
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}
        .g2-inner{display:grid;grid-template-columns:1fr 1fr;gap:11px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .panel-body{padding:19px}
        .field{margin-bottom:15px}
        .field label{display:block;font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase;margin-bottom:6px}
        .field input,.field select,.field textarea{width:100%;background:#0a120c;border:1px solid #233428;border-radius:5px;padding:11px 13px;color:#d8eedd;font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .17s;box-sizing:border-box}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:#2d6b45;box-shadow:0 0 0 3px rgba(74,222,128,.07)}
        .field textarea{resize:none;line-height:1.6}
        .btn{display:block;width:100%;padding:13px;background:#1a4a2e;color:#4ade80;border:1px solid #2d6b45;border-radius:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .2s;margin-top:6px}
        .btn:hover:not(:disabled){background:#2d6b45;color:#fff;box-shadow:0 0 26px rgba(74,222,128,.18)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .doc-block{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)}
        .doc-block:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
        .doc-title{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:#fff;margin-bottom:6px}
        .doc-block p{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;line-height:1.8;margin:0}
        .doc-block code{color:#4ade80;background:#0a120c;padding:1px 5px;border-radius:3px;font-size:10px;display:block;margin-top:2px}
        .empty{padding:20px;font-family:'DM Mono',monospace;font-size:11px;color:#384e3c}
        .bc-row{padding:13px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:14px}
        .bc-row:last-child{border-bottom:none}
        .bc-left{display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:80px}
        .bc-niveau{font-family:'DM Mono',monospace;font-size:9px;font-weight:800;letter-spacing:.12em}
        .bc-status{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em}
        .bc-status.ok{color:#4ade80}.bc-status.fail{color:#ef4444}
        .bc-body{flex:1;min-width:0}
        .bc-titre{font-size:12px;font-weight:700;color:#d8eedd;margin-bottom:3px}
        .bc-msg{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .bc-err{font-family:'DM Mono',monospace;font-size:10px;color:#ef4444;margin-top:3px}
        .bc-right{flex-shrink:0;text-align:right}
        .bc-by{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c}
        .bc-time{font-family:'DM Mono',monospace;font-size:9px;color:#6fa876;display:block;margin-top:2px}
        .bc-exp{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;margin-top:1px}
        .toast-fixed{position:fixed;bottom:20px;right:20px;background:#111a12;border:1px solid #233428;border-radius:9px;padding:12px 17px;font-family:'DM Mono',monospace;font-size:12px;color:#d8eedd;z-index:300;animation:slideUp .3s ease both}
        .toast-ok{border-left:3px solid #4ade80}.toast-wn{border-left:3px solid #f59e0b}.toast-er{border-left:3px solid #ef4444}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </>
  )
}
