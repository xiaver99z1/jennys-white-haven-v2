import type { ReactNode } from 'react'

export interface PanelProps {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
}

export function Panel({ title, count, action, children }: PanelProps) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs h-full">
      <header className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          {title}
          {count !== undefined ? (
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              {count}
            </span>
          ) : null}
        </h2>
        {action}
      </header>
      <div className="px-5 divide-y divide-stone-100">{children}</div>
    </section>
  )
}
