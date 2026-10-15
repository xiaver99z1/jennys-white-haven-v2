import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { parseUserAgent } from '#/lib/parse-user-agent'
import { authSession } from '#/lib/auth-helpers'

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
      const session = await authSession()

      // Find session first so we know which user it belongs to
      const targetSession = await prisma.session.findUnique({
        where: { token: data.token },
        include: { user: true },
      })

      if (!targetSession) {
        throw new Error('Session not found.')
      }

      // Expire session
      await prisma.session.update({
        where: { token: data.token },
        data: { expiresAt: new Date() },
      })

      // Log the security event
      await logActivity({
        userId: session.user.id,
        action: 'SESSION_REVOKED',
        description: `Revoked active session for user ${targetSession.user.email} (${parseUserAgent(targetSession.userAgent)})`,
        ipAddress: targetSession.ipAddress,
        userAgent: targetSession.userAgent,
      })

      return { success: true, message: 'Session revoked successfully.' }
    } catch (error: any) {
      console.error('Error revoking session:', error)
      throw new Error('Failed to revoke session.')
    }
  })
