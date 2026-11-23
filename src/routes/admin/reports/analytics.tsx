import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getAnalyticsReport } from '#/server/analytics-actions'
import { AnalyticsReportView } from '#/components/admin/reports/AnalyticsReportView'
import { parseReportSearch } from '#/lib/formatters'

export const Route = createFileRoute('/admin/reports/analytics')({
  head: () => ({
    meta: [{ title: "Website Analytics | Jenny's White Haven" }],
  }),
  validateSearch: parseReportSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAnalyticsReport({ data: deps }),
  component: AnalyticsReportPage,
})

function AnalyticsReportPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <AnalyticsReportView
      data={data}
      onRangeChange={(next) => navigate({ search: next })}
    />
  )
}
