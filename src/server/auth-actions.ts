import { createServerFn } from '@tanstack/react-start'
import { logActivity } from '#/lib/logger'
import { authSession, getServerHeaders } from '#/lib/auth-helpers'
import { prisma } from '#/lib/prisma'

export function validateVerifyActivationToken(data: { token: string }) {
  return data
}

export async function verifyActivationTokenHandler({
  data,
}: {
  data: { token: string }
}) {
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

  const headers = getServerHeaders()
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
}

export const verifyActivationToken = createServerFn({ method: 'POST' })
  .validator(validateVerifyActivationToken)
  .handler(verifyActivationTokenHandler)

export async function logUserLoginHandler() {
  try {
    const session = (await authSession()) as Awaited<
      ReturnType<typeof authSession>
    > | null

    if (!session) {
      throw new Error('No active session found.')
    }

    await logActivity({
      userId: session.user.id,
      action: 'LOGIN_SUCCESS',
      description: `Successfully signed in to account (${session.user.email})`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to log user login:', error)
    return { success: false, error: error.message }
  }
}

export const logUserLogin = createServerFn({ method: 'POST' }).handler(
  logUserLoginHandler,
)

export async function logUserLogoutHandler() {
  try {
    const session = await authSession()

    await logActivity({
      userId: session.user.id,
      action: 'LOGOUT',
      description: `Successfully signed out from account (${session.user.email})`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to log user logout:', error)
    return { success: false, error: error.message }
  }
}

export const logUserLogout = createServerFn({ method: 'POST' }).handler(
  logUserLogoutHandler,
)
