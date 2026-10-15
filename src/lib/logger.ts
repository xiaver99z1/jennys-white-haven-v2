import { prisma } from '#/lib/prisma'

interface LogActivityParams {
  userId: string
  action: string
  description: string
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logActivity({
  userId,
  action,
  description,
  ipAddress,
  userAgent,
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        description,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Unknown Device',
      },
    })
  } catch (error) {
    console.error('Failed to write activity log:', error)
  }
}
