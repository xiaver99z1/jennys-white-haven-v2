import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getNotifications } from '#/server/notification-actions'
import { NotificationsList } from '#/components/admin/notifications/NotificationsList'

export const Route = createFileRoute('/admin/notifications')({
  loader: async () => {
    const [allRes, unreadRes] = await Promise.all([
      getNotifications({ data: { filter: 'all', limit: 100 } }),
      getNotifications({ data: { filter: 'unread', limit: 200 } }),
    ])
    const seen = new Set(allRes.items.map((n) => n.id))
    const merged = [
      ...allRes.items,
      ...unreadRes.items.filter((n) => !seen.has(n.id)),
    ]
    return { notifications: merged, unreadCount: unreadRes.unreadCount }
  },
  component: NotificationsPage,
})

function NotificationsPage() {
  const { notifications, unreadCount } = Route.useLoaderData()
  const router = useRouter()

  return (
    <NotificationsList
      initialNotifications={notifications}
      unreadCount={unreadCount}
      router={router}
    />
  )
}
