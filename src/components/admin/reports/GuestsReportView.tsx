import { IdCard, Repeat, UserPlus, Users } from 'lucide-react'
import { StatCard } from '#/components/common/StatCard'
import { Panel } from '#/components/common/Panel'
import { EmptyState } from '#/components/common/EmptyState'
import { ReportToolbar } from '#/components/admin/reports/ReportToolbar'
import { formatPeso, formatShortDate } from '#/lib/formatters'
import { downloadCsv } from '#/lib/csv'
import type { GuestsReportData, ReportPreset } from '#/types'

interface GuestsReportViewProps {
  data: GuestsReportData
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
}

export function GuestsReportView({
  data,
  onRangeChange,
}: GuestsReportViewProps) {
  const { range, kpis, byIdType, byNationality, topGuests } = data

  const handleExportCsv = () => {
    downloadCsv(
      `guests-report-${range.from}-to-${range.to}`,
      [
        'Guest Name',
        'Phone',
        'Email',
        'Nationality',
        'Stays',
        'Total Nights',
        'Total Spent (PHP)',
        'Last Stay',
      ],
      topGuests.map((g) => [
        g.name,
        g.phone,
        g.email ?? '',
        g.nationality ?? '',
        g.bookingCount,
        g.totalNights,
        g.totalSpent,
        g.lastStay ? formatShortDate(g.lastStay) : '',
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Guests & Insights Report"
        subtitle="Guest retention, top spenders, and ID/nationality demographics"
        range={range}
        onRangeChange={onRangeChange}
        onExportCsv={handleExportCsv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Guests"
          value={String(kpis.totalGuests)}
          hint="Active guest profiles"
          icon={<Users className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="New Guests"
          value={String(kpis.newGuestsInPeriod)}
          hint="Registered in selected period"
          icon={<UserPlus className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Repeat Guests"
          value={String(kpis.repeatGuestsCount)}
          hint="Guests with 2+ stays"
          icon={<Repeat className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="Verified ID Rate"
          value={`${kpis.verifiedIdRate}%`}
          hint="Guests with ID type & number"
          icon={<IdCard className="w-5 h-5" />}
          accent="bg-stone-100 text-stone-700 border-stone-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top Nationalities" count={byNationality.length}>
          {byNationality.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No guest nationality data available." />
            </div>
          ) : (
            <div className="py-4 space-y-2.5">
              {byNationality.map((item) => (
                <div
                  key={item.nationality}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-stone-800">
                    {item.nationality}
                  </span>
                  <span className="font-semibold text-stone-600">
                    {item.count} ({item.share}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="ID Verification Breakdown" count={byIdType.length}>
          {byIdType.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No guest ID records available." />
            </div>
          ) : (
            <div className="py-4 space-y-2.5">
              {byIdType.map((item) => (
                <div
                  key={item.idType}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-stone-800">
                    {item.idType}
                  </span>
                  <span className="font-semibold text-stone-600">
                    {item.count} ({item.share}%)
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
            Top Guests by Spend & Stays
          </h2>
          <p className="text-[11px] text-stone-500">
            Highest-value repeat and recent guests
          </p>
        </header>
        {topGuests.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No guest records found." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Nationality</th>
                  <th className="px-5 py-3 font-semibold">Stays</th>
                  <th className="px-5 py-3 font-semibold">Nights</th>
                  <th className="px-5 py-3 font-semibold">Last Stay</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Total Spent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-3 font-semibold text-stone-900">
                      {g.name}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      <div>{g.phone}</div>
                      {g.email ? (
                        <div className="text-[11px] text-stone-400">
                          {g.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {g.nationality || '—'}
                    </td>
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      {g.bookingCount}
                    </td>
                    <td className="px-5 py-3 text-stone-700">{g.totalNights}</td>
                    <td className="px-5 py-3 text-stone-600">
                      {g.lastStay ? formatShortDate(g.lastStay) : '—'}
                    </td>
                    <td className="px-5 py-3 font-bold text-emerald-700 text-right">
                      {formatPeso(g.totalSpent)}
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
