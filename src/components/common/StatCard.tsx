import type { ReactNode } from 'react'

export interface StatCardProps {
  title: string
  value: string
  hint?: string
  icon: ReactNode
  accent?: string
}

export function StatCard({
  title,
  value,
  hint,
  icon,
  accent = 'bg-stone-100 text-stone-700 border-stone-200',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-stone-900 mt-1 truncate">
          {value}
        </p>
        {hint ? <p className="text-[11px] text-stone-400 mt-1">{hint}</p> : null}
      </div>
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accent}`}
      >
        {icon}
      </div>
    </div>
  )
}
