import { createServerFn } from '@tanstack/react-start'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'

export const logProfileActivity = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      action: 'AVATAR_UPDATED' | 'PROFILE_UPDATED' | 'PASSWORD_UPDATED'
      description: string
    }) => data,
  )
  .handler(async ({ data }) => {
    try {
      const session = await authSession()

      await logActivity({
        userId: session.user.id,
        action: data.action,
        description: data.description,
        ipAddress: session?.session?.ipAddress ?? null,
        userAgent: session?.session?.userAgent ?? null,
      })

      return { success: true }
    } catch (error: any) {
      console.error('Failed to log profile activity:', error)
      return { success: false, error: error.message }
    }
  })
