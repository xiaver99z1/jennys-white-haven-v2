import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getRoomsList } from '#/server/room-actions'
import { RoomsList } from '#/components/admin/rooms/RoomsList'

export const Route = createFileRoute('/admin/rooms')({
  loader: async () => {
    const rooms = await getRoomsList()
    return { rooms }
  },
  component: AdminRoomsPage,
})

function AdminRoomsPage() {
  const { rooms } = Route.useLoaderData()
  const router = useRouter()

  return <RoomsList initialRooms={rooms} router={router} />
}
