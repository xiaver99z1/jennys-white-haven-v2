import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationsList } from '#/components/admin/notifications/NotificationsList'
import type { NotificationRecord } from '#/types'

const { mockMarkNotificationRead, mockMarkAllNotificationsRead } = vi.hoisted(
  () => ({
    mockMarkNotificationRead: vi.fn(),
    mockMarkAllNotificationsRead: vi.fn(),
  }),
)

vi.mock('#/server/notification-actions', () => ({
  markNotificationRead: mockMarkNotificationRead,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const mockNotifications: NotificationRecord[] = [
  {
    id: 'n1',
    type: 'PAYMENT_RECORDED',
    title: 'Payment Recorded: ₱2,500',
    message: 'CASH payment for JWH-001',
    href: '/admin/bookings',
    isRead: false,
    createdAt: '2026-11-13T00:00:00.000Z',
  },
  {
    id: 'n2',
    type: 'BOOKING_CREATED',
    title: 'New Booking: JWH-001',
    message: 'Maria Santos · Room 101',
    href: '/admin/bookings',
    isRead: true,
    createdAt: '2026-11-12T00:00:00.000Z',
  },
  {
    id: 'n3',
    type: 'BOOKING_CHECKIN',
    title: 'Guest Checked In',
    message: 'Room 101',
    href: '/admin',
    isRead: true,
    createdAt: '2026-11-12T00:00:00.000Z',
  },
  {
    id: 'n4',
    type: 'SYSTEM',
    title: 'System Notice',
    message: 'Welcome',
    href: '/admin',
    isRead: true,
    createdAt: '2026-11-11T00:00:00.000Z',
  },
]

describe('NotificationsList', () => {
  const mockRouter = { invalidate: vi.fn().mockResolvedValue(undefined) }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkNotificationRead.mockResolvedValue({ success: true })
    mockMarkAllNotificationsRead.mockResolvedValue({ success: true })
  })

  it('renders notifications, filters unread, and marks single and all as read', async () => {
    const user = userEvent.setup()

    render(
      <NotificationsList
        initialNotifications={mockNotifications}
        router={mockRouter}
      />,
    )

    expect(screen.getByText('Payment Recorded: ₱2,500')).toBeInTheDocument()
    expect(screen.getByText('New Booking: JWH-001')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Unread \(1\)/i }))
    expect(screen.queryByText('New Booking: JWH-001')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mark read/i }))
    await waitFor(() => {
      expect(mockMarkNotificationRead).toHaveBeenCalledWith({
        data: { id: 'n1' },
      })
      expect(mockRouter.invalidate).toHaveBeenCalled()
    })

    await user.click(
      screen.getByRole('button', { name: /Mark all as read \(1\)/i }),
    )
    await waitFor(() => {
      expect(mockMarkAllNotificationsRead).toHaveBeenCalled()
    })
  })

  it('renders empty state for all and unread filters', async () => {
    const user = userEvent.setup()

    render(
      <NotificationsList initialNotifications={[]} router={mockRouter} />,
    )

    expect(screen.getByText('No notifications')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Unread \(0\)/i }))
    expect(
      screen.getByText("You're all caught up with no unread notifications."),
    ).toBeInTheDocument()
  })
})
