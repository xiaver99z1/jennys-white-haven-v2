import type { ReportDateRangeInput, ReportPreset, StatusMeta } from '#/types'
import {
  ADMIN_LABELS,
  BOOKING_STATUS_META,
  CHAT_STATUS_META,
  DEFAULT_BADGE_CLASS,
  DEFAULT_ROLE_BADGE_CLASS,
  PAYMENT_STATUS_META,
  REVIEW_STATUS_META,
  ROLE_BADGE_CLASSES,
  ROOM_STATUS_META,
  SHORT_MONTH_NAMES,
} from '#/lib/constants/labels'

const PESO_NUMBER_FORMATTER = new Intl.NumberFormat('en-US')
const LOCAL_DATE_FORMATTER = new Intl.DateTimeFormat()
const LOCAL_TIME_FORMATTER = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
})
const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
})
const UTC_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})
const CALENDAR_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})
const CALENDAR_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

/**
 * Formats a numeric or string amount in Philippine Pesos (e.g. "₱2,500").
 */
export function formatPeso(amount: number | string): string {
  return `₱${PESO_NUMBER_FORMATTER.format(Number(amount))}`
}

/**
 * Formats a Date or ISO date string as "YYYY-MM-DD" (UTC).
 */
export function formatDate(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10)
}

/**
 * Formats an optional Date or string for `<input type="date" />` ("YYYY-MM-DD" or "").
 */
export function formatDateInput(
  value: Date | string | undefined | null,
): string {
  if (!value) return ''
  return formatDate(value)
}

/**
 * Formats a local Date instance as "YYYY-MM-DD" without UTC shift.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parses a "YYYY-MM-DD" ISO string into a local midnight Date, or undefined if invalid.
 */
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

/**
 * Computes the number of stay nights between two "YYYY-MM-DD" calendar dates (0 if invalid or non-positive).
 */
export function computeStayNights(
  checkIn?: string,
  checkOut?: string,
): number {
  const from = parseLocalIsoDate(checkIn)
  const to = parseLocalIsoDate(checkOut)
  if (!from || !to) return 0
  const diffMs = to.getTime() - from.getTime()
  if (diffMs <= 0) return 0
  return Math.round(diffMs / 86_400_000)
}

/**
 * Formats a Date or ISO date string as "MMM. D, YYYY" (e.g. "Nov. 13, 2026").
 */
export function formatShortDate(dateInput: Date | string): string {
  const date = new Date(dateInput)
  return `${SHORT_MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/**
 * Formats a Date or ISO date string using the user's locale date format.
 */
export function formatLocalDateOnly(value: Date | string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return LOCAL_DATE_FORMATTER.format(dt)
}

/**
 * Formats a Date or ISO date string into a localized date + HH:MM time string.
 */
export function formatLocalDateTime(value: Date | string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return `${LOCAL_DATE_FORMATTER.format(dt)} ${LOCAL_TIME_FORMATTER.format(dt)}`
}

/**
 * Formats a chat timestamp into a concise local time string (e.g. "2:30 PM").
 */
export function formatChatTime(value: Date | string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return CHAT_TIME_FORMATTER.format(dt)
}

/**
 * Formats a Date or ISO string as "MMM. D, YYYY · H:MM AM/PM UTC" for admin audit/chat views.
 */
export function formatUtcTimestamp(value: Date | string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return `${formatShortDate(dt)} · ${UTC_TIME_FORMATTER.format(dt)} UTC`
}

/**
 * Formats weekday and short month/day labels for calendar grid headers using cached Intl formatters.
 */
export function formatCalendarDayHeader(date: Date): {
  dayLabel: string
  dateLabel: string
} {
  return {
    dayLabel: CALENDAR_WEEKDAY_FORMATTER.format(date),
    dateLabel: CALENDAR_MONTH_DAY_FORMATTER.format(date),
  }
}

/**
 * Formats a guest's full name from first and last name.
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

/**
 * Resolves badge label and Tailwind classes for a booking status.
 */
export function getBookingStatusMeta(status: string): StatusMeta {
  return (
    (BOOKING_STATUS_META as Record<string, StatusMeta | undefined>)[status] ?? {
      label: status,
      className: DEFAULT_BADGE_CLASS,
    }
  )
}

/**
 * Resolves badge label and Tailwind classes for a payment status.
 */
export function getPaymentStatusMeta(status: string): StatusMeta {
  return (
    (PAYMENT_STATUS_META as Record<string, StatusMeta | undefined>)[status] ?? {
      label: status,
      className: DEFAULT_BADGE_CLASS,
    }
  )
}

/**
 * Resolves badge label and Tailwind classes for a room status.
 */
export function getRoomStatusMeta(status: string): StatusMeta {
  return (
    (ROOM_STATUS_META as Record<string, StatusMeta | undefined>)[status] ?? {
      label: status,
      className: DEFAULT_BADGE_CLASS,
    }
  )
}

/**
 * Resolves badge label and Tailwind classes for a guest review moderation status.
 */
export function getReviewStatusMeta(status: string): StatusMeta {
  return (
    (REVIEW_STATUS_META as Record<string, StatusMeta | undefined>)[status] ?? {
      label: status,
      className: DEFAULT_BADGE_CLASS,
    }
  )
}

/**
 * Resolves badge label and Tailwind classes for a live chat thread status.
 */
export function getChatStatusMeta(status: string): StatusMeta {
  return (
    (CHAT_STATUS_META as Record<string, StatusMeta | undefined>)[status] ?? {
      label: status,
      className: DEFAULT_BADGE_CLASS,
    }
  )
}

/**
 * Resolves Tailwind badge classes for a staff role.
 */
export function getRoleBadgeClass(role?: string | null): string {
  const key = role?.toLowerCase() ?? ''
  return ROLE_BADGE_CLASSES[key] ?? DEFAULT_ROLE_BADGE_CLASS
}

/**
 * Formats a role key for display (e.g. "super_admin" -> "super admin").
 */
export function formatRoleLabel(
  role?: string | null,
  fallback = '',
): string {
  if (!role) return fallback
  return role.replace(/_/g, ' ')
}

/**
 * Extracts a safe user-facing error message from an unknown thrown value.
 */
export function getErrorMessage(
  err: unknown,
  fallback: string = ADMIN_LABELS.common.somethingWentWrong,
): string {
  return err instanceof Error ? err.message : fallback
}

const VALID_REPORT_PRESETS: ReadonlySet<string> = new Set([
  'today',
  'last7',
  'thisMonth',
  'lastMonth',
  'last90',
  'all',
  'custom',
])

/**
 * Checks whether a value is a valid YYYY-MM-DD calendar date.
 */
export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/**
 * Validates and normalizes URL search parameters for report routes.
 */
export function parseReportSearch(
  search: Record<string, unknown>,
): ReportDateRangeInput {
  const from = isValidCalendarDate(search.from) ? search.from : undefined
  const to = isValidCalendarDate(search.to) ? search.to : undefined
  const rawPreset =
    typeof search.preset === 'string' && VALID_REPORT_PRESETS.has(search.preset)
      ? (search.preset as ReportPreset)
      : 'thisMonth'
  const preset =
    rawPreset === 'custom' && (!from || !to) ? 'thisMonth' : rawPreset
  return { preset, from, to }
}
