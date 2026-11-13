import type { ReactNode } from 'react'

export interface EmptyStateProps {
  message?: string
  title?: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({
  message,
  title,
  description,
  icon,
}: EmptyStateProps) {
  if (message && !title) {
    return (
      <p className="py-6 text-center text-xs text-stone-500">{message}</p>
    )
  }

  return (
    <div className="p-12 text-center flex flex-col items-center">
      {icon ? (
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3 text-stone-400">
          {icon}
        </div>
      ) : null}
      {title ? (
        <h3 className="text-base font-bold text-stone-900">{title}</h3>
      ) : null}
      {description ? (
        <p className="text-sm text-stone-500 mt-1 max-w-sm">{description}</p>
      ) : null}
    </div>
  )
}
