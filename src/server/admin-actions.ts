import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { Resend } from 'resend'
import { generateSecurePassword } from '#/lib/password'
import crypto from 'crypto'
import { hashPassword } from 'better-auth/crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export type ResortRole =
  'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'owner' | 'manager' | 'receptionist'

export const createAdminUser = createServerFn({ method: 'POST' })
  .validator((data: { name: string; email: string; role: ResortRole }) => data)
  .handler(async ({ data }) => {
    const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    const normalizedRole = data.role.toLowerCase()
    const now = new Date()

    try {
      // 1. Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingUser) {
        throw new Error('This email address is already registered.')
      }

      // 2. Use static temporary password for testing
      const tempPassword = 'Password!123'
      const hashedPassword = await hashPassword(tempPassword)
      const token = crypto.randomBytes(32).toString('hex')
      const tokenExpires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

      // 3. Create User in Prisma
      const newUser = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: normalizedRole,
          emailVerified: false,
          activationToken: token,
          activationTokenExpires: tokenExpires,
          activationEmailCount: 1,
          lastActivationEmailSentAt: now,
          // Create associated credential Account record for Better-Auth
          accounts: {
            create: {
              accountId: data.email,
              providerId: 'credential',
              password: hashedPassword,
            },
          },
        },
      })

      const activationUrl = `${appUrl}/verify-activation?token=${token}`

      // 4. Send Email via Resend
      await resend.emails.send({
        from: 'Jenny’s White Haven <onboarding@resend.dev>',
        to: [data.email],
        subject: 'Activate Your Account - Jenny’s White Haven Resort',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px;">
              <h2 style="color: #b45309; margin-top: 0;">Welcome, ${data.name}!</h2>
              <p>An account has been created for you with the role of <strong>${data.role}</strong> at Jenny’s White Haven Resort.</p>
              <p>Your temporary password is:</p>
              <div style="background: #f5f5f4; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #292524; display: inline-block; margin: 8px 0 16px 0;">
                ${tempPassword}
              </div>
              <p>Please click the button below to verify your email address and activate your account. This link will expire in <strong>3 days</strong>:</p>
              <div style="margin: 24px 0;">
                <a href="${activationUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
                  Activate Account
                </a>
              </div>
            </div>
          `,
      })

      return {
        success: true,
        message:
          'Resort staff created successfully! Activation link sent to email.',
        user: newUser,
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
      // 1. Update basic user info (Name & Role)
      const updatedUser = await prisma.user.update({
        where: { id: data.userId },
        data: {
          name: data.name,
          role: normalizedRole,
        },
      })

      // 2. If a new password was provided, hash and update the associated Account record
      if (data.password && data.password.trim() !== '') {
        // Hash the password
        const hashedPassword = await hashPassword(data.password)

        // Better-Auth stores credential passwords in the Account table
        await prisma.account.updateMany({
          where: {
            userId: data.userId,
            providerId: 'credential', // or 'email' depending on your schema setup
          },
          data: {
            password: hashedPassword,
          },
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

export const resendVerificationEmail = createServerFn({ method: 'POST' })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    const now = new Date()
    const MAX_EMAILS_PER_DAY = 3

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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          activationToken: newToken,
          activationTokenExpires: newTokenExpires,
          activationEmailCount: currentCount,
          lastActivationEmailSentAt: now,
        },
      })

      const activationUrl = `${appUrl}/verify-activation?token=${newToken}`

      // 3. Send email via Resend
      await resend.emails.send({
        from: 'Jenny’s White Haven <onboarding@resend.dev>',
        to: [user.email],
        subject: 'Resent Verification Link - Jenny’s White Haven Resort',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px;">
            <h2 style="color: #b45309; margin-top: 0;">Hello, ${user.name}!</h2>
            <p>You requested a new verification link for your staff account at Jenny’s White Haven Resort.</p>
            <p>Please click the button below to verify your email address. This link expires in <strong>3 days</strong>:</p>
            <div style="margin: 24px 0;">
              <a href="${activationUrl}" style="background-color: #b45309; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
                Verify Email Address
              </a>
            </div>
          </div>
        `,
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
  })
