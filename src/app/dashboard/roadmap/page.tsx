import { createServiceClient } from '@/lib/supabase/server'
import type { RoadmapItem } from '@/types'

async function getRoadmap() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('roadmap_items').select('*').order('created_at')
  return (data as RoadmapItem[]) || []
}

const DOT: Record<string, string> = { done:'dot-done', active:'dot-active', todo:'dot-todo' }
const TAG_CLS: Record<string, string> = { cotrain:'tag-ct', infra:'tag-in', ux:'tag-ux' }
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
          <div className="ph"><div className="pht">Roadmap globale</div><div className="phg">// {blocs.length} blocs</div></div>
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
                <div className={`rm-tag ${TAG_CLS[item.tag] || 'tag-ct'}`}>
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
                <div className={`rm-tag ${TAG_CLS[item.tag] || 'tag-ct'}`}>{item.tag.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  )
}
