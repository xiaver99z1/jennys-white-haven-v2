import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveReportDateRange,
  validateReportInput,
  getRevenueReportHandler,
  getOccupancyReportHandler,
  getBookingsReportHandler,
  getGuestsReportHandler,
} from './report-actions'

const {
  mockRequirePermission,
  mockPaymentFindMany,
  mockBookingFindMany,
  mockRoomFindMany,
  mockGuestFindMany,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockPaymentFindMany: vi.fn(),
  mockBookingFindMany: vi.fn(),
  mockRoomFindMany: vi.fn(),
  mockGuestFindMany: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    payment: { findMany: mockPaymentFindMany },
    booking: { findMany: mockBookingFindMany },
    room: { findMany: mockRoomFindMany },
    guest: { findMany: mockGuestFindMany },
  },
}))

describe('report-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'owner' })
  })

  it('validates input and resolves all date range presets', () => {
    expect(validateReportInput()).toEqual({})
    expect(validateReportInput({ preset: 'today' })).toEqual({ preset: 'today' })
    expect(() =>
      validateReportInput({ preset: 'custom', from: 'bad', to: '2026-11-10' }),
    ).toThrow('Invalid start date')
    expect(() =>
      validateReportInput({ preset: 'custom', from: '2026-11-10', to: '2026-02-30' }),
    ).toThrow('Invalid end date')
    expect(() => validateReportInput({ preset: 'custom' })).toThrow(
      'Invalid custom date range',
    )
    expect(() =>
      resolveReportDateRange({ preset: 'custom', from: 'bad', to: 'bad' }),
    ).toThrow('Invalid custom date range')

    expect(resolveReportDateRange({ preset: 'today' }).dayCount).toBe(1)
    expect(resolveReportDateRange({ preset: 'last7' }).dayCount).toBe(7)
    expect(resolveReportDateRange({ preset: 'last90' }).dayCount).toBe(90)
    expect(resolveReportDateRange({ preset: 'lastMonth' }).preset).toBe(
      'lastMonth',
    )
    expect(resolveReportDateRange({ preset: 'all' }).from).toBe('2020-01-01')
    expect(resolveReportDateRange({ preset: 'thisMonth' }).preset).toBe(
      'thisMonth',
    )

    const custom = resolveReportDateRange({
      preset: 'custom',
      from: '2026-11-10',
      to: '2026-11-05',
    })
    expect(custom.from).toBe('2026-11-05')
    expect(custom.to).toBe('2026-11-10')
    expect(custom.dayCount).toBe(6)
  })

  it('computes revenue report KPIs, breakdowns, and outstanding balances', async () => {
    mockPaymentFindMany.mockResolvedValue([
      {
        id: 'p1',
        amount: '1500.00',
        method: 'GCASH',
        referenceNo: 'GC-1',
        paidAt: new Date('2026-11-10T04:00:00Z'),
        booking: {
          id: 'b1',
          bookingReference: 'JWH-001',
          guest: { firstName: 'Maria', lastName: 'Santos' },
        },
        receivedBy: { name: 'Jenny' },
      },
      {
        id: 'p2',
        amount: '500.00',
        method: 'CASH',
        referenceNo: null,
        paidAt: new Date('2026-11-10T06:00:00Z'),
        booking: {
          id: 'b1',
          bookingReference: 'JWH-001',
          guest: { firstName: 'Maria', lastName: 'Santos' },
        },
        receivedBy: null,
      },
    ])
    mockBookingFindMany
      .mockResolvedValueOnce([{ totalAmount: '2500.00' }])
      .mockResolvedValueOnce([
        {
          id: 'b1',
          bookingReference: 'JWH-001',
          checkIn: new Date('2026-11-10T00:00:00Z'),
          totalAmount: '2500.00',
          amountPaid: '2000.00',
          paymentStatus: 'PARTIAL',
          guest: { firstName: 'Maria', lastName: 'Santos' },
          room: { roomNumber: '101' },
        },
      ])

    const res = await getRevenueReportHandler({
      data: { preset: 'custom', from: '2026-11-01', to: '2026-11-13' },
    })

    expect(mockRequirePermission).toHaveBeenCalledWith('view:reports')
    expect(res.kpis.totalCollected).toBe(2000)
    expect(res.kpis.totalBilled).toBe(2500)
    expect(res.kpis.outstandingBalance).toBe(500)
    expect(res.kpis.collectionRate).toBe(80)
    expect(res.byMethod[0].method).toBe('GCASH')
    expect(res.dailyTrend).toHaveLength(1)
    expect(res.recentPayments).toHaveLength(2)
  })

  it('computes occupancy report with prorated overlapping nights, ADR, and RevPAR', async () => {
    mockRoomFindMany.mockResolvedValue([
      {
        id: 'r1',
        roomNumber: '101',
        name: 'Ocean Breeze',
        type: 'DELUXE',
        status: 'AVAILABLE',
        pricePerNight: '2500.00',
      },
      {
        id: 'r2',
        roomNumber: '102',
        name: 'Garden Suite',
        type: 'SUITE',
        status: 'OCCUPIED',
        pricePerNight: '4000.00',
      },
    ])
    mockBookingFindMany.mockResolvedValue([
      {
        roomId: 'r1',
        checkIn: new Date('2026-11-01T06:00:00+08:00'),
        checkOut: new Date('2026-11-03T04:00:00+08:00'),
        nights: 2,
        totalAmount: '5000.00',
      },
    ])

    const res = await getOccupancyReportHandler({
      data: { preset: 'custom', from: '2026-11-01', to: '2026-11-05' },
    })

    expect(res.kpis.occupiedRoomNights).toBe(2)
    expect(res.kpis.availableRoomNights).toBe(10)
    expect(res.kpis.occupancyRate).toBe(20)
    expect(res.kpis.adr).toBe(2500)
    expect(res.kpis.revPar).toBe(500)
    expect(res.byRoomType).toHaveLength(2)
  })

  it('computes bookings report KPIs and status breakdown', async () => {
    mockBookingFindMany.mockResolvedValue([
      {
        id: 'b1',
        bookingReference: 'JWH-001',
        checkIn: new Date('2026-11-10T00:00:00Z'),
        checkOut: new Date('2026-11-12T00:00:00Z'),
        nights: 2,
        guestsCount: 2,
        totalAmount: '5000.00',
        amountPaid: '5000.00',
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        guest: { firstName: 'Maria', lastName: 'Santos' },
        room: { roomNumber: '101', name: 'Ocean Breeze' },
      },
      {
        id: 'b2',
        bookingReference: 'JWH-002',
        checkIn: new Date('2026-11-11T00:00:00Z'),
        checkOut: new Date('2026-11-12T00:00:00Z'),
        nights: 1,
        guestsCount: 1,
        totalAmount: '2500.00',
        amountPaid: '0',
        status: 'CANCELLED',
        paymentStatus: 'UNPAID',
        guest: { firstName: 'Juan', lastName: 'Cruz' },
        room: { roomNumber: '102', name: 'Garden' },
      },
    ])

    const res = await getBookingsReportHandler({
      data: { preset: 'custom', from: '2026-11-01', to: '2026-11-13' },
    })

    expect(res.kpis.totalBookings).toBe(2)
    expect(res.kpis.cancelledCount).toBe(1)
    expect(res.kpis.cancellationRate).toBe(50)
    expect(res.kpis.avgLengthOfStay).toBe(2)
    expect(res.byStatus).toHaveLength(2)
  })

  it('computes guests report retention, verification rate, and top guests', async () => {
    mockGuestFindMany.mockResolvedValue([
      {
        id: 'g1',
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@example.com',
        phone: '09171234567',
        nationality: 'Filipino',
        idType: 'PASSPORT',
        idNumber: 'P123',
        createdAt: new Date('2026-11-05T00:00:00Z'),
        bookings: [
          { totalAmount: '3000', nights: 2, checkIn: new Date('2026-11-06') },
          { totalAmount: '2000', nights: 1, checkIn: new Date('2026-11-10') },
        ],
      },
      {
        id: 'g2',
        firstName: 'Juan',
        lastName: 'Cruz',
        email: null,
        phone: '09180000000',
        nationality: null,
        idType: null,
        idNumber: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        bookings: [],
      },
    ])

    const res = await getGuestsReportHandler({
      data: { preset: 'custom', from: '2026-11-01', to: '2026-11-13' },
    })

    expect(res.kpis.totalGuests).toBe(1)
    expect(res.kpis.newGuestsInPeriod).toBe(1)
    expect(res.kpis.repeatGuestsCount).toBe(1)
    expect(res.kpis.verifiedIdRate).toBe(100)
    expect(res.topGuests[0].name).toBe('Maria Santos')
    expect(res.topGuests[0].totalSpent).toBe(5000)

    const allRes = await getGuestsReportHandler({ data: { preset: 'all' } })
    expect(allRes.kpis.totalGuests).toBe(2)
    expect(allRes.kpis.verifiedIdRate).toBe(50)
  })
})
