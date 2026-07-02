import { formatTokenCount } from '@shared/agent-context'
import { cn } from '@renderer/lib/utils'

interface ContextRingProps {
  used: number
  limit: number
  source?: 'api' | 'estimate'
  isCompressing?: boolean
  className?: string
}

export function ContextRing({
  used,
  limit,
  source = 'estimate',
  isCompressing,
  className
}: ContextRingProps) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0
  const radius = 7
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - ratio)
  const percent = Math.round(ratio * 100)

  const strokeClass =
    ratio >= 1
      ? 'stroke-red-400'
      : ratio >= 0.85
        ? 'stroke-amber-400'
        : ratio >= 0.65
          ? 'stroke-yellow-400'
          : 'stroke-accent'

  const title = isCompressing
    ? 'Compressing context...'
    : `${formatTokenCount(used)} / ${formatTokenCount(limit)} context tokens (${percent}%)${source === 'api' ? ' · API' : ' · estimated'}`

  return (
    <div
      className={cn('relative flex h-5 w-5 items-center justify-center', className)}
      title={title}
      aria-label={title}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          className={cn(strokeClass, isCompressing && 'animate-pulse')}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span
        className={cn(
          'pointer-events-none absolute text-[7px] font-medium leading-none text-muted',
          ratio >= 0.85 && 'text-amber-300'
        )}
      >
        {isCompressing ? '…' : percent >= 100 ? '!' : percent > 0 ? percent : ''}
      </span>
    </div>
  )
}
