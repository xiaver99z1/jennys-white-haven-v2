import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'

export const getUserSessions = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const now = new Date()

    try {
      // 1. Fetch Active Sessions (expiresAt > now)
      const activeSessions = await prisma.session.findMany({
        where: {
          userId: data.userId,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      })

      // 2. Fetch Session History (expired sessions)
      const sessionHistory = await prisma.session.findMany({
        where: {
          userId: data.userId,
          expiresAt: { lte: now },
        },
        orderBy: { expiresAt: 'desc' },
        take: 20, // Limit history to last 20 entries
      })

      return {
        success: true,
        activeSessions,
        sessionHistory,
      }
    } catch (error: any) {
      console.error('Error fetching sessions:', error)
      throw new Error('Failed to fetch user sessions.')
    }
  })

export const revokeSession = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Instead of hard deleting, we can set expiresAt to now so it moves to History!
      await prisma.session.update({
        where: { token: data.token },
        data: { expiresAt: new Date() },
      })

      return { success: true, message: 'Session revoked successfully.' }
    } catch (error: any) {
      console.error('Error revoking session:', error)
      throw new Error('Failed to revoke session.')
    }
  })
