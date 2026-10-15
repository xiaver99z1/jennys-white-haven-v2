import { createServerFn } from '@tanstack/react-start'

import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { prisma } from '#/lib/prisma'
import { auth } from '#/lib/auth'

export const verifyActivationToken = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    if (!data.token) {
      throw new Error('Verification token is missing.')
    }

    const user = await prisma.user.findFirst({
      where: {
        activationToken: data.token,
        activationTokenExpires: { gte: new Date() },
      },
    })

    if (!user) {
      throw new Error(
        'This activation link is invalid or has already been consumed.',
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        activationToken: null,
        activationTokenExpires: null,
      },
    })

    const headers = getRequestHeaders()
    const ipAddress =
      headers.get('x-forwarded-for') || headers.get('x-real-ip') || '127.0.0.1'
    const userAgent = headers.get('user-agent') || 'Unknown User-Agent'

    await logActivity({
      userId: user.id,
      action: 'ACCOUNT_ACTIVATED',
      description: `Successfully activated account via email verification (${user.email})`,
      ipAddress,
      userAgent,
    })

    return {
      success: true,
      message: 'Email verified successfully!',
    }
  })

export const logUserLogin = createServerFn({ method: 'POST' })
  .validator((data?: { email?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const headers = getRequestHeaders()
      let session = await auth.api.getSession({ headers })

      // Fallback: If cookie header hasn't attached yet, find user by email
      if (!session && data?.email) {
        const user = await prisma.user.findUnique({
          where: { email: data.email },
        })

        if (user) {
          const ipAddress =
            headers.get('x-forwarded-for') ||
            headers.get('x-real-ip') ||
            '127.0.0.1'
          const userAgent = headers.get('user-agent') || 'Unknown'

          await logActivity({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            description: `Successfully signed in to account (${user.email})`,
            ipAddress,
            userAgent,
          })

          return { success: true }
        }
      }

      if (!session || !session.user) {
        throw new Error('No active session found.')
      }

      await logActivity({
        userId: session.user.id,
        action: 'LOGIN_SUCCESS',
        description: `Successfully signed in to account (${session.user.email})`,
        ipAddress: session.session.ipAddress,
        userAgent: session.session.userAgent,
      })

      return { success: true }
    } catch (error: any) {
      console.error('Failed to log user login:', error)
      return { success: false, error: error.message }
    }
  })

export const logUserLogout = createServerFn({ method: 'POST' }).handler(
  async () => {
    try {
      const session = await authSession()

      // Log the logout activity under the user's own activity log
      await logActivity({
        userId: session.user.id,
        action: 'LOGOUT',
        description: `Successfully signed out from account (${session.user.email})`,
        ipAddress: session.session.ipAddress,
        userAgent: session.session.userAgent,
      })

      return { success: true }
    } catch (error: any) {
      console.error('Failed to log user logout:', error)
      return { success: false, error: error.message }
    }
  },
)
