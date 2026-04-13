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
const statusGlow: Record<string, string> = { online: '0 0 8px rgba(74,222,128,.5)', maintenance: '0 0 8px rgba(245,158,11,.5)', offline: '0 0 8px rgba(239,68,68,.5)' }
const statusColor: Record<string, string> = { online: '#4ade80', maintenance: '#f59e0b', offline: '#ef4444' }

export default async function DashboardPage() {
  const { apps, modules, signals, roadmap } = await getData()
  const app = apps[0]
  const appModules = app ? modules.filter((item) => item.app_id === app.id) : []
  const activeRoadmap = roadmap.filter((item) => item.status !== 'done').slice(0, 6)
  const latestSignals = signals.slice(0, 6)
  const warnCount = signals.filter((s) => s.severity !== 'info').length
  const modulesOnline = appModules.filter((m) => m.status === 'online').length
  const modulesInMaintenance = appModules.filter((m) => m.status === 'maintenance').length
  const appName = app?.name || 'Application'
  const appKey = app?.app_key || 'app'

  return (
    <div className="dash-shell">
      <section className="hero-shell">
        <div className="hero-card hero-card-main">
          <div className="hero-kicker">// centre de commandement</div>
          <h1 className="hero-title">Un seul cockpit pour piloter vos applications.</h1>
          <p className="hero-copy">
            Maintenance globale, maintenance par module, messages publics, signaux structurels.
            Tout est visible, tout est pilotable.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard/apps" className="hero-btn hero-btn-primary">Controler {appName}</Link>
            <Link href="/dashboard/analytics" className="hero-btn">Voir les signaux</Link>
          </div>
          <div className="hero-gridline" />
        </div>
        <div className="hero-card hero-card-side">
          <div className="mini-head">
            <div>
              <div className="mini-label">Application pilotee</div>
              <div className="mini-title">{appName}</div>
            </div>
            {app && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse-dot" style={{ background: statusColor[app.status], boxShadow: statusGlow[app.status] }} />
                <span className={`pill ${statusClass[app.status]}`}><span className="pill-dot" />{statusLabel[app.status]}</span>
              </div>
            )}
          </div>
          <div className="focus-meta">
            <div><span className="focus-key">Modules</span><code>{appModules.length}</code></div>
            <div><span className="focus-key">Endpoint</span><code>/api/public/apps/{appKey}</code></div>
          </div>
          <div className="focus-strip">
            <div className="focus-stat"><div className="focus-value" style={{ color: '#4ade80' }}>{modulesOnline}</div><div className="focus-label">modules en ligne</div></div>
            <div className="focus-stat"><div className="focus-value" style={{ color: modulesInMaintenance > 0 ? '#f59e0b' : '#4ade80' }}>{modulesInMaintenance}</div><div className="focus-label">en maintenance</div></div>
            <div className="focus-stat"><div className="focus-value" style={{ color: warnCount > 0 ? '#ef4444' : '#4ade80' }}>{warnCount}</div><div className="focus-label">alertes</div></div>
          </div>
        </div>
      </section>

      {/* ── Health Grid — vue "control room" des modules ── */}
      <section className="panel mb">
        <div className="ph">
          <div className="pht">Sante des modules</div>
          <div className="phg">// {modulesOnline}/{appModules.length} operationnels</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {appModules.map((module) => (
              <div
                key={module.id}
                className="relative rounded-lg border p-3 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  borderColor: statusColor[module.status] + '33',
                  background: statusColor[module.status] + '08',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs font-bold text-white tracking-wide">{module.name}</span>
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse-dot" style={{ background: statusColor[module.status], boxShadow: statusGlow[module.status] }} />
                </div>
                <div className="font-mono text-[8px] text-[#384e3c] tracking-widest uppercase">{module.module_key}</div>
                <div className="font-mono text-[9px] mt-1" style={{ color: statusColor[module.status] }}>
                  {statusLabel[module.status]}
                </div>
                {module.reboot_required && (
                  <div className="font-mono text-[8px] text-[#f59e0b] mt-1 animate-pulse">REBOOT REQUIS</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metriques ── */}
      <section className="metrics-grid">
        <div className="metric-card"><div className="metric-icon">⬡</div><div className="metric-value">{apps.length}</div><div className="metric-label">{apps.length > 1 ? 'Applications suivies' : 'Application suivie'}</div><div className="metric-sub">pilotees depuis Codex</div></div>
        <div className="metric-card"><div className="metric-icon">⚙</div><div className="metric-value">{modulesInMaintenance}</div><div className="metric-label">Modules coupes</div><div className="metric-sub">pilotables individuellement</div></div>
        <div className="metric-card"><div className="metric-icon">✦</div><div className="metric-value">{latestSignals.length}</div><div className="metric-label">Signaux recents</div><div className="metric-sub">connexions, alertes</div></div>
        <div className="metric-card"><div className="metric-icon">▲</div><div className="metric-value">{app?.uptime?.toFixed?.(1) ?? app?.uptime ?? '—'}%</div><div className="metric-label">Uptime {appName}</div><div className="metric-sub">fenetre monitoree</div></div>
      </section>

      <section className="content-grid">
        {/* ── Telemetrie ── */}
        <div className="panel">
          <div className="ph"><div className="pht">Telemetrie</div><div className="phg">// derniers signaux</div></div>
          <div className="panel-body signal-list">
            {latestSignals.length === 0 ? <div className="empty-soft">Aucun signal remonte.</div> : latestSignals.map((signal) => (
              <div key={signal.id} className="signal-item">
                <div className="signal-head">
                  <div className="signal-app">{signal.title}</div>
                  <span className={`pill ${signal.severity === 'error' ? 'pill-of' : signal.severity === 'warn' ? 'pill-mt' : 'pill-on'}`}>{signal.severity}</span>
                </div>
                <p>{signal.body || signal.signal_type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Backlog ── */}
        <div className="panel">
          <div className="ph"><div className="pht">Backlog a suivre</div><div className="phg">// reste a faire</div></div>
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
      </section>
    </div>
  )
}
