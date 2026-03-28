'use client'

import { useEffect, useMemo, useState } from 'react'
import type { App } from '@/types'

type ToastState = { msg: string; type: 'ok' | 'wn' | 'er' } | null

type Drafts = Record<string, {
  maintenance_message: string
  public_login_message: string
  public_home_message: string
  control_note: string
  login_notice_enabled: boolean
  home_notice_enabled: boolean
  reboot_required: boolean
}>

const STATUS_LABEL: Record<string, string> = {
  online: 'En ligne',
  maintenance: 'Maintenance',
  offline: 'Hors ligne',
}

const STATUS_CLS: Record<string, string> = {
  online: 'pill-on',
  maintenance: 'pill-mt',
  offline: 'pill-of',
}

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [drafts, setDrafts] = useState<Drafts>({})

  useEffect(() => {
    fetch('/api/apps')
      .then((response) => response.json())
      .then((data: App[]) => {
        setApps(data)
        const nextDrafts: Drafts = {}
        data.forEach((app) => {
          nextDrafts[app.id] = {
            maintenance_message: app.maintenance_message || '🔧 Maintenance en cours. Retour très bientôt.',
            public_login_message: app.public_login_message || '',
            public_home_message: app.public_home_message || '',
            control_note: app.control_note || '',
            login_notice_enabled: !!app.login_notice_enabled,
            home_notice_enabled: !!app.home_notice_enabled,
            reboot_required: !!app.reboot_required,
          }
        })
        setDrafts(nextDrafts)
      })
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, type: 'ok' | 'wn' | 'er' = 'ok') {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3600)
  }

  function updateDraft(appId: string, patch: Partial<Drafts[string]>) {
    setDrafts((current) => ({
      ...current,
      [appId]: {
        ...current[appId],
        ...patch,
      },
    }))
  }

  async function patchApp(appId: string, patch: Record<string, unknown>, successMessage: string, type: 'ok' | 'wn' | 'er' = 'ok') {
    setSavingId(appId)
    try {
      const response = await fetch('/api/apps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, ...patch }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Erreur de mise à jour.')
      }
      setApps((current) => current.map((app) => (app.id === appId ? payload : app)))
      showToast(successMessage, type)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erreur inattendue.', 'er')
    } finally {
      setSavingId(null)
    }
  }

  async function toggleMaintenance(app: App) {
    const draft = drafts[app.id]
    const nextStatus = app.status === 'maintenance' ? 'online' : 'maintenance'
    await patchApp(
      app.id,
      {
        status: nextStatus,
        maintenance_message: draft?.maintenance_message,
      },
      nextStatus === 'maintenance'
        ? `${app.name} passe en maintenance.`
        : `${app.name} est remis en ligne.`,
      nextStatus === 'maintenance' ? 'wn' : 'ok'
    )
  }

  async function saveCommunications(app: App) {
    const draft = drafts[app.id]
    await patchApp(
      app.id,
      {
        public_login_message: draft.public_login_message,
        public_home_message: draft.public_home_message,
        login_notice_enabled: draft.login_notice_enabled,
        home_notice_enabled: draft.home_notice_enabled,
        control_note: draft.control_note,
        reboot_required: draft.reboot_required,
      },
      `${app.name} — communications enregistrées.`
    )
  }

  async function confirmRestart(app: App) {
    await patchApp(app.id, { last_restart_at: 'now' }, `${app.name} — redémarrage confirmé.`)
  }

  const focusApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      const aScore = a.name.toLowerCase().includes('cotrain') ? 1 : 0
      const bScore = b.name.toLowerCase().includes('cotrain') ? 1 : 0
      return bScore - aScore || a.name.localeCompare(b.name)
    })
  }, [apps])

  return (
    <div className="apps-shell">
      <section className="apps-header panel glass-panel">
        <div>
          <div className="phg">// pilotage applicatif</div>
          <h2 className="apps-title">Contrôle centralisé de tes applications métier</h2>
          <p className="apps-copy">
            Depuis ici, tu passes CoTrain en maintenance, tu pousses un message visible au login ou à l’accueil,
            tu notes l’action à faire et tu gardes la main sur les redémarrages.
          </p>
        </div>
        <div className="apps-summary">
          <div className="apps-summary-box"><strong>{apps.length}</strong><span>apps suivies</span></div>
          <div className="apps-summary-box"><strong>{apps.filter((app) => app.status === 'maintenance').length}</strong><span>maintenances</span></div>
          <div className="apps-summary-box"><strong>{apps.filter((app) => app.login_notice_enabled || app.home_notice_enabled).length}</strong><span>annonces publiques</span></div>
        </div>
      </section>

      {loading ? (
        <div className="panel panel-pad">Chargement des applications...</div>
      ) : (
        <section className="apps-grid">
          {focusApps.map((app) => {
            const draft = drafts[app.id]
            const publicEndpoint = `/api/public/apps/${app.app_key || slugify(app.name)}`
            return (
              <article key={app.id} className={`app-card panel ${app.name.toLowerCase().includes('cotrain') ? 'app-card-focus' : ''}`}>
                <div className="app-card-head">
                  <div>
                    <div className="app-name-row">
                      <h3>{app.name}</h3>
                      <span className={`env env-${app.env}`}>{app.env.toUpperCase()}</span>
                    </div>
                    <div className="app-url">{app.url}</div>
                  </div>
                  <div className="app-status-box">
                    <span className={`pill ${STATUS_CLS[app.status]}`}><span className="pill-dot" />{STATUS_LABEL[app.status]}</span>
                    <div className="app-uptime">{app.status === 'maintenance' ? '—' : `${app.uptime ?? 99.9}% uptime`}</div>
                  </div>
                </div>

                <div className="app-quick-actions">
                  <button
                    className={`control-btn ${app.status === 'maintenance' ? 'control-btn-live' : 'control-btn-maintenance'}`}
                    onClick={() => toggleMaintenance(app)}
                    disabled={savingId === app.id}
                  >
                    {savingId === app.id ? 'Traitement…' : app.status === 'maintenance' ? 'Remettre en ligne' : 'Passer en maintenance'}
                  </button>
                  <button className="control-btn control-btn-secondary" onClick={() => confirmRestart(app)} disabled={savingId === app.id}>
                    Confirmer redémarrage
                  </button>
                </div>

                <div className="app-section-grid">
                  <div className="control-block">
                    <label>Message maintenance</label>
                    <textarea
                      rows={3}
                      value={draft?.maintenance_message || ''}
                      onChange={(event) => updateDraft(app.id, { maintenance_message: event.target.value })}
                    />
                  </div>
                  <div className="control-block">
                    <label>Note de pilotage interne</label>
                    <textarea
                      rows={3}
                      value={draft?.control_note || ''}
                      onChange={(event) => updateDraft(app.id, { control_note: event.target.value })}
                      placeholder="Ex. : surveiller le prochain redémarrage Vercel / test post-déploiement à faire."
                    />
                  </div>
                </div>

                <div className="app-section-grid">
                  <div className="control-block">
                    <div className="control-label-row">
                      <label>Message page login</label>
                      <label className="switch-wrap">
                        <input
                          type="checkbox"
                          checked={!!draft?.login_notice_enabled}
                          onChange={(event) => updateDraft(app.id, { login_notice_enabled: event.target.checked })}
                        />
                        <span>Actif</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={draft?.public_login_message || ''}
                      onChange={(event) => updateDraft(app.id, { public_login_message: event.target.value })}
                      placeholder="Annonce affichée sur le login : MAJ, coupure, reprise, message d’exploitation."
                    />
                  </div>
                  <div className="control-block">
                    <div className="control-label-row">
                      <label>Message page home</label>
                      <label className="switch-wrap">
                        <input
                          type="checkbox"
                          checked={!!draft?.home_notice_enabled}
                          onChange={(event) => updateDraft(app.id, { home_notice_enabled: event.target.checked })}
                        />
                        <span>Actif</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={draft?.public_home_message || ''}
                      onChange={(event) => updateDraft(app.id, { public_home_message: event.target.value })}
                      placeholder="Annonce affichée sur l’accueil : redémarrage effectué, version livrée, information terrain."
                    />
                  </div>
                </div>

                <div className="app-footer-row">
                  <label className="switch-wrap switch-wrap-inline">
                    <input
                      type="checkbox"
                      checked={!!draft?.reboot_required}
                      onChange={(event) => updateDraft(app.id, { reboot_required: event.target.checked })}
                    />
                    <span>Marquer “redémarrage requis”</span>
                  </label>

                  <code>{publicEndpoint}</code>

                  <button className="control-btn control-btn-primary" onClick={() => saveCommunications(app)} disabled={savingId === app.id}>
                    {savingId === app.id ? 'Enregistrement…' : 'Enregistrer les messages'}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {toast && <div className={`toast-fixed toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
