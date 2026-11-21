import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import {
  DEFAULT_APP_BASE_URL,
  DEFAULT_FROM_NAME,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  PASSWORD_RESET_EXPIRES_MINUTES,
  VERIFICATION_EXPIRES_MINUTES,
} from '#/lib/constants/auth'
import type {
  ActionEmailTemplate,
  SendVerificationEmailOptions,
} from '#/types'

export type { SendVerificationEmailOptions }

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
    DEFAULT_APP_BASE_URL
  return configuredUrl.replace(/\/+$/, '')
}

export function formatEmailExpiryLabel(expiresInMinutes: number): string {
  if (expiresInMinutes % (24 * 60) === 0) {
    const days = expiresInMinutes / (24 * 60)
    return days === 1 ? '1 day' : `${days} days`
  }
  if (expiresInMinutes === 60) {
    return '1 hour'
  }
  return `${expiresInMinutes} minutes`
}

async function sendActionEmail(template: ActionEmailTemplate) {
  const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST
  const isGmailHost = host.toLowerCase() === DEFAULT_SMTP_HOST
  const smtpUser = process.env.SMTP_USER?.trim()
  const rawSmtpPass = process.env.SMTP_PASS
  const smtpPass = isGmailHost
    ? rawSmtpPass?.replace(/\s+/g, '')
    : rawSmtpPass
  if (!smtpUser || !smtpPass?.trim()) {
    throw new Error(
      'Email service is not configured. Please set SMTP_USER and SMTP_PASS.',
    )
  }

  const port = Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465
  const from =
    process.env.SMTP_FROM?.trim() || `${DEFAULT_FROM_NAME} <${smtpUser}>`

  const safeName = escapeHtml(template.name)
  const safeUrl = escapeHtml(template.actionUrl)
  const expiryLabel = formatEmailExpiryLabel(template.expiresInMinutes)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  try {
    return await transporter.sendMail({
      from,
      to: template.to,
      subject: template.subject,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #292524; background-color: #fafaf9;">
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">
            Jenny&#39;s White Haven Resort
          </p>
          <h1 style="font-size: 22px; font-weight: 700; color: #1c1917; margin: 0 0 16px;">
            ${template.heading}
          </h1>
          <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0 0 24px;">
            ${template.bodyHtml(safeName, expiryLabel)}
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${safeUrl}" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
              ${template.ctaLabel}
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.6; color: #78716c; margin: 0 0 12px;">
            If the button above doesn&#39;t work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; word-break: break-all; color: #44403c; background-color: #f5f5f4; padding: 12px; border-radius: 8px; margin: 0 0 24px;">
            ${safeUrl}
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #a8a29e; margin: 0; border-top: 1px solid #f5f5f4; padding-top: 16px;">
            ${template.footerNote}
          </p>
        </div>
      </div>
    `,
      text: template
        .textLines(template.name, expiryLabel, template.actionUrl)
        .join('\n'),
    })
  } catch (error: unknown) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : template.fallbackErrorMessage,
    )
  }
}

export async function sendVerificationEmail({
  to,
  name,
  rawToken,
  expiresInMinutes = VERIFICATION_EXPIRES_MINUTES,
}: SendVerificationEmailOptions) {
  const activationUrl = `${getAppBaseUrl()}/verify-activation?token=${encodeURIComponent(rawToken)}`
  return sendActionEmail({
    to,
    name,
    subject: "Verify Your Email — Jenny's White Haven",
    heading: 'Verify your administrator email',
    bodyHtml: (safeName, expiryLabel) =>
      `Hello ${safeName},<br /><br />Please confirm your email address to activate your administrator account. For your security, this one-time link will expire in <strong>${expiryLabel}</strong>.`,
    ctaLabel: 'Verify Email Address',
    actionUrl: activationUrl,
    footerNote:
      'If you did not request this account, you can safely ignore this email.',
    textLines: (recipientName, expiryLabel, url) => [
      `Hello ${recipientName},`,
      '',
      "Please verify your email address to activate your Jenny's White Haven administrator account.",
      `For your security, this one-time link will expire in ${expiryLabel}.`,
      '',
      `Verify link: ${url}`,
      '',
      'If you did not request this account, you can safely ignore this email.',
    ],
    expiresInMinutes,
    fallbackErrorMessage: 'Failed to send verification email.',
  })
}

export async function sendPasswordResetEmail({
  to,
  name,
  rawToken,
  expiresInMinutes = PASSWORD_RESET_EXPIRES_MINUTES,
}: SendVerificationEmailOptions) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`
  return sendActionEmail({
    to,
    name,
    subject: "Reset Your Password — Jenny's White Haven",
    heading: 'Reset your administrator password',
    bodyHtml: (safeName, expiryLabel) =>
      `Hello ${safeName},<br /><br />We received a request to reset the password for your administrator account. Click the button below to choose a new password. For your security, this one-time link will expire in <strong>${expiryLabel}</strong>.`,
    ctaLabel: 'Reset Password',
    actionUrl: resetUrl,
    footerNote:
      'If you did not request a password reset, you can safely ignore this email.',
    textLines: (recipientName, expiryLabel, url) => [
      `Hello ${recipientName},`,
      '',
      "We received a request to reset the password for your Jenny's White Haven administrator account.",
      `For your security, this one-time link will expire in ${expiryLabel}.`,
      '',
      `Reset password link: ${url}`,
      '',
      'If you did not request a password reset, you can safely ignore this email.',
    ],
    expiresInMinutes,
    fallbackErrorMessage: 'Failed to send password reset email.',
  })
}
