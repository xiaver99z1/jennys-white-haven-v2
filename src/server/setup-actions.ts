import { createServerFn } from '@tanstack/react-start'
import { hashPassword } from 'better-auth/crypto'
import { getServerHeaders } from '#/lib/auth-helpers'
import {
  EMAIL_REGEX,
  FULL_NAME_MAX_LENGTH,
  FULL_NAME_MIN_LENGTH,
  VERIFICATION_EXPIRES_MINUTES,
  VERIFICATION_TOKEN_TTL_MS,
  extractRequestClientMeta,
  validateStrongPassword,
} from '#/lib/constants/auth'
import { generateActivationToken, sendVerificationEmail } from '#/lib/email'
import { prisma } from '#/lib/prisma'
import type { InitialSetupInput } from '#/types'

export type { InitialSetupInput }

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

  if (
    name.length < FULL_NAME_MIN_LENGTH ||
    name.length > FULL_NAME_MAX_LENGTH
  ) {
    throw new Error(
      `Full name must be between ${FULL_NAME_MIN_LENGTH} and ${FULL_NAME_MAX_LENGTH} characters.`,
    )
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address.')
  }

  const passwordError = validateStrongPassword(password)
  if (passwordError) {
    throw new Error(passwordError)
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
  const { ipAddress, userAgent } = extractRequestClientMeta(getServerHeaders())

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
      expiresInMinutes: VERIFICATION_EXPIRES_MINUTES,
    })
  } catch (error: unknown) {
    // Atomically delete only if the account is still in its original unverified state
    let accountAdvanced = false
    try {
      const deleted = await prisma.user.deleteMany({
        where: {
          id: createdUser.id,
          emailVerified: false,
          activationToken: tokenHash,
        },
      })
      accountAdvanced = deleted.count === 0
    } catch {
      // Preserve the original email delivery error when cleanup fails
    }

    if (accountAdvanced) {
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

    const detail =
      error instanceof Error ? error.message : 'Email provider error'
    throw new Error(
      `Failed to send verification email: ${detail}. Fix your email delivery configuration, then sign in and request a new verification email.`,
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
