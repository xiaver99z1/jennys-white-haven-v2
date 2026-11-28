import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { auth } from '#/lib/auth'
import { authSession } from '#/lib/auth-helpers'
import {
  ADMIN_REAUTH_PREFIX,
  ADMIN_REAUTH_WINDOW_MS,
  DAY_WINDOW_MS,
  DEFAULT_TEMP_STAFF_PASSWORD,
  MAX_ADMIN_REAUTH_ATTEMPTS,
  MAX_VERIFICATION_EMAILS_PER_DAY,
  STAFF_INVITE_EXPIRES_MINUTES,
  STAFF_INVITE_TOKEN_TTL_MS,
  resolveUserDisplayIdentifier,
} from '#/lib/constants/auth'
import { generateActivationToken, sendVerificationEmail } from '#/lib/email'
import { logActivity } from '#/lib/logger'
import { prisma } from '#/lib/prisma'
import { validateEmailField, validatePersonName } from '#/lib/validation'
import type {
  AdminUserIdInput,
  CreateAdminUserInput,
  ResortRole,
  UpdateAdminUserInput,
} from '#/types'

export type {
  AdminUserIdInput,
  CreateAdminUserInput,
  ResortRole,
  UpdateAdminUserInput,
}

// --- 1. CREATE ADMIN USER ---
export function validateCreateAdminUser(data: CreateAdminUserInput) {
  return data
}

export const createAdminUserHandler = createServerOnlyFn(
  async ({ data }: { data: CreateAdminUserInput }) => {
  const normalizedRole = data.role.toLowerCase()
  const now = new Date()
  const session = await authSession()

  const nameValidationError = validatePersonName(data.name, { label: 'Full name' })
  if (nameValidationError) {
    throw new Error(nameValidationError)
  }
  const emailValidationError = validateEmailField(data.email, { required: true })
  if (emailValidationError) {
    throw new Error(emailValidationError)
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new Error('This email address is already registered.')
    }

    const newUser = (await auth.api.createUser({
      body: {
        email: data.email,
        password: DEFAULT_TEMP_STAFF_PASSWORD,
        name: data.name,
        role: normalizedRole as any,
      },
    })) as Partial<Awaited<ReturnType<typeof auth.api.createUser>>>

    if (!newUser.user) {
      throw new Error('Failed to create user in authentication system.')
    }

    const { rawToken, tokenHash } = generateActivationToken()
    const tokenExpires = new Date(now.getTime() + STAFF_INVITE_TOKEN_TTL_MS)

    await prisma.user.update({
      where: { id: newUser.user.id },
      data: {
        activationToken: tokenHash,
        activationTokenExpires: tokenExpires,
        activationEmailCount: 1,
        lastActivationEmailSentAt: now,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'USER_CREATED',
      description: `Created new staff member: ${data.name} (${data.email}) with role ${data.role}`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    try {
      await sendVerificationEmail({
        to: data.email,
        name: data.name,
        rawToken,
        expiresInMinutes: STAFF_INVITE_EXPIRES_MINUTES,
      })
    } catch (emailError) {
      console.error(
        'Staff account created, but activation email delivery failed:',
        emailError,
      )
      try {
        await prisma.user.updateMany({
          where: {
            id: newUser.user.id,
            emailVerified: false,
            activationToken: tokenHash,
          },
          data: {
            activationEmailCount: 0,
            lastActivationEmailSentAt: null,
          },
        })
      } catch {
        // Keep partial-success response so admin can use Resend Verification Email
      }

      return {
        success: true,
        emailSent: false,
        message:
          'Resort staff created, but the activation email could not be delivered. Please use Resend Verification Email from User Management.',
        user: newUser.user,
      }
    }

    return {
      success: true,
      emailSent: true,
      message:
        'Resort staff created successfully! Activation link sent to email.',
      user: newUser.user,
    }
  } catch (error: any) {
    console.error('Error in createAdminUser:', error)
    throw new Error(error.message || 'Failed to process request.')
  }
})

export const createAdminUser = createServerFn({ method: 'POST' })
  .validator(validateCreateAdminUser)
  .handler(createAdminUserHandler)

// --- 2. UPDATE ADMIN USER ---
export function validateUpdateAdminUser(data: UpdateAdminUserInput) {
  return data
}

export const updateAdminUserHandler = createServerOnlyFn(
  async ({ data }: { data: UpdateAdminUserInput }) => {
  const normalizedRole = data.role.toLowerCase()

  try {
    const session = await authSession(
      'Unauthorized: You must be logged in to update user profiles.',
    )

    const currentAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    const existingUser = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!existingUser) {
      throw new Error('Target user not found.')
    }

    const nameError = validatePersonName(data.name, { label: 'Full name' })
    if (nameError) {
      throw new Error(nameError)
    }

    const isPasswordUpdated = Boolean(
      data.password && data.password.trim() !== '',
    )

    if (isPasswordUpdated) {
      if (!data.adminPassword || data.adminPassword.trim() === '') {
        throw new Error(
          'Administrator password is required to change a user password.',
        )
      }

      const reauthIdentifier = `${ADMIN_REAUTH_PREFIX}${session.user.id}`
      const now = new Date()
      const failedAttempts = await prisma.verification.count({
        where: {
          identifier: reauthIdentifier,
          expiresAt: { gte: now },
        },
      })

      if (failedAttempts >= MAX_ADMIN_REAUTH_ATTEMPTS) {
        throw new Error(
          'Too many failed administrator password attempts. Please try again in 15 minutes.',
        )
      }

      const adminAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          providerId: 'credential',
        },
      })

      if (!adminAccount?.password) {
        throw new Error('Administrator credential account not found.')
      }

      const isValidAdminPassword = await verifyPassword({
        hash: adminAccount.password,
        password: data.adminPassword,
      })

      if (!isValidAdminPassword) {
        await prisma.verification.create({
          data: {
            identifier: reauthIdentifier,
            value: String(failedAttempts + 1),
            expiresAt: new Date(now.getTime() + ADMIN_REAUTH_WINDOW_MS),
          },
        })
        throw new Error('Incorrect administrator password.')
      }

      await prisma.verification.deleteMany({
        where: { identifier: reauthIdentifier },
      })
    }

    const changes: string[] = []

    if (existingUser.name !== data.name) {
      changes.push(`name from "${existingUser.name}" to "${data.name}"`)
    }

    const currentRole = existingUser.role?.toLowerCase() ?? 'guest'
    if (currentRole !== normalizedRole) {
      changes.push(
        `role from "${existingUser.role ?? 'none'}" to "${data.role}"`,
      )
    }

    if (isPasswordUpdated) {
      changes.push('password')
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        name: data.name,
        role: normalizedRole,
      },
    })

    if (isPasswordUpdated) {
      const hashedPassword = await hashPassword(data.password!)
      await prisma.account.updateMany({
        where: {
          userId: data.userId,
          providerId: 'credential',
        },
        data: {
          password: hashedPassword,
        },
      })
    }

    if (changes.length > 0) {
      const formattedChanges =
        changes.length === 1
          ? changes[0]
          : changes.slice(0, -1).join(', ') +
            ' and ' +
            changes[changes.length - 1]

      const adminIdentifier = resolveUserDisplayIdentifier(
        currentAdmin,
        'Admin',
      )
      const targetIdentifier = resolveUserDisplayIdentifier(
        existingUser,
        'user',
      )

      const description = `${adminIdentifier} updated ${targetIdentifier} ${formattedChanges}`

      await logActivity({
        userId: session.user.id,
        action: 'USER_UPDATED',
        description,
        ipAddress: session.session.ipAddress ?? null,
        userAgent: session.session.userAgent ?? null,
      })
    }

    return {
      success: true,
      message: 'Staff profile updated successfully!',
      user: updatedUser,
    }
  } catch (error: any) {
    console.error('Error updating staff profile:', error)
    throw new Error(error.message || 'Failed to update staff profile.')
  }
})

export const updateAdminUser = createServerFn({ method: 'POST' })
  .validator(validateUpdateAdminUser)
  .handler(updateAdminUserHandler)

// --- 3. BLOCK ADMIN USER ---
export function validateBlockAdminUser(data: AdminUserIdInput) {
  return data
}

export const blockAdminUserHandler = createServerOnlyFn(
  async ({ data }: { data: AdminUserIdInput }) => {
  try {
    const session = await authSession()
    const currentAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!targetUser) throw new Error('User not found.')

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        banned: true,
        banReason: 'Blocked by administrator',
      },
    })

    await prisma.session.deleteMany({
      where: { userId: data.userId },
    })

    const adminIdentifier = resolveUserDisplayIdentifier(currentAdmin, 'Admin')
    const targetIdentifier = resolveUserDisplayIdentifier(targetUser, 'user')

    await logActivity({
      userId: session.user.id,
      action: 'USER_BLOCKED',
      description: `${adminIdentifier} blocked user ${targetIdentifier}`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('Error blocking user:', error)
    throw new Error(error.message || 'Failed to block user.')
  }
})

export const blockAdminUser = createServerFn({ method: 'POST' })
  .validator(validateBlockAdminUser)
  .handler(blockAdminUserHandler)

// --- 4. UNBLOCK ADMIN USER ---
export function validateUnblockAdminUser(data: AdminUserIdInput) {
  return data
}

export const unblockAdminUserHandler = createServerOnlyFn(
  async ({ data }: { data: AdminUserIdInput }) => {
  try {
    const session = await authSession()
    const currentAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!targetUser) throw new Error('User not found.')

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        banned: false,
        banReason: null,
      },
    })

    const adminIdentifier = resolveUserDisplayIdentifier(currentAdmin, 'Admin')
    const targetIdentifier = resolveUserDisplayIdentifier(targetUser, 'user')

    await logActivity({
      userId: session.user.id,
      action: 'USER_UNBLOCKED',
      description: `${adminIdentifier} unblocked user ${targetIdentifier}`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('Error unblocking user:', error)
    throw new Error(error.message || 'Failed to unblock user.')
  }
})

export const unblockAdminUser = createServerFn({ method: 'POST' })
  .validator(validateUnblockAdminUser)
  .handler(unblockAdminUserHandler)

// --- 5. RESEND VERIFICATION EMAIL ---
export function validateResendVerificationEmail(data: AdminUserIdInput) {
  return data
}

export const resendVerificationEmailHandler = createServerOnlyFn(
  async ({ data }: { data: AdminUserIdInput }) => {
  const now = new Date()
  const session = await authSession()

  try {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!user) {
      throw new Error('User account not found.')
    }

    if (user.emailVerified) {
      throw new Error('This user account is already verified.')
    }

    let currentCount = user.activationEmailCount || 0
    const lastSent = user.lastActivationEmailSentAt

    const isSameWindow =
      lastSent &&
      now.getTime() - new Date(lastSent).getTime() < DAY_WINDOW_MS

    if (isSameWindow) {
      if (currentCount >= MAX_VERIFICATION_EMAILS_PER_DAY) {
        throw new Error(
          `Maximum limit reached. You can only resend up to ${MAX_VERIFICATION_EMAILS_PER_DAY} verification emails per day for this user.`,
        )
      }
      currentCount += 1
    } else {
      currentCount = 1
    }

    const { rawToken, tokenHash } = generateActivationToken()
    const tokenExpires = new Date(now.getTime() + STAFF_INVITE_TOKEN_TTL_MS)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        activationToken: tokenHash,
        activationTokenExpires: tokenExpires,
        activationEmailCount: currentCount,
        lastActivationEmailSentAt: now,
      },
    })

    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        rawToken,
        expiresInMinutes: STAFF_INVITE_EXPIRES_MINUTES,
      })
    } catch (sendError) {
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
        // Preserve original delivery error
      }
      throw sendError
    }

    await logActivity({
      userId: session.user.id,
      action: 'RESEND_VERIFICATION',
      description: `Resent email verification link to ${user.name} (${user.email})`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return {
      success: true,
      count: currentCount,
      max: MAX_VERIFICATION_EMAILS_PER_DAY,
      message: `Verification link successfully sent to ${user.email} (${currentCount}/${MAX_VERIFICATION_EMAILS_PER_DAY} emails sent today).`,
    }
  } catch (error: any) {
    console.error('Error resending verification email:', error)
    throw new Error(error.message || 'Failed to resend verification email.')
  }
})

export const resendVerificationEmail = createServerFn({ method: 'POST' })
  .validator(validateResendVerificationEmail)
  .handler(resendVerificationEmailHandler)
