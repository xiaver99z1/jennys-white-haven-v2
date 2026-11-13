import { CalendarCheck2, Clock, Users, XCircle } from 'lucide-react'
import { StatCard } from '#/components/common/StatCard'
import { Panel } from '#/components/common/Panel'
import { StatusBadge } from '#/components/common/StatusBadge'
import { EmptyState } from '#/components/common/EmptyState'
import { ReportToolbar } from '#/components/admin/reports/ReportToolbar'
import {
  formatPeso,
  formatShortDate,
  getBookingStatusMeta,
  getPaymentStatusMeta,
} from '#/lib/formatters'
import { downloadCsv } from '#/lib/csv'
import type { BookingsReportData, ReportPreset } from '#/types'

interface BookingsReportViewProps {
  data: BookingsReportData
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
}

export function BookingsReportView({
  data,
  onRangeChange,
}: BookingsReportViewProps) {
  const { range, kpis, byStatus, bookings } = data

  const handleExportCsv = () => {
    downloadCsv(
      `bookings-report-${range.from}-to-${range.to}`,
      [
        'Reference',
        'Guest',
        'Room',
        'Check-In',
        'Check-Out',
        'Nights',
        'Guests',
        'Total (PHP)',
        'Paid (PHP)',
        'Booking Status',
        'Payment Status',
      ],
      bookings.map((b) => [
        b.bookingReference,
        b.guestName,
        `Room ${b.roomNumber} (${b.roomName})`,
        formatShortDate(b.checkIn),
        formatShortDate(b.checkOut),
        b.nights,
        b.guestsCount,
        b.totalAmount,
        b.amountPaid,
        b.status,
        b.paymentStatus,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Bookings & Operations Report"
        subtitle="Reservation pipeline, cancellations, and average length of stay"
        range={range}
        onRangeChange={onRangeChange}
        onExportCsv={handleExportCsv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bookings"
          value={String(kpis.totalBookings)}
          hint={`${kpis.confirmedOrCompleted} confirmed / completed`}
          icon={<CalendarCheck2 className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="Cancellation Rate"
          value={`${kpis.cancellationRate}%`}
          hint={`${kpis.cancelledCount} cancelled booking(s)`}
          icon={<XCircle className="w-5 h-5" />}
          accent="bg-red-50 text-red-700 border-red-200"
        />
        <StatCard
          title="Avg Length of Stay"
          value={`${kpis.avgLengthOfStay} nights`}
          hint="Across non-cancelled bookings"
          icon={<Clock className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="Guests Hosted"
          value={String(kpis.totalGuestsHosted)}
          hint="Total headcount in period"
          icon={<Users className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
      </div>

      <Panel title="Breakdown by Booking Status" count={byStatus.length}>
        {byStatus.length === 0 ? (
          <div className="py-6">
            <EmptyState message="No bookings found in this date range." />
          </div>
        ) : (
          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {byStatus.map((s) => {
              const meta = getBookingStatusMeta(s.status)
              return (
                <div
                  key={s.status}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5"
                >
                  <StatusBadge label={meta.label} className={meta.className} />
                  <div className="text-lg font-bold text-stone-900">
                    {s.count}{' '}
                    <span className="text-xs font-normal text-stone-500">
                      ({s.share}%)
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-600">
                    {formatPeso(s.revenue)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <header className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">
            Bookings in Period
          </h2>
          <p className="text-[11px] text-stone-500">
            All reservations with check-in dates inside the selected range
          </p>
        </header>
        {bookings.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No bookings found in this date range." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Stay</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b) => {
                  const statusMeta = getBookingStatusMeta(b.status)
                  const payMeta = getPaymentStatusMeta(b.paymentStatus)
                  return (
                    <tr key={b.id} className="hover:bg-stone-50/70">
                      <td className="px-5 py-3 font-semibold text-stone-900">
                        {b.bookingReference}
                      </td>
                      <td className="px-5 py-3 text-stone-700">{b.guestName}</td>
                      <td className="px-5 py-3 text-stone-600">
                        Room {b.roomNumber}
                      </td>
                      <td className="px-5 py-3 text-stone-600">
                        {formatShortDate(b.checkIn)} →{' '}
                        {formatShortDate(b.checkOut)} ({b.nights}n)
                      </td>
                      <td className="px-5 py-3 font-semibold text-stone-900">
                        {formatPeso(b.totalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={statusMeta.label}
                          className={statusMeta.className}
                        />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={payMeta.label}
                          className={payMeta.className}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
