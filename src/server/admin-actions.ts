import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { prisma } from '#/lib/prisma'
import crypto from 'crypto'
import { hashPassword } from 'better-auth/crypto'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'

export type ResortRole =
  'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'owner' | 'manager' | 'receptionist'

// --- 1. CREATE ADMIN USER ---
export function validateCreateAdminUser(data: {
  name: string
  email: string
  role: ResortRole
}) {
  return data
}

export async function createAdminUserHandler({
  data,
}: {
  data: { name: string; email: string; role: ResortRole }
}) {
  const normalizedRole = data.role.toLowerCase()
  const now = new Date()
  const session = await authSession()

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new Error('This email address is already registered.')
    }

    const tempPassword = `Password!123`

    const newUser = await auth.api.createUser({
      body: {
        email: data.email,
        password: tempPassword,
        name: data.name,
        role: normalizedRole as any,
      },
    })

    if (!newUser || !newUser.user) {
      throw new Error('Failed to create user in authentication system.')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: newUser.user.id },
      data: {
        activationToken: token,
        activationTokenExpires: tokenExpires,
        activationEmailCount: 1,
        lastActivationEmailSentAt: now,
      },
    })

    await logActivity({
      userId: session.user.id,
      action: 'USER_CREATED',
      description: `Created new staff member: ${data.name} (${data.email}) with role ${data.role}`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return {
      success: true,
      message:
        'Resort staff created successfully! Activation link sent to email.',
      user: newUser.user,
    }
  } catch (error: any) {
    console.error('Error in createAdminUser:', error)
    throw new Error(error.message || 'Failed to process request.')
  }
}

export const createAdminUser = createServerFn({ method: 'POST' })
  .validator(validateCreateAdminUser)
  .handler(createAdminUserHandler)

// --- 2. UPDATE ADMIN USER ---
export function validateUpdateAdminUser(data: {
  userId: string
  name: string
  password?: string
  role: ResortRole
}) {
  return data
}

export async function updateAdminUserHandler({
  data,
}: {
  data: {
    userId: string
    name: string
    password?: string
    role: ResortRole
  }
}) {
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

    const isPasswordUpdated = data.password && data.password.trim() !== ''
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

      const adminIdentifier =
        currentAdmin?.email || currentAdmin?.name || 'Admin'
      const targetIdentifier = existingUser.email || existingUser.name || 'user'

      const description = `${adminIdentifier} updated ${targetIdentifier} ${formattedChanges}`

      await logActivity({
        userId: session.user.id,
        action: 'USER_UPDATED',
        description,
        ipAddress: session?.session?.ipAddress ?? null,
        userAgent: session?.session?.userAgent ?? null,
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
}

export const updateAdminUser = createServerFn({ method: 'POST' })
  .validator(validateUpdateAdminUser)
  .handler(updateAdminUserHandler)

// --- 3. BLOCK ADMIN USER ---
export function validateBlockAdminUser(data: { userId: string }) {
  return data
}

export async function blockAdminUserHandler({
  data,
}: {
  data: { userId: string }
}) {
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

    const adminIdentifier = currentAdmin?.email || currentAdmin?.name || 'Admin'
    const targetIdentifier = targetUser.email || targetUser.name || 'user'

    await logActivity({
      userId: session.user.id,
      action: 'USER_BLOCKED',
      description: `${adminIdentifier} blocked user ${targetIdentifier}`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('Error blocking user:', error)
    throw new Error(error.message || 'Failed to block user.')
  }
}

export const blockAdminUser = createServerFn({ method: 'POST' })
  .validator(validateBlockAdminUser)
  .handler(blockAdminUserHandler)

// --- 4. UNBLOCK ADMIN USER ---
export function validateUnblockAdminUser(data: { userId: string }) {
  return data
}

export async function unblockAdminUserHandler({
  data,
}: {
  data: { userId: string }
}) {
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

    const adminIdentifier = currentAdmin?.email || currentAdmin?.name || 'Admin'
    const targetIdentifier = targetUser.email || targetUser.name || 'user'

    await logActivity({
      userId: session.user.id,
      action: 'USER_UNBLOCKED',
      description: `${adminIdentifier} unblocked user ${targetIdentifier}`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('Error unblocking user:', error)
    throw new Error(error.message || 'Failed to unblock user.')
  }
}

export const unblockAdminUser = createServerFn({ method: 'POST' })
  .validator(validateUnblockAdminUser)
  .handler(unblockAdminUserHandler)

// --- 5. RESEND VERIFICATION EMAIL ---
export function validateResendVerificationEmail(data: { userId: string }) {
  return data
}

export async function resendVerificationEmailHandler({
  data,
}: {
  data: { userId: string }
}) {
  const now = new Date()
  const MAX_EMAILS_PER_DAY = 3
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
      now.getTime() - new Date(lastSent).getTime() < 24 * 60 * 60 * 1000

    if (isSameWindow) {
      if (currentCount >= MAX_EMAILS_PER_DAY) {
        throw new Error(
          `Maximum limit reached. You can only resend up to ${MAX_EMAILS_PER_DAY} verification emails per day for this user.`,
        )
      }
      currentCount += 1
    } else {
      currentCount = 1
    }

    await logActivity({
      userId: session.user.id,
      action: 'RESEND_VERIFICATION',
      description: `Resent email verification link to ${user.name} (${user.email})`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return {
      success: true,
      count: currentCount,
      max: MAX_EMAILS_PER_DAY,
      message: `Verification link successfully sent to ${user.email} (${currentCount}/${MAX_EMAILS_PER_DAY} emails sent today).`,
    }
  } catch (error: any) {
    console.error('Error resending verification email:', error)
    throw new Error(error.message || 'Failed to resend verification email.')
  }
}

export const resendVerificationEmail = createServerFn({ method: 'POST' })
  .validator(validateResendVerificationEmail)
  .handler(resendVerificationEmailHandler)
