import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BookingsList } from './BookingsList'
import { restoreBooking } from '#/server/booking-actions'

vi.mock('#/server/booking-actions', () => ({
  restoreBooking: vi.fn(),
}))

vi.mock('#/components/admin/bookings/AddBookingModal', () => ({
  AddBookingModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-add-booking-modal">
        <button onClick={onClose}>Close Add</button>
        <button onClick={onSuccess}>Success Add</button>
      </div>
    )
  },
}))

vi.mock('#/components/admin/bookings/EditBookingModal', () => ({
  EditBookingModal: ({
    isOpen,
    booking,
    onClose,
    onSuccess,
    onSaveStart,
    onDeleteStart,
  }: any) => {
    if (!isOpen || !booking) return null
    return (
      <div data-testid="mock-edit-booking-modal">
        <span>Editing {booking.bookingReference}</span>
        <button onClick={onClose}>Close Edit</button>
        <button onClick={() => onSaveStart(booking.id)}>
          Trigger Save Lock
        </button>
        <button onClick={() => onDeleteStart(booking.id)}>
          Trigger Delete Lock
        </button>
        <button onClick={onSuccess}>Success Edit</button>
      </div>
    )
  },
}))

vi.mock('#/components/common/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, title, onConfirm, onClose }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-confirm-modal">
        <h3>{title}</h3>
        <button onClick={onConfirm}>Confirm Action</button>
        <button onClick={onClose}>Cancel Action</button>
      </div>
    )
  },
}))

describe('BookingsList', () => {
  const mockRouter = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  }

  const mockRooms = [
    {
      id: 'room-1',
      roomNumber: '101',
      name: 'Ocean Suite',
      type: 'Suite',
      capacity: 4,
      pricePerNight: 4500,
    },
  ]

  const mockGuests = [
    {
      id: 'guest-1',
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '09171234567',
    },
  ]

  const mockBookings = [
    {
      id: 'b-1',
      bookingReference: 'JWH-20261112-0001',
      roomId: 'room-1',
      guestId: 'guest-1',
      checkIn: '2026-11-12T00:00:00.000Z',
      checkOut: '2026-11-14T00:00:00.000Z',
      nights: 2,
      guestsCount: 2,
      totalAmount: 9000,
      amountPaid: 4500,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'GCASH',
      status: 'CONFIRMED',
      specialRequests: 'Sea view balcony',
      deletedAt: null,
      room: mockRooms[0],
      guest: mockGuests[0],
    },
    {
      id: 'b-2',
      bookingReference: 'JWH-20261112-0002',
      roomId: 'room-1',
      guestId: 'guest-1',
      checkIn: '2026-11-15T00:00:00.000Z',
      checkOut: '2026-11-16T00:00:00.000Z',
      nights: 1,
      guestsCount: 2,
      totalAmount: 4500,
      amountPaid: 0,
      paymentStatus: 'UNKNOWN_PAYMENT',
      paymentMethod: null,
      status: 'UNKNOWN_STATUS',
      specialRequests: null,
      deletedAt: null,
      room: { ...mockRooms[0], roomNumber: '202', name: 'Palm Villa' },
      guest: { ...mockGuests[0], firstName: 'Juan', lastName: 'Cruz' },
    },
    {
      id: 'b-3',
      bookingReference: 'JWH-20261112-ARCH',
      roomId: 'room-1',
      guestId: 'guest-1',
      checkIn: '2026-11-20T00:00:00.000Z',
      checkOut: '2026-11-22T00:00:00.000Z',
      nights: 2,
      guestsCount: 2,
      totalAmount: 9000,
      amountPaid: 9000,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      status: 'CANCELLED',
      specialRequests: null,
      deletedAt: '2026-11-12T00:00:00.000Z',
      room: mockRooms[0],
      guest: mockGuests[0],
    },
  ]

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders active bookings table correctly and filters by search query and status tabs', async () => {
    const user = userEvent.setup()
    render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    expect(screen.getByText('Bookings Management')).toBeInTheDocument()
    expect(screen.getByText('JWH-20261112-0001')).toBeInTheDocument()
    expect(screen.getByText('JWH-20261112-0002')).toBeInTheDocument()
    expect(screen.queryByText('JWH-20261112-ARCH')).not.toBeInTheDocument()

    // Filter by status tab
    await user.click(screen.getByRole('button', { name: 'Confirmed' }))
    expect(screen.getByText('JWH-20261112-0001')).toBeInTheDocument()
    expect(screen.queryByText('JWH-20261112-0002')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All Bookings' }))

    // Search by room name
    const searchInput = screen.getByPlaceholderText(/search by reference/i)
    await user.type(searchInput, 'Palm Villa')
    expect(screen.getByText('JWH-20261112-0002')).toBeInTheDocument()
    expect(screen.queryByText('JWH-20261112-0001')).not.toBeInTheDocument()
  })

  it('toggles archived bookings view and displays archived items and empty states', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /view archived bookings/i }),
    )
    expect(screen.getByText('JWH-20261112-ARCH')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()

    rerender(
      <BookingsList
        initialBookings={[]}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )
    expect(
      screen.getByText(
        'No archived or soft-deleted bookings match your filters.',
      ),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /view active bookings/i }),
    )
    expect(
      screen.getByText(
        'Get started by creating your first staycation reservation.',
      ),
    ).toBeInTheDocument()
  })

  it('opens and closes Add Booking Modal and Edit Booking Modal with row locks', async () => {
    const user = userEvent.setup()
    render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    await user.click(screen.getByRole('button', { name: /new booking/i }))
    expect(screen.getByTestId('mock-add-booking-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /success add/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /close add/i }))
    expect(
      screen.queryByTestId('mock-add-booking-modal'),
    ).not.toBeInTheDocument()

    const editBtns = screen.getAllByRole('button', { name: /edit booking/i })
    await user.click(editBtns[0])
    expect(screen.getByTestId('mock-edit-booking-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close edit/i }))
    expect(
      screen.queryByTestId('mock-edit-booking-modal'),
    ).not.toBeInTheDocument()

    await user.click(editBtns[0])
    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )
    await user.click(screen.getByRole('button', { name: /success edit/i }))
    expect(mockRouter.invalidate).toHaveBeenCalledTimes(2)
  })

  it('handles restore booking flow (cancel, success=false, error, success=true) and clears locks on initialBookings update', async () => {
    vi.mocked(restoreBooking).mockResolvedValueOnce({ success: false })
    const user = userEvent.setup()
    const { unmount } = render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /view archived bookings/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore booking/i }))
    await user.click(screen.getByRole('button', { name: /cancel action/i }))
    expect(screen.queryByTestId('mock-confirm-modal')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /restore booking/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))
    await waitFor(() => {
      expect(restoreBooking).toHaveBeenCalledWith({ data: { id: 'b-3' } })
    })
    unmount()

    vi.mocked(restoreBooking).mockRejectedValueOnce(new Error('Restore fail'))
    const { unmount: unmount2 } = render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )
    await user.click(
      screen.getByRole('button', { name: /view archived bookings/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore booking/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore booking:',
        expect.any(Error),
      )
    })
    unmount2()

    vi.mocked(restoreBooking).mockResolvedValueOnce({ success: true })
    const { rerender } = render(
      <BookingsList
        initialBookings={mockBookings}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )
    await user.click(
      screen.getByRole('button', { name: /view archived bookings/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore booking/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))
    await waitFor(() => {
      expect(mockRouter.invalidate).toHaveBeenCalled()
    })

    // Clear restoringId lock
    rerender(
      <BookingsList
        initialBookings={mockBookings.map((b) =>
          b.id === 'b-3' ? { ...b, deletedAt: null } : b,
        )}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    // Trigger and clear savingId and deletingId locks
    await user.click(
      screen.getByRole('button', { name: /view active bookings/i }),
    )
    const editBtns = screen.getAllByRole('button', { name: /edit booking/i })
    await user.click(editBtns[0])
    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))
    rerender(
      <BookingsList
        initialBookings={[...mockBookings]}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )

    await user.click(editBtns[0])
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )
    rerender(
      <BookingsList
        initialBookings={mockBookings.map((b) =>
          b.id === 'b-1' ? { ...b, deletedAt: '2026-11-12T00:00:00.000Z' } : b,
        )}
        rooms={mockRooms}
        guests={mockGuests}
        router={mockRouter}
      />,
    )
    expect(screen.getByText('Bookings Management')).toBeInTheDocument()
  })
})
