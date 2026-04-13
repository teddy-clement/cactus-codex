'use client'
import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'

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
  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [niveau, setNiveau] = useState<'faible' | 'moyen' | 'important'>('moyen')
  const [expiresH, setExpiresH] = useState('4')
  const [saving, setSaving] = useState(false)

  const [history, setHistory] = useState<SentBroadcast[]>([])
  const [active, setActive] = useState<ActiveBroadcast[]>([])
  const [loadingActive, setLoadingActive] = useState(true)
  const [stoppingId, setStoppingId] = useState<number | null>(null)
  const [appError, setCotrainError] = useState<string | null>(null)

  const { showToast } = useToast()

  useEffect(() => {
    fetch('/api/broadcasts')
      .then(r => r.json())
      .then((payload: { data?: SentBroadcast[] } | SentBroadcast[]) => {
        const list = Array.isArray(payload) ? payload : (payload.data || [])
        setHistory(list)
      })
      .catch(() => showToast('Erreur chargement historique broadcasts', 'er'))
  }, [showToast])

  // ── Realtime : historique codex_broadcasts toujours frais ──
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('broadcasts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codex_broadcasts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const b = payload.new as SentBroadcast
          setHistory(prev => {
            if (prev.some(x => x.id === b.id)) return prev
            return [b, ...prev].slice(0, 50)
          })
        } else if (payload.eventType === 'UPDATE') {
          const b = payload.new as SentBroadcast
          setHistory(prev => prev.map(x => x.id === b.id ? b : x))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadActive = useCallback(async () => {
    setLoadingActive(true)
    setCotrainError(null)
    try {
      const res = await fetch('/api/app-broadcasts')
      if (!res.ok) {
        const err = await res.json()
        setCotrainError(err.error || `Erreur ${res.status}`)
        setActive([])
      } else {
        const data: ActiveBroadcast[] = await res.json()
        setActive(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      setCotrainError(`App injoignable : ${String(e)}`)
      setActive([])
    }
    setLoadingActive(false)
  }, [])

  useEffect(() => { loadActive() }, [loadActive])

  // Auto-refresh broadcasts actifs toutes les 30s
  useEffect(() => {
    const interval = setInterval(() => loadActive(), 30000)
    return () => clearInterval(interval)
  }, [loadActive])

  async function stopBroadcast(id: number, broadcastTitre: string) {
    setStoppingId(id)
    const res = await fetch('/api/app-broadcasts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setStoppingId(null)
    if (res.ok) {
      setActive(prev => prev.filter(b => b.id !== id))
      showToast(`✓ Broadcast "${broadcastTitre}" arrêté`, 'ok')
    } else {
      const err = await res.json()
      showToast(err.error || 'Erreur lors de l\'arrêt', 'er')
    }
  }

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
      showToast(payload.ok ? '✓ Broadcast envoyé avec succès' : '⚠ Enregistré mais livraison échouée', payload.ok ? 'ok' : 'wn')
      setTimeout(loadActive, 1500)
    } else {
      showToast(payload.error || 'Erreur', 'er')
    }
  }

  return (
    <>
      {/* ── BLOC 1 : Messages actifs dans l'app ── */}
      <div className="panel active-panel mb-[17px]">
        <div className="ph">
          <div className="pht">
            Messages actifs dans l'app
            {active.length > 0 && <span className="active-count ml-2.5">{active.length}</span>}
          </div>
          <div className="flex items-center gap-2.5">
            {loadingActive && <span className="phg">Chargement…</span>}
            <button className="refresh-btn" onClick={loadActive} disabled={loadingActive}>↺</button>
          </div>
        </div>

        {appError && (
          <div className="app-error">
            ⚠ Impossible de joindre l'app : {appError}
          </div>
        )}

        {!loadingActive && !appError && active.length === 0 && (
          <div className="empty">✓ Aucun broadcast actif en ce moment</div>
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
          <div className="ph"><div className="pht">Envoyer un broadcast</div><div className="phg">// vers l'app</div></div>
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
              <button type="submit" className="btn-action" disabled={saving}>
                {saving ? 'Envoi…' : '📢 Envoyer le broadcast →'}
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
    </>
  )
}
