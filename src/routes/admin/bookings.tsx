import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/bookings')({
  head: () => ({
    meta: [{ title: "Bookings | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800">Bookings</h1>
      <p className="text-stone-500 mt-2">Coming soon...</p>
    </div>
  ),
})
