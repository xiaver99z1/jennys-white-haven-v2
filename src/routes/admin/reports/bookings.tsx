import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getBookingsReport } from '#/server/report-actions'
import { BookingsReportView } from '#/components/admin/reports/BookingsReportView'
import { parseReportSearch } from '#/lib/formatters'

export const Route = createFileRoute('/admin/reports/bookings')({
  validateSearch: parseReportSearch,
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
