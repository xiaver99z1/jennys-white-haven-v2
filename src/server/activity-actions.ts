import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'

export function validateActivityLogsData(data: { userId: string }) {
  return data
}

export async function fetchUserActivityLogsHandler({
  data,
}: {
  data: { userId: string }
}) {
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
}

export const getUserActivityLogs = createServerFn({ method: 'POST' })
  .validator(validateActivityLogsData)
  .handler(fetchUserActivityLogsHandler)
