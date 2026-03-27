import { createServiceClient } from '@/lib/supabase/server'
import type { ActivityLog } from '@/types'

async function getLogs(): Promise<ActivityLog[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)
  return (data as ActivityLog[]) || []
}

const LV_CLS: Record<string, string> = { ok: 'lv-ok', info: 'lv-info', warn: 'lv-warn', error: 'lv-err' }
const LV_LABEL: Record<string, string> = { ok: 'OK', info: 'INFO', warn: 'WARN', error: 'ERR' }

function formatTs(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default async function LogsPage() {
  const logs = await getLogs()
  const warns = logs.filter(l => l.level === 'warn' || l.level === 'error').length

  return (
    <>
      <div className="panel">
        <div className="ph">
          <div className="pht">Journal d'activité</div>
          <div className="phg">// {logs.length} entrées · {warns} alertes</div>
        </div>
        <div className="lr lr-head">
          <span>TIMESTAMP</span>
          <span>NIVEAU</span>
          <span>ÉVÉNEMENT</span>
          <span>UTILISATEUR</span>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: '24px 19px', fontFamily: 'var(--mono)', fontSize: '12px', color: '#384e3c' }}>
            Aucun journal disponible.
          </div>
        ) : logs.map(log => (
          <div key={log.id} className="lr">
            <div className="ts">{formatTs(log.timestamp)}</div>
            <div><span className={`lv ${LV_CLS[log.level]}`}>{LV_LABEL[log.level]}</span></div>
            <div className="lm">{log.message}</div>
            <div className="lu">{log.user}</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:9px;overflow:hidden}
        .ph{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .pht{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;color:#fff;letter-spacing:.03em}
        .phg{font-family:'DM Mono',monospace;font-size:9px;color:#384e3c;letter-spacing:.17em;text-transform:uppercase}
        .lr{display:grid;grid-template-columns:130px 54px 1fr 110px;padding:9px 19px;gap:13px;border-bottom:1px solid var(--border);align-items:center;font-family:'DM Mono',monospace;font-size:10.5px}
        .lr:last-child{border-bottom:none}
        .lr-head{padding:9px 19px;border-bottom:1px solid var(--border2)}
        .lr-head span{font-size:8.5px;color:#384e3c;letter-spacing:.2em;text-transform:uppercase}
        .ts{color:#384e3c}
        .lv{padding:1px 6px;border-radius:3px;font-size:9px;font-weight:500;text-align:center}
        .lv-ok  {background:rgba(74,222,128,.1);color:#4ade80}
        .lv-info{background:rgba(56,189,248,.1);color:#38bdf8}
        .lv-warn{background:rgba(245,158,11,.1);color:#f59e0b}
        .lv-err {background:rgba(239,68,68,.1);color:#ef4444}
        .lm{color:#6fa876}
        .lu{color:#384e3c;text-align:right}
      `}</style>
    </>
  )
}
