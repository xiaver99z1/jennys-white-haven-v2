import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RevenueReportView } from './RevenueReportView'
import { OccupancyReportView } from './OccupancyReportView'
import { BookingsReportView } from './BookingsReportView'
import { GuestsReportView } from './GuestsReportView'

const mockDownloadCsv = vi.fn()
vi.mock('#/lib/csv', () => ({
  downloadCsv: (...args: any[]) => mockDownloadCsv(...args),
}))

const sampleRange = {
  from: '2026-11-01',
  to: '2026-11-13',
  preset: 'thisMonth' as const,
  dayCount: 13,
}

describe('Report Views', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  it('renders RevenueReportView, changes date presets/custom range, prints, and exports CSV', async () => {
    const user = userEvent.setup()
    const onRangeChange = vi.fn()

    render(
      <RevenueReportView
        data={{
          range: sampleRange,
          kpis: {
            totalCollected: 2000,
            totalBilled: 2500,
            outstandingBalance: 500,
            collectionRate: 80,
            paymentCount: 1,
          },
          byMethod: [{ method: 'GCASH', amount: 2000, count: 1, share: 100 }],
          dailyTrend: [{ date: '2026-11-10', amount: 2000, count: 1 }],
          recentPayments: [
            {
              id: 'p1',
              bookingId: 'b1',
              bookingReference: 'JWH-001',
              guestName: 'Maria Santos',
              amount: 2000,
              method: 'GCASH',
              referenceNo: 'GC-1',
              paidAt: '2026-11-10T00:00:00Z',
              receivedByName: 'Jenny',
            },
          ],
          outstandingBookings: [
            {
              id: 'b1',
              bookingReference: 'JWH-001',
              guestName: 'Maria Santos',
              roomNumber: '101',
              checkIn: '2026-11-10T00:00:00Z',
              totalAmount: 2500,
              amountPaid: 2000,
              balanceDue: 500,
              paymentStatus: 'PARTIAL',
            },
          ],
        }}
        onRangeChange={onRangeChange}
      />,
    )

    expect(screen.getByText('Revenue & Payments Report')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Last 7 Days' }))
    expect(onRangeChange).toHaveBeenCalledWith({ preset: 'last7' })

    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onRangeChange).toHaveBeenCalledWith({
      preset: 'custom',
      from: '2026-11-01',
      to: '2026-11-13',
    })

    await user.click(screen.getByRole('button', { name: /Export CSV/i }))
    expect(mockDownloadCsv).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Print/i }))
    expect(window.print).toHaveBeenCalled()
  })

  it('renders OccupancyReportView and exports CSV', async () => {
    const user = userEvent.setup()

    render(
      <OccupancyReportView
        data={{
          range: sampleRange,
          kpis: {
            occupancyRate: 50,
            occupiedRoomNights: 5,
            availableRoomNights: 10,
            adr: 2500,
            revPar: 1250,
            totalRoomRevenue: 12500,
            activeRoomCount: 1,
          },
          byRoomType: [
            {
              type: 'Deluxe',
              roomCount: 1,
              nightsSold: 5,
              availableNights: 10,
              occupancyRate: 50,
              revenue: 12500,
            },
          ],
          byRoom: [
            {
              id: 'r1',
              roomNumber: '101',
              name: 'Ocean Breeze',
              type: 'Deluxe',
              status: 'AVAILABLE',
              pricePerNight: 2500,
              nightsSold: 5,
              occupancyRate: 50,
              revenue: 12500,
              bookingCount: 2,
            },
          ],
        }}
        onRangeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Occupancy & Rooms Report')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Export CSV/i }))
    expect(mockDownloadCsv).toHaveBeenCalled()
  })

  it('renders BookingsReportView and exports CSV', async () => {
    const user = userEvent.setup()

    render(
      <BookingsReportView
        data={{
          range: sampleRange,
          kpis: {
            totalBookings: 1,
            confirmedOrCompleted: 1,
            cancelledCount: 0,
            cancellationRate: 0,
            avgLengthOfStay: 2,
            totalGuestsHosted: 2,
          },
          byStatus: [
            { status: 'CONFIRMED', count: 1, revenue: 5000, share: 100 },
          ],
          bookings: [
            {
              id: 'b1',
              bookingReference: 'JWH-001',
              guestName: 'Maria Santos',
              roomNumber: '101',
              roomName: 'Ocean Breeze',
              checkIn: '2026-11-10T00:00:00Z',
              checkOut: '2026-11-12T00:00:00Z',
              nights: 2,
              guestsCount: 2,
              totalAmount: 5000,
              amountPaid: 5000,
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
            },
          ],
        }}
        onRangeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Bookings & Operations Report')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Export CSV/i }))
    expect(mockDownloadCsv).toHaveBeenCalled()
  })

  it('renders GuestsReportView and exports CSV', async () => {
    const user = userEvent.setup()

    render(
      <GuestsReportView
        data={{
          range: sampleRange,
          kpis: {
            totalGuests: 1,
            newGuestsInPeriod: 1,
            repeatGuestsCount: 1,
            verifiedIdRate: 100,
          },
          byIdType: [{ idType: 'PASSPORT', count: 1, share: 100 }],
          byNationality: [{ nationality: 'Filipino', count: 1, share: 100 }],
          topGuests: [
            {
              id: 'g1',
              name: 'Maria Santos',
              email: 'maria@example.com',
              phone: '09171234567',
              nationality: 'Filipino',
              bookingCount: 2,
              totalNights: 4,
              totalSpent: 10000,
              lastStay: '2026-11-10T00:00:00Z',
            },
          ],
        }}
        onRangeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Guests & Insights Report')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Export CSV/i }))
    expect(mockDownloadCsv).toHaveBeenCalled()
  })
})
