import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  computePaymentStatus,
  getBookingPaymentsHandler,
  recordPaymentHandler,
  validateBookingId,
  validateRecordPayment,
} from './payment-actions'

const {
  mockAuthSession,
  mockRequirePermission,
  mockLogActivity,
  mockPaymentFindMany,
  mockBookingFindUnique,
  mockTransaction,
  mockPaymentCreate,
  mockBookingUpdate,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockLogActivity: vi.fn(),
  mockPaymentFindMany: vi.fn(),
  mockBookingFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockPaymentCreate: vi.fn(),
  mockBookingUpdate: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('#/lib/logger', () => ({
  logActivity: mockLogActivity,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    payment: {
      findMany: mockPaymentFindMany,
      create: mockPaymentCreate,
    },
    booking: {
      findUnique: mockBookingFindUnique,
      update: mockBookingUpdate,
    },
    $transaction: mockTransaction,
  },
}))

describe('payment-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'owner' })
    mockAuthSession.mockResolvedValue({
      user: { id: 'u1', role: 'owner' },
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    })
    mockTransaction.mockImplementation(async (cb) =>
      cb({
        payment: { create: mockPaymentCreate },
        booking: { update: mockBookingUpdate },
      }),
    )
  })

  it('computes payment status accurately and validates inputs', () => {
    expect(validateBookingId({ bookingId: 'b1' })).toEqual({ bookingId: 'b1' })
    expect(
      validateRecordPayment({ bookingId: 'b1', amount: 100, method: 'CASH' }),
    ).toEqual({ bookingId: 'b1', amount: 100, method: 'CASH' })
    expect(computePaymentStatus(0, 2500)).toBe('UNPAID')
    expect(computePaymentStatus(1000, 2500)).toBe('PARTIAL')
    expect(computePaymentStatus(2500, 2500)).toBe('PAID')
    expect(computePaymentStatus(3000, 2500)).toBe('PAID')
  })

  it('fetches and serializes booking payments', async () => {
    mockPaymentFindMany.mockResolvedValue([
      {
        id: 'p1',
        bookingId: 'b1',
        amount: '1500.00',
        method: 'GCASH',
        referenceNo: 'REF-1',
        notes: 'Deposit',
        paidAt: new Date('2026-11-12T00:00:00Z'),
        receivedBy: { name: 'Admin' },
      },
    ])

    const res = await getBookingPaymentsHandler({ data: { bookingId: 'b1' } })
    expect(res.success).toBe(true)
    expect(res.payments[0].amount).toBe(1500)
    expect(mockRequirePermission).toHaveBeenCalledWith('view:bookings')
  })

  it('rejects invalid payment amounts or missing bookings', async () => {
    await expect(
      recordPaymentHandler({
        data: { bookingId: 'b1', amount: 0, method: 'CASH' },
      }),
    ).rejects.toThrow('Payment amount must be greater than 0.')

    mockBookingFindUnique.mockResolvedValue(null)
    await expect(
      recordPaymentHandler({
        data: { bookingId: 'missing', amount: 500, method: 'CASH' },
      }),
    ).rejects.toThrow('Booking not found.')

    mockBookingFindUnique.mockResolvedValue({
      id: 'b1',
      deletedAt: new Date(),
    })
    await expect(
      recordPaymentHandler({
        data: { bookingId: 'b1', amount: 500, method: 'CASH' },
      }),
    ).rejects.toThrow('Booking not found.')
  })

  it('records payment in transaction, updates booking totals, and logs activity', async () => {
    mockBookingFindUnique.mockResolvedValue({
      id: 'b1',
      bookingReference: 'JWH-001',
      totalAmount: '2500',
      amountPaid: '500',
      deletedAt: null,
    })
    mockPaymentCreate.mockResolvedValue({
      id: 'p2',
      bookingId: 'b1',
      amount: '2000',
      method: 'CASH',
      referenceNo: null,
      notes: null,
      paidAt: new Date(),
      receivedBy: { name: 'Owner' },
    })

    const res = await recordPaymentHandler({
      data: {
        bookingId: 'b1',
        amount: 2000,
        method: 'CASH',
        referenceNo: 'REF-1',
      },
    })

    expect(res.success).toBe(true)
    expect(res.amountPaid).toBe(2500)
    expect(res.paymentStatus).toBe('PAID')
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: {
        amountPaid: 2500,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      },
    })
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'PAYMENT_RECORDED',
        description: expect.stringContaining('JWH-001'),
      }),
    )

    mockAuthSession.mockResolvedValueOnce({
      user: { id: 'u1', role: 'owner' },
      session: { ipAddress: null, userAgent: null },
    })
    await recordPaymentHandler({
      data: {
        bookingId: 'b1',
        amount: 100,
        method: 'CASH',
      },
    })
  })
})
