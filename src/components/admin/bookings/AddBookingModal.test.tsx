import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddBookingModal } from './AddBookingModal'
import { createBooking } from '#/server/booking-actions'

vi.mock('#/server/booking-actions', () => ({
  createBooking: vi.fn(),
}))

describe('AddBookingModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const mockRooms = [
    {
      id: 'room-1',
      roomNumber: '101',
      name: 'Ocean Suite',
      type: 'Suite',
      capacity: 4,
      pricePerNight: 4500,
    },
    {
      id: 'room-2',
      roomNumber: '102',
      name: 'Garden Villa',
      type: 'Villa',
      capacity: 6,
      pricePerNight: 6500,
    },
  ]

  const mockGuests = [
    {
      id: 'guest-1',
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '09171234567',
    },
    {
      id: 'guest-2',
      firstName: 'Juan',
      lastName: 'Cruz',
      phone: '09180001111',
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    rooms: mockRooms,
    guests: mockGuests,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when isOpen is false and handles empty rooms/guests arrays', () => {
    const { container, rerender } = render(
      <AddBookingModal {...defaultProps} isOpen={false} />,
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <AddBookingModal
        {...defaultProps}
        isOpen={true}
        rooms={[]}
        guests={[]}
      />,
    )
    expect(screen.getByText('Create New Booking')).toBeInTheDocument()
    expect(screen.getByText('₱0')).toBeInTheDocument()
  })

  it('calculates stay summary, updates all fields, and submits successfully', async () => {
    vi.mocked(createBooking).mockResolvedValueOnce({ success: true } as any)

    render(<AddBookingModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/guest \*/i), {
      target: { value: 'guest-2' },
    })
    fireEvent.change(screen.getByLabelText(/room \*/i), {
      target: { value: 'room-2' },
    })
    fireEvent.change(screen.getByLabelText(/check-in date/i), {
      target: { value: '2026-12-01' },
    })
    // Same date first to cover diff <= 0 invalid stay message & disabled button
    fireEvent.change(screen.getByLabelText(/check-out date/i), {
      target: { value: '2026-12-01' },
    })
    expect(
      screen.getByText('Check-out date must be after check-in date'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create booking/i }),
    ).toBeDisabled()

    // 3 nights -> 3 * 6500 = 19,500
    fireEvent.change(screen.getByLabelText(/check-out date/i), {
      target: { value: '2026-12-04' },
    })
    expect(screen.getByText('₱19,500')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/guests count/i), {
      target: { value: '4' },
    })
    fireEvent.change(screen.getByLabelText(/booking status/i), {
      target: { value: 'CHECKED_IN' },
    })
    fireEvent.change(screen.getByLabelText(/payment status/i), {
      target: { value: 'PARTIAL' },
    })
    fireEvent.change(screen.getByLabelText(/payment method/i), {
      target: { value: 'GCASH' },
    })
    fireEvent.change(screen.getByLabelText(/amount paid/i), {
      target: { value: '10000' },
    })
    fireEvent.change(screen.getByLabelText(/special requests/i), {
      target: { value: 'Airport transfer' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create booking/i }))

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalledWith({
        data: {
          roomId: 'room-2',
          guestId: 'guest-2',
          checkIn: '2026-12-01',
          checkOut: '2026-12-04',
          guestsCount: 4,
          totalAmount: 19500,
          amountPaid: 10000,
          paymentStatus: 'PARTIAL',
          paymentMethod: 'GCASH',
          status: 'CHECKED_IN',
          specialRequests: 'Airport transfer',
        },
      })
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('submits with empty rooms/guests and handles custom and fallback error messages', async () => {
    vi.mocked(createBooking).mockResolvedValueOnce({ success: true } as any)
    const { unmount } = render(
      <AddBookingModal {...defaultProps} rooms={[]} guests={[]} />,
    )

    fireEvent.submit(
      screen.getByRole('button', { name: /create booking/i }).closest('form')!,
    )

    await waitFor(() => {
      expect(createBooking).toHaveBeenCalled()
    })
    unmount()

    vi.mocked(createBooking).mockRejectedValueOnce(
      new Error('Room already booked'),
    )
    render(<AddBookingModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /create booking/i }))
    await waitFor(() => {
      expect(screen.getByText('Room already booked')).toBeInTheDocument()
    })

    vi.mocked(createBooking).mockRejectedValueOnce({})
    fireEvent.click(screen.getByRole('button', { name: /create booking/i }))
    await waitFor(() => {
      expect(screen.getByText('Failed to create booking.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
