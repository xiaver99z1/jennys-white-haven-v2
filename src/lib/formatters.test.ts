import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateInput,
  formatFullName,
  formatLocalDate,
  formatPeso,
  formatShortDate,
  getBookingStatusMeta,
  getErrorMessage,
  getPaymentStatusMeta,
  getRoleBadgeClass,
  getRoomStatusMeta,
} from '#/lib/formatters'

describe('formatters', () => {
  it('formats peso amounts from numbers and numeric strings', () => {
    expect(formatPeso(2500)).toBe('₱2,500')
    expect(formatPeso('1500')).toBe('₱1,500')
  })

  it('formats dates and date inputs', () => {
    expect(formatDate('2026-11-13T10:00:00.000Z')).toBe('2026-11-13')
    expect(formatDateInput(undefined)).toBe('')
    expect(formatDateInput(null)).toBe('')
    expect(formatDateInput('2026-11-13T10:00:00.000Z')).toBe('2026-11-13')
    expect(formatLocalDate(new Date(2026, 10, 5))).toBe('2026-11-05')
    expect(formatShortDate('2026-11-13T00:00:00.000Z')).toBe('Nov. 13, 2026')
  })

  it('formats full names', () => {
    expect(formatFullName('Maria', 'Santos')).toBe('Maria Santos')
  })

  it('resolves booking, payment, room, and role badge metadata with fallbacks', () => {
    expect(getBookingStatusMeta('CONFIRMED').label).toBe('Confirmed')
    expect(getBookingStatusMeta('UNKNOWN')).toEqual({
      label: 'UNKNOWN',
      className: 'bg-stone-100 text-stone-700 border-stone-200',
    })

    expect(getPaymentStatusMeta('PAID').label).toBe('Paid')
    expect(getPaymentStatusMeta('OTHER').label).toBe('OTHER')

    expect(getRoomStatusMeta('AVAILABLE').label).toBe('Available')
    expect(getRoomStatusMeta('OTHER').label).toBe('OTHER')

    expect(getRoleBadgeClass('OWNER')).toContain('amber')
    expect(getRoleBadgeClass('unknown')).toContain('stone')
    expect(getRoleBadgeClass(null)).toContain('stone')
  })

  it('extracts error messages safely', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getErrorMessage('string error')).toBe('Something went wrong')
    expect(getErrorMessage('string error', 'Fallback')).toBe('Fallback')
  })
})
