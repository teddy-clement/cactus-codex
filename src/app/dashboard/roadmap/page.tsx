import { createServiceClient } from '@/lib/supabase/server'
import type { RoadmapItem } from '@/types'

async function getRoadmap() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('roadmap_items').select('*').order('created_at')
  return (data as RoadmapItem[]) || []
}

const DOT: Record<string, string> = { done:'dot-done', active:'dot-active', todo:'dot-todo' }
const TAG: Record<string, string> = { cotrain:'tag-ct', infra:'tag-in', ux:'tag-ux' }
const PROG_COLOR: Record<string, string> = {
  done: '#4ade80', active: '#f59e0b', todo: '#2e4432'
}
const PRIO_COLOR: Record<string, string> = { high:'#ef4444', medium:'#f59e0b', low:'#6fa876' }

export default async function RoadmapPage() {
  const items = await getRoadmap()
  const blocs  = items.filter(i => i.title.startsWith('BLOC'))
  const backlog = items.filter(i => !i.title.startsWith('BLOC'))

  return (
    <>
      <div className="g2">
        <div className="panel">
          <div className="ph"><div className="pht">CoTrain V2 — Roadmap globale</div><div className="phg">// 5 blocs</div></div>
          <div className="panel-body">
            {blocs.map(item => (
              <div key={item.id} className="rm-item">
                <div className={`rm-dot ${DOT[item.status]}`} />
                <div className="rm-body">
                  <div className="rm-title">{item.title}</div>
                  <div className="rm-meta"><span>{item.description}</span></div>
                  <div className="prog">
                    <div className="pf" style={{ width: `${item.progress}%`, background: PROG_COLOR[item.status] }} />
                  </div>
                </div>
                <div className={`rm-tag ${TAG[item.tag]}`}>
                  {item.status === 'done' ? '✓ Done' : `${item.progress}%${item.status === 'active' ? ' ◆' : ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="ph"><div className="pht">Backlog actif</div><div className="phg">// priorités immédiates</div></div>
          <div className="panel-body">
            {backlog.map(item => (
              <div key={item.id} className="rm-item">
                <div className={`rm-dot ${DOT[item.status]}`} />
                <div className="rm-body">
                  <div className="rm-title">{item.title}</div>
                  <div className="rm-meta">
                    <span style={{ color: PRIO_COLOR[item.priority] }}>
                      Priorité {item.priority.toUpperCase()}
                    </span>
                    {item.version && <span>{item.version}</span>}
                  </div>
                </div>
                <div className={`rm-tag ${TAG[item.tag]}`}>{item.tag === 'cotrain' ? 'CoTrain' : item.tag === 'infra' ? 'Infra' : 'UX'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:17px}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .panel-body{padding:19px}
        .rm-item{display:flex;gap:13px;padding:13px 0;border-bottom:1px solid var(--border);align-items:flex-start}
        .rm-item:last-child{border-bottom:none;padding-bottom:0}
        .rm-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
        .dot-done{background:#4ade80}.dot-active{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,.45)}.dot-todo{background:#2e4432}
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
