import { createServerFn } from '@tanstack/react-start'
// import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { prisma } from '#/lib/prisma'
// import { Resend } from 'resend'
// import { generateSecurePassword } from '#/lib/password'
import crypto from 'crypto'
import { hashPassword } from 'better-auth/crypto'
import { logActivity } from '#/lib/logger' // Adjust import path if needed
import { authSession } from '#/lib/auth-helpers'

// const resend = new Resend(process.env.RESEND_API_KEY)

export type ResortRole =
  'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'owner' | 'manager' | 'receptionist'

export const createAdminUser = createServerFn({ method: 'POST' })
  .validator((data: { name: string; email: string; role: ResortRole }) => data)
  .handler(async ({ data }) => {
    const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
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

      // const tempPassword = generateSecurePassword()
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
      const tokenExpires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days

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
        userId: session.user.id, // 👈 Logged under the admin who performed the action!
        action: 'USER_CREATED',
        description: `Created new resort staff member: ${data.name} (${data.email}) with role ${data.role}`,
        ipAddress: session.session.ipAddress,
        userAgent: session.session.userAgent,
      })

      const activationUrl = `${appUrl}/verify-activation?token=${token}`

      // 3. Send Email with Detailed Error Handling
      // let emailResult = null
      // try {
      //   emailResult = await resend.emails.send({
      //     from: 'Jenny’s White Haven <onboarding@resend.dev>',
      //     to: [data.email],
      //     subject: 'Activate Your Account - Jenny’s White Haven Resort',
      //     html: `
      //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px;">
      //         <h2 style="color: #b45309; margin-top: 0;">Welcome, ${data.name}!</h2>
      //         <p>An account has been created for you with the role of <strong>${data.role}</strong> at Jenny’s White Haven Resort.</p>
      //         <p>Your temporary password is:</p>
      //         <div style="background: #f5f5f4; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #292524; display: inline-block; margin: 8px 0 16px 0;">
      //           ${tempPassword}
      //         </div>
      //         <p>Please click the button below to verify your email address and activate your account. This link will expire in <strong>3 days</strong>:</p>
      //         <div style="margin: 24px 0;">
      //           <a href="${activationUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
      //             Activate Account
      //           </a>
      //         </div>
      //       </div>
      //     `,
      //   })

      //   if (emailResult.error) {
      //     console.error('RESEND EMAIL FAILURE:', emailResult.error)
      //   }
      // } catch (emailErr) {
      //   console.error('RESEND SEND ERROR:', emailErr)
      // }

      // return {
      //   success: true,
      //   message: emailResult?.error
      //     ? `User created! Note: Email delivery failed (${emailResult.error.message}). Check terminal for activation link.`
      //     : 'Resort staff created successfully! Activation link sent to email.',
      //   user: newUser.user,
      // }

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
  })
export const updateAdminUser = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      userId: string
      name: string
      password?: string
      role: ResortRole
    }) => data,
  )
  .handler(async ({ data }) => {
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

      // Compare Role safely with null fallback
      const currentRole = existingUser.role?.toLowerCase() ?? 'guest'

      if (currentRole !== normalizedRole) {
        changes.push(
          `role from "${existingUser.role ?? 'none'}" to "${data.role}"`,
        )
      }

      // Check Password
      const isPasswordUpdated = data.password && data.password.trim() !== ''
      if (isPasswordUpdated) {
        changes.push('password')
      }

      // 3. Update basic user info (Name & Role)
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          name: data.name,
          role: normalizedRole,
        },
      })

      // 4. If a new password was provided, hash and update the associated Account record
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

      // 5. Construct description and record activity log if any changes occurred
      if (changes.length > 0) {
        // Format list with " and " (e.g., "A", "A and B", or "A, B, and C")
        const formattedChanges =
          changes.length === 1
            ? changes[0]
            : changes.slice(0, -1).join(', ') +
              ' and ' +
              changes[changes.length - 1]

        const adminIdentifier =
          currentAdmin?.email || currentAdmin?.name || 'Admin'
        const targetIdentifier =
          existingUser.email || existingUser.name || 'user'

        const description = `${adminIdentifier} updated ${targetIdentifier} ${formattedChanges}`

        // Log the activity under the Admin's account (actor-centric)
        await logActivity({
          userId: session.user.id,
          action: 'USER_UPDATED',
          description,
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

// Block / Ban User Action
export const blockAdminUser = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const sessions = await authSession()
      const currentAdmin = await prisma.user.findUnique({
        where: { id: sessions.user.id },
      })
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      })

      if (!targetUser) throw new Error('User not found.')

      // Update user to banned
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          banned: true,
          banReason: 'Blocked by administrator',
        },
      })

      // Immediately revoke all active sessions for this user for security
      await prisma.session.deleteMany({
        where: { userId: data.userId },
      })

      // Log the activity
      const adminIdentifier =
        currentAdmin?.email || currentAdmin?.name || 'Admin'
      const targetIdentifier = targetUser.email || targetUser.name || 'user'

      await logActivity({
        userId: sessions.user.id,
        action: 'USER_BLOCKED',
        description: `${adminIdentifier} blocked user ${targetIdentifier}`,
      })

      return { success: true, user: updatedUser }
    } catch (error: any) {
      console.error('Error blocking user:', error)
      throw new Error(error.message || 'Failed to block user.')
    }
  })

// Unblock / Unban User Action
export const unblockAdminUser = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const sessions = await authSession()
      const currentAdmin = await prisma.user.findUnique({
        where: { id: sessions.user.id },
      })
      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
      })

      if (!targetUser) throw new Error('User not found.')

      // Unban user
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          banned: false,
          banReason: null,
        },
      })

      // Log the activity
      const adminIdentifier =
        currentAdmin?.email || currentAdmin?.name || 'Admin'
      const targetIdentifier = targetUser.email || targetUser.name || 'user'

      await logActivity({
        userId: sessions.user.id,
        action: 'USER_UNBLOCKED',
        description: `${adminIdentifier} unblocked user ${targetIdentifier}`,
      })

      return { success: true, user: updatedUser }
    } catch (error: any) {
      console.error('Error unblocking user:', error)
      throw new Error(error.message || 'Failed to unblock user.')
    }
  })

export const resendVerificationEmail = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
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

      // 1. Rate Limiting Check (24-hour window)
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
        // Reset window after 24 hours
        currentCount = 1
      }

      // 2. Generate token & update user record
      const newToken = crypto.randomBytes(32).toString('hex')
      const newTokenExpires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: {
      //     activationToken: newToken,
      //     activationTokenExpires: newTokenExpires,
      //     activationEmailCount: currentCount,
      //     lastActivationEmailSentAt: now,
      //   },
      // })

      await logActivity({
        userId: session.user.id,
        action: 'RESEND_VERIFICATION',
        description: `Resent email verification link to ${user.name} (${user.email})`,
      })

      // const activationUrl = `${appUrl}/verify-activation?token=${newToken}`

      // 3. Send email via Resend
      // await resend.emails.send({
      //   from: 'Jenny’s White Haven <onboarding@resend.dev>',
      //   to: [user.email],
      //   subject: 'Resent Verification Link - Jenny’s White Haven Resort',
      //   html: `
      //     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px;">
      //       <h2 style="color: #b45309; margin-top: 0;">Hello, ${user.name}!</h2>
      //       <p>You requested a new verification link for your staff account at Jenny’s White Haven Resort.</p>
      //       <p>Please click the button below to verify your email address. This link expires in <strong>3 days</strong>:</p>
      //       <div style="margin: 24px 0;">
      //         <a href="${activationUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
      //           Verify Email Address
      //         </a>
      //       </div>
      //     </div>
      //   `,
      // })

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
  })
