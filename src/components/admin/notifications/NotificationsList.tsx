import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, Check, CheckCheck } from 'lucide-react'
import type { AdminRouter, NotificationRecord } from '#/types'
import { formatShortDate } from '#/lib/formatters'
import { EmptyState } from '#/components/common/EmptyState'
import { StatusBadge } from '#/components/common/StatusBadge'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '#/server/notification-actions'

interface NotificationsListProps {
  initialNotifications: NotificationRecord[]
  router: AdminRouter
}

function getTypeBadgeClass(type: string) {
  switch (type) {
    case 'PAYMENT_RECORDED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'BOOKING_CREATED':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'BOOKING_CHECKIN':
    case 'BOOKING_CHECKOUT':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200'
  }
}

export function NotificationsList({
  initialNotifications,
  router,
}: NotificationsListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isUpdating, setIsUpdating] = useState(false)

  const unreadCount = initialNotifications.filter((n) => !n.isRead).length
  const filtered =
    filter === 'unread'
      ? initialNotifications.filter((n) => !n.isRead)
      : initialNotifications

  const handleMarkRead = async (id: string) => {
    setIsUpdating(true)
    try {
      await markNotificationRead({ data: { id } })
      window.dispatchEvent(new Event('admin-notifications-refresh'))
      await router.invalidate()
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkAllRead = async () => {
    setIsUpdating(true)
    try {
      await markAllNotificationsRead()
      window.dispatchEvent(new Event('admin-notifications-refresh'))
      await router.invalidate()
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Activity alerts for bookings, check-ins, check-outs, and payments
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl shadow-xs inline-flex items-center gap-2 text-xs transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        {(['all', 'unread'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === tab
                ? 'bg-amber-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tab === 'all' ? 'All Notifications' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden divide-y divide-stone-100">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-6 h-6 text-amber-800" />}
            title="No notifications"
            description={
              filter === 'unread'
                ? "You're all caught up with no unread notifications."
                : 'Notifications will appear here when bookings or payments occur.'
            }
          />
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`px-5 py-4 flex items-center justify-between gap-4 transition ${
                item.isRead ? 'bg-white' : 'bg-amber-50/30'
              }`}
            >
              <Link to={item.href} className="min-w-0 flex-1 group">
                <div className="flex items-center gap-2">
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-amber-700 shrink-0" />
                  )}
                  <span className="text-sm font-bold text-stone-900 group-hover:text-amber-900 truncate">
                    {item.title}
                  </span>
                  <StatusBadge
                    size="xs"
                    label={item.type.replace(/_/g, ' ')}
                    className={getTypeBadgeClass(item.type)}
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">{item.message}</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  {formatShortDate(item.createdAt)}
                </p>
              </Link>

              {!item.isRead && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleMarkRead(item.id)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
