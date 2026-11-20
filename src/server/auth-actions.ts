import { createServerFn } from '@tanstack/react-start'
import { logActivity } from '#/lib/logger'
import { authSession, getServerHeaders } from '#/lib/auth-helpers'
import {
  generateActivationToken,
  hashActivationToken,
  sendVerificationEmail,
} from '#/lib/email'
import { prisma } from '#/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 minute
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_VERIFICATION_EMAILS_PER_DAY = 3
const GENERIC_RESEND_MESSAGE =
  'If an unverified account exists for this email, a fresh verification link has been sent.'

export function validateVerifyActivationToken(data: { token: string }) {
  return data
}

export async function verifyActivationTokenHandler({
  data,
}: {
  data: { token: string }
}) {
  const token = data.token.trim()
  if (!token) {
    throw new Error('Verification token is missing.')
  }

  const now = new Date()
  const tokenHash = hashActivationToken(token)

  const user = await prisma.user.findFirst({
    where: {
      emailVerified: false,
      activationToken: tokenHash,
      activationTokenExpires: { gte: now },
    },
  })

  if (!user) {
    throw new Error(
      'This activation link is invalid or has already been consumed.',
    )
  }

  const updated = await prisma.user.updateMany({
    where: {
      id: user.id,
      emailVerified: false,
      activationToken: tokenHash,
      activationTokenExpires: { gte: now },
    },
    data: {
      emailVerified: true,
      activationToken: null,
      activationTokenExpires: null,
    },
  })

  if (updated.count !== 1) {
    throw new Error(
      'This activation link is invalid or has already been consumed.',
    )
  }

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

export function validateResendVerificationByEmail(data: { email: string }) {
  return data
}

export async function resendVerificationByEmailHandler({
  data,
}: {
  data: { email: string }
}) {
  const email = data.email.trim().toLowerCase()
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address.')
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  // Anti-enumeration: never disclose whether an email exists or is already verified
  if (!user || user.emailVerified || user.banned) {
    return {
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    }
  }

  const now = new Date()
  const lastSent = user.lastActivationEmailSentAt
    ? new Date(user.lastActivationEmailSentAt)
    : null

  if (lastSent && now.getTime() - lastSent.getTime() < RESEND_COOLDOWN_MS) {
    console.warn('Resend verification skipped: cooldown active for user', user.id)
    return {
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    }
  }

  const isSameDayWindow =
    lastSent && now.getTime() - lastSent.getTime() < DAY_WINDOW_MS
  const currentCount = isSameDayWindow ? (user.activationEmailCount || 0) : 0

  if (currentCount >= MAX_VERIFICATION_EMAILS_PER_DAY) {
    console.warn(
      'Resend verification skipped: daily limit reached for user',
      user.id,
    )
    return {
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    }
  }

  const nextCount = currentCount + 1
  const { rawToken, tokenHash } = generateActivationToken()
  const tokenExpires = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS)

  // Atomically reserve resend eligibility against observed token and rate-limit state
  const reserved = await prisma.user.updateMany({
    where: {
      id: user.id,
      emailVerified: false,
      banned: user.banned,
      activationToken: user.activationToken,
      activationEmailCount: user.activationEmailCount,
      lastActivationEmailSentAt: user.lastActivationEmailSentAt,
    },
    data: {
      activationToken: tokenHash,
      activationTokenExpires: tokenExpires,
      activationEmailCount: nextCount,
      lastActivationEmailSentAt: now,
    },
  })

  if (reserved.count !== 1) {
    console.warn(
      'Resend verification skipped: concurrent state change for user',
      user.id,
    )
    return {
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    }
  }

  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      rawToken,
      expiresInMinutes: 60,
    })
  } catch (error: unknown) {
    // Only restore previous metadata if the stored token still matches this request's tokenHash
    try {
      await prisma.user.updateMany({
        where: {
          id: user.id,
          emailVerified: false,
          activationToken: tokenHash,
        },
        data: {
          activationToken: user.activationToken,
          activationTokenExpires: user.activationTokenExpires,
          activationEmailCount: user.activationEmailCount,
          lastActivationEmailSentAt: user.lastActivationEmailSentAt,
        },
      })
    } catch {
      // Ignore rollback database failure
    }

    console.error('Failed to deliver verification email:', error)
    return {
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    }
  }

  const headers = getServerHeaders()
  const ipAddress =
    headers.get('x-forwarded-for') || headers.get('x-real-ip') || '127.0.0.1'
  const userAgent = headers.get('user-agent') || 'Unknown User-Agent'

  await logActivity({
    userId: user.id,
    action: 'RESEND_VERIFICATION',
    description: `Requested new email verification link (${user.email})`,
    ipAddress,
    userAgent,
  })

  return {
    success: true,
    message: GENERIC_RESEND_MESSAGE,
  }
}

export const resendVerificationByEmail = createServerFn({ method: 'POST' })
  .validator(validateResendVerificationByEmail)
  .handler(resendVerificationByEmailHandler)

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
