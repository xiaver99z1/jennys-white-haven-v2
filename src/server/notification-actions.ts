import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import type { NotificationsResponse } from '#/types'

export interface CreateNotificationParams {
  type: string
  title: string
  message: string
  href?: string
  userId?: string | null
}

export async function createNotification({
  type,
  title,
  message,
  href = '/admin',
  userId = null,
}: CreateNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        type,
        title,
        message,
        href,
        userId,
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

export interface GetNotificationsInput {
  filter?: 'all' | 'unread'
  limit?: number
}

export function validateGetNotifications(data?: GetNotificationsInput) {
  return data ?? {}
}

export async function getNotificationsHandler({
  data,
}: {
  data?: GetNotificationsInput
}): Promise<NotificationsResponse> {
  await authSession()

  const filter = data?.filter ?? 'all'
  const limit = data?.limit ?? 50
  const where = filter === 'unread' ? { isRead: false } : {}

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { isRead: false },
    }),
  ])

  return {
    unreadCount,
    items,
  }
}

export const getNotifications = createServerFn({ method: 'GET' })
  .validator(validateGetNotifications)
  .handler(getNotificationsHandler)

export function validateMarkNotificationRead(data: { id: string }) {
  return data
}

export async function markNotificationReadHandler({
  data,
}: {
  data: { id: string }
}) {
  await authSession()

  await prisma.notification.update({
    where: { id: data.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return { success: true }
}

export const markNotificationRead = createServerFn({ method: 'POST' })
  .validator(validateMarkNotificationRead)
  .handler(markNotificationReadHandler)

export async function markAllNotificationsReadHandler() {
  await authSession()

  await prisma.notification.updateMany({
    where: { isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })

  return { success: true }
}

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(markAllNotificationsReadHandler)
