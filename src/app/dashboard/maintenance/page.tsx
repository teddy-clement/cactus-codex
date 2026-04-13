'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import type { App, MaintenanceSchedule } from '@/types'

export default function MaintenancePage() {
  const [apps, setApps] = useState<App[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [selectedApp, setSelectedApp] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('')
  const [message, setMessage] = useState('🔧 Maintenance en cours. Retour prévu dans ${durée}.')
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { showToast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch('/api/apps').then(r => r.json()),
      fetch('/api/maintenance').then(r => r.json()),
    ]).then(([appsPayload, schedulesPayload]) => {
      // Supporte {data, total} et array direct
      const appsData = (Array.isArray(appsPayload) ? appsPayload : appsPayload.data || []) as App[]
      const schedulesData = (Array.isArray(schedulesPayload) ? schedulesPayload : schedulesPayload.data || []) as MaintenanceSchedule[]
      setApps(appsData)
      if (appsData.length) setSelectedApp(appsData[0].id)
      setSchedules(schedulesData)
    }).catch(() => showToast('Erreur de chargement', 'er'))
  }, [showToast])

  const maintApps = apps.filter(a => a.status === 'maintenance')

  async function bringOnline(app: App) {
    setRestoringId(app.id)
    try {
      const res = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status: 'online' }),
      })
      if (res.ok) {
        setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'online', maintenance_since: null } : a))
        showToast(`✓ ${app.name} remis en ligne`, 'ok')
      } else {
        showToast('Erreur lors de la remise en ligne', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setRestoringId(null)
    }
  }

  async function scheduleMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedApp || !scheduledAt || !duration) {
      showToast('Champs requis manquants', 'er')
      return
    }
    const selectedAppObj = apps.find(a => a.id === selectedApp)
    setSaving(true)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: selectedApp,
          app_name: selectedAppObj?.name || 'Application',
          scheduled_at: scheduledAt,
          estimated_duration: duration,
          message,
        }),
      })
      if (res.ok) {
        const newSchedule = await res.json() as MaintenanceSchedule
        setSchedules(prev => [...prev, newSchedule].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
        setScheduledAt('')
        setDuration('')
        showToast('⚙ Maintenance planifiée avec succès', 'ok')
      } else {
        const err = await res.json()
        showToast(err.error || 'Erreur lors de la planification', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSchedule(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id))
        showToast('Planification supprimée', 'ok')
      } else {
        showToast('Erreur lors de la suppression', 'er')
      }
    } catch {
      showToast('Erreur réseau', 'er')
    } finally {
      setDeletingId(null)
    }
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
          <button className="btn-online" onClick={() => bringOnline(app)} disabled={restoringId === app.id}>
            {restoringId === app.id ? '…' : 'Remettre en ligne'}
          </button>
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
                  <label>Date &amp; heure début</label>
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
              <button type="submit" className="btn-action" disabled={saving}>{saving ? 'Enregistrement…' : 'Planifier →'}</button>
            </form>
          </div>
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="panel mt-[17px]">
          <div className="ph"><div className="pht">Maintenances planifiées</div><div className="phg">// {schedules.length} entrée{schedules.length > 1 ? 's' : ''}</div></div>
          {schedules.map(s => (
            <div key={s.id} className="schedule-row">
              <div className="schedule-info">
                <span className="schedule-app">{s.app_name}</span>
                <span className="schedule-date">{new Date(s.scheduled_at).toLocaleString('fr-FR')} — {s.estimated_duration}</span>
                {s.message && <span className="schedule-msg">{s.message}</span>}
              </div>
              <button className="ibtn-del" onClick={() => deleteSchedule(s.id)} disabled={deletingId === s.id} title="Supprimer">
                {deletingId === s.id ? '…' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
