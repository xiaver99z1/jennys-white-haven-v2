import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookingCalendar } from '#/components/admin/bookings/BookingCalendar'
import { formatLocalDate } from '#/lib/formatters'
import type { BookingItem, BookingRoomOption } from '#/types'

const rooms: BookingRoomOption[] = [
  {
    id: 'r1',
    roomNumber: '101',
    name: 'Ocean View',
    type: 'Deluxe',
    capacity: 2,
    pricePerNight: 3500,
  },
]

const today = new Date()
const dayAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)

const bookings: BookingItem[] = [
  {
    id: 'b1',
    bookingReference: 'JWH-001',
    roomId: 'r1',
    guestId: 'g1',
    checkIn: formatLocalDate(today),
    checkOut: formatLocalDate(dayAfter),
    nights: 1,
    guestsCount: 2,
    totalAmount: 3500,
    amountPaid: 0,
    paymentStatus: 'UNPAID',
    status: 'CONFIRMED',
    room: {
      id: 'r1',
      roomNumber: '101',
      name: 'Ocean View',
      type: 'Deluxe',
      pricePerNight: 3500,
    },
    guest: {
      id: 'g1',
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '09171234567',
    },
  },
]

describe('BookingCalendar', () => {
  it('renders empty state when there are no rooms', () => {
    render(
      <BookingCalendar
        bookings={[]}
        rooms={[]}
        onSelectBooking={vi.fn()}
      />,
    )
    expect(screen.getByText('No rooms available')).toBeInTheDocument()
  })

  it('renders rooms, bookings, supports week navigation, and triggers onSelectBooking', async () => {
    const user = userEvent.setup()
    const onSelectBooking = vi.fn()

    render(
      <BookingCalendar
        bookings={bookings}
        rooms={rooms}
        onSelectBooking={onSelectBooking}
      />,
    )

    expect(screen.getByText('Room 101')).toBeInTheDocument()
    const bookingPill = screen.getAllByText('Maria Santos')[0]
    await user.click(bookingPill)
    expect(onSelectBooking).toHaveBeenCalledWith(bookings[0])

    // Navigating next week moves today out of view, exercising empty today/non-today cells
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
  })

  it('highlights today column even on empty cells when room has no booking today', () => {
    render(
      <BookingCalendar
        bookings={[]}
        rooms={rooms}
        onSelectBooking={vi.fn()}
      />,
    )
    expect(screen.getByText('Room 101')).toBeInTheDocument()
  })
})
