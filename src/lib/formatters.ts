import type { StatusMeta } from '#/types'
import {
  ADMIN_LABELS,
  BOOKING_STATUS_META,
  DEFAULT_BADGE_CLASS,
  DEFAULT_ROLE_BADGE_CLASS,
  PAYMENT_STATUS_META,
  ROLE_BADGE_CLASSES,
  ROOM_STATUS_META,
  SHORT_MONTH_NAMES,
} from '#/lib/constants/labels'

/**
 * Formats a numeric or string amount in Philippine Pesos (e.g. "₱2,500").
 */
export function formatPeso(amount: number | string): string {
  return `₱${Number(amount).toLocaleString()}`
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
export function formatDateInput(value: Date | string | undefined | null): string {
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
 * Formats a Date or ISO date string as "MMM. D, YYYY" (e.g. "Nov. 13, 2026").
 */
export function formatShortDate(dateInput: Date | string): string {
  const date = new Date(dateInput)
  return `${SHORT_MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
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
 * Resolves Tailwind badge classes for a staff role.
 */
export function getRoleBadgeClass(role?: string | null): string {
  const key = role?.toLowerCase() ?? ''
  return ROLE_BADGE_CLASSES[key] ?? DEFAULT_ROLE_BADGE_CLASS
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
