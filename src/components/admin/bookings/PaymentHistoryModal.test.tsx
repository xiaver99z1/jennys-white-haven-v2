import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentHistoryModal } from '#/components/admin/bookings/PaymentHistoryModal'
import type { BookingItem } from '#/types'

const { mockGetBookingPayments, mockRecordPayment } = vi.hoisted(() => ({
  mockGetBookingPayments: vi.fn(),
  mockRecordPayment: vi.fn(),
}))

vi.mock('#/server/payment-actions', () => ({
  getBookingPayments: mockGetBookingPayments,
  recordPayment: mockRecordPayment,
}))

const sampleBooking: BookingItem = {
  id: 'b1',
  bookingReference: 'JWH-001',
  roomId: 'r1',
  guestId: 'g1',
  checkIn: '2026-11-12',
  checkOut: '2026-11-13',
  nights: 1,
  guestsCount: 2,
  totalAmount: 2500,
  amountPaid: 500,
  paymentStatus: 'PARTIAL',
  status: 'CONFIRMED',
  room: {
    id: 'r1',
    roomNumber: '101',
    name: 'Room 1',
    type: 'Standard',
    pricePerNight: 2500,
  },
  guest: {
    id: 'g1',
    firstName: 'Maria',
    lastName: 'Santos',
    phone: '09171234567',
  },
}

describe('PaymentHistoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when closed or booking is null', () => {
    const { container } = render(
      <PaymentHistoryModal
        isOpen={false}
        booking={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('loads payments, displays empty state, validates amount, and records payment', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const onClose = vi.fn()

    mockGetBookingPayments.mockResolvedValue({
      success: true,
      payments: [
        {
          id: 'p0',
          bookingId: 'b1',
          amount: 500,
          method: 'CASH',
          referenceNo: null,
          notes: null,
          paidAt: '2026-11-12T00:00:00.000Z',
          receivedBy: null,
        },
      ],
    })
    mockRecordPayment.mockResolvedValue({
      success: true,
      payment: {
        id: 'p1',
        bookingId: 'b1',
        amount: 2000,
        method: 'GCASH',
        referenceNo: 'GC-99',
        notes: 'Balance',
        paidAt: '2026-11-13T00:00:00.000Z',
        receivedBy: { name: 'Admin' },
      },
      amountPaid: 2500,
      paymentStatus: 'PAID',
    })

    render(
      <PaymentHistoryModal
        isOpen
        booking={sampleBooking}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('+₱500')).toBeInTheDocument()
    })

    const amountInput = screen.getByLabelText('Amount (₱)')
    await user.clear(amountInput)
    await user.type(amountInput, '0')
    await user.click(screen.getByRole('button', { name: /Record Payment/i }))
    expect(
      screen.getByText('Please enter a valid payment amount greater than 0.'),
    ).toBeInTheDocument()

    await user.clear(amountInput)
    await user.type(amountInput, '2000')
    await user.selectOptions(screen.getByLabelText('Method'), 'GCASH')
    await user.type(screen.getByLabelText(/Reference No/i), 'GC-99')
    await user.type(screen.getByLabelText(/Notes/i), 'Balance')
    await user.click(screen.getByRole('button', { name: /Record Payment/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(screen.getByText('+₱2,000')).toBeInTheDocument()
      expect(screen.getByText('Paid')).toBeInTheDocument()
    })

    // Also verify partial payment updates remaining amount
    mockRecordPayment.mockResolvedValueOnce({
      success: true,
      payment: {
        id: 'p2',
        bookingId: 'b1',
        amount: 500,
        method: 'CASH',
        referenceNo: null,
        notes: null,
        paidAt: '2026-11-13T01:00:00.000Z',
        receivedBy: { name: 'Admin' },
      },
      amountPaid: 1000,
      paymentStatus: 'PARTIAL',
    })
    await user.type(amountInput, '500')
    await user.click(screen.getByRole('button', { name: /Record Payment/i }))
    await waitFor(() => {
      expect(screen.getByText('₱1,000')).toBeInTheDocument()
      expect(amountInput).toHaveValue(1500)
    })

    await user.click(screen.getByRole('button', { name: 'Close payment modal' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('handles load and submit errors gracefully', async () => {
    const user = userEvent.setup()
    mockGetBookingPayments.mockRejectedValue(new Error('Load failed'))
    mockRecordPayment.mockRejectedValue('unknown')

    render(
      <PaymentHistoryModal
        isOpen
        booking={{ ...sampleBooking, amountPaid: 2500 }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Amount (₱)'), '100')
    await user.click(screen.getByRole('button', { name: /Record Payment/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to record payment.')).toBeInTheDocument()
    })
  })

  it('ignores async resolution and rejection after unmount', async () => {
    let resolveFetch!: (val: { success: boolean; payments: any[] }) => void
    mockGetBookingPayments.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { unmount } = render(
      <PaymentHistoryModal
        isOpen
        booking={sampleBooking}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    unmount()
    resolveFetch({ success: true, payments: [] })

    let rejectFetch!: (err: unknown) => void
    mockGetBookingPayments.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFetch = reject
        }),
    )

    const { unmount: unmount2 } = render(
      <PaymentHistoryModal
        isOpen
        booking={sampleBooking}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    unmount2()
    rejectFetch(new Error('late error'))
  })
})
