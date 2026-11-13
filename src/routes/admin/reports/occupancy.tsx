import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getOccupancyReport } from '#/server/report-actions'
import { OccupancyReportView } from '#/components/admin/reports/OccupancyReportView'
import { parseReportSearch } from '#/lib/formatters'

export const Route = createFileRoute('/admin/reports/occupancy')({
  validateSearch: parseReportSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getOccupancyReport({ data: deps }),
  component: OccupancyReportPage,
})

function OccupancyReportPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <OccupancyReportView
      data={data}
      onRangeChange={(next) => navigate({ search: next })}
    />
  )
}
