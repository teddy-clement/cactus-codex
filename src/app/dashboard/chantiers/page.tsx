'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useApp } from '@/components/dashboard/AppContext'
import type { Chantier } from '@/types'

const STATUS_LABEL: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', bloque: 'Bloqué', termine: 'Terminé' }
const STATUS_CLS: Record<string, string> = { a_faire: '', en_cours: 'pill-mt', bloque: 'pill-of', termine: 'pill-on' }
const PRIO_COLOR: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#6fa876' }

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { apps } = useApp()
  const { showToast } = useToast()

  // Formulaire
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [appKey, setAppKey] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    fetch('/api/chantiers')
      .then(r => r.json())
      .then((data: Chantier[]) => setChantiers(Array.isArray(data) ? data : []))
      .catch(() => showToast('Erreur chargement chantiers', 'er'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    if (apps.length && !appKey) setAppKey(apps[0].app_key || '')
  }, [apps, appKey])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim() || !appKey) { showToast('Titre et application requis', 'er'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/chantiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_key: appKey, titre: titre.trim(), description: description.trim() || null, priority, date_debut: dateDebut || null, date_fin_prevue: dateFin || null }),
      })
      if (res.ok) {
        const newChantier = await res.json()
        setChantiers(prev => [newChantier, ...prev])
        setTitre(''); setDescription(''); setDateDebut(''); setDateFin('')
        showToast('Chantier créé', 'ok')
      } else {
        const err = await res.json()
        showToast(err.error || 'Erreur', 'er')
      }
    } catch { showToast('Erreur réseau', 'er') }
    finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/chantiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setChantiers(prev => prev.map(c => c.id === id ? updated : c))
        showToast(`Chantier → ${STATUS_LABEL[status]}`, 'ok')
      }
    } catch { showToast('Erreur réseau', 'er') }
    finally { setUpdatingId(null) }
  }

  const grouped = {
    en_cours: chantiers.filter(c => c.status === 'en_cours'),
    a_faire: chantiers.filter(c => c.status === 'a_faire'),
    bloque: chantiers.filter(c => c.status === 'bloque'),
    termine: chantiers.filter(c => c.status === 'termine'),
  }

  return (
    <>
      <div className="g2 mb">
        <div className="panel">
          <div className="ph"><div className="pht">Nouveau chantier</div><div className="phg">// créer</div></div>
          <div className="panel-body">
            <form onSubmit={create}>
              <div className="field">
                <label>Application</label>
                <select value={appKey} onChange={e => setAppKey(e.target.value)}>
                  {apps.map(a => <option key={a.id} value={a.app_key || ''}>{a.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Titre</label>
                <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Migration base de données" required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails optionnels…" />
              </div>
              <div className="g2-inner">
                <div className="field">
                  <label>Priorité</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)}>
                    <option value="high">Haute</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date début</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Date fin prévue</label>
                <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
              </div>
              <button type="submit" className="btn-action" disabled={saving}>{saving ? 'Création…' : 'Créer le chantier →'}</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Vue d'ensemble</div><div className="phg">// {chantiers.length} chantier{chantiers.length !== 1 ? 's' : ''}</div></div>
          <div className="panel-body">
            {Object.entries(grouped).map(([status, items]) => (
              <div key={status} className="role-bar">
                <div className="rbl">{STATUS_LABEL[status]}</div>
                <div className="rbb"><div className="rbf" style={{ width: chantiers.length ? (items.length / chantiers.length * 100) + '%' : '0%', background: status === 'termine' ? '#4ade80' : status === 'bloque' ? '#ef4444' : status === 'en_cours' ? '#f59e0b' : '#2e4432' }} /></div>
                <div className="rbp">{items.length}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="panel"><div className="empty">Chargement…</div></div>}

      {!loading && Object.entries(grouped).filter(([, items]) => items.length > 0).map(([status, items]) => (
        <div key={status} className="panel mb">
          <div className="ph">
            <div className="pht">{STATUS_LABEL[status]}</div>
            <div className="phg">// {items.length}</div>
          </div>
          {items.map(c => (
            <div key={c.id} className="schedule-row">
              <div className="schedule-info">
                <div className="flex items-center gap-2">
                  <span className="schedule-app">{c.titre}</span>
                  <span className="font-mono text-[8px] px-1.5 py-0.5 rounded border" style={{ color: PRIO_COLOR[c.priority], borderColor: PRIO_COLOR[c.priority] + '44' }}>{c.priority.toUpperCase()}</span>
                </div>
                {c.description && <span className="schedule-msg">{c.description}</span>}
                <span className="font-mono text-[9px] text-[#384e3c]">
                  {c.app_key}{c.date_debut ? ` · début ${c.date_debut}` : ''}{c.date_fin_prevue ? ` · fin prévue ${c.date_fin_prevue}` : ''}
                </span>
              </div>
              <div className="flex gap-1">
                {c.status === 'a_faire' && <button className="ibtn" onClick={() => updateStatus(c.id, 'en_cours')} disabled={updatingId === c.id} title="Démarrer">▶</button>}
                {c.status === 'en_cours' && <button className="ibtn" onClick={() => updateStatus(c.id, 'termine')} disabled={updatingId === c.id} title="Terminer">✓</button>}
                {c.status === 'en_cours' && <button className="ibtn" onClick={() => updateStatus(c.id, 'bloque')} disabled={updatingId === c.id} title="Bloquer">⏸</button>}
                {c.status === 'bloque' && <button className="ibtn" onClick={() => updateStatus(c.id, 'en_cours')} disabled={updatingId === c.id} title="Débloquer">▶</button>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
