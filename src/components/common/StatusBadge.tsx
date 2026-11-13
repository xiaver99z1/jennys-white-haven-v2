import type { ReactNode } from 'react'

export interface StatusBadgeProps {
  label: string
  className: string
  icon?: ReactNode
  uppercase?: boolean
  size?: 'xs' | 'sm'
}

export function StatusBadge({
  label,
  className,
  icon,
  uppercase = false,
  size = 'sm',
}: StatusBadgeProps) {
  const sizeClass =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2.5 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${sizeClass} ${uppercase ? 'uppercase tracking-wider' : ''} ${className}`}
    >
      {icon}
      {label}
    </span>
  )
}
