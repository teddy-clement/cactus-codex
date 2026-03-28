import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { App, AppModule, AppSignal, RoadmapItem } from '@/types'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: apps }, { data: modules }, { data: signals }, { data: roadmap }] = await Promise.all([
    supabase.from('apps').select('*').order('name'),
    supabase.from('app_modules').select('*').order('path_prefix'),
    supabase.from('app_signals').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('roadmap_items').select('*').order('created_at'),
  ])
  return {
    apps: (apps as App[]) || [],
    modules: (modules as AppModule[]) || [],
    signals: (signals as AppSignal[]) || [],
    roadmap: (roadmap as RoadmapItem[]) || [],
  }
}

const statusClass: Record<string, string> = { online: 'pill-on', maintenance: 'pill-mt', offline: 'pill-of' }
const statusLabel: Record<string, string> = { online: 'En ligne', maintenance: 'Maintenance', offline: 'Hors ligne' }

export default async function DashboardPage() {
  const { apps, modules, signals, roadmap } = await getData()
  const app = apps.find((item) => item.app_key === 'cotrain') || apps[0]
  const appModules = modules.filter((item) => item.app_id === app?.id)
  const activeRoadmap = roadmap.filter((item) => item.status !== 'done').slice(0, 6)
  const latestSignals = signals.slice(0, 6)
  const warnCount = signals.filter((s) => s.severity !== 'info').length
  const modulesInMaintenance = appModules.filter((m) => m.status === 'maintenance').length

  return (
    <div className="dash-shell">
      <section className="hero-shell">
        <div className="hero-card hero-card-main">
          <div className="hero-kicker">// centre de commandement COTRAIN</div>
          <h1 className="hero-title">Un seul cockpit pour piloter CoTrain proprement.</h1>
          <p className="hero-copy">
            Depuis Cactus Codex, tu gardes la main sur la maintenance globale, la maintenance par module,
            les messages publics, les redémarrages requis et les signaux structurels remontés par l’application.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard/apps" className="hero-btn hero-btn-primary">Contrôler CoTrain</Link>
            <Link href="/dashboard/analytics" className="hero-btn">Voir les signaux</Link>
          </div>
          <div className="hero-gridline" />
        </div>
        <div className="hero-card hero-card-side">
          <div className="mini-head">
            <div>
              <div className="mini-label">Application pilotée</div>
              <div className="mini-title">{app?.name || 'CoTrain'}</div>
            </div>
            {app && <span className={`pill ${statusClass[app.status]}`}><span className="pill-dot" />{statusLabel[app.status]}</span>}
          </div>
          <div className="focus-meta">
            <div><span className="focus-key">Modules</span><code>{appModules.length}</code></div>
            <div><span className="focus-key">Endpoint public</span><code>/api/public/apps/cotrain</code></div>
          </div>
          <div className="focus-strip">
            <div className="focus-stat"><div className="focus-value">{modulesInMaintenance}</div><div className="focus-label">modules en maintenance</div></div>
            <div className="focus-stat"><div className="focus-value">{warnCount}</div><div className="focus-label">signaux à traiter</div></div>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card"><div className="metric-icon">⬡</div><div className="metric-value">1</div><div className="metric-label">Application suivie</div><div className="metric-sub">CoTrain uniquement, propre et net</div></div>
        <div className="metric-card"><div className="metric-icon">⚙</div><div className="metric-value">{modulesInMaintenance}</div><div className="metric-label">Modules coupés</div><div className="metric-sub">pilotables individuellement</div></div>
        <div className="metric-card"><div className="metric-icon">✦</div><div className="metric-value">{latestSignals.length}</div><div className="metric-label">Signaux récents</div><div className="metric-sub">connexions, alertes, remontées</div></div>
        <div className="metric-card"><div className="metric-icon">▲</div><div className="metric-value">{app?.uptime?.toFixed?.(1) ?? app?.uptime ?? '—'}%</div><div className="metric-label">Uptime CoTrain</div><div className="metric-sub">dernière fenêtre monitorée</div></div>
      </section>

      <section className="content-grid">
        <div className="panel panel-large">
          <div className="ph"><div className="pht">Modules pilotables</div><div className="phg">// segmentation</div></div>
          <div className="control-stack">
            {appModules.map((module) => (
              <div key={module.id} className="control-row">
                <div className="control-main">
                  <div className="control-name-row"><div className="control-name">{module.name}</div><span className="env env-production">{module.module_key.toUpperCase()}</span></div>
                  <div className="control-url">{module.path_prefix}</div>
                  <div className="control-badges">
                    <span className={`pill ${statusClass[module.status]}`}><span className="pill-dot" />{statusLabel[module.status]}</span>
                    {module.public_message && <span className="signal-badge">Message public</span>}
                    {module.reboot_required && <span className="signal-badge signal-badge-warn">Redémarrage requis</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Télémetrie CoTrain</div><div className="phg">// structurel uniquement</div></div>
          <div className="panel-body signal-list">
            {latestSignals.length === 0 ? <div className="empty-soft">Aucun signal remonté pour le moment.</div> : latestSignals.map((signal) => (
              <div key={signal.id} className="signal-item">
                <div className="signal-head"><div className="signal-app">{signal.title}</div><span className={`pill ${signal.severity === 'error' ? 'pill-of' : signal.severity === 'warn' ? 'pill-mt' : 'pill-on'}`}>{signal.severity}</span></div>
                <p>{signal.body || signal.signal_type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid lower-grid">
        <div className="panel">
          <div className="ph"><div className="pht">Backlog à suivre</div><div className="phg">// reste à faire</div></div>
          <div className="panel-body">
            {activeRoadmap.map((item) => (
              <div key={item.id} className="backlog-row">
                <div className={`rm-dot ${item.status === 'active' ? 'dot-active' : 'dot-todo'}`} />
                <div className="backlog-body"><div className="backlog-title">{item.title}</div><div className="backlog-meta">{item.description}</div><div className="prog"><div className="pf" style={{ width: `${item.progress}%`, background: item.status === 'active' ? 'var(--amber)' : 'var(--border3)' }} /></div></div>
                <div className="backlog-pct">{item.progress}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="ph"><div className="pht">Doctrine Codex ↔ CoTrain</div><div className="phg">// ligne claire</div></div>
          <div className="panel-body doctrine-list">
            <div className="doctrine-item"><span>01</span><p>Maintenance globale en un bouton, sans bricolage dans CoTrain.</p></div>
            <div className="doctrine-item"><span>02</span><p>Maintenance ciblée par module : GEOPS, COSITE, COMAN, messagerie, affichage.</p></div>
            <div className="doctrine-item"><span>03</span><p>Surveillance structurelle : connexions, alertes techniques, redémarrages requis et remontées utilisateur.</p></div>
          </div>
        </div>
      </section>
    </div>
  )
}
