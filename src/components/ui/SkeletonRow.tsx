'use client'

interface SkeletonRowProps {
  cols?: number
  className?: string
}

/**
 * Ligne de table animee (pulse) pour les pages logs, signals, feedbacks.
 * Masque automatiquement sur mobile au profit des SkeletonCard.
 */
export default function SkeletonRow({ cols = 4, className = '' }: SkeletonRowProps) {
  const widths = ['w-24', 'w-full', 'w-3/4', 'w-20', 'w-16']

  return (
    <div className={`hidden sm:flex items-center gap-3 px-5 py-3 border-b border-[#192b1b] ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded-md bg-[#1d2a1f] animate-pulse ${widths[i % widths.length]}`}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}
