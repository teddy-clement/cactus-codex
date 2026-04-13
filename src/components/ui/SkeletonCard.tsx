'use client'

interface SkeletonCardProps {
  className?: string
}

/**
 * Card animee pour les vues mobile (< 640px) et les panels generiques.
 * Reprend le look des signal-row / bc-row en version vide.
 */
export default function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`px-4 py-3 border-b border-[#192b1b] ${className}`}>
      <div className="flex items-start gap-3">
        <div className="h-4 w-14 rounded bg-[#1d2a1f] animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 w-3/4 rounded bg-[#1d2a1f] animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-[#15201a] animate-pulse" style={{ animationDelay: '150ms' }} />
        </div>
        <div className="h-3 w-12 rounded bg-[#1d2a1f] animate-pulse flex-shrink-0" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
