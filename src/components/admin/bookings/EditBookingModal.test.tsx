import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditBookingModal } from './EditBookingModal'
import { updateBooking, deleteBooking } from '#/server/booking-actions'

vi.mock('#/server/booking-actions', () => ({
  updateBooking: vi.fn(),
  deleteBooking: vi.fn(),
}))

describe('EditBookingModal', () => {
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

  const mockBooking = {
    id: 'booking-1',
    bookingReference: 'JWH-20261112-ABCD',
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
    specialRequests: 'Late check-in',
    room: mockRooms[0],
    guest: mockGuests[0],
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onSaveStart: vi.fn(),
    onDeleteStart: vi.fn(),
    booking: mockBooking,
    rooms: mockRooms,
    guests: mockGuests,
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns null when isOpen is false or booking is null, and handles fallback booking properties', () => {
    const { container, rerender } = render(
      <EditBookingModal {...defaultProps} isOpen={false} booking={null} />,
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <EditBookingModal {...defaultProps} isOpen={true} booking={null} />,
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <EditBookingModal
        {...defaultProps}
        booking={{
          ...mockBooking,
          roomId: undefined as any,
          guestId: undefined as any,
          checkIn: '',
          checkOut: '',
          guestsCount: undefined as any,
          totalAmount: 0,
          amountPaid: 0,
          paymentStatus: undefined as any,
          paymentMethod: null,
          status: undefined as any,
          specialRequests: null,
        }}
      />,
    )
    expect(
      screen.getByText('Edit Booking JWH-20261112-ABCD'),
    ).toBeInTheDocument()
  })

  it('evaluates hasChanges across every individual field and ignores submit when unchanged', () => {
    render(<EditBookingModal {...defaultProps} />)

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' })
    expect(saveBtn).toBeDisabled()

    fireEvent.submit(saveBtn.closest('form')!)
    expect(updateBooking).not.toHaveBeenCalled()

    // 1. guestId
    const guestSelect = screen.getByLabelText(/^guest$/i)
    fireEvent.change(guestSelect, { target: { value: 'guest-2' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(guestSelect, { target: { value: 'guest-1' } })
    expect(saveBtn).toBeDisabled()

    // 2. roomId
    const roomSelect = screen.getByLabelText(/^room$/i)
    fireEvent.change(roomSelect, { target: { value: 'room-2' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(roomSelect, { target: { value: 'room-1' } })
    expect(saveBtn).toBeDisabled()

    // 3. checkIn
    const checkInInput = screen.getByLabelText(/check-in date/i)
    fireEvent.change(checkInInput, { target: { value: '2026-11-13' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(checkInInput, { target: { value: '2026-11-12' } })
    expect(saveBtn).toBeDisabled()

    // 4. checkOut
    const checkOutInput = screen.getByLabelText(/check-out date/i)
    fireEvent.change(checkOutInput, { target: { value: '2026-11-15' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(checkOutInput, { target: { value: '2026-11-14' } })
    expect(saveBtn).toBeDisabled()

    // 5. guestsCount
    const guestsInput = screen.getByLabelText(/guests count/i)
    fireEvent.change(guestsInput, { target: { value: '3' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(guestsInput, { target: { value: '2' } })
    expect(saveBtn).toBeDisabled()

    // 6. status
    const statusSelect = screen.getByLabelText(/booking status/i)
    fireEvent.change(statusSelect, { target: { value: 'CHECKED_IN' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(statusSelect, { target: { value: 'CONFIRMED' } })
    expect(saveBtn).toBeDisabled()

    // 7. paymentStatus
    const paymentStatusSelect = screen.getByLabelText(/payment status/i)
    fireEvent.change(paymentStatusSelect, { target: { value: 'PAID' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(paymentStatusSelect, { target: { value: 'PARTIAL' } })
    expect(saveBtn).toBeDisabled()

    // 8. paymentMethod
    const paymentMethodSelect = screen.getByLabelText(/payment method/i)
    fireEvent.change(paymentMethodSelect, { target: { value: 'CASH' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(paymentMethodSelect, { target: { value: 'GCASH' } })
    expect(saveBtn).toBeDisabled()

    // 9. totalAmount
    const totalInput = screen.getByLabelText(/total amount/i)
    fireEvent.change(totalInput, { target: { value: '10000' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(totalInput, { target: { value: '9000' } })
    expect(saveBtn).toBeDisabled()

    // 10. amountPaid
    const paidInput = screen.getByLabelText(/amount paid/i)
    fireEvent.change(paidInput, { target: { value: '9000' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(paidInput, { target: { value: '4500' } })
    expect(saveBtn).toBeDisabled()

    // 11. specialRequests
    const requestsInput = screen.getByLabelText(/special requests/i)
    fireEvent.change(requestsInput, { target: { value: 'Early breakfast' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(requestsInput, { target: { value: 'Late check-in' } })
    expect(saveBtn).toBeDisabled()
  })

  it('opens ConfirmModal on save, cancels save, and submits updated booking data successfully', async () => {
    vi.mocked(updateBooking).mockResolvedValueOnce({ success: true } as any)
    render(<EditBookingModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/booking status/i), {
      target: { value: 'CHECKED_IN' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(
      screen.getByText('Update Booking JWH-20261112-ABCD?'),
    ).toBeInTheDocument()

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    expect(
      screen.queryByText('Update Booking JWH-20261112-ABCD?'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(defaultProps.onSaveStart).toHaveBeenCalledWith('booking-1')
      expect(defaultProps.onClose).toHaveBeenCalled()
      expect(updateBooking).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'booking-1',
          status: 'CHECKED_IN',
        }),
      })
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles error when booking update fails with custom message and fallback message', async () => {
    vi.mocked(updateBooking).mockRejectedValueOnce(new Error('Update failed'))
    render(<EditBookingModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText(/booking status/i), {
      target: { value: 'CHECKED_IN' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })

    vi.mocked(updateBooking).mockRejectedValueOnce({})
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update booking.')).toBeInTheDocument()
    })
  })

  it('opens ConfirmModal, cancels deletion, and confirms deletion successfully', async () => {
    vi.mocked(deleteBooking).mockResolvedValueOnce({ success: true })
    render(<EditBookingModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete booking/i }))
    expect(
      screen.getByText('Archive Booking JWH-20261112-ABCD?'),
    ).toBeInTheDocument()

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    expect(
      screen.queryByText('Archive Booking JWH-20261112-ABCD?'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /delete booking/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(defaultProps.onDeleteStart).toHaveBeenCalledWith('booking-1')
      expect(deleteBooking).toHaveBeenCalledWith({ data: { id: 'booking-1' } })
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles error when booking deletion fails with custom message and fallback message', async () => {
    vi.mocked(deleteBooking).mockRejectedValueOnce(new Error('Delete error'))
    render(<EditBookingModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete booking/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Delete error')).toBeInTheDocument()
    })

    vi.mocked(deleteBooking).mockRejectedValueOnce({})
    fireEvent.click(screen.getByRole('button', { name: /delete booking/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to delete booking.')).toBeInTheDocument()
    })
  })
})
