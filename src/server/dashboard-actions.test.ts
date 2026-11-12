import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getResortDayRange,
  getDashboardStatsHandler,
  validateQuickActionInput,
  checkInBookingHandler,
  checkOutBookingHandler,
} from './dashboard-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: any) => cb(prisma)),
    booking: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: vi.fn(),
}))

describe('dashboard-actions', () => {
  const mockAdmin = { id: 'admin-1', role: 'OWNER' }
  const mockRoom = { id: 'room-1', roomNumber: '101', pricePerNight: '4500' }
  const mockGuest = { id: 'guest-1', firstName: 'Maria', lastName: 'Santos' }

  const makeBooking = (overrides: Record<string, unknown> = {}) => ({
    id: 'b-1',
    bookingReference: 'JWH-20261112-AAAA',
    roomId: 'room-1',
    status: 'CONFIRMED',
    deletedAt: null,
    totalAmount: '9000.00',
    amountPaid: '4500.00',
    room: mockRoom,
    guest: mockGuest,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requirePermission).mockResolvedValue(mockAdmin as any)
    vi.mocked(authSession).mockResolvedValue({
      user: mockAdmin,
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)
  })

  describe('getResortDayRange', () => {
    it('uses Philippine time (UTC+8) to resolve today and the current month', () => {
      // 17:30 UTC on Nov 11 is already 01:30 on Nov 12 in Manila
      const range = getResortDayRange(new Date('2026-11-11T17:30:00.000Z'))

      expect(range.start.toISOString()).toBe('2026-11-12T00:00:00.000Z')
      expect(range.end.toISOString()).toBe('2026-11-13T00:00:00.000Z')
      expect(range.monthStart.toISOString()).toBe('2026-11-01T00:00:00.000Z')
      expect(range.monthEnd.toISOString()).toBe('2026-12-01T00:00:00.000Z')
    })

    it('defaults to the current time when no date is passed', () => {
      const range = getResortDayRange()
      expect(range.end.getTime() - range.start.getTime()).toBe(
        24 * 60 * 60 * 1000,
      )
    })
  })

  describe('validateQuickActionInput', () => {
    it('returns the input unchanged', () => {
      expect(validateQuickActionInput({ id: 'b-1' })).toEqual({ id: 'b-1' })
    })
  })

  describe('getDashboardStatsHandler', () => {
    it('aggregates arrivals, departures, room counts, recent bookings, balances, and monthly revenue', async () => {
      vi.mocked(prisma.booking.findMany)
        .mockResolvedValueOnce([makeBooking({ id: 'arr-1' })] as any)
        .mockResolvedValueOnce([
          makeBooking({ id: 'dep-1', status: 'CHECKED_IN' }),
        ] as any)
        .mockResolvedValueOnce([makeBooking({ id: 'rec-1' })] as any)
        .mockResolvedValueOnce([
          makeBooking({ id: 'out-1', paymentStatus: 'PARTIAL' }),
        ] as any)
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce([
        { status: 'AVAILABLE' },
        { status: 'AVAILABLE' },
        { status: 'OCCUPIED' },
        { status: 'CLEANING' },
        { status: 'MAINTENANCE' },
      ] as any)
      vi.mocked(prisma.booking.aggregate).mockResolvedValueOnce({
        _sum: { totalAmount: '27000.00', amountPaid: '13500.00' },
        _count: { _all: 3 },
      } as any)

      const res = await getDashboardStatsHandler()

      expect(requirePermission).toHaveBeenCalledWith('view:bookings')
      expect(res.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(res.arrivals[0].id).toBe('arr-1')
      expect(res.arrivals[0].totalAmount).toBe(9000)
      expect(res.arrivals[0].amountPaid).toBe(4500)
      expect(res.arrivals[0].room.pricePerNight).toBe(4500)
      expect(res.departures[0].id).toBe('dep-1')
      expect(res.recentBookings[0].id).toBe('rec-1')
      expect(res.outstanding[0].id).toBe('out-1')
      expect(res.rooms).toEqual({
        total: 5,
        available: 2,
        occupied: 1,
        cleaning: 1,
        maintenance: 1,
      })
      expect(res.revenue).toEqual({
        monthTotal: 27000,
        monthCollected: 13500,
        monthBookings: 3,
      })
    })

    it('falls back to zero revenue when there are no bookings this month', async () => {
      vi.mocked(prisma.booking.findMany).mockResolvedValue([])
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.booking.aggregate).mockResolvedValueOnce({
        _sum: { totalAmount: null, amountPaid: null },
        _count: { _all: 0 },
      } as any)

      const res = await getDashboardStatsHandler()

      expect(res.rooms.total).toBe(0)
      expect(res.revenue).toEqual({
        monthTotal: 0,
        monthCollected: 0,
        monthBookings: 0,
      })
    })
  })

  describe('checkInBookingHandler', () => {
    it('rejects missing, archived, or non-checkin-able bookings', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(null)
      await expect(
        checkInBookingHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ deletedAt: new Date() }) as any,
      )
      await expect(
        checkInBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_OUT' }) as any,
      )
      await expect(
        checkInBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Only pending or confirmed bookings can be checked in.')

      expect(prisma.booking.update).not.toHaveBeenCalled()
    })

    it('checks in pending and confirmed bookings and marks the room occupied', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'PENDING' }) as any,
      )
      await checkInBookingHandler({ data: { id: 'b-1' } })

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CONFIRMED' }) as any,
      )
      const res = await checkInBookingHandler({ data: { id: 'b-1' } })

      expect(res).toEqual({ success: true })
      expect(requirePermission).toHaveBeenCalledWith('update:bookings')
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: 'CHECKED_IN' },
      })
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'OCCUPIED' },
      })
      expect(logActivity).toHaveBeenLastCalledWith({
        userId: 'admin-1',
        action: 'BOOKING_CHECKED_IN',
        description:
          'Checked in Maria Santos to Room 101 (JWH-20261112-AAAA)',
        ipAddress: null,
        userAgent: null,
      })
    })
  })

  describe('checkOutBookingHandler', () => {
    it('rejects missing, archived, or not-checked-in bookings', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(null)
      await expect(
        checkOutBookingHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_IN', deletedAt: new Date() }) as any,
      )
      await expect(
        checkOutBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CONFIRMED' }) as any,
      )
      await expect(
        checkOutBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Only checked-in bookings can be checked out.')

      expect(prisma.booking.update).not.toHaveBeenCalled()
    })

    it('checks out a checked-in booking and marks the room for cleaning', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_IN' }) as any,
      )
      const res = await checkOutBookingHandler({ data: { id: 'b-1' } })

      expect(res).toEqual({ success: true })
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: 'CHECKED_OUT' },
      })
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'CLEANING' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_CHECKED_OUT',
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
        }),
      )

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_IN' }) as any,
      )
      await checkOutBookingHandler({ data: { id: 'b-1' } })
      expect(logActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: 'BOOKING_CHECKED_OUT',
          ipAddress: null,
          userAgent: null,
        }),
      )
    })
  })
})
