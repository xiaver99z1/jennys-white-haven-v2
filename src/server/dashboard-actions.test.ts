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
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
  const mockRoom = {
    id: 'room-1',
    roomNumber: '101',
    pricePerNight: '4500',
    status: 'AVAILABLE',
    deletedAt: null,
  }
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
    it('aggregates arrivals, departures, room counts, recent bookings, balances, and monthly revenue without understating balances', async () => {
      vi.mocked(prisma.booking.findMany)
        .mockResolvedValueOnce([makeBooking({ id: 'arr-1' })] as any)
        .mockResolvedValueOnce([
          makeBooking({ id: 'dep-1', status: 'CHECKED_IN' }),
        ] as any)
        .mockResolvedValueOnce([makeBooking({ id: 'rec-1' })] as any)
        .mockResolvedValueOnce([
          makeBooking({
            id: 'out-1',
            totalAmount: '9000.00',
            amountPaid: '4500.00',
            paymentStatus: 'PARTIAL',
          }),
          makeBooking({
            id: 'out-paid',
            totalAmount: '5000.00',
            amountPaid: '5000.00',
            paymentStatus: 'PARTIAL',
          }),
        ] as any)
        .mockResolvedValueOnce([
          { totalAmount: '10000.00', amountPaid: '5000.00' },
          // Overpaid booking should not reduce the balance due on the first booking
          { totalAmount: '5000.00', amountPaid: '7000.00' },
        ] as any)
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce([
        { status: 'AVAILABLE' },
        { status: 'AVAILABLE' },
        { status: 'OCCUPIED' },
        { status: 'CLEANING' },
        { status: 'MAINTENANCE' },
      ] as any)

      const res = await getDashboardStatsHandler()

      expect(requirePermission).toHaveBeenCalledWith('view:bookings')
      expect(res.canUpdateBookings).toBe(true)
      expect(res.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(res.arrivals[0].id).toBe('arr-1')
      expect(res.arrivals[0].totalAmount).toBe(9000)
      expect(res.arrivals[0].amountPaid).toBe(4500)
      expect(res.arrivals[0].room.pricePerNight).toBe(4500)
      expect(res.departures[0].id).toBe('dep-1')
      expect(res.recentBookings[0].id).toBe('rec-1')
      expect(res.outstanding).toHaveLength(1)
      expect(res.outstanding[0].id).toBe('out-1')
      expect(res.outstandingCount).toBe(1)
      expect(res.rooms).toEqual({
        total: 5,
        available: 2,
        occupied: 1,
        cleaning: 1,
        maintenance: 1,
      })
      expect(res.revenue).toEqual({
        monthTotal: 15000,
        monthPaid: 12000,
        monthBalanceDue: 5000,
        monthBookings: 2,
      })
    })

    it('falls back to zero revenue and sets canUpdateBookings=false for receptionist', async () => {
      vi.mocked(requirePermission).mockResolvedValueOnce({
        id: 'rec-user',
        role: 'RECEPTIONIST',
      } as any)
      vi.mocked(prisma.booking.findMany).mockResolvedValue([])
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce([])

      const res = await getDashboardStatsHandler()

      expect(res.canUpdateBookings).toBe(false)
      expect(res.rooms.total).toBe(0)
      expect(res.outstandingCount).toBe(0)
      expect(res.revenue).toEqual({
        monthTotal: 0,
        monthPaid: 0,
        monthBalanceDue: 0,
        monthBookings: 0,
      })
    })
  })

  describe('checkInBookingHandler', () => {
    it('rejects missing, archived, non-checkin-able, maintenance room, or already occupied room', async () => {
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

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ room: { ...mockRoom, status: 'MAINTENANCE' } }) as any,
      )
      await expect(
        checkInBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Room 101 is currently unavailable for check-in.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ room: { ...mockRoom, deletedAt: new Date() } }) as any,
      )
      await expect(
        checkInBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow('Room 101 is currently unavailable for check-in.')

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CONFIRMED' }) as any,
      )
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({
        bookingReference: 'JWH-20261112-OTHER',
      } as any)
      await expect(
        checkInBookingHandler({ data: { id: 'b-1' } }),
      ).rejects.toThrow(
        'Room 101 already has a checked-in guest (JWH-20261112-OTHER).',
      )

      expect(prisma.booking.update).not.toHaveBeenCalled()
    })

    it('checks in pending and confirmed bookings and marks the room occupied', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'PENDING' }) as any,
      )
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null)
      await checkInBookingHandler({ data: { id: 'b-1' } })

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CONFIRMED' }) as any,
      )
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null)
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

    it('checks out a checked-in booking, marks room CLEANING when empty, or keeps OCCUPIED if another booking is checked in', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_IN' }) as any,
      )
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null)
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

      vi.clearAllMocks()
      vi.mocked(requirePermission).mockResolvedValue(mockAdmin as any)
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        makeBooking({ status: 'CHECKED_IN' }) as any,
      )
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({
        id: 'other-checked-in',
      } as any)
      await checkOutBookingHandler({ data: { id: 'b-1' } })
      expect(prisma.room.update).not.toHaveBeenCalled()
    })
  })
})
