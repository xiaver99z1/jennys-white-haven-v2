import { useState } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { addDays, format, startOfToday } from 'date-fns'
import type { BookedDateRange } from '#/types'
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
  bookedRanges,
}: {
  initialCheckIn?: string
  initialCheckOut?: string
  bookedRanges?: BookedDateRange[]
}) {
  const [range, setRange] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
  })
  return (
    <StayDateRangePicker
      checkIn={range.checkIn}
      checkOut={range.checkOut}
      bookedRanges={bookedRanges}
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

  it('opens dual-month calendar, edits check-out without resetting check-in, disables booked nights, and clears dates', () => {
    const today = startOfToday()
    const checkInDate = addDays(today, 2)
    const checkOutDate = addDays(today, 4)
    const extendedCheckOutDate = addDays(today, 6)
    const bookedStart = addDays(today, 8)
    const bookedEnd = addDays(today, 10)

    render(
      <PickerHarness
        bookedRanges={[
          {
            checkIn: format(bookedStart, 'yyyy-MM-dd'),
            checkOut: format(bookedEnd, 'yyyy-MM-dd'),
          },
        ]}
      />,
    )

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
    expect(screen.getByText('Booked / Unavailable')).toBeInTheDocument()

    // Booked night is disabled on the calendar
    const bookedDayBtn = screen.getByRole('button', {
      name: new RegExp(format(bookedStart, 'MMMM do, yyyy'), 'i'),
    })
    expect(bookedDayBtn).toBeDisabled()

    // Select check-in -> immediately highlighted as dark pill before check-out is chosen
    const checkInCellButton = screen.getByRole('button', {
      name: new RegExp(format(checkInDate, 'MMMM do, yyyy'), 'i'),
    })
    fireEvent.click(checkInCellButton)
    expect(checkInBtn).toHaveTextContent(format(checkInDate, 'MMM d, yyyy'))
    expect(checkInCellButton.closest('td')?.className).toContain(
      '[&>button]:bg-stone-900',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(format(checkOutDate, 'MMMM do, yyyy'), 'i'),
      }),
    )
    expect(checkOutBtn).toHaveTextContent(format(checkOutDate, 'MMM d, yyyy'))
    expect(
      screen.queryByRole('dialog', {
        name: 'Select check-in and check-out dates',
      }),
    ).not.toBeInTheDocument()

    // Clicking Check-out and choosing a later date preserves Check-in instead of resetting the range
    fireEvent.click(checkOutBtn)
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(format(extendedCheckOutDate, 'MMMM do, yyyy'), 'i'),
      }),
    )
    expect(checkInBtn).toHaveTextContent(format(checkInDate, 'MMM d, yyyy'))
    expect(checkOutBtn).toHaveTextContent(
      format(extendedCheckOutDate, 'MMM d, yyyy'),
    )

    // Reopen and click Clear dates
    fireEvent.click(checkInBtn)
    expect(screen.getByText('4 nights selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear dates' }))
    expect(checkInBtn).toHaveTextContent('Add date')
    expect(checkOutBtn).toHaveTextContent('Add date')

    // Escape closes popover and restores focus
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(
      screen.queryByRole('dialog', {
        name: 'Select check-in and check-out dates',
      }),
    ).not.toBeInTheDocument()
    expect(checkInBtn).toHaveFocus()
  })

  it('focuses close button in mobile modal mode and restores focus on Escape', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    })

    render(<PickerHarness />)

    const checkInBtn = screen.getByLabelText(/Check-in/i)
    fireEvent.click(checkInBtn)

    const closeBtn = screen.getByRole('button', { name: 'Close calendar' })
    expect(closeBtn).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(checkInBtn).toHaveFocus()
  })
})
