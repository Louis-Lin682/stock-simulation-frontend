type LoadingRingProps = {
  label?: string
  progress?: number
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingRing({ label, progress, size = 'md' }: LoadingRingProps) {
  const progressText = typeof progress === 'number' ? `${Math.round(progress)}%` : null

  return (
    <span
      className={`loading-ring loading-ring-${size}`}
      role="status"
      aria-label={label ?? '載入中'}
      style={{ '--loading-progress': `${progress ?? 72}%` } as CSSProperties}
    >
      <span aria-hidden="true">{progressText && <strong>{progressText}</strong>}</span>
      {label && <em>{label}</em>}
    </span>
  )
}
import type { CSSProperties } from 'react'
