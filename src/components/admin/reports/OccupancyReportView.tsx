import { BedDouble, Building2, Percent, TrendingUp } from 'lucide-react'
import { StatCard } from '#/components/common/StatCard'
import { Panel } from '#/components/common/Panel'
import { StatusBadge } from '#/components/common/StatusBadge'
import { EmptyState } from '#/components/common/EmptyState'
import { ReportToolbar } from '#/components/admin/reports/ReportToolbar'
import { formatPeso, getRoomStatusMeta } from '#/lib/formatters'
import { downloadCsv } from '#/lib/csv'
import type { OccupancyReportData, ReportPreset } from '#/types'

interface OccupancyReportViewProps {
  data: OccupancyReportData
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
}

export function OccupancyReportView({
  data,
  onRangeChange,
}: OccupancyReportViewProps) {
  const { range, kpis, byRoomType, byRoom } = data

  const handleExportCsv = () => {
    downloadCsv(
      `occupancy-report-${range.from}-to-${range.to}`,
      [
        'Room No',
        'Room Name',
        'Type',
        'Status',
        'Rate/Night (PHP)',
        'Nights Sold',
        'Occupancy (%)',
        'Bookings',
        'Revenue (PHP)',
      ],
      byRoom.map((r) => [
        r.roomNumber,
        r.name,
        r.type,
        r.status,
        r.pricePerNight,
        r.nightsSold,
        r.occupancyRate,
        r.bookingCount,
        r.revenue,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Occupancy & Rooms Report"
        subtitle="Room utilization, Average Daily Rate (ADR), and RevPAR"
        range={range}
        onRangeChange={onRangeChange}
        onExportCsv={handleExportCsv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy Rate"
          value={`${kpis.occupancyRate}%`}
          hint={`${kpis.occupiedRoomNights} / ${kpis.availableRoomNights} room-nights`}
          icon={<Percent className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="ADR (Avg Daily Rate)"
          value={formatPeso(kpis.adr)}
          hint="Room revenue per night sold"
          icon={<TrendingUp className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="RevPAR"
          value={formatPeso(kpis.revPar)}
          hint="Revenue per available room-night"
          icon={<Building2 className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="Room Revenue"
          value={formatPeso(kpis.totalRoomRevenue)}
          hint={`Across ${kpis.activeRoomCount} active room(s)`}
          icon={<BedDouble className="w-5 h-5" />}
          accent="bg-stone-100 text-stone-700 border-stone-200"
        />
      </div>

      <Panel title="Performance by Room Type" count={byRoomType.length}>
        {byRoomType.length === 0 ? (
          <div className="py-6">
            <EmptyState message="No active rooms found." />
          </div>
        ) : (
          <div className="py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {byRoomType.map((t) => (
              <div
                key={t.type}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">
                    {t.type}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {t.roomCount} room(s)
                  </span>
                </div>
                <div className="text-lg font-bold text-amber-900">
                  {t.occupancyRate}%
                </div>
                <div className="text-[11px] text-stone-500">
                  {t.nightsSold} / {t.availableNights} nights ·{' '}
                  {formatPeso(t.revenue)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <header className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">
            Room-by-Room Breakdown
          </h2>
          <p className="text-[11px] text-stone-500">
            Individual room occupancy and revenue in the selected period
          </p>
        </header>
        {byRoom.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No active rooms found." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Rate / Night</th>
                  <th className="px-5 py-3 font-semibold">Bookings</th>
                  <th className="px-5 py-3 font-semibold">Nights Sold</th>
                  <th className="px-5 py-3 font-semibold">Occupancy</th>
                  <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {byRoom.map((r) => {
                  const statusMeta = getRoomStatusMeta(r.status)
                  return (
                    <tr key={r.id} className="hover:bg-stone-50/70">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-stone-900">
                          Room {r.roomNumber}
                        </div>
                        <div className="text-[11px] text-stone-500">{r.name}</div>
                      </td>
                      <td className="px-5 py-3 text-stone-700">{r.type}</td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={statusMeta.label}
                          className={statusMeta.className}
                        />
                      </td>
                      <td className="px-5 py-3 text-stone-700">
                        {formatPeso(r.pricePerNight)}
                      </td>
                      <td className="px-5 py-3 text-stone-700">
                        {r.bookingCount}
                      </td>
                      <td className="px-5 py-3 font-semibold text-stone-900">
                        {r.nightsSold}
                      </td>
                      <td className="px-5 py-3 font-semibold text-amber-800">
                        {r.occupancyRate}%
                      </td>
                      <td className="px-5 py-3 font-bold text-emerald-700 text-right">
                        {formatPeso(r.revenue)}
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
