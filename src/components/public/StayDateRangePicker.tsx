import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import type { DateRange, Matcher } from 'react-day-picker'
import { addDays, format, startOfToday } from 'date-fns'
import { ArrowLeft, ArrowRight, Calendar, X } from 'lucide-react'
import type { BookedDateRange } from '#/types'

export interface StayDateRangePickerProps {
  checkIn: string
  checkOut: string
  onChange: (next: { checkIn: string; checkOut: string }) => void
  bookedRanges?: BookedDateRange[]
  allowPastDates?: boolean
  idPrefix?: string
  checkInLabel?: string
  checkOutLabel?: string
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

function toOccupiedNightMatchers(
  bookedRanges?: BookedDateRange[],
): Array<{ from: Date; to: Date }> {
  if (!bookedRanges || bookedRanges.length === 0) return []
  const ranges: Array<{ from: Date; to: Date }> = []
  for (const item of bookedRanges) {
    const start = parseLocalIsoDate(item.checkIn)
    const end = parseLocalIsoDate(item.checkOut)
    if (!start || !end) continue
    const lastNight = addDays(end, -1)
    if (lastNight.getTime() >= start.getTime()) {
      ranges.push({ from: start, to: lastNight })
    }
  }
  return ranges
}

function rangeIntersectsOccupied(
  from: Date,
  to: Date,
  occupiedRanges: Array<{ from: Date; to: Date }>,
): boolean {
  const lastNight = addDays(to, -1)
  if (lastNight.getTime() < from.getTime()) return false
  return occupiedRanges.some(
    (occ) =>
      occ.from.getTime() <= lastNight.getTime() &&
      occ.to.getTime() >= from.getTime(),
  )
}

export function StayDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  bookedRanges,
  allowPastDates = false,
  idPrefix = 'stay',
  checkInLabel = 'Check-in',
  checkOutLabel = 'Check-out',
  compact = false,
  required = false,
  className = '',
}: StayDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeField, setActiveField] = useState<'checkIn' | 'checkOut'>(
    'checkIn',
  )
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [rangeNotice, setRangeNotice] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number
    left: number
  } | null>(null)

  const triggerWrapperRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const checkInBtnRef = useRef<HTMLButtonElement>(null)
  const checkOutBtnRef = useRef<HTMLButtonElement>(null)
  const activeFieldRef = useRef<'checkIn' | 'checkOut'>(activeField)
  activeFieldRef.current = activeField

  const today = useMemo(() => startOfToday(), [])

  const occupiedNightRanges = useMemo(
    () => toOccupiedNightMatchers(bookedRanges),
    [bookedRanges],
  )

  const disabledMatchers = useMemo<Matcher[]>(() => {
    const matchers: Matcher[] = []
    if (!allowPastDates) {
      matchers.push({ before: today })
    }
    for (const occ of occupiedNightRanges) {
      matchers.push(occ)
    }
    return matchers
  }, [allowPastDates, today, occupiedNightRanges])

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = parseLocalIsoDate(checkIn)
    const to = parseLocalIsoDate(checkOut)
    if (!from && !to) return undefined
    return { from, to }
  }, [checkIn, checkOut])

  const hasCompleteRange = Boolean(selectedRange?.from && selectedRange.to)

  const hoverPreviewMatchers = useMemo(() => {
    const from = selectedRange?.from
    if (
      activeField !== 'checkOut' ||
      !from ||
      selectedRange.to ||
      !hoveredDate ||
      hoveredDate.getTime() <= from.getTime() ||
      rangeIntersectsOccupied(from, hoveredDate, occupiedNightRanges)
    ) {
      return { middle: [] as Matcher[], end: [] as Matcher[] }
    }
    const afterFrom = addDays(from, 1)
    const beforeHover = addDays(hoveredDate, -1)
    return {
      middle:
        beforeHover.getTime() >= afterFrom.getTime()
          ? [{ from: afterFrom, to: beforeHover }]
          : [],
      end: [hoveredDate],
    }
  }, [activeField, selectedRange, hoveredDate, occupiedNightRanges])

  const nights = computeStayNights(checkIn, checkOut)

  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => parseLocalIsoDate(checkIn) ?? today,
  )

  const closeCalendar = useCallback((restoreFocus = false) => {
    setIsOpen(false)
    setHoveredDate(null)
    setRangeNotice(null)
    if (restoreFocus) {
      const target =
        activeFieldRef.current === 'checkOut'
          ? checkOutBtnRef.current
          : checkInBtnRef.current
      target?.focus()
    }
  }, [])

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
    const popoverWidth = Math.min(680, window.innerWidth - 32)
    const measuredHeight = popoverRef.current?.offsetHeight || 430
    const effectiveHeight = Math.min(measuredHeight, window.innerHeight - 32)
    const margin = 16

    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove =
      spaceBelow < effectiveHeight + margin &&
      rect.top > effectiveHeight + margin

    const rawTop = openAbove ? rect.top - effectiveHeight - 10 : rect.bottom + 10
    const maxTop = Math.max(margin, window.innerHeight - effectiveHeight - margin)
    const top = Math.min(Math.max(margin, rawTop), maxTop)

    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - popoverWidth - margin),
    )

    setPopoverStyle({ top, left })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePopoverPosition()
    if (!isDesktop) {
      closeBtnRef.current?.focus()
    }

    const handleReposition = () => updatePopoverPosition()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeCalendar(true)
      } else if (e.key === 'Tab' && !isDesktop && popoverRef.current) {
        const focusable = Array.from(
          popoverRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) {
          e.preventDefault()
          popoverRef.current.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
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
  }, [isOpen, isDesktop, updatePopoverPosition, closeCalendar])

  function handleOpen(field: 'checkIn' | 'checkOut') {
    setActiveField(field)
    setRangeNotice(null)
    if (!isOpen) {
      const initialMonth =
        parseLocalIsoDate(field === 'checkOut' && checkOut ? checkOut : checkIn) ??
        today
      setDisplayMonth(initialMonth)
    }
    setIsOpen(true)
  }

  function handleSelectRange(
    _nextRange: DateRange | undefined,
    selectedDay: Date,
  ) {
    const existingFrom = parseLocalIsoDate(checkIn)

    // When editing check-out with an existing check-in, preserve check-in if selectedDay is valid & after check-in
    if (activeField === 'checkOut' && existingFrom) {
      if (selectedDay.getTime() > existingFrom.getTime()) {
        if (
          !rangeIntersectsOccupied(existingFrom, selectedDay, occupiedNightRanges)
        ) {
          setRangeNotice(null)
          onChange({
            checkIn,
            checkOut: toLocalIsoDate(selectedDay),
          })
          // Keep calendar open so guest/admin can easily adjust check-in or check-out
          setActiveField('checkIn')
          return
        }

        // Cannot span across booked nights -> start a new check-in at selectedDay and explain why
        const nextIso = toLocalIsoDate(selectedDay)
        setRangeNotice(
          `Cannot cross booked dates — started new check-in on ${formatStayDisplayDate(nextIso)}.`,
        )
        onChange({
          checkIn: nextIso,
          checkOut: '',
        })
        setActiveField('checkOut')
        return
      }

      // If clicked date is on/before existing check-in, start fresh from selectedDay
      setRangeNotice(null)
      onChange({
        checkIn: toLocalIsoDate(selectedDay),
        checkOut: '',
      })
      setActiveField('checkOut')
      return
    }

    // Starting a new selection from Check-in
    setRangeNotice(null)
    onChange({
      checkIn: toLocalIsoDate(selectedDay),
      checkOut: '',
    })
    setActiveField('checkOut')
  }

  function handleClear() {
    setRangeNotice(null)
    onChange({ checkIn: '', checkOut: '' })
    setActiveField('checkIn')
  }

  const labelClass = compact
    ? 'flex items-center gap-1 min-w-0 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-stone-500 font-semibold mb-1 sm:mb-1.5'
    : 'flex items-center gap-1.5 min-w-0 text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5'

  const buttonBaseClass = compact
    ? 'w-full px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border bg-white text-left text-xs sm:text-sm transition flex items-center justify-between gap-1.5 cursor-pointer'
    : 'w-full px-3 py-2 rounded-xl border bg-white text-left text-xs sm:text-sm transition flex items-center justify-between gap-2 cursor-pointer'

  const checkInDisplay = formatStayDisplayDate(checkIn)
  const checkOutDisplay = formatStayDisplayDate(checkOut)
  const hasBookedDates = occupiedNightRanges.length > 0

  const calendarNode = (
    <div
      ref={popoverRef}
      role="dialog"
      tabIndex={-1}
      aria-modal={!isDesktop}
      aria-label="Select check-in and check-out dates"
      style={
        isDesktop && popoverStyle
          ? {
              position: 'fixed',
              top: popoverStyle.top,
              left: popoverStyle.left,
              width: 'min(680px, calc(100vw - 2rem))',
            }
          : undefined
      }
      className={
        isDesktop
          ? 'z-[70] rounded-2xl bg-white border border-stone-200/90 shadow-2xl p-6 text-stone-900 max-h-[calc(100vh-2rem)] overflow-y-auto'
          : 'w-full max-w-md rounded-3xl bg-white border border-stone-200 shadow-2xl p-5 text-stone-900 max-h-[88vh] overflow-y-auto'
      }
    >
      {/* Calendar Header Summary */}
      <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-stone-100">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-800 font-semibold">
            {nights > 0
              ? `${nights} ${nights === 1 ? 'night' : 'nights'} selected`
              : activeField === 'checkOut' && checkIn
                ? 'Select your check-out date'
                : 'Select your check-in date'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-serif text-stone-900">
            <button
              type="button"
              aria-pressed={activeField === 'checkIn'}
              aria-label={`Switch to start date (${checkInDisplay || 'not selected'})`}
              onClick={() => setActiveField('checkIn')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                activeField === 'checkIn'
                  ? 'bg-stone-900 text-[#FAF8F4]'
                  : 'hover:bg-stone-100 text-stone-800'
              }`}
            >
              {checkInDisplay || checkInLabel}
            </button>
            <span aria-hidden="true" className="text-stone-400">
              →
            </span>
            <button
              type="button"
              aria-pressed={activeField === 'checkOut'}
              aria-label={`Switch to end date (${checkOutDisplay || 'not selected'})`}
              onClick={() => setActiveField('checkOut')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                activeField === 'checkOut'
                  ? 'bg-stone-900 text-[#FAF8F4]'
                  : 'hover:bg-stone-100 text-stone-800'
              }`}
            >
              {checkOutDisplay || checkOutLabel}
            </button>
          </div>
          {rangeNotice && (
            <p role="status" className="text-[11px] font-medium text-rose-700">
              {rangeNotice}
            </p>
          )}
        </div>

        <button
          ref={closeBtnRef}
          type="button"
          onClick={() => closeCalendar(true)}
          aria-label="Close calendar"
          className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 transition cursor-pointer shrink-0"
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
        startMonth={allowPastDates ? undefined : today}
        selected={selectedRange}
        onSelect={handleSelectRange}
        onDayMouseEnter={(day) => setHoveredDate(day)}
        onDayMouseLeave={() => setHoveredDate(null)}
        disabled={disabledMatchers}
        modifiers={{
          booked: occupiedNightRanges,
          pickedEndpoint: [
            ...(selectedRange?.from ? [selectedRange.from] : []),
            ...(selectedRange?.to ? [selectedRange.to] : []),
          ],
          hoverRangeMiddle: hoverPreviewMatchers.middle,
          hoverRangeEnd: hoverPreviewMatchers.end,
        }}
        modifiersClassNames={{
          booked:
            '[&>button]:bg-rose-100 [&>button]:text-rose-700 [&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-rose-300 [&>button]:line-through [&>button]:decoration-rose-500 [&>button]:decoration-2',
          pickedEndpoint:
            '[&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold',
          hoverRangeMiddle: 'bg-amber-100/55 text-stone-900',
          hoverRangeEnd:
            'bg-amber-100/55 rounded-r-full [&>button]:ring-2 [&>button]:ring-stone-900/70 [&>button]:font-semibold',
        }}
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
          disabled: 'text-stone-300 line-through decoration-stone-300',
          selected: 'font-semibold',
          range_start: hasCompleteRange
            ? 'bg-amber-100/75 rounded-l-full [&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold'
            : '[&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold',
          range_end: hasCompleteRange
            ? 'bg-amber-100/75 rounded-r-full [&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold'
            : '[&>button]:bg-stone-900 [&>button]:text-[#FAF8F4] [&>button]:hover:bg-stone-900 [&>button]:font-semibold',
          range_middle:
            'bg-amber-100/75 text-stone-900 [&>button]:rounded-none [&>button]:hover:bg-amber-200/70',
        }}
      />

      {/* Footer Legend & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-stone-100">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
          {hasBookedDates && (
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
              <span className="w-3.5 h-3.5 rounded-sm bg-rose-100 border border-rose-400 inline-block" />
              Booked / Unavailable
            </span>
          )}
          <button
            type="button"
            onClick={handleClear}
            disabled={!checkIn && !checkOut}
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 underline underline-offset-4 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Clear dates
          </button>
        </div>

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
      className={`grid grid-cols-2 items-end gap-2 sm:gap-3 ${className}`}
    >
      {/* Check-in Trigger */}
      <div className="min-w-0">
        <label
          htmlFor={`${idPrefix}-checkin`}
          title={checkInLabel}
          className={labelClass}
        >
          <Calendar
            className={
              compact
                ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0'
                : 'w-3.5 h-3.5 shrink-0'
            }
          />
          <span className="truncate">{checkInLabel}</span>
          {required && <span className="text-rose-500 shrink-0">*</span>}
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
      <div className="min-w-0">
        <label
          htmlFor={`${idPrefix}-checkout`}
          title={checkOutLabel}
          className={labelClass}
        >
          <Calendar
            className={
              compact
                ? 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0'
                : 'w-3.5 h-3.5 shrink-0'
            }
          />
          <span className="truncate">{checkOutLabel}</span>
          {required && <span className="text-rose-500 shrink-0">*</span>}
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

      {/* Portal Calendar Overlay */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          isDesktop ? (
            calendarNode
          ) : (
            <div
              onClick={() => closeCalendar(true)}
              className="fixed inset-0 z-[70] bg-stone-950/55 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
              >
                {calendarNode}
              </div>
            </div>
          ),
          document.body,
        )}
    </div>
  )
}
