import { createServerFn } from '@tanstack/react-start'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'

export type ProfileActionType =
  'AVATAR_UPDATED' | 'PROFILE_UPDATED' | 'PASSWORD_UPDATED'

export function validateProfileActivity(data: {
  action: ProfileActionType
  description: string
}) {
  return data
}

export async function logProfileActivityHandler({
  data,
}: {
  data: {
    action: ProfileActionType
    description: string
  }
}) {
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
}

export const logProfileActivity = createServerFn({ method: 'POST' })
  .validator(validateProfileActivity)
  .handler(logProfileActivityHandler)
