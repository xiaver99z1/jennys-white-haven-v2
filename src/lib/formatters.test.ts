import { describe, it, expect } from 'vitest'
import {
  computeStayNights,
  formatCalendarDayHeader,
  formatChatTime,
  formatDate,
  formatDateInput,
  formatFullName,
  formatLocalDate,
  formatLocalDateOnly,
  formatLocalDateTime,
  formatPeso,
  formatRoleLabel,
  formatShortDate,
  formatUtcTimestamp,
  getBookingStatusMeta,
  getChatStatusMeta,
  getErrorMessage,
  getPaymentStatusMeta,
  getReviewStatusMeta,
  getRoleBadgeClass,
  getRoomStatusMeta,
  isValidCalendarDate,
  parseLocalIsoDate,
  parseReportSearch,
} from '#/lib/formatters'

describe('formatters', () => {
  it('formats peso amounts from numbers and numeric strings', () => {
    expect(formatPeso(2500)).toBe('₱2,500')
    expect(formatPeso('1500')).toBe('₱1,500')
  })

  it('formats dates, stay nights, and localized/UTC timestamps safely', () => {
    expect(formatDate('2026-11-13T10:00:00.000Z')).toBe('2026-11-13')
    expect(formatDateInput(undefined)).toBe('')
    expect(formatDateInput(null)).toBe('')
    expect(formatDateInput('2026-11-13T10:00:00.000Z')).toBe('2026-11-13')
    expect(formatLocalDate(new Date(2026, 10, 5))).toBe('2026-11-05')
    expect(formatShortDate('2026-11-13T00:00:00.000Z')).toBe('Nov. 13, 2026')

    expect(parseLocalIsoDate('2026-12-01')).toBeInstanceOf(Date)
    expect(parseLocalIsoDate('2026-02-30')).toBeUndefined()
    expect(parseLocalIsoDate('invalid')).toBeUndefined()

    expect(computeStayNights('2026-12-01', '2026-12-04')).toBe(3)
    expect(computeStayNights('2026-12-04', '2026-12-01')).toBe(0)
    expect(computeStayNights('', '2026-12-04')).toBe(0)

    expect(formatLocalDateOnly('2026-11-13T10:30:00.000Z')).not.toBe('')
    expect(formatLocalDateOnly('invalid')).toBe('')
    expect(formatLocalDateTime('2026-11-13T10:30:00.000Z')).toContain(' ')
    expect(formatLocalDateTime('invalid')).toBe('')
    expect(formatChatTime('2026-11-13T10:30:00.000Z')).not.toBe('')
    expect(formatChatTime('invalid')).toBe('')
    expect(formatUtcTimestamp('2026-11-13T14:05:00.000Z')).toBe(
      'Nov. 13, 2026 · 2:05 PM UTC',
    )
    expect(formatUtcTimestamp('invalid')).toBe('')

    const header = formatCalendarDayHeader(new Date(2026, 10, 13))
    expect(header.dayLabel).toBe('Fri')
    expect(header.dateLabel).toBe('Nov 13')
  })

  it('formats full names', () => {
    expect(formatFullName('Maria', 'Santos')).toBe('Maria Santos')
  })

  it('resolves booking, payment, room, review, chat, and role badge metadata with fallbacks', () => {
    expect(getBookingStatusMeta('CONFIRMED').label).toBe('Confirmed')
    expect(getBookingStatusMeta('UNKNOWN')).toEqual({
      label: 'UNKNOWN',
      className: 'bg-stone-100 text-stone-700 border-stone-200',
    })

    expect(getPaymentStatusMeta('PAID').label).toBe('Paid')
    expect(getPaymentStatusMeta('OTHER').label).toBe('OTHER')

    expect(getRoomStatusMeta('AVAILABLE').label).toBe('Available')
    expect(getRoomStatusMeta('OTHER').label).toBe('OTHER')

    expect(getReviewStatusMeta('APPROVED').label).toBe('APPROVED')
    expect(getReviewStatusMeta('OTHER').label).toBe('OTHER')

    expect(getChatStatusMeta('OPEN').label).toBe('Open')
    expect(getChatStatusMeta('RESOLVED').label).toBe('Resolved')
    expect(getChatStatusMeta('OTHER').label).toBe('OTHER')

    expect(getRoleBadgeClass('SUPER_ADMIN')).toContain('purple')
    expect(getRoleBadgeClass('OWNER')).toContain('amber')
    expect(getRoleBadgeClass('unknown')).toContain('stone')
    expect(getRoleBadgeClass(null)).toContain('stone')

    expect(formatRoleLabel('super_admin')).toBe('super admin')
    expect(formatRoleLabel('OWNER')).toBe('OWNER')
    expect(formatRoleLabel(null, 'Unassigned')).toBe('Unassigned')
    expect(formatRoleLabel(undefined)).toBe('')
  })

  it('extracts error messages and validates report search params safely', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getErrorMessage('string error')).toBe('Something went wrong')
    expect(getErrorMessage('string error', 'Fallback')).toBe('Fallback')

    expect(isValidCalendarDate('2026-11-28')).toBe(true)
    expect(isValidCalendarDate('2026-02-30')).toBe(false)
    expect(isValidCalendarDate(123)).toBe(false)

    expect(parseReportSearch({ preset: 'last7' }).preset).toBe('last7')
    expect(parseReportSearch({ preset: 'custom' }).preset).toBe('thisMonth')
    expect(
      parseReportSearch({
        preset: 'custom',
        from: '2026-11-01',
        to: '2026-11-15',
      }),
    ).toEqual({
      preset: 'custom',
      from: '2026-11-01',
      to: '2026-11-15',
    })
  })
})
