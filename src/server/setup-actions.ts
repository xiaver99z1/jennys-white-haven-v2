import { createServerFn } from '@tanstack/react-start'
import { hashPassword } from 'better-auth/crypto'
import { getServerHeaders } from '#/lib/auth-helpers'
import { generateActivationToken, sendVerificationEmail } from '#/lib/email'
import { prisma } from '#/lib/prisma'

export interface InitialSetupInput {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export function validateCreateInitialSuperAdmin(data: InitialSetupInput) {
  return data
}

export async function checkInitialSetupRequiredHandler() {
  const userCount = await prisma.user.count()
  return { needsSetup: userCount === 0 }
}

export const checkInitialSetupRequired = createServerFn({
  method: 'GET',
}).handler(checkInitialSetupRequiredHandler)

export async function createInitialSuperAdminHandler({
  data,
}: {
  data: InitialSetupInput
}) {
  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  const { password, confirmPassword } = data

  if (name.length < 2 || name.length > 100) {
    throw new Error('Full name must be between 2 and 100 characters.')
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address.')
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters long.')
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      'Password must include uppercase, lowercase, a number, and a special character.',
    )
  }

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.')
  }

  // Fast pre-check before running scrypt hashing so locked instances reject cheaply
  const existingCount = await prisma.user.count()
  if (existingCount > 0) {
    throw new Error('Initial setup has already been completed.')
  }

  const hashedPassword = await hashPassword(password)
  const { rawToken, tokenHash } = generateActivationToken()
  const now = new Date()
  const tokenExpires = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS)

  const headers = getServerHeaders()
  const ipAddress =
    headers.get('x-forwarded-for') || headers.get('x-real-ip') || '127.0.0.1'
  const userAgent = headers.get('user-agent') || 'Unknown User-Agent'

  let createdUser: {
    id: string
    name: string
    email: string
    role: string | null
  }

  try {
    createdUser = await prisma.$transaction(
      async (tx) => {
        const countInTx = await tx.user.count()
        if (countInTx > 0) {
          throw new Error('Initial setup has already been completed.')
        }

        const user = await tx.user.create({
          data: {
            name,
            email,
            emailVerified: false,
            role: 'super_admin',
            activationToken: tokenHash,
            activationTokenExpires: tokenExpires,
            activationEmailCount: 1,
            lastActivationEmailSentAt: now,
          },
        })

        await tx.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: 'credential',
            password: hashedPassword,
          },
        })

        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: 'INITIAL_SETUP',
            description: `Completed initial setup and created Super Admin account pending email verification (${user.email})`,
            ipAddress,
            userAgent,
          },
        })

        return user
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'P2034' || error.code === 'P2002')
    ) {
      throw new Error('Initial setup has already been completed.')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to complete initial setup.')
  }

  try {
    await sendVerificationEmail({
      to: createdUser.email,
      name: createdUser.name,
      rawToken,
      expiresInMinutes: 60,
    })
  } catch (error: unknown) {
    // Roll back the unverified initial user if email delivery fails so setup is not bricked
    try {
      await prisma.user.delete({ where: { id: createdUser.id } })
    } catch {
      // Preserve the original email delivery error
    }

    const detail =
      error instanceof Error ? error.message : 'Email provider error'
    throw new Error(
      `Failed to send verification email: ${detail}. Please check your email configuration and try again.`,
    )
  }

  return {
    success: true,
    requiresVerification: true,
    message:
      'Super Admin account created! Please check your email to verify your account before signing in.',
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
    },
  }
}

export const createInitialSuperAdmin = createServerFn({ method: 'POST' })
  .validator(validateCreateInitialSuperAdmin)
  .handler(createInitialSuperAdminHandler)
