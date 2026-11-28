import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDays, format, startOfToday } from 'date-fns'
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

  it('calculates stay summary, disables room booked dates, updates all fields, and submits successfully', async () => {
    vi.mocked(createBooking).mockResolvedValueOnce({ success: true } as any)
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })

    const today = startOfToday()
    const checkInDate = addDays(today, 2)
    const checkOutDate = addDays(today, 5)
    const bookedStart = addDays(today, 8)
    const bookedEnd = addDays(today, 10)

    render(
      <AddBookingModal
        {...defaultProps}
        existingBookings={[
          {
            id: 'existing-1',
            bookingReference: 'JWH-EXIST-01',
            roomId: 'room-2',
            guestId: 'guest-1',
            checkIn: format(bookedStart, 'yyyy-MM-dd'),
            checkOut: format(bookedEnd, 'yyyy-MM-dd'),
            nights: 2,
            guestsCount: 2,
            totalAmount: 13000,
            amountPaid: 0,
            paymentStatus: 'UNPAID',
            paymentMethod: null,
            status: 'CONFIRMED',
            specialRequests: null,
            room: mockRooms[1],
            guest: mockGuests[0],
          },
        ]}
      />,
    )

    fireEvent.change(screen.getByLabelText(/guest \*/i), {
      target: { value: 'guest-2' },
    })
    fireEvent.change(screen.getByLabelText(/room \*/i), {
      target: { value: 'room-2' },
    })

    // Open calendar and verify booked date is disabled for Room 102
    fireEvent.click(screen.getByLabelText(/check-in date/i))
    expect(
      screen.getByRole('button', {
        name: new RegExp(format(bookedStart, 'MMMM do, yyyy'), 'i'),
      }),
    ).toBeDisabled()

    // Picking only Check-in clears Check-out -> shows invalid stay message & disables submit
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(format(checkInDate, 'MMMM do, yyyy'), 'i'),
      }),
    )
    expect(
      screen.getByText('Check-out date must be after check-in date'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create booking/i }),
    ).toBeDisabled()

    // Select check-out 3 nights later -> 3 * 6500 = 19,500
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(format(checkOutDate, 'MMMM do, yyyy'), 'i'),
      }),
    )
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
          checkIn: format(checkInDate, 'yyyy-MM-dd'),
          checkOut: format(checkOutDate, 'yyyy-MM-dd'),
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

  it('validates empty rooms/guests and handles custom and fallback error messages', async () => {
    const { unmount } = render(
      <AddBookingModal {...defaultProps} rooms={[]} guests={[]} />,
    )

    fireEvent.submit(
      screen.getByRole('button', { name: /create booking/i }).closest('form')!,
    )

    await waitFor(() => {
      expect(screen.getByText('Please select a guest.')).toBeInTheDocument()
      expect(screen.getByText('Please select a room.')).toBeInTheDocument()
    })
    expect(createBooking).not.toHaveBeenCalled()
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
