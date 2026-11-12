import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getGuestsList } from '#/server/guest-actions'
import { GuestsList } from '#/components/admin/guests/GuestsList'

export const Route = createFileRoute('/admin/guests')({
  head: () => ({
    meta: [{ title: "Guests | Jenny's White Haven" }],
  }),
  loader: async () => {
    const guests = await getGuestsList()
    return { guests }
  },
  component: AdminGuestsPage,
})

function AdminGuestsPage() {
  const { guests } = Route.useLoaderData()
  const router = useRouter()

  return <GuestsList initialGuests={guests} router={router} />
}
