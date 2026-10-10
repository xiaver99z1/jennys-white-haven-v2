import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  head: () => ({
    meta: [{ title: "Home | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-1">Dashboard</h1>
      <p className="text-stone-500 mb-8">
        Welcome back to Jenny's White Haven Admin
      </p>

      {/* Simple Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Today's Check-ins" value="0" />
        <StatCard title="Today's Check-outs" value="0" />
        <StatCard title="Occupied Rooms" value="0" />
        <StatCard title="Available Rooms" value="0" />
      </div>

      <div className="mt-10 bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-lg font-medium text-stone-800 mb-2">
          Recent Bookings
        </h2>
        <p className="text-stone-500 text-sm">
          No bookings yet. They will appear here once guests start booking.
        </p>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <p className="text-sm text-stone-500 mb-1">{title}</p>
      <p className="text-2xl font-semibold text-stone-800">{value}</p>
    </div>
  )
}
