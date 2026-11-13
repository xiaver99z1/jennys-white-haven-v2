import { Banknote, CreditCard, Percent, Receipt, Wallet } from 'lucide-react'
import { StatCard } from '#/components/common/StatCard'
import { Panel } from '#/components/common/Panel'
import { StatusBadge } from '#/components/common/StatusBadge'
import { EmptyState } from '#/components/common/EmptyState'
import { ReportToolbar } from '#/components/admin/reports/ReportToolbar'
import {
  formatPeso,
  formatShortDate,
  getPaymentStatusMeta,
} from '#/lib/formatters'
import { downloadCsv } from '#/lib/csv'
import type { ReportPreset, RevenueReportData } from '#/types'

interface RevenueReportViewProps {
  data: RevenueReportData
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
}

export function RevenueReportView({
  data,
  onRangeChange,
}: RevenueReportViewProps) {
  const { range, kpis, byMethod, dailyTrend, recentPayments, outstandingBookings } =
    data

  const handleExportCsv = () => {
    downloadCsv(
      `revenue-report-${range.from}-to-${range.to}`,
      [
        'Paid Date',
        'Booking Ref',
        'Guest',
        'Method',
        'Reference No',
        'Amount (PHP)',
        'Received By',
      ],
      recentPayments.map((p) => [
        formatShortDate(p.paidAt),
        p.bookingReference,
        p.guestName,
        p.method,
        p.referenceNo ?? '',
        p.amount,
        p.receivedByName ?? '',
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Revenue & Payments Report"
        subtitle="Cashflow collected, payment methods, and outstanding guest balances"
        range={range}
        onRangeChange={onRangeChange}
        onExportCsv={handleExportCsv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Collected"
          value={formatPeso(kpis.totalCollected)}
          hint={`${kpis.paymentCount} payment(s) in range`}
          icon={<Banknote className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Total Billed"
          value={formatPeso(kpis.totalBilled)}
          hint="Non-cancelled check-ins in range"
          icon={<Receipt className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatPeso(kpis.outstandingBalance)}
          hint={`${outstandingBookings.length} unpaid/partial booking(s)`}
          icon={<Wallet className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="Collection Rate"
          value={`${kpis.collectionRate}%`}
          hint="Collected vs billed in period"
          icon={<Percent className="w-5 h-5" />}
          accent="bg-stone-100 text-stone-700 border-stone-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Collections by Payment Method" count={byMethod.length}>
          {byMethod.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No payments recorded in this date range." />
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {byMethod.map((item) => (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                      {item.method}
                      <span className="text-stone-400 font-normal">
                        ({item.count})
                      </span>
                    </span>
                    <span className="font-bold text-stone-900">
                      {formatPeso(item.amount)} · {item.share}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-800 rounded-full"
                      style={{ width: `${Math.max(item.share, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Daily Collection Trend" count={dailyTrend.length}>
          {dailyTrend.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No daily collections in this date range." />
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
              {dailyTrend.map((d) => (
                <div
                  key={d.date}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-stone-700">
                    {formatShortDate(d.date)}
                  </span>
                  <span className="text-stone-400">{d.count} receipt(s)</span>
                  <span className="font-bold text-emerald-700">
                    {formatPeso(d.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <header className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">
            Outstanding Balances (Action Required)
          </h2>
          <p className="text-[11px] text-stone-500">
            Active unpaid and partial bookings across all dates
          </p>
        </header>
        {outstandingBookings.length === 0 ? (
          <div className="p-6">
            <EmptyState message="All active bookings are fully paid." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Check-In</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Paid</th>
                  <th className="px-5 py-3 font-semibold">Balance Due</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {outstandingBookings.map((b) => {
                  const meta = getPaymentStatusMeta(b.paymentStatus)
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
                        {formatShortDate(b.checkIn)}
                      </td>
                      <td className="px-5 py-3 font-medium text-stone-800">
                        {formatPeso(b.totalAmount)}
                      </td>
                      <td className="px-5 py-3 text-emerald-700 font-medium">
                        {formatPeso(b.amountPaid)}
                      </td>
                      <td className="px-5 py-3 font-bold text-red-700">
                        {formatPeso(b.balanceDue)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={meta.label}
                          className={meta.className}
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

      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <header className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">
            Payment Receipts Ledger
          </h2>
          <p className="text-[11px] text-stone-500">
            Latest payments collected within the selected period
          </p>
        </header>
        {recentPayments.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No payment receipts in this date range." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Booking Ref</th>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Ref No.</th>
                  <th className="px-5 py-3 font-semibold">Received By</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-3 text-stone-600">
                      {formatShortDate(p.paidAt)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-900">
                      {p.bookingReference}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{p.guestName}</td>
                    <td className="px-5 py-3 text-stone-700">{p.method}</td>
                    <td className="px-5 py-3 text-stone-500">
                      {p.referenceNo || '—'}
                    </td>
                    <td className="px-5 py-3 text-stone-500">
                      {p.receivedByName || '—'}
                    </td>
                    <td className="px-5 py-3 font-bold text-emerald-700 text-right">
                      +{formatPeso(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
