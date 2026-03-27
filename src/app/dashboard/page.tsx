import { createServiceClient } from '@/lib/supabase/server'
import type { App, RoadmapItem } from '@/types'

async function getData() {
  const supabase = createServiceClient()
  const [{ data: apps }, { data: roadmap }] = await Promise.all([
    supabase.from('apps').select('*').order('name'),
    supabase.from('roadmap_items').select('*').order('created_at').limit(5),
  ])
  return { apps: apps as App[] || [], roadmap: roadmap as RoadmapItem[] || [] }
}

const STATUS_CLASS: Record<string, string> = {
  online:      'pill-on',
  maintenance: 'pill-mt',
  offline:     'pill-of',
}
const STATUS_LABEL: Record<string, string> = {
  online:      'En ligne',
  maintenance: 'Maintenance',
  offline:     'Hors ligne',
}
const DOT_CLASS: Record<string, string> = {
  done:   'dot-done',
  active: 'dot-active',
  todo:   'dot-todo',
}
const TAG_CLASS: Record<string, string> = {
  cotrain: 'tag-ct',
  infra:   'tag-in',
  ux:      'tag-ux',
}

export default async function DashboardPage() {
  const { apps, roadmap } = await getData()

  const onlineCount     = apps.filter(a => a.status === 'online').length
  const maintCount      = apps.filter(a => a.status === 'maintenance').length
  const globalUptime    = '99.4%'

  return (
    <>
      <div className="g4 mb">
        <div className="stat" style={{ '--al': 'var(--cc-lit)' } as React.CSSProperties}>
          <div className="si">⬡</div><div className="sv">{apps.length}</div>
          <div className="sl">Apps actives</div><div className="sd">↑ +1 ce mois</div>
        </div>
        <div className="stat" style={{ '--al': 'var(--amber)' } as React.CSSProperties}>
          <div className="si">⚙</div><div className="sv">{maintCount}</div>
          <div className="sl">En maintenance</div>
          <div className="sd" style={{ color: 'var(--amber)' }}>
            {maintCount > 0 ? `⚠ ${apps.find(a => a.status === 'maintenance')?.name}` : '✓ Aucune'}
          </div>
        </div>
        <div className="stat" style={{ '--al': 'var(--blue)' } as React.CSSProperties}>
          <div className="si">◉</div><div className="sv">4</div>
          <div className="sl">Utilisateurs accès</div><div className="sd">↑ +2 ce mois</div>
        </div>
        <div className="stat" style={{ '--al': 'var(--cc-lit)' } as React.CSSProperties}>
          <div className="si">▲</div><div className="sv">{globalUptime}</div>
          <div className="sl">Uptime global</div><div className="sd">30 derniers jours</div>
        </div>
      </div>

      <div className="g2">
        <div className="panel">
          <div className="ph"><div className="pht">Statut des applications</div><div className="phg">// temps réel</div></div>
          <div className="trow thead" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <span>Application</span><span>Env</span><span>Statut</span><span>Uptime</span>
          </div>
          {apps.map(app => (
            <div key={app.id} className="trow" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{app.name}</div>
              <div><span className={`env env-${app.env}`}>{app.env.toUpperCase()}</span></div>
              <div>
                <span className={`pill ${STATUS_CLASS[app.status]}`}>
                  <span className="pill-dot" />
                  {STATUS_LABEL[app.status]}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: app.status === 'maintenance' ? 'var(--amber)' : 'var(--cc-lit)' }}>
                {app.status === 'maintenance' ? '—' : `${app.uptime ?? 99.9}%`}
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Sprint actif</div><div className="phg">// CoTrain V2</div></div>
          <div className="panel-body">
            {roadmap.map(item => (
              <div key={item.id} className="rm-item">
                <div className={`rm-dot ${DOT_CLASS[item.status]}`} />
                <div className="rm-body">
                  <div className="rm-title">{item.title}</div>
                  <div className="rm-meta"><span>{item.description}</span></div>
                  <div className="prog"><div className="pf" style={{ width: `${item.progress}%`, background: item.status === 'active' ? 'var(--amber)' : item.status === 'todo' ? 'var(--border3)' : 'var(--cc-lit)' }} /></div>
                </div>
                <div className={`rm-tag ${TAG_CLASS[item.tag]}`}>{item.progress}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  )
}
