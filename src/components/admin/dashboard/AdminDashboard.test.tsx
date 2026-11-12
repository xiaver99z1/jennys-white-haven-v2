import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminDashboard } from './AdminDashboard'
import type { DashboardBooking, DashboardStats } from './AdminDashboard'
import { checkInBooking, checkOutBooking } from '#/server/dashboard-actions'

vi.mock('#/server/dashboard-actions', () => ({
  checkInBooking: vi.fn(),
  checkOutBooking: vi.fn(),
}))

const makeBooking = (
  overrides: Partial<DashboardBooking> = {},
): DashboardBooking => ({
  id: 'b-1',
  bookingReference: 'JWH-20261112-AAAA',
  checkIn: '2026-11-12T00:00:00.000Z',
  checkOut: '2026-11-14T00:00:00.000Z',
  nights: 2,
  guestsCount: 2,
  totalAmount: 9000,
  amountPaid: 4500,
  paymentStatus: 'PARTIAL',
  status: 'CONFIRMED',
  room: { roomNumber: '101', name: 'Ocean Suite' },
  guest: { firstName: 'Maria', lastName: 'Santos', phone: '09171234567' },
  ...overrides,
})

const fullStats: DashboardStats = {
  today: '2026-11-12',
  canUpdateBookings: true,
  arrivals: [
    makeBooking({ id: 'arr-pending', status: 'PENDING' }),
    makeBooking({
      id: 'arr-confirmed',
      bookingReference: 'JWH-20261112-BBBB',
      guest: { firstName: 'Juan', lastName: 'Cruz', phone: '0918' },
      room: { roomNumber: '102', name: 'Garden Villa' },
    }),
    makeBooking({
      id: 'arr-in',
      status: 'CHECKED_IN',
      guest: { firstName: 'Ana', lastName: 'Reyes', phone: '0919' },
    }),
  ],
  departures: [
    makeBooking({
      id: 'dep-in',
      status: 'CHECKED_IN',
      guest: { firstName: 'Pedro', lastName: 'Lim', phone: '0920' },
      room: { roomNumber: '201', name: 'Palm Villa' },
    }),
    makeBooking({
      id: 'dep-out',
      status: 'CHECKED_OUT',
      guest: { firstName: 'Liza', lastName: 'Tan', phone: '0921' },
    }),
  ],
  rooms: { total: 4, available: 1, occupied: 2, cleaning: 1, maintenance: 0 },
  recentBookings: [
    makeBooking({ id: 'rec-1', totalAmount: 12500 }),
    makeBooking({ id: 'rec-2', status: 'MYSTERY_STATUS' }),
  ],
  outstanding: [
    makeBooking({
      id: 'out-1',
      totalAmount: 10000,
      amountPaid: 2500,
      paymentStatus: 'PARTIAL',
    }),
    makeBooking({
      id: 'out-2',
      totalAmount: 5000,
      amountPaid: 6000,
      paymentStatus: 'MYSTERY_PAYMENT',
    }),
  ],
  outstandingCount: 2,
  revenue: {
    monthTotal: 50000,
    monthPaid: 32000,
    monthBalanceDue: 18000,
    monthBookings: 6,
  },
}

const emptyStats: DashboardStats = {
  today: '2026-11-12',
  canUpdateBookings: false,
  arrivals: [],
  departures: [],
  rooms: { total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0 },
  recentBookings: [],
  outstanding: [],
  outstandingCount: 0,
  revenue: {
    monthTotal: 1000,
    monthPaid: 1500,
    monthBalanceDue: 0,
    monthBookings: 1,
  },
}

describe('AdminDashboard', () => {
  const mockRouter = {
    invalidate: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders KPIs, occupancy, revenue, lists, and status/payment fallbacks', async () => {
    const user = userEvent.setup()
    render(<AdminDashboard stats={fullStats} router={mockRouter} />)

    expect(screen.getByText('Today · 2026-11-12')).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByText('50% occupancy')).toBeInTheDocument()
    expect(screen.getByText('1 cleaning · 0 maintenance')).toBeInTheDocument()
    expect(screen.getByText('₱50,000')).toBeInTheDocument()
    expect(screen.getByText('₱32,000')).toBeInTheDocument()
    expect(screen.getByText('₱18,000')).toBeInTheDocument()
    expect(
      screen.getByText('6 booking(s) checking in this month'),
    ).toBeInTheDocument()

    // Arrivals: PENDING + CONFIRMED get Check In, CHECKED_IN shows badge
    expect(screen.getAllByRole('button', { name: 'Check In' })).toHaveLength(2)
    // Departures: CHECKED_IN gets Check Out, CHECKED_OUT shows badge
    expect(screen.getAllByRole('button', { name: 'Check Out' })).toHaveLength(
      1,
    )
    expect(screen.getByText('Checked Out')).toBeInTheDocument()

    // Recent bookings with dates and unknown status fallback
    expect(screen.getByText('₱12,500')).toBeInTheDocument()
    expect(screen.getByText('MYSTERY_STATUS')).toBeInTheDocument()
    expect(
      screen.getAllByText('2026-11-12 → 2026-11-14 · 2 night(s)').length,
    ).toBeGreaterThan(0)

    // Balances due: remaining balance, overpaid clamps to 0, payment fallback
    expect(screen.getByText('₱7,500')).toBeInTheDocument()
    expect(screen.getByText('₱0')).toBeInTheDocument()
    expect(screen.getByText('MYSTERY_PAYMENT')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /view all/i }))
    expect(mockRouter.navigate).toHaveBeenCalledWith({ to: '/admin/bookings' })
  })

  it('hides check-in and check-out controls when canUpdateBookings is false', () => {
    render(
      <AdminDashboard
        stats={{ ...fullStats, canUpdateBookings: false }}
        router={mockRouter}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Check In' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Check Out' })).toBeNull()
  })

  it('renders empty states and zero occupancy when there are no rooms or bookings', () => {
    render(<AdminDashboard stats={emptyStats} router={mockRouter} />)

    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText('0% occupancy')).toBeInTheDocument()
    expect(
      screen.getByText('No arrivals scheduled for today.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No departures scheduled for today.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'No bookings yet. They will appear here once guests start booking.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('All bookings are fully paid.')).toBeInTheDocument()
    // Collected exceeds booked -> balance due clamps to 0
    expect(screen.getByText('₱0')).toBeInTheDocument()
  })

  it('confirms check-in, supports cancel, shows processing lock, and refreshes on success', async () => {
    let resolveCheckIn!: (value: { success: boolean }) => void
    vi.mocked(checkInBooking).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCheckIn = resolve
        }) as any,
    )
    const user = userEvent.setup()
    render(<AdminDashboard stats={fullStats} router={mockRouter} />)

    const checkInBtns = screen.getAllByRole('button', { name: 'Check In' })

    // Cancel first
    await user.click(checkInBtns[0])
    expect(screen.getByText('Check In Guest?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Check in Maria Santos to Room 101? The room will be marked as occupied.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Check In Guest?')).not.toBeInTheDocument()

    // Confirm on the second arrival
    await user.click(checkInBtns[1])
    await user.click(screen.getByRole('button', { name: 'Yes, Check In' }))

    expect(checkInBooking).toHaveBeenCalledWith({
      data: { id: 'arr-confirmed' },
    })
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check Out' })).toBeDisabled()

    resolveCheckIn({ success: true })
    await waitFor(() => {
      expect(mockRouter.invalidate).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
  })

  it('confirms check-out and shows server errors with message and fallback', async () => {
    const user = userEvent.setup()
    render(<AdminDashboard stats={fullStats} router={mockRouter} />)

    // Success
    vi.mocked(checkOutBooking).mockResolvedValueOnce({ success: true })
    await user.click(screen.getByRole('button', { name: 'Check Out' }))
    expect(screen.getByText('Check Out Guest?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Check out Pedro Lim from Room 201? The room will be marked for cleaning.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, Check Out' }))
    await waitFor(() => {
      expect(checkOutBooking).toHaveBeenCalledWith({ data: { id: 'dep-in' } })
      expect(mockRouter.invalidate).toHaveBeenCalledTimes(1)
    })

    // Error with message
    vi.mocked(checkOutBooking).mockRejectedValueOnce(
      new Error('Only checked-in bookings can be checked out.'),
    )
    await user.click(screen.getByRole('button', { name: 'Check Out' }))
    await user.click(screen.getByRole('button', { name: 'Yes, Check Out' }))
    await waitFor(() => {
      expect(
        screen.getByText('Only checked-in bookings can be checked out.'),
      ).toBeInTheDocument()
    })

    // Error without message -> fallback
    vi.mocked(checkOutBooking).mockRejectedValueOnce({})
    await user.click(screen.getByRole('button', { name: 'Check Out' }))
    await user.click(screen.getByRole('button', { name: 'Yes, Check Out' }))
    await waitFor(() => {
      expect(
        screen.getByText('Action failed. Please try again.'),
      ).toBeInTheDocument()
    })
  })
})
