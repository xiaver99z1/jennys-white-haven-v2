import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getBookingsReport } from '#/server/report-actions'
import { BookingsReportView } from '#/components/admin/reports/BookingsReportView'
import type { ReportDateRangeInput, ReportPreset } from '#/types'

export const Route = createFileRoute('/admin/reports/bookings')({
  validateSearch: (search: Record<string, unknown>): ReportDateRangeInput => ({
    preset:
      typeof search.preset === 'string'
        ? (search.preset as ReportPreset)
        : 'thisMonth',
    from: typeof search.from === 'string' ? search.from : undefined,
    to: typeof search.to === 'string' ? search.to : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getBookingsReport({ data: deps }),
  component: BookingsReportPage,
})

function BookingsReportPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <BookingsReportView
      data={data}
      onRangeChange={(next) => navigate({ search: next })}
    />
  )
}
