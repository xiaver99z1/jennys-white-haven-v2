import { createServerFn } from '@tanstack/react-start'

import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'

export const logUserLogin = createServerFn({ method: 'POST' }).handler(
  async () => {
    try {
      const session = await authSession()

      if (!session || !session.user) {
        throw new Error('No active session found.')
      }

      // Log the login activity under the user's own activity log (since they are the doer of their own login)
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
      // Non-blocking error so login doesn't fail just because of logging
      return { success: false, error: error.message }
    }
  },
)

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
