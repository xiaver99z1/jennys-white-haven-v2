import { useState } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { addDays, format, startOfToday } from 'date-fns'
import {
  StayDateRangePicker,
  computeStayNights,
  formatStayDisplayDate,
  parseLocalIsoDate,
  toLocalIsoDate,
} from './StayDateRangePicker'

function PickerHarness({
  initialCheckIn = '',
  initialCheckOut = '',
}: {
  initialCheckIn?: string
  initialCheckOut?: string
}) {
  const [range, setRange] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
  })
  return (
    <StayDateRangePicker
      checkIn={range.checkIn}
      checkOut={range.checkOut}
      onChange={setRange}
      idPrefix="test"
    />
  )
}

describe('StayDateRangePicker', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })
  })

  it('parses, formats, and computes nights safely in local time', () => {
    const parsed = parseLocalIsoDate('2026-12-05')
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(11)
    expect(parsed?.getDate()).toBe(5)
    expect(toLocalIsoDate(parsed)).toBe('2026-12-05')
    expect(formatStayDisplayDate('2026-12-05')).toBe('Dec 5, 2026')
    expect(computeStayNights('2026-12-05', '2026-12-08')).toBe(3)
    expect(computeStayNights('2026-12-08', '2026-12-05')).toBe(0)
  })

  it('opens dual-month calendar popover, selects a check-in & check-out range, and clears dates', () => {
    const today = startOfToday()
    const checkInDate = addDays(today, 2)
    const checkOutDate = addDays(today, 5)

    render(<PickerHarness />)

    const checkInBtn = screen.getByLabelText(/Check-in/i)
    const checkOutBtn = screen.getByLabelText(/Check-out/i)
    expect(checkInBtn).toHaveTextContent('Add date')
    expect(checkOutBtn).toHaveTextContent('Add date')

    fireEvent.click(checkInBtn)
    expect(
      screen.getByRole('dialog', {
        name: 'Select check-in and check-out dates',
      }),
    ).toBeInTheDocument()

    // Select check-in date (2 days from today) and check-out date (5 days from today)
    const checkInDayBtn = screen.getByRole('button', {
      name: new RegExp(format(checkInDate, 'MMMM do, yyyy'), 'i'),
    })
    fireEvent.click(checkInDayBtn)
    expect(checkInBtn).toHaveTextContent(format(checkInDate, 'MMM d, yyyy'))

    const checkOutDayBtn = screen.getByRole('button', {
      name: new RegExp(format(checkOutDate, 'MMMM do, yyyy'), 'i'),
    })
    fireEvent.click(checkOutDayBtn)

    // Popover auto-closes on desktop once range is complete, and buttons reflect formatted dates
    expect(checkOutBtn).toHaveTextContent(format(checkOutDate, 'MMM d, yyyy'))
    expect(
      screen.queryByRole('dialog', {
        name: 'Select check-in and check-out dates',
      }),
    ).not.toBeInTheDocument()

    // Reopen and click Clear dates
    fireEvent.click(checkInBtn)
    expect(screen.getByText('3 nights selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear dates' }))
    expect(checkInBtn).toHaveTextContent('Add date')
    expect(checkOutBtn).toHaveTextContent('Add date')

    // Escape closes popover
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(
      screen.queryByRole('dialog', {
        name: 'Select check-in and check-out dates',
      }),
    ).not.toBeInTheDocument()
  })
})
