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

      <style jsx>{`
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:17px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}.mb{margin-bottom:17px}
        .stat{background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:17px 19px;position:relative;overflow:hidden;transition:border-color .18s,transform .18s}
        .stat:hover{border-color:var(--border3);transform:translateY(-1px)}
        .stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--al,var(--cc-lit));opacity:.4}
        .si{font-size:17px;margin-bottom:9px}.sv{font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px}
        .sl{font-family:'DM Mono',monospace;font-size:9.5px;color:#6fa876;letter-spacing:.14em;text-transform:uppercase}
        .sd{font-family:'DM Mono',monospace;font-size:9.5px;color:#4ade80;margin-top:5px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .panel-body{padding:19px}
        .trow{display:grid;align-items:center;padding:11px 19px;gap:13px;border-bottom:1px solid var(--border);transition:background .13s}
        .trow:last-child{border-bottom:none}.trow:not(.thead):hover{background:var(--surface2)}
        .trow.thead{padding:9px 19px;border-bottom:1px solid var(--border2)}.trow.thead span{font-family:'DM Mono',monospace;font-size:8.5px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase}
        .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-family:'DM Mono',monospace;font-size:9.5px;font-weight:500}
        .pill-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
        .pill-on{background:rgba(74,222,128,.09);color:#4ade80;border:1px solid rgba(74,222,128,.2)}
        .pill-mt{background:rgba(245,158,11,.09);color:#f59e0b;border:1px solid rgba(245,158,11,.2)}
        .pill-of{background:rgba(239,68,68,.09);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
        .env{font-family:'DM Mono',monospace;font-size:8px;padding:2px 7px;border-radius:3px;border:1px solid;letter-spacing:.1em;display:inline-block}
        .env-production{background:rgba(56,189,248,.06);color:#38bdf8;border-color:rgba(56,189,248,.18)}
        .env-staging,.env-preview{background:rgba(74,222,128,.06);color:#4ade80;border-color:rgba(74,222,128,.18)}
        .env-cloud{background:rgba(59,130,246,.06);color:#3b82f6;border-color:rgba(59,130,246,.18)}
        .rm-item{display:flex;gap:13px;padding:13px 0;border-bottom:1px solid var(--border);align-items:flex-start}
        .rm-item:last-child{border-bottom:none;padding-bottom:0}
        .rm-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
        .dot-done{background:#4ade80}.dot-active{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,.45)}.dot-todo{background:var(--border3)}
        .rm-body{flex:1}.rm-title{font-size:13px;font-weight:600;color:#fff;margin-bottom:3px}
        .rm-meta{font-family:'DM Mono',monospace;font-size:10px;color:#6fa876;display:flex;gap:9px}
        .rm-tag{font-family:'DM Mono',monospace;font-size:8.5px;padding:2px 8px;border-radius:3px;letter-spacing:.1em;margin-left:auto;align-self:center;white-space:nowrap;border:1px solid}
        .tag-ct{background:rgba(74,222,128,.06);color:#4ade80;border-color:rgba(74,222,128,.18)}
        .tag-in{background:rgba(56,189,248,.06);color:#38bdf8;border-color:rgba(56,189,248,.18)}
        .tag-ux{background:rgba(245,158,11,.06);color:#f59e0b;border-color:rgba(245,158,11,.18)}
        .prog{height:3px;background:var(--border2);border-radius:2px;overflow:hidden;margin-top:6px}
        .pf{height:100%;border-radius:2px;transition:width 1.2s ease}
      `}</style>
    </>
  )
}
