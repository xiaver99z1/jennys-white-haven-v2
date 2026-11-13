import { useState } from 'react'
import { Calendar, Download, Printer } from 'lucide-react'
import type { ReportPreset, ReportRangeMeta } from '#/types'

const PRESET_OPTIONS: Array<{ value: ReportPreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
]

interface ReportToolbarProps {
  title: string
  subtitle: string
  range: ReportRangeMeta
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
  onExportCsv: () => void
}

export function ReportToolbar({
  title,
  subtitle,
  range,
  onRangeChange,
  onExportCsv,
}: ReportToolbarProps) {
  const [customFrom, setCustomFrom] = useState(range.from)
  const [customTo, setCustomTo] = useState(range.to)

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFrom || !customTo) return
    onRangeChange({ preset: 'custom', from: customFrom, to: customTo })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {subtitle} · {range.from} to {range.to} ({range.dayCount}{' '}
            {range.dayCount === 1 ? 'day' : 'days'})
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_OPTIONS.map((opt) => {
            const active = range.preset === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRangeChange({ preset: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-amber-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <form
          onSubmit={handleCustomSubmit}
          className="flex flex-wrap items-center gap-2 text-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
          <input
            type="date"
            aria-label="From date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
          />
          <span className="text-stone-400">to</span>
          <input
            type="date"
            aria-label="To date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold transition cursor-pointer"
          >
            Apply
          </button>
        </form>
      </div>
    </div>
  )
}
