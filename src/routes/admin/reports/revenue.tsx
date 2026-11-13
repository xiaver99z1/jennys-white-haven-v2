import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getRevenueReport } from '#/server/report-actions'
import { RevenueReportView } from '#/components/admin/reports/RevenueReportView'
import { parseReportSearch } from '#/lib/formatters'

export const Route = createFileRoute('/admin/reports/revenue')({
  validateSearch: parseReportSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getRevenueReport({ data: deps }),
  component: RevenueReportPage,
})

function RevenueReportPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <RevenueReportView
      data={data}
      onRangeChange={(next) => navigate({ search: next })}
    />
  )
}
