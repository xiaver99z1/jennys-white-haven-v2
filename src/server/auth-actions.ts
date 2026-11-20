import { createServerFn } from '@tanstack/react-start'
import { hashPassword } from 'better-auth/crypto'
import { authSession, getServerHeaders } from '#/lib/auth-helpers'
import {
  DAY_WINDOW_MS,
  EMAIL_REGEX,
  GENERIC_RESEND_MESSAGE,
  MAX_VERIFICATION_EMAILS_PER_DAY,
  PASSWORD_RESET_EXPIRES_MINUTES,
  PASSWORD_RESET_PREFIX,
  PASSWORD_RESET_TTL_MS,
  RESEND_COOLDOWN_MS,
  VERIFICATION_EXPIRES_MINUTES,
  VERIFICATION_TOKEN_TTL_MS,
  extractRequestClientMeta,
  validateStrongPassword,
} from '#/lib/constants/auth'
import {
  generateActivationToken,
  hashActivationToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '#/lib/email'
import { getErrorMessage } from '#/lib/formatters'
import { logActivity } from '#/lib/logger'
import { prisma } from '#/lib/prisma'
import type {
  ResendVerificationByEmailInput,
  ResetPasswordWithTokenInput,
  VerifyActivationTokenInput,
} from '#/types'

export type {
  ResendVerificationByEmailInput,
  ResetPasswordWithTokenInput,
  VerifyActivationTokenInput,
}

export function validateVerifyActivationToken(
  data: VerifyActivationTokenInput,
) {
  return data
}

export async function verifyActivationTokenHandler({
  data,
}: {
  data: VerifyActivationTokenInput
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

  const { ipAddress, userAgent } = extractRequestClientMeta(getServerHeaders())

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

export function validateResendVerificationByEmail(
  data: ResendVerificationByEmailInput,
) {
  return data
}

export async function resendVerificationByEmailHandler({
  data,
}: {
  data: ResendVerificationByEmailInput
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
      expiresInMinutes: VERIFICATION_EXPIRES_MINUTES,
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

  const { ipAddress, userAgent } = extractRequestClientMeta(getServerHeaders())

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

export async function requestPasswordResetHandler() {
  const session = await authSession(
    'Unauthorized: You must be logged in to request a password reset.',
  )

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    throw new Error('User account not found.')
  }

  const identifier = `${PASSWORD_RESET_PREFIX}${user.id}`
  const now = new Date()
  const cooldownCutoff = new Date(now.getTime() - RESEND_COOLDOWN_MS)
  const { rawToken, tokenHash } = generateActivationToken()
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS)

  // Atomically replace an existing reset record only when its 60-second cooldown has elapsed
  const rotated = await prisma.verification.updateMany({
    where: {
      identifier,
      createdAt: { lte: cooldownCutoff },
    },
    data: {
      value: tokenHash,
      expiresAt,
      createdAt: now,
    },
  })

  if (rotated.count === 0) {
    const existingReset = await prisma.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
    })

    if (existingReset) {
      throw new Error(
        'Please wait a minute before requesting another password reset email.',
      )
    }

    try {
      await prisma.verification.create({
        data: {
          id: identifier,
          identifier,
          value: tokenHash,
          expiresAt,
          createdAt: now,
        },
      })
    } catch {
      throw new Error(
        'Please wait a minute before requesting another password reset email.',
      )
    }
  }

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      rawToken,
      expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
    })
  } catch (error: unknown) {
    try {
      await prisma.verification.deleteMany({
        where: { identifier, value: tokenHash },
      })
    } catch {
      // Preserve original email error
    }

    throw new Error(
      getErrorMessage(error, 'Failed to send password reset email.'),
    )
  }

  await logActivity({
    userId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    description: `Requested password reset link via account profile (${user.email})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    message: `Password reset link sent to ${user.email}. Please check your inbox.`,
  }
}

export const requestPasswordReset = createServerFn({ method: 'POST' }).handler(
  requestPasswordResetHandler,
)

export function validateResetPasswordWithToken(
  data: ResetPasswordWithTokenInput,
) {
  return data
}

export async function resetPasswordWithTokenHandler({
  data,
}: {
  data: ResetPasswordWithTokenInput
}) {
  const token = data.token.trim()
  if (!token) {
    throw new Error('Password reset token is missing.')
  }

  const { newPassword, confirmPassword } = data
  const passwordError = validateStrongPassword(newPassword)
  if (passwordError) {
    throw new Error(passwordError)
  }

  if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match.')
  }

  const now = new Date()
  const tokenHash = hashActivationToken(token)

  const verification = await prisma.verification.findFirst({
    where: {
      value: tokenHash,
      expiresAt: { gte: now },
      identifier: { startsWith: PASSWORD_RESET_PREFIX },
    },
  })

  if (!verification) {
    throw new Error(
      'This password reset link is invalid or has already been used.',
    )
  }

  const userId = verification.identifier.slice(PASSWORD_RESET_PREFIX.length)
  const hashedPassword = await hashPassword(newPassword)
  const { ipAddress, userAgent } = extractRequestClientMeta(getServerHeaders())

  await prisma.$transaction(async (tx) => {
    const consumedAt = new Date()
    const consumed = await tx.verification.deleteMany({
      where: {
        id: verification.id,
        value: tokenHash,
        expiresAt: { gte: consumedAt },
      },
    })

    if (consumed.count !== 1) {
      throw new Error(
        'This password reset link is invalid or has already been used.',
      )
    }

    const updatedAccounts = await tx.account.updateMany({
      where: {
        userId,
        providerId: 'credential',
      },
      data: {
        password: hashedPassword,
      },
    })

    if (updatedAccounts.count === 0) {
      throw new Error('User credential account not found.')
    }

    await tx.session.deleteMany({
      where: { userId },
    })

    await tx.activityLog.create({
      data: {
        userId,
        action: 'PASSWORD_RESET_COMPLETED',
        description:
          'Reset account password via email verification link and revoked active sessions',
        ipAddress,
        userAgent,
      },
    })
  })

  return {
    success: true,
    message:
      'Your password has been reset successfully. Please sign in with your new password.',
  }
}

export const resetPasswordWithToken = createServerFn({ method: 'POST' })
  .validator(validateResetPasswordWithToken)
  .handler(resetPasswordWithTokenHandler)
