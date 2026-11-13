import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getOccupancyReport } from '#/server/report-actions'
import { OccupancyReportView } from '#/components/admin/reports/OccupancyReportView'
import type { ReportDateRangeInput, ReportPreset } from '#/types'

export const Route = createFileRoute('/admin/reports/occupancy')({
  validateSearch: (search: Record<string, unknown>): ReportDateRangeInput => ({
    preset:
      typeof search.preset === 'string'
        ? (search.preset as ReportPreset)
        : 'thisMonth',
    from: typeof search.from === 'string' ? search.from : undefined,
    to: typeof search.to === 'string' ? search.to : undefined,
  }),
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
