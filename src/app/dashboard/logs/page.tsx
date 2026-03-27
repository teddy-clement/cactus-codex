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

    </>
  )
}
