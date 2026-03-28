"use client"

import { useEffect, useMemo, useState } from 'react'
import type { App, AppModule, AppSignal } from '@/types'

type ToastState = { msg: string; type: 'ok' | 'wn' | 'er' } | null

const STATUS_LABEL: Record<string, string> = { online: 'En ligne', maintenance: 'Maintenance', offline: 'Hors ligne' }
const STATUS_CLS: Record<string, string> = { online: 'pill-on', maintenance: 'pill-mt', offline: 'pill-of' }

export default function AppsPage() {
  const [app, setApp] = useState<App | null>(null)
  const [modules, setModules] = useState<AppModule[]>([])
  const [signals, setSignals] = useState<AppSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [draft, setDraft] = useState({
    maintenance_message: '', public_login_message: '', public_home_message: '', control_note: '',
    login_notice_enabled: false, home_notice_enabled: false, reboot_required: false,
  })

  useEffect(() => {
    Promise.all([fetch('/api/apps').then(r => r.json()), fetch('/api/modules').then(r => r.json()), fetch('/api/signals').then(r => r.json())])
      .then(([apps, mods, sigs]) => {
        const current = (apps as App[]).find((item) => item.app_key === 'cotrain') || (apps as App[])[0]
        setApp(current || null)
        setModules((mods as AppModule[]).filter((m) => m.app_id === current?.id))
        setSignals((sigs as AppSignal[]).slice(0, 20))
        if (current) setDraft({
          maintenance_message: current.maintenance_message || '🔧 Maintenance CoTrain en cours.',
          public_login_message: current.public_login_message || '',
          public_home_message: current.public_home_message || '',
          control_note: current.control_note || '',
          login_notice_enabled: !!current.login_notice_enabled,
          home_notice_enabled: !!current.home_notice_enabled,
          reboot_required: !!current.reboot_required,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, type: 'ok' | 'wn' | 'er' = 'ok') { setToast({ msg, type }); window.setTimeout(() => setToast(null), 2600) }

  async function patchApp(patch: Record<string, unknown>, success: string) {
    if (!app) return
    setSaving(app.id)
    const res = await fetch('/api/apps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: app.id, ...patch }) })
    const payload = await res.json()
    setSaving(null)
    if (!res.ok) return showToast(payload.error || 'Erreur', 'er')
    setApp(payload); showToast(success, 'ok')
  }

  async function patchModule(moduleId: string, patch: Record<string, unknown>, success: string) {
    setSaving(moduleId)
    const res = await fetch('/api/modules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: moduleId, ...patch }) })
    const payload = await res.json()
    setSaving(null)
    if (!res.ok) return showToast(payload.error || 'Erreur', 'er')
    setModules((current) => current.map((m) => m.id === moduleId ? payload : m))
    showToast(success, patch.status === 'maintenance' ? 'wn' : 'ok')
  }

  const moduleCount = modules.length
  const moduleMaint = modules.filter((m) => m.status === 'maintenance').length
  const signalSummary = useMemo(() => ({
    total: signals.length,
    warn: signals.filter((s) => s.severity === 'warn').length,
    error: signals.filter((s) => s.severity === 'error').length,
  }), [signals])

  if (loading) return <div className="panel panel-pad">Chargement...</div>
  if (!app) return <div className="panel panel-pad">Aucune application CoTrain trouvée.</div>

  return (
    <div className="apps-shell">
      <section className="apps-header panel glass-panel">
        <div>
          <div className="phg">// cotrain control center</div>
          <h2 className="apps-title">Une seule application. Des modules pilotés proprement.</h2>
          <p className="apps-copy">Tu pilotes ici CoTrain globalement, mais aussi GEOPS, COSITE, COMAN, messagerie et les briques sensibles une par une.</p>
        </div>
        <div className="apps-summary">
          <div className="apps-summary-box"><strong>{moduleCount}</strong><span>modules</span></div>
          <div className="apps-summary-box"><strong>{moduleMaint}</strong><span>coupés</span></div>
          <div className="apps-summary-box"><strong>{signalSummary.error + signalSummary.warn}</strong><span>alertes</span></div>
        </div>
      </section>

      <article className="app-card panel app-card-focus">
        <div className="app-card-head">
          <div>
            <div className="app-name-row"><h3>{app.name}</h3><span className={`env env-${app.env}`}>{app.env.toUpperCase()}</span></div>
            <div className="app-url">{app.url}</div>
          </div>
          <div className="app-status-box"><span className={`pill ${STATUS_CLS[app.status]}`}><span className="pill-dot" />{STATUS_LABEL[app.status]}</span><div className="app-uptime">{app.uptime ?? 99.9}% uptime</div></div>
        </div>
        <div className="app-quick-actions">
          <button className={`control-btn ${app.status === 'maintenance' ? 'control-btn-live' : 'control-btn-maintenance'}`} onClick={() => patchApp({ status: app.status === 'maintenance' ? 'online' : 'maintenance', maintenance_message: draft.maintenance_message }, app.status === 'maintenance' ? 'CoTrain remis en ligne.' : 'CoTrain passe en maintenance.')} disabled={saving === app.id}>{saving === app.id ? 'Traitement…' : app.status === 'maintenance' ? 'Remettre CoTrain en ligne' : 'Passer tout CoTrain en maintenance'}</button>
          <button className="control-btn control-btn-secondary" onClick={() => patchApp({ last_restart_at: 'now' }, 'Redémarrage CoTrain confirmé.')} disabled={saving === app.id}>Confirmer redémarrage</button>
        </div>
        <div className="app-section-grid">
          <div className="control-block"><label>Message maintenance global</label><textarea rows={3} value={draft.maintenance_message} onChange={(e) => setDraft((d) => ({ ...d, maintenance_message: e.target.value }))} /></div>
          <div className="control-block"><label>Note de pilotage</label><textarea rows={3} value={draft.control_note} onChange={(e) => setDraft((d) => ({ ...d, control_note: e.target.value }))} /></div>
        </div>
        <div className="app-section-grid">
          <div className="control-block"><div className="control-label-row"><label>Message page login</label><label className="switch-wrap"><input type="checkbox" checked={draft.login_notice_enabled} onChange={(e) => setDraft((d) => ({ ...d, login_notice_enabled: e.target.checked }))} /><span>Actif</span></label></div><textarea rows={3} value={draft.public_login_message} onChange={(e) => setDraft((d) => ({ ...d, public_login_message: e.target.value }))} /></div>
          <div className="control-block"><div className="control-label-row"><label>Message page home</label><label className="switch-wrap"><input type="checkbox" checked={draft.home_notice_enabled} onChange={(e) => setDraft((d) => ({ ...d, home_notice_enabled: e.target.checked }))} /><span>Actif</span></label></div><textarea rows={3} value={draft.public_home_message} onChange={(e) => setDraft((d) => ({ ...d, public_home_message: e.target.value }))} /></div>
        </div>
        <div className="app-footer-row">
          <label className="switch-wrap big"><input type="checkbox" checked={draft.reboot_required} onChange={(e) => setDraft((d) => ({ ...d, reboot_required: e.target.checked }))} /><span>Marquer “redémarrage requis”</span></label>
          <button className="control-btn control-btn-primary" onClick={() => patchApp(draft, 'Paramètres CoTrain enregistrés.')} disabled={saving === app.id}>Enregistrer CoTrain</button>
        </div>
      </article>

      <section className="panel panel-pad">
        <div className="ph"><div className="pht">Modules CoTrain</div><div className="phg">// maintenance ciblée</div></div>
        <div className="module-grid">
          {modules.map((module) => (
            <div key={module.id} className="module-card">
              <div className="module-head"><div><div className="module-name">{module.name}</div><div className="module-path">{module.path_prefix}</div></div><span className={`pill ${STATUS_CLS[module.status]}`}><span className="pill-dot" />{STATUS_LABEL[module.status]}</span></div>
              <textarea rows={3} value={module.maintenance_message || ''} onChange={(e) => setModules((current) => current.map((m) => m.id === module.id ? { ...m, maintenance_message: e.target.value } : m))} placeholder="Message maintenance du module" />
              <textarea rows={2} value={module.public_message || ''} onChange={(e) => setModules((current) => current.map((m) => m.id === module.id ? { ...m, public_message: e.target.value } : m))} placeholder="Message public ciblé" />
              <div className="module-actions">
                <button className={`control-btn ${module.status === 'maintenance' ? 'control-btn-live' : 'control-btn-maintenance'}`} onClick={() => patchModule(module.id, { status: module.status === 'maintenance' ? 'online' : 'maintenance', maintenance_message: module.maintenance_message, public_message: module.public_message }, module.status === 'maintenance' ? `${module.name} remis en ligne.` : `${module.name} passe en maintenance.`)} disabled={saving === module.id}>{module.status === 'maintenance' ? 'Remettre en ligne' : 'Passer en maintenance'}</button>
                <button className="control-btn control-btn-secondary" onClick={() => patchModule(module.id, { reboot_required: !module.reboot_required, maintenance_message: module.maintenance_message, public_message: module.public_message }, `Drapeau redémarrage ${module.reboot_required ? 'retiré' : 'activé'} pour ${module.name}.`)} disabled={saving === module.id}>{module.reboot_required ? 'Lever redémarrage' : 'Marquer redémarrage'}</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel-pad">
        <div className="ph"><div className="pht">Signaux structurels remontés par CoTrain</div><div className="phg">// monitoring</div></div>
        <div className="signal-table">
          {signals.map((signal) => <div key={signal.id} className="signal-row"><span className={`pill ${signal.severity === 'error' ? 'pill-of' : signal.severity === 'warn' ? 'pill-mt' : 'pill-on'}`}>{signal.severity}</span><div><strong>{signal.title}</strong><p>{signal.body || signal.signal_type}</p></div><time>{new Date(signal.created_at).toLocaleString('fr-FR')}</time></div>)}
        </div>
      </section>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
