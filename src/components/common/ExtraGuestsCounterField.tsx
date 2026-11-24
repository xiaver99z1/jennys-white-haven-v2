import { Minus, Plus } from 'lucide-react'
import { formatPeso } from '#/lib/formatters'

interface ExtraGuestsCounterFieldProps {
  idPrefix: string
  extraAdults: number
  extraChildren: number
  extraAdultFee: number
  extraChildFee: number
  extraTotalFee?: number
  maxPerCategory?: number
  variant?: 'public' | 'admin'
  onChangeAdults: (nextCount: number) => void
  onChangeChildren: (nextCount: number) => void
}

function sanitizeCount(raw: string, max: number): number {
  const digitsOnly = raw.replace(/\D/g, '')
  if (!digitsOnly) return 0
  const parsed = Number.parseInt(digitsOnly, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(max, parsed)
}

export function ExtraGuestsCounterField({
  idPrefix,
  extraAdults,
  extraChildren,
  extraAdultFee,
  extraChildFee,
  extraTotalFee = 0,
  maxPerCategory = 20,
  variant = 'public',
  onChangeAdults,
  onChangeChildren,
}: ExtraGuestsCounterFieldProps) {
  const isPublic = variant === 'public'

  return (
    <div
      className={
        isPublic
          ? 'rounded-2xl bg-[#FAF8F4] border border-stone-200/80 p-3.5 space-y-3'
          : 'p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            isPublic
              ? 'text-[11px] uppercase tracking-[0.16em] text-stone-600 font-semibold'
              : 'text-[11px] font-semibold text-stone-700 uppercase tracking-wider'
          }
        >
          {isPublic
            ? 'Additional Persons (Optional)'
            : 'Additional Persons (Auto-Compute Fee)'}
        </span>
        {extraTotalFee > 0 && (
          <span className="text-[11px] font-semibold text-amber-800">
            +{formatPeso(extraTotalFee)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Extra Adult Stepper */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-stone-200/90 px-3 py-2">
          <div className="min-w-0">
            <label
              htmlFor={`${idPrefix}-extra-adults`}
              className="block text-xs font-semibold text-stone-800"
            >
              Adult
            </label>
            <span className="block text-[11px] text-amber-900 font-medium">
              +{formatPeso(extraAdultFee)} / night
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Decrease extra adults"
              disabled={extraAdults <= 0}
              onClick={() => onChangeAdults(Math.max(0, extraAdults - 1))}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              id={`${idPrefix}-extra-adults`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={extraAdults === 0 ? '' : String(extraAdults)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) =>
                onChangeAdults(sanitizeCount(e.target.value, maxPerCategory))
              }
              className="w-11 h-8 text-center rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
            <button
              type="button"
              aria-label="Increase extra adults"
              disabled={extraAdults >= maxPerCategory}
              onClick={() =>
                onChangeAdults(Math.min(maxPerCategory, extraAdults + 1))
              }
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Extra Child Stepper */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-stone-200/90 px-3 py-2">
          <div className="min-w-0">
            <label
              htmlFor={`${idPrefix}-extra-children`}
              className="block text-xs font-semibold text-stone-800"
            >
              Child
            </label>
            <span className="block text-[11px] text-amber-900 font-medium">
              +{formatPeso(extraChildFee)} / night
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Decrease extra children"
              disabled={extraChildren <= 0}
              onClick={() => onChangeChildren(Math.max(0, extraChildren - 1))}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              id={`${idPrefix}-extra-children`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={extraChildren === 0 ? '' : String(extraChildren)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) =>
                onChangeChildren(sanitizeCount(e.target.value, maxPerCategory))
              }
              className="w-11 h-8 text-center rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
            <button
              type="button"
              aria-label="Increase extra children"
              disabled={extraChildren >= maxPerCategory}
              onClick={() =>
                onChangeChildren(Math.min(maxPerCategory, extraChildren + 1))
              }
              className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
