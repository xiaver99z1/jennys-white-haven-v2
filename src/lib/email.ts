import crypto from 'node:crypto'
import { createServerOnlyFn } from '@tanstack/react-start'
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

export const hashActivationToken = createServerOnlyFn(
  (rawToken: string): string => {
    return crypto.createHash('sha256').update(rawToken).digest('hex')
  },
)

export const generateActivationToken = createServerOnlyFn(
  (): {
    rawToken: string
    tokenHash: string
  } => {
    const rawToken = crypto.randomBytes(32).toString('hex')
    return {
      rawToken,
      tokenHash: hashActivationToken(rawToken),
    }
  },
)

const SINGLE_MAILBOX_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/

export function isSingleMailboxEmail(value: string): boolean {
  const trimmed = value.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 254 &&
    SINGLE_MAILBOX_REGEX.test(trimmed)
  )
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

async function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST
  const isGmailHost = host.toLowerCase() === DEFAULT_SMTP_HOST
  const smtpUser = process.env.SMTP_USER?.trim()
  const rawSmtpPass = process.env.SMTP_PASS
  const smtpPass = isGmailHost ? rawSmtpPass?.replace(/\s+/g, '') : rawSmtpPass
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

  const { default: nodemailer } = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  return { transporter, from }
}

const sendActionEmail = createServerOnlyFn(
  async (template: ActionEmailTemplate) => {
    const { transporter, from } = await createSmtpTransport()

    const safeName = escapeHtml(template.name)
    const safeUrl = escapeHtml(template.actionUrl)
    const expiryLabel = formatEmailExpiryLabel(template.expiresInMinutes)

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
  },
)

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

export interface SendChatInquiryAlertEmailOptions {
  recipients: string[]
  visitorName: string
  visitorEmail?: string | null
  visitorPhone?: string | null
  messageBody: string
  conversationId: string
}

export const sendChatInquiryAlertEmail = createServerOnlyFn(
  async ({
    recipients,
    visitorName,
    visitorEmail,
    visitorPhone,
    messageBody,
    conversationId,
  }: SendChatInquiryAlertEmailOptions) => {
    const uniqueRecipients = Array.from(
      new Set(recipients.map((r) => r.trim()).filter(Boolean)),
    )
    if (uniqueRecipients.length === 0) return null

    const { transporter, from } = await createSmtpTransport()
    const inboxUrl = `${getAppBaseUrl()}/admin/chat?thread=${encodeURIComponent(conversationId)}`

    const safeVisitorName = escapeHtml(visitorName)
    const safeMessage = escapeHtml(messageBody).replace(/\n/g, '<br />')
    const validatedReplyTo =
      visitorEmail && isSingleMailboxEmail(visitorEmail)
        ? visitorEmail.trim()
        : undefined
    const contactParts = [
      validatedReplyTo ? `Email: ${validatedReplyTo}` : '',
      visitorPhone ? `Phone: ${visitorPhone}` : '',
    ].filter(Boolean)
    const safeContactSummary = escapeHtml(
      contactParts.join(' · ') || 'No contact details provided',
    )
    const safeInboxUrl = escapeHtml(inboxUrl)

    return transporter.sendMail({
      from,
      to: uniqueRecipients.join(', '),
      replyTo: validatedReplyTo,
      subject: `New Guest Chat Inquiry from ${visitorName} — Jenny's White Haven`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #292524; background-color: #fafaf9;">
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">
            Jenny&#39;s White Haven · Live Chat Support
          </p>
          <h1 style="font-size: 20px; font-weight: 700; color: #1c1917; margin: 0 0 12px;">
            New inquiry from ${safeVisitorName}
          </h1>
          <p style="font-size: 13px; color: #57534e; margin: 0 0 18px;">
            ${safeContactSummary}
          </p>
          <div style="background-color: #faf8f4; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1c1917; margin: 0 0 24px;">
            ${safeMessage}
          </div>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${safeInboxUrl}" style="display: inline-block; background-color: #1c1917; color: #faf8f4; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 26px; border-radius: 999px;">
              Open Conversation in Admin
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.5; color: #a8a29e; margin: 0; border-top: 1px solid #f5f5f4; padding-top: 14px;">
            Reply directly from your Admin Chat Support inbox.
          </p>
        </div>
      </div>
    `,
      text: [
        `New guest chat inquiry from ${visitorName}`,
        contactParts.join(' | ') || 'No contact details provided',
        '',
        messageBody,
        '',
        `Open in Admin: ${inboxUrl}`,
      ].join('\n'),
    })
  },
)

export interface SendChatReplyToGuestEmailOptions {
  to: string
  visitorName: string
  staffName: string
  replyBody: string
}

export const sendChatReplyToGuestEmail = createServerOnlyFn(
  async ({
    to,
    visitorName,
    staffName,
    replyBody,
  }: SendChatReplyToGuestEmailOptions) => {
    const trimmedTo = to.trim()
    if (!trimmedTo || !isSingleMailboxEmail(trimmedTo)) return null

    const { transporter, from } = await createSmtpTransport()
    const siteUrl = getAppBaseUrl()

    const safeVisitorName = escapeHtml(visitorName)
    const safeStaffName = escapeHtml(staffName)
    const safeReply = escapeHtml(replyBody).replace(/\n/g, '<br />')
    const safeSiteUrl = escapeHtml(siteUrl)

    return transporter.sendMail({
      from,
      to: trimmedTo,
      subject: `Reply from Jenny's White Haven`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #292524; background-color: #fafaf9;">
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 32px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #92400e; margin: 0 0 8px;">
            Jenny&#39;s White Haven · Camotes Island
          </p>
          <h1 style="font-size: 20px; font-weight: 700; color: #1c1917; margin: 0 0 12px;">
            Hello ${safeVisitorName},
          </h1>
          <p style="font-size: 14px; color: #57534e; margin: 0 0 16px;">
            <strong>${safeStaffName}</strong> replied to your inquiry:
          </p>
          <div style="background-color: #faf8f4; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1c1917; margin: 0 0 24px;">
            ${safeReply}
          </div>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${safeSiteUrl}" style="display: inline-block; background-color: #1c1917; color: #faf8f4; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 26px; border-radius: 999px;">
              Visit Website
            </a>
          </div>
        </div>
      </div>
    `,
      text: [
        `Hello ${visitorName},`,
        '',
        `${staffName} from Jenny's White Haven replied to your inquiry:`,
        '',
        replyBody,
        '',
        `Visit our website: ${siteUrl}`,
      ].join('\n'),
    })
  },
)
