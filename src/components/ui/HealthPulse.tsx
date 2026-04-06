'use client'

interface HealthPulseProps {
  status: 'online' | 'maintenance' | 'offline'
  size?: number
}

const COLORS = {
  online:      { bg: '#4ade80', glow: 'rgba(74,222,128,.5)' },
  maintenance: { bg: '#f59e0b', glow: 'rgba(245,158,11,.5)' },
  offline:     { bg: '#ef4444', glow: 'rgba(239,68,68,.5)' },
}

export default function HealthPulse({ status, size = 10 }: HealthPulseProps) {
  const c = COLORS[status] || COLORS.online

  return (
    <span
      className="inline-block rounded-full animate-pulse-dot"
      style={{
        width: size,
        height: size,
        background: c.bg,
        boxShadow: `0 0 ${size}px ${c.glow}, 0 0 ${size * 2}px ${c.glow}`,
      }}
    />
  )
}
