'use client'
import { useRouter } from 'next/navigation'
import type { App } from '@/types'

interface AppCardProps {
  app: App
  signals24h: number
  feedbacksUnread: number
  lastHeartbeat: string | null
  errors24h: number
  warnings24h: number
  index?: number
}

const STATUS_LABEL: Record<string, string> = {
  online: 'Opérationnel',
  maintenance: 'Maintenance',
  offline: 'Erreur',
}

const STATUS_COLOR: Record<string, string> = {
  online: '#4ade80',
  maintenance: '#f59e0b',
  offline: '#ef4444',
}

function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 5) return 'à l\'instant'
  if (diffSec < 60) return `il y a ${diffSec}s`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `il y a ${min}min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr}h`
  const days = Math.floor(hr / 24)
  return `il y a ${days}j`
}

export default function AppCard({ app, signals24h, feedbacksUnread, lastHeartbeat, errors24h, warnings24h, index = 0 }: AppCardProps) {
  const router = useRouter()
  const status = app.status || 'online'
  const color = STATUS_COLOR[status]
  const label = STATUS_LABEL[status]

  // Health bar : vert par defaut, orange si warnings, rouge si erreurs
  const healthColor = errors24h > 0 ? '#ef4444' : warnings24h > 0 ? '#f59e0b' : '#4ade80'

  function go() {
    router.push(`/dashboard/apps/${app.app_key || app.id}`)
  }

  return (
    <button
      onClick={go}
      className="glass glass-hover animate-slideUp group text-left w-full relative overflow-hidden"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ── En-tête ── */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold text-white tracking-wide truncate">
              {app.name}
            </div>
            <div className="font-mono text-[10px] text-[#6fa876] tracking-wider mt-0.5 truncate">
              {app.app_key || '—'}
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border flex-shrink-0"
            style={{ borderColor: color + '40', background: color + '15' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
            />
            <span className="font-mono text-[9px] tracking-wider uppercase" style={{ color }}>
              {label}
            </span>
          </div>
        </div>

        {/* ── 3 métriques ── */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <div className="font-display text-2xl font-bold text-white leading-none">
              {signals24h}
            </div>
            <div className="font-mono text-[9px] text-[#6fa876] mt-1 tracking-wider uppercase">
              Signaux 24h
            </div>
          </div>
          <div>
            <div className={`font-display text-2xl font-bold leading-none ${feedbacksUnread > 0 ? 'text-[#f59e0b]' : 'text-white'}`}>
              {feedbacksUnread}
            </div>
            <div className="font-mono text-[9px] text-[#6fa876] mt-1 tracking-wider uppercase">
              Feedbacks
            </div>
          </div>
          <div>
            <div className="font-mono text-sm text-white leading-tight">
              {formatRelative(lastHeartbeat)}
            </div>
            <div className="font-mono text-[9px] text-[#6fa876] mt-1 tracking-wider uppercase">
              Heartbeat
            </div>
          </div>
        </div>
      </div>

      {/* ── Health bar ── */}
      <div
        className="h-1 w-full transition-all"
        style={{
          background: `linear-gradient(90deg, ${healthColor} 0%, ${healthColor}80 100%)`,
          boxShadow: `0 0 12px ${healthColor}50`,
        }}
      />
    </button>
  )
}
