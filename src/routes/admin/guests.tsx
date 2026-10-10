import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/guests')({
  head: () => ({
    meta: [{ title: "Guests | Jenny's White Haven" }],
  }),
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800">Guest</h1>
      <p className="text-stone-500 mt-2">Coming soon...</p>
    </div>
  ),
})
