import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { format, startOfToday } from 'date-fns'
import { ArrowLeft, ArrowRight, Calendar, X } from 'lucide-react'

export interface StayDateRangePickerProps {
  checkIn: string
  checkOut: string
  onChange: (next: { checkIn: string; checkOut: string }) => void
  idPrefix?: string
  compact?: boolean
  required?: boolean
  className?: string
}

export function parseLocalIsoDate(iso?: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return undefined
  }
  return dt
}

export function toLocalIsoDate(date?: Date): string {
  if (!date || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatStayDisplayDate(iso?: string): string {
  const dt = parseLocalIsoDate(iso)
  if (!dt) return ''
  return format(dt, 'MMM d, yyyy')
}

export function computeStayNights(checkIn?: string, checkOut?: string): number {
  const from = parseLocalIsoDate(checkIn)
  const to = parseLocalIsoDate(checkOut)
  if (!from || !to) return 0
  const diffMs = to.getTime() - from.getTime()
  if (diffMs <= 0) return 0
  return Math.round(diffMs / 86_400_000)
}

export function StayDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  idPrefix = 'stay',
  compact = false,
  required = false,
  className = '',
}: StayDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeField, setActiveField] = useState<'checkIn' | 'checkOut'>(
    'checkIn',
  )
  const [isDesktop, setIsDesktop] = useState(true)
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number
    left: number
  } | null>(null)

  const triggerWrapperRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const checkInBtnRef = useRef<HTMLButtonElement>(null)
  const checkOutBtnRef = useRef<HTMLButtonElement>(null)

  const closeCalendar = useCallback(
    (restoreFocus = false) => {
      setIsOpen(false)
      if (restoreFocus) {
        const target =
          activeField === 'checkOut'
            ? checkOutBtnRef.current
            : checkInBtnRef.current
        target?.focus()
      }
    },
    [activeField],
  )

  const today = useMemo(() => startOfToday(), [])

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = parseLocalIsoDate(checkIn)
    const to = parseLocalIsoDate(checkOut)
    if (!from && !to) return undefined
    return { from, to }
  }, [checkIn, checkOut])

  const nights = computeStayNights(checkIn, checkOut)

  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => parseLocalIsoDate(checkIn) ?? today,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkViewport = () => setIsDesktop(window.innerWidth >= 768)
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  const updatePopoverPosition = useCallback(() => {
    if (typeof window === 'undefined' || !triggerWrapperRef.current) return
    if (window.innerWidth < 768) {
      setPopoverStyle(null)
      return
    }
    const rect = triggerWrapperRef.current.getBoundingClientRect()
    const popoverWidth = 680
    const popoverHeight = 410
    const margin = 16

    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove =
      spaceBelow < popoverHeight + margin && rect.top > popoverHeight + margin

    const top = openAbove
      ? Math.max(margin, rect.top - popoverHeight - 10)
      : Math.min(
          window.innerHeight - popoverHeight - margin,
          rect.bottom + 10,
        )

    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - popoverWidth - margin),
    )

    setPopoverStyle({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const nextMonth = parseLocalIsoDate(checkIn) ?? today
    setDisplayMonth(nextMonth)
    updatePopoverPosition()

    const handleReposition = () => updatePopoverPosition()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCalendar(true)
      }
    }
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (
        triggerWrapperRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      closeCalendar(false)
    }

    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen, checkIn, today, updatePopoverPosition, closeCalendar])

  function handleOpen(field: 'checkIn' | 'checkOut') {
    setActiveField(field)
    setIsOpen(true)
  }

  function handleSelectRange(
    nextRange: DateRange | undefined,
    selectedDay: Date,
  ) {
    // If both dates were already picked and user clicks a new day, start a fresh range
    if (checkIn && checkOut) {
      onChange({
        checkIn: toLocalIsoDate(selectedDay),
        checkOut: '',
      })
      setActiveField('checkOut')
      return
    }

    if (!nextRange?.from) {
      onChange({ checkIn: '', checkOut: '' })
      setActiveField('checkIn')
      return
    }

    const nextFrom = toLocalIsoDate(nextRange.from)
    const nextTo =
      nextRange.to && nextRange.to.getTime() > nextRange.from.getTime()
        ? toLocalIsoDate(nextRange.to)
        : ''

    onChange({ checkIn: nextFrom, checkOut: nextTo })

    if (nextFrom && !nextTo) {
      setActiveField('checkOut')
    } else if (nextFrom && nextTo) {
      setActiveField('checkIn')
      if (isDesktop) {
        setIsOpen(false)
      }
    }
  }

  function handleClear() {
    onChange({ checkIn: '', checkOut: '' })
    setActiveField('checkIn')
  }

  const labelClass = compact
    ? 'flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-stone-500 font-semibold mb-1 sm:mb-1.5'
    : 'flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5'

  const buttonBaseClass = compact
    ? 'w-full px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border bg-white text-left text-xs sm:text-sm transition flex items-center justify-between gap-1.5 cursor-pointer'
    : 'w-full px-3 py-2.5 rounded-xl border bg-white text-left text-sm transition flex items-center justify-between gap-2 cursor-pointer'

  const checkInDisplay = formatStayDisplayDate(checkIn)
  const checkOutDisplay = formatStayDisplayDate(checkOut)

  const calendarNode = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal={!isDesktop}
      aria-label="Select check-in and check-out dates"
      style={
        isDesktop && popoverStyle
          ? {
              position: 'fixed',
              top: popoverStyle.top,
              left: popoverStyle.left,
              width: 680,
            }
          : undefined
      }
      className={
        isDesktop
          ? 'z-[60] rounded-2xl bg-white border border-stone-200/90 shadow-2xl p-6 text-stone-900'
          : 'w-full max-w-md rounded-3xl bg-white border border-stone-200 shadow-2xl p-5 text-stone-900 max-h-[88vh] overflow-y-auto'
      }
    >
      {/* Calendar Header Summary */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-100">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-800 font-semibold">
            {nights > 0
              ? `${nights} ${nights === 1 ? 'night' : 'nights'} selected`
              : activeField === 'checkOut' && checkIn
                ? 'Select your check-out date'
                : 'Select your check-in date'}
          </p>
          <p className="text-sm font-serif text-stone-900 mt-0.5">
            {checkInDisplay || 'Check-in'}
            <span className="mx-2 text-stone-400">→</span>
            {checkOutDisplay || 'Check-out'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => closeCalendar(true)}
          aria-label="Close calendar"
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dual-Month (Desktop) / Single-Month (Mobile) DayPicker */}
      <DayPicker
        mode="range"
        weekStartsOn={1}
        numberOfMonths={isDesktop ? 2 : 1}
        navLayout="around"
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        startMonth={today}
        selected={selectedRange}
        onSelect={handleSelectRange}
        disabled={{ before: today }}
        excludeDisabled
        showOutsideDays={false}
        components={{
          Chevron: ({ orientation }) =>
            orientation === 'left' ? (
              <ArrowLeft className="w-4 h-4 text-stone-700" />
            ) : (
              <ArrowRight className="w-4 h-4 text-stone-700" />
            ),
        }}
        classNames={{
          root: 'w-full select-none',
          months:
            'relative flex flex-col md:flex-row items-start justify-center gap-6 md:gap-8',
          month: 'w-full md:w-auto space-y-3',
          month_caption:
            'relative flex items-center justify-center h-9 px-8 font-medium text-stone-800',
          caption_label: 'text-sm font-semibold tracking-wide text-stone-800',
          button_previous:
            'absolute left-0 top-0 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 text-stone-700 disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer z-10',
          button_next:
            'absolute right-0 top-0 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 text-stone-700 disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer z-10',
          month_grid: 'w-full border-collapse',
          weekdays: 'grid grid-cols-7 mb-1',
          weekday:
            'h-8 flex items-center justify-center text-[11px] font-medium text-stone-400',
          weeks: 'space-y-1',
          week: 'grid grid-cols-7',
          day: 'relative p-0 text-center text-xs sm:text-sm focus-within:relative focus-within:z-20',
          day_button:
            'mx-auto w-9 h-9 rounded-full inline-flex items-center justify-center font-normal transition hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30 cursor-pointer disabled:cursor-not-allowed disabled:hover:bg-transparent',
          today: 'font-semibold text-amber-900',
          outside: 'text-stone-300 opacity-50',
          disabled:
            'text-stone-400/80 line-through decoration-stone-400/80 opacity-60',
          selected: 'font-semibold',
          range_start:
            'bg-amber-100/75 rounded-l-full [&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold',
          range_end:
            'bg-amber-100/75 rounded-r-full [&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold',
          range_middle:
            'bg-amber-100/75 text-stone-900 [&>button]:rounded-none [&>button]:hover:bg-amber-200/70',
        }}
      />

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={handleClear}
          disabled={!checkIn && !checkOut}
          className="text-xs font-semibold text-stone-500 hover:text-stone-900 underline underline-offset-4 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Clear dates
        </button>

        <button
          type="button"
          onClick={() => closeCalendar(true)}
          className="px-5 py-2 rounded-full bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-[11px] uppercase tracking-[0.16em] font-semibold transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div
      ref={triggerWrapperRef}
      className={`grid grid-cols-2 gap-2 sm:gap-3 ${className}`}
    >
      {/* Check-in Trigger */}
      <div>
        <label htmlFor={`${idPrefix}-checkin`} className={labelClass}>
          <Calendar className={compact ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'} />
          Check-in
        </label>
        <button
          ref={checkInBtnRef}
          id={`${idPrefix}-checkin`}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => handleOpen('checkIn')}
          className={`${buttonBaseClass} ${
            isOpen && activeField === 'checkIn'
              ? 'border-stone-900 ring-2 ring-stone-900/10'
              : 'border-stone-200 hover:border-stone-400'
          }`}
        >
          <span
            className={`truncate ${
              checkInDisplay ? 'text-stone-900 font-medium' : 'text-stone-400'
            }`}
          >
            {checkInDisplay || 'Add date'}
          </span>
          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        </button>
      </div>

      {/* Check-out Trigger */}
      <div>
        <label htmlFor={`${idPrefix}-checkout`} className={labelClass}>
          <Calendar className={compact ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'} />
          Check-out
        </label>
        <button
          ref={checkOutBtnRef}
          id={`${idPrefix}-checkout`}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => handleOpen('checkOut')}
          className={`${buttonBaseClass} ${
            isOpen && activeField === 'checkOut'
              ? 'border-stone-900 ring-2 ring-stone-900/10'
              : 'border-stone-200 hover:border-stone-400'
          }`}
        >
          <span
            className={`truncate ${
              checkOutDisplay ? 'text-stone-900 font-medium' : 'text-stone-400'
            }`}
          >
            {checkOutDisplay || 'Add date'}
          </span>
          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        </button>
      </div>

      {/* Optional hidden required inputs so native form validation still enforces dates when required */}
      {required && (
        <>
          <input
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            required
            value={checkIn}
            onChange={() => {}}
            className="sr-only"
          />
          <input
            type="text"
            tabIndex={-1}
            aria-hidden="true"
            required
            value={checkOut}
            onChange={() => {}}
            className="sr-only"
          />
        </>
      )}

      {/* Portal Calendar Overlay */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          isDesktop ? (
            calendarNode
          ) : (
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-stone-950/55 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
                {calendarNode}
              </div>
            </div>
          ),
          document.body,
        )}
    </div>
  )
}
