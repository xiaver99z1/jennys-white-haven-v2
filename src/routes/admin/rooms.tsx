import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/rooms')({
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold text-stone-800">Rooms</h1>
      <p className="text-stone-500 mt-2">Coming soon...</p>
    </div>
  ),
})
