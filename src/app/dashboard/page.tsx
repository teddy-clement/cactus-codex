import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { App, RoadmapItem } from '@/types'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: apps }, { data: roadmap }] = await Promise.all([
    supabase.from('apps').select('*').order('name'),
    supabase.from('roadmap_items').select('*').order('created_at'),
  ])
  return { apps: (apps as App[]) || [], roadmap: (roadmap as RoadmapItem[]) || [] }
}

const statusClass: Record<string, string> = {
  online: 'pill-on',
  maintenance: 'pill-mt',
  offline: 'pill-of',
}

const statusLabel: Record<string, string> = {
  online: 'En ligne',
  maintenance: 'Maintenance',
  offline: 'Hors ligne',
}

function appKey(app: App) {
  if (app.app_key) return app.app_key
  return app.name
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export default async function DashboardPage() {
  const { apps, roadmap } = await getData()
  const cotrain = apps.find((app) => app.name.toLowerCase().includes('cotrain') && app.env === 'production') || apps.find((app) => app.name.toLowerCase().includes('cotrain'))
  const notices = apps.filter((app) => app.login_notice_enabled || app.home_notice_enabled || app.status === 'maintenance')
  const rebootRequired = apps.filter((app) => app.reboot_required)
  const activeRoadmap = roadmap.filter((item) => item.status !== 'done').slice(0, 5)
  const onlineCount = apps.filter((app) => app.status === 'online').length
  const maintenanceCount = apps.filter((app) => app.status === 'maintenance').length
  const avgUptime = apps.filter((app) => typeof app.uptime === 'number').reduce((sum, app) => sum + Number(app.uptime || 0), 0) / Math.max(apps.filter((app) => typeof app.uptime === 'number').length, 1)

  return (
    <div className="dash-shell">
      <section className="hero-shell">
        <div className="hero-card hero-card-main">
          <div className="hero-kicker">// centre de commandement</div>
          <h1 className="hero-title">Pilote tes apps comme un vrai poste de contrôle.</h1>
          <p className="hero-copy">
            Cactus Codex devient ton cockpit unique pour suivre CoTrain, déclencher une maintenance,
            pousser un message public et garder la vision claire sur ce qu’il reste à livrer.
          </p>

          <div className="hero-actions">
            <Link href="/dashboard/apps" className="hero-btn hero-btn-primary">Contrôler les applications</Link>
            <Link href="/dashboard/maintenance" className="hero-btn">Centre maintenance</Link>
          </div>

          <div className="hero-gridline" />
        </div>

        <div className="hero-card hero-card-side">
          <div className="mini-head">
            <div>
              <div className="mini-label">Focus principal</div>
              <div className="mini-title">{cotrain?.name || 'CoTrain'}</div>
            </div>
            {cotrain && (
              <span className={`pill ${statusClass[cotrain.status]}`}>
                <span className="pill-dot" />
                {statusLabel[cotrain.status]}
              </span>
            )}
          </div>

          <div className="focus-meta">
            <div>
              <span className="focus-key">Env</span>
              <span className={`env env-${cotrain?.env || 'production'}`}>{(cotrain?.env || 'production').toUpperCase()}</span>
            </div>
            <div>
              <span className="focus-key">Endpoint public</span>
              <code>/api/public/apps/{cotrain ? appKey(cotrain) : 'cotrain-production'}</code>
            </div>
          </div>

          <div className="focus-strip">
            <div className="focus-stat">
              <div className="focus-value">{notices.length}</div>
              <div className="focus-label">messages actifs</div>
            </div>
            <div className="focus-stat">
              <div className="focus-value">{rebootRequired.length}</div>
              <div className="focus-label">redémarrages requis</div>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card" style={{ ['--metric-line' as string]: 'var(--cc-lit)' }}>
          <div className="metric-icon">⬡</div>
          <div className="metric-value">{apps.length}</div>
          <div className="metric-label">Applications suivies</div>
          <div className="metric-sub">dont {onlineCount} en ligne</div>
        </div>
        <div className="metric-card" style={{ ['--metric-line' as string]: 'var(--amber)' }}>
          <div className="metric-icon">⚙</div>
          <div className="metric-value">{maintenanceCount}</div>
          <div className="metric-label">Maintenances en cours</div>
          <div className="metric-sub">pilotables depuis un seul bouton</div>
        </div>
        <div className="metric-card" style={{ ['--metric-line' as string]: 'var(--blue)' }}>
          <div className="metric-icon">✦</div>
          <div className="metric-value">{notices.length}</div>
          <div className="metric-label">Messages publics</div>
          <div className="metric-sub">login / home / annonce rapide</div>
        </div>
        <div className="metric-card" style={{ ['--metric-line' as string]: 'var(--cc-lit)' }}>
          <div className="metric-icon">▲</div>
          <div className="metric-value">{avgUptime.toFixed(1)}%</div>
          <div className="metric-label">Uptime moyen</div>
          <div className="metric-sub">sur les apps monitorées</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel panel-large">
          <div className="ph">
            <div className="pht">Mur de contrôle des applications</div>
            <div className="phg">// opérationnel</div>
          </div>
          <div className="control-stack">
            {apps.map((app) => (
              <div key={app.id} className="control-row">
                <div className="control-main">
                  <div className="control-name-row">
                    <div className="control-name">{app.name}</div>
                    <span className={`env env-${app.env}`}>{app.env.toUpperCase()}</span>
                  </div>
                  <div className="control-url">{app.url}</div>
                  <div className="control-badges">
                    <span className={`pill ${statusClass[app.status]}`}><span className="pill-dot" />{statusLabel[app.status]}</span>
                    {app.login_notice_enabled && <span className="signal-badge">Message login</span>}
                    {app.home_notice_enabled && <span className="signal-badge">Message home</span>}
                    {app.reboot_required && <span className="signal-badge signal-badge-warn">Redémarrage requis</span>}
                  </div>
                </div>
                <div className="control-side">
                  <div className="uptime-value">{app.status === 'maintenance' ? '—' : `${app.uptime ?? 99.9}%`}</div>
                  <div className="uptime-label">uptime 30j</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div className="pht">Messages & annonces</div>
            <div className="phg">// diffusion</div>
          </div>
          <div className="panel-body signal-list">
            {notices.length === 0 ? (
              <div className="empty-soft">Aucun message actif. La plateforme est propre et silencieuse.</div>
            ) : (
              notices.map((app) => (
                <div key={app.id} className="signal-item">
                  <div className="signal-head">
                    <div className="signal-app">{app.name}</div>
                    <span className={`pill ${statusClass[app.status]}`}><span className="pill-dot" />{statusLabel[app.status]}</span>
                  </div>
                  {app.public_login_message && app.login_notice_enabled && <p>{app.public_login_message}</p>}
                  {app.public_home_message && app.home_notice_enabled && <p>{app.public_home_message}</p>}
                  {app.maintenance_message && app.status === 'maintenance' && <p>{app.maintenance_message}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="content-grid lower-grid">
        <div className="panel">
          <div className="ph">
            <div className="pht">Travail restant</div>
            <div className="phg">// backlog vivant</div>
          </div>
          <div className="panel-body">
            {activeRoadmap.map((item) => (
              <div key={item.id} className="backlog-row">
                <div className={`rm-dot ${item.status === 'active' ? 'dot-active' : 'dot-todo'}`} />
                <div className="backlog-body">
                  <div className="backlog-title">{item.title}</div>
                  <div className="backlog-meta">{item.description}</div>
                  <div className="prog"><div className="pf" style={{ width: `${item.progress}%`, background: item.status === 'active' ? 'var(--amber)' : 'var(--border3)' }} /></div>
                </div>
                <div className="backlog-pct">{item.progress}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <div className="pht">Doctrine Cactus Codex</div>
            <div className="phg">// rôle du système</div>
          </div>
          <div className="panel-body doctrine-list">
            <div className="doctrine-item"><span>01</span><p>Un bouton pour basculer CoTrain en maintenance sans bricolage ni intervention manuelle ailleurs.</p></div>
            <div className="doctrine-item"><span>02</span><p>Un point unique pour pousser une annonce login ou home sur tes applications métier.</p></div>
            <div className="doctrine-item"><span>03</span><p>Une vue claire sur le reste à faire, les redémarrages requis et les points de fragilité réels.</p></div>
          </div>
        </div>
      </section>
    </div>
  )
}
