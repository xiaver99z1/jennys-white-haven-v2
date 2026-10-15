import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'

export const getUserActivityLogs = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const logs = await prisma.activityLog.findMany({
        where: { userId: data.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return { success: true, logs }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error)
      throw new Error('Failed to fetch activity logs.')
    }
  })
