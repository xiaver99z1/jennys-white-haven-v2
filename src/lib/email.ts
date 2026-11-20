import crypto from 'node:crypto'
import { Resend } from 'resend'

const DEFAULT_FROM_EMAIL = "Jenny's White Haven <onboarding@resend.dev>"

export function hashActivationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export function generateActivationToken(): {
  rawToken: string
  tokenHash: string
} {
  const rawToken = crypto.randomBytes(32).toString('hex')
  return {
    rawToken,
    tokenHash: hashActivationToken(rawToken),
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getAppBaseUrl(): string {
  const configuredUrl =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  return configuredUrl.replace(/\/+$/, '')
}

export interface SendVerificationEmailOptions {
  to: string
  name: string
  rawToken: string
  expiresInMinutes?: number
}

export async function sendVerificationEmail({
  to,
  name,
  rawToken,
  expiresInMinutes = 60,
}: SendVerificationEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'Email service is not configured. Please set RESEND_API_KEY.',
    )
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL
  const activationUrl = `${getAppBaseUrl()}/verify-activation?token=${encodeURIComponent(rawToken)}`
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(activationUrl)
  const expiryLabel =
    expiresInMinutes === 60
      ? '1 hour'
      : `${expiresInMinutes} minutes`

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from,
    to: [to],
    subject: "Verify Your Email — Jenny's White Haven",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #292524; background-color: #fafaf9;">
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">
            Jenny&#39;s White Haven Resort
          </p>
          <h1 style="font-size: 22px; font-weight: 700; color: #1c1917; margin: 0 0 16px;">
            Verify your administrator email
          </h1>
          <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0 0 24px;">
            Hello ${safeName},<br /><br />
            Please confirm your email address to activate your administrator account. For your security, this one-time link will expire in <strong>${expiryLabel}</strong>.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${safeUrl}" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.6; color: #78716c; margin: 0 0 12px;">
            If the button above doesn&#39;t work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; word-break: break-all; color: #44403c; background-color: #f5f5f4; padding: 12px; border-radius: 8px; margin: 0 0 24px;">
            ${safeUrl}
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #a8a29e; margin: 0; border-top: 1px solid #f5f5f4; padding-top: 16px;">
            If you did not request this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
    text: [
      `Hello ${name},`,
      '',
      "Please verify your email address to activate your Jenny's White Haven administrator account.",
      `For your security, this one-time link will expire in ${expiryLabel}.`,
      '',
      `Verify link: ${activationUrl}`,
      '',
      'If you did not request this account, you can safely ignore this email.',
    ].join('\n'),
  })

  if (result.error) {
    throw new Error(
      result.error.message || 'Failed to send verification email.',
    )
  }

  return result
}

export async function sendPasswordResetEmail({
  to,
  name,
  rawToken,
  expiresInMinutes = 30,
}: SendVerificationEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'Email service is not configured. Please set RESEND_API_KEY.',
    )
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(resetUrl)
  const expiryLabel =
    expiresInMinutes === 60 ? '1 hour' : `${expiresInMinutes} minutes`

  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from,
    to: [to],
    subject: "Reset Your Password — Jenny's White Haven",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #292524; background-color: #fafaf9;">
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">
            Jenny&#39;s White Haven Resort
          </p>
          <h1 style="font-size: 22px; font-weight: 700; color: #1c1917; margin: 0 0 16px;">
            Reset your administrator password
          </h1>
          <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0 0 24px;">
            Hello ${safeName},<br /><br />
            We received a request to reset the password for your administrator account. Click the button below to choose a new password. For your security, this one-time link will expire in <strong>${expiryLabel}</strong>.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${safeUrl}" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.6; color: #78716c; margin: 0 0 12px;">
            If the button above doesn&#39;t work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; word-break: break-all; color: #44403c; background-color: #f5f5f4; padding: 12px; border-radius: 8px; margin: 0 0 24px;">
            ${safeUrl}
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #a8a29e; margin: 0; border-top: 1px solid #f5f5f4; padding-top: 16px;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
    text: [
      `Hello ${name},`,
      '',
      "We received a request to reset the password for your Jenny's White Haven administrator account.",
      `For your security, this one-time link will expire in ${expiryLabel}.`,
      '',
      `Reset password link: ${resetUrl}`,
      '',
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n'),
  })

  if (result.error) {
    throw new Error(
      result.error.message || 'Failed to send password reset email.',
    )
  }

  return result
}
