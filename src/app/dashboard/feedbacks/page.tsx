'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { UserFeedback } from '@/types'

const SEV_COLOR: Record<string, string> = { critical: '#ef4444', warn: '#f59e0b', info: '#4ade80' }
const STATUS_LABEL: Record<string, string> = { nouveau: 'Nouveau', en_cours: 'En cours', 'résolu': 'Résolu', 'ignoré': 'Ignoré' }
const STATUS_CLS: Record<string, string> = { nouveau: 'pill-of', en_cours: 'pill-mt', 'résolu': 'pill-on', 'ignoré': '' }

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { showToast } = useToast()

  async function load(p: number, status: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (status) params.set('status', status)
      const res = await fetch(`/api/feedbacks?${params}`)
      const data = await res.json()
      setFeedbacks(data.data || [])
      setTotal(data.total || 0)
    } catch {
      showToast('Erreur de chargement des feedbacks', 'er')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page, filter) }, [page, filter])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setFeedbacks(prev => prev.map(f => f.id === id ? updated : f))
        showToast(`Feedback → ${STATUS_LABEL[status]}`, 'ok')
      } else {
        showToast('Erreur lors de la mise à jour', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <>
      <div className="signals-top">
        <div className="filter-group">
          {['', 'nouveau', 'en_cours', 'résolu', 'ignoré'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => { setFilter(f); setPage(1) }}
            >
              {f ? STATUS_LABEL[f] : 'Tous'}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] text-[#384e3c]">{total} remontée{total !== 1 ? 's' : ''}</div>
      </div>

      <div className="panel">
        <div className="ph">
          <div className="pht">Remontées utilisateurs</div>
          <div className="phg">// feedbacks apps clientes</div>
        </div>

        {loading && <div className="empty">Chargement…</div>}

        {!loading && feedbacks.length === 0 && (
          <div className="empty">✓ Aucune remontée pour ce filtre</div>
        )}

        {!loading && feedbacks.map(fb => (
          <div key={fb.id} className="signal-row" style={{ borderLeft: `3px solid ${SEV_COLOR[fb.severity] || '#4ade80'}` }}>
            <div className="signal-left">
              <span className="sev" style={{ color: SEV_COLOR[fb.severity] }}>{fb.severity.toUpperCase()}</span>
              <span className="sig-type">{fb.app_key}</span>
            </div>
            <div className="signal-body">
              <div className="sig-title">{fb.message}</div>
              <div className="sig-body">
                {fb.user_email || 'Anonyme'}{fb.user_role ? ` · ${fb.user_role}` : ''}
              </div>
              {fb.admin_note && <div className="font-mono text-[9px] text-[#6fa876] mt-1">Note : {fb.admin_note}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`pill ${STATUS_CLS[fb.status] || ''}`}>{STATUS_LABEL[fb.status]}</span>
              <time className="sig-time">
                {new Date(fb.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </time>
              <div className="flex gap-1">
                {fb.status === 'nouveau' && (
                  <button className="ibtn" onClick={() => updateStatus(fb.id, 'en_cours')} disabled={updatingId === fb.id}>▶</button>
                )}
                {(fb.status === 'nouveau' || fb.status === 'en_cours') && (
                  <button className="ibtn" onClick={() => updateStatus(fb.id, 'résolu')} disabled={updatingId === fb.id}>✓</button>
                )}
                {fb.status === 'nouveau' && (
                  <button className="ibtn" onClick={() => updateStatus(fb.id, 'ignoré')} disabled={updatingId === fb.id}>✕</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button className="filter-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
          <span className="font-mono text-[10px] text-[#6fa876]">{page} / {totalPages}</span>
          <button className="filter-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</button>
        </div>
      )}
    </>
  )
}
