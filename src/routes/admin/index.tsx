import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getDashboardStats } from '#/server/dashboard-actions'
import { AdminDashboard } from '#/components/admin/dashboard/AdminDashboard'

export const Route = createFileRoute('/admin/')({
  head: () => ({
    meta: [{ title: "Dashboard | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  loader: async () => await getDashboardStats(),
  component: DashboardPage,
})

function DashboardPage() {
  const stats = Route.useLoaderData()
  const router = useRouter()

  return <AdminDashboard stats={stats} router={router} />
}
