import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getGuestsReport } from '#/server/report-actions'
import { GuestsReportView } from '#/components/admin/reports/GuestsReportView'
import type { ReportDateRangeInput, ReportPreset } from '#/types'

export const Route = createFileRoute('/admin/reports/guests')({
  validateSearch: (search: Record<string, unknown>): ReportDateRangeInput => ({
    preset:
      typeof search.preset === 'string'
        ? (search.preset as ReportPreset)
        : 'thisMonth',
    from: typeof search.from === 'string' ? search.from : undefined,
    to: typeof search.to === 'string' ? search.to : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getGuestsReport({ data: deps }),
  component: GuestsReportPage,
})

function GuestsReportPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <GuestsReportView
      data={data}
      onRangeChange={(next) => navigate({ search: next })}
    />
  )
}
