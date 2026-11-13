import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getGuestsReport } from '#/server/report-actions'
import { GuestsReportView } from '#/components/admin/reports/GuestsReportView'
import { parseReportSearch } from '#/lib/formatters'

export const Route = createFileRoute('/admin/reports/guests')({
  validateSearch: parseReportSearch,
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
