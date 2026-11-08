import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { parseUserAgent } from '#/lib/parse-user-agent'
import { authSession } from '#/lib/auth-helpers'

// --- 1. GET USER SESSIONS ---
export function validateGetUserSessions(data: { userId: string }) {
  return data
}

export async function getUserSessionsHandler({
  data,
}: {
  data: { userId: string }
}) {
  const now = new Date()

  try {
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: data.userId,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    const sessionHistory = await prisma.session.findMany({
      where: {
        userId: data.userId,
        expiresAt: { lte: now },
      },
      orderBy: { expiresAt: 'desc' },
      take: 20,
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
}

export const getUserSessions = createServerFn({ method: 'POST' })
  .validator(validateGetUserSessions)
  .handler(getUserSessionsHandler)

// --- 2. REVOKE SESSION ---
export function validateRevokeSession(data: { token: string }) {
  return data
}

export async function revokeSessionHandler({
  data,
}: {
  data: { token: string }
}) {
  try {
    const session = await authSession()

    const targetSession = await prisma.session.findUnique({
      where: { token: data.token },
      include: { user: true },
    })

    if (!targetSession) {
      throw new Error('Session not found.')
    }

    await prisma.session.update({
      where: { token: data.token },
      data: { expiresAt: new Date() },
    })

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
}

export const revokeSession = createServerFn({ method: 'POST' })
  .validator(validateRevokeSession)
  .handler(revokeSessionHandler)
