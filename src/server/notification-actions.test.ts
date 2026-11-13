import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createNotification,
  getNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  validateGetNotifications,
  validateMarkNotificationRead,
} from './notification-actions'

const {
  mockAuthSession,
  mockNotificationCreate,
  mockNotificationFindMany,
  mockNotificationCount,
  mockNotificationUpdate,
  mockNotificationUpdateMany,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockNotificationCreate: vi.fn(),
  mockNotificationFindMany: vi.fn(),
  mockNotificationCount: vi.fn(),
  mockNotificationUpdate: vi.fn(),
  mockNotificationUpdateMany: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    notification: {
      create: mockNotificationCreate,
      findMany: mockNotificationFindMany,
      count: mockNotificationCount,
      update: mockNotificationUpdate,
      updateMany: mockNotificationUpdateMany,
    },
  },
}))

describe('notification-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthSession.mockResolvedValue({ user: { id: 'u1', role: 'owner' } })
  })

  it('creates notification and catches DB errors safely', async () => {
    mockNotificationCreate.mockResolvedValue({ id: 'n1' })
    await createNotification({
      type: 'SYSTEM',
      title: 'Test',
      message: 'Hello',
    })
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        type: 'SYSTEM',
        title: 'Test',
        message: 'Hello',
        href: '/admin',
        userId: null,
      },
    })

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNotificationCreate.mockRejectedValueOnce(new Error('DB err'))
    await createNotification({
      type: 'SYSTEM',
      title: 'Fail',
      message: 'Err',
      href: '/admin/bookings',
      userId: 'u1',
    })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('validates and fetches all or unread notifications', async () => {
    expect(validateGetNotifications(undefined)).toEqual({})
    expect(validateGetNotifications({ filter: 'unread', limit: 10 })).toEqual({
      filter: 'unread',
      limit: 10,
    })

    mockNotificationFindMany.mockResolvedValue([{ id: 'n1', isRead: false }])
    mockNotificationCount.mockResolvedValue(1)

    const allRes = await getNotificationsHandler({})
    expect(allRes.unreadCount).toBe(1)
    expect(mockNotificationFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    await getNotificationsHandler({ data: { filter: 'unread', limit: 5 } })
    expect(mockNotificationFindMany).toHaveBeenLastCalledWith({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  })

  it('marks single notification and all notifications as read', async () => {
    expect(validateMarkNotificationRead({ id: 'n1' })).toEqual({ id: 'n1' })

    const res1 = await markNotificationReadHandler({ data: { id: 'n1' } })
    expect(res1.success).toBe(true)
    expect(mockNotificationUpdate).toHaveBeenCalled()

    const res2 = await markAllNotificationsReadHandler()
    expect(res2.success).toBe(true)
    expect(mockNotificationUpdateMany).toHaveBeenCalled()
  })
})
