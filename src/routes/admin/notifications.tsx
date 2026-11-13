import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getNotifications } from '#/server/notification-actions'
import { NotificationsList } from '#/components/admin/notifications/NotificationsList'

export const Route = createFileRoute('/admin/notifications')({
  loader: async () => {
    const res = await getNotifications({ data: { filter: 'all', limit: 100 } })
    return { notifications: res.items }
  },
  component: NotificationsPage,
})

function NotificationsPage() {
  const { notifications } = Route.useLoaderData()
  const router = useRouter()

  return (
    <NotificationsList
      initialNotifications={notifications}
      router={router}
    />
  )
}
