import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getBookingsList } from '#/server/booking-actions'
import { BookingsList } from '#/components/admin/bookings/BookingsList'

export const Route = createFileRoute('/admin/bookings')({
  head: () => ({
    meta: [{ title: "Bookings Management | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  loader: async () => {
    const data = await getBookingsList()
    return data
  },
  component: BookingsPage,
})

function BookingsPage() {
  const { bookings, rooms, guests } = Route.useLoaderData()
  const router = useRouter()

  return (
    <BookingsList
      initialBookings={bookings}
      rooms={rooms}
      guests={guests}
      router={router}
    />
  )
}
