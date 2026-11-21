import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import nodemailer from 'nodemailer'
import {
  escapeHtml,
  formatEmailExpiryLabel,
  generateActivationToken,
  getAppBaseUrl,
  hashActivationToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email'

const mockSendMail = vi.fn()

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}))

describe('email helpers (Nodemailer SMTP)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('generates 256-bit hex tokens and deterministic SHA-256 hashes', () => {
    const { rawToken, tokenHash } = generateActivationToken()
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/)
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(tokenHash).not.toBe(rawToken)
    expect(hashActivationToken(rawToken)).toBe(tokenHash)
  })

  it('escapes HTML special characters and formats expiry labels', () => {
    expect(escapeHtml(`<script>"O'Brien" & Co</script>`)).toBe(
      '&lt;script&gt;&quot;O&#39;Brien&quot; &amp; Co&lt;/script&gt;',
    )
    expect(formatEmailExpiryLabel(30)).toBe('30 minutes')
    expect(formatEmailExpiryLabel(60)).toBe('1 hour')
    expect(formatEmailExpiryLabel(1440)).toBe('1 day')
    expect(formatEmailExpiryLabel(4320)).toBe('3 days')
  })

  it('resolves base URL from BETTER_AUTH_URL, VERCEL_URL, or localhost fallback', () => {
    process.env.BETTER_AUTH_URL = 'https://jennyswhitehaven.com///'
    expect(getAppBaseUrl()).toBe('https://jennyswhitehaven.com')

    delete process.env.BETTER_AUTH_URL
    process.env.VERCEL_URL = 'preview.vercel.app'
    expect(getAppBaseUrl()).toBe('https://preview.vercel.app')

    delete process.env.VERCEL_URL
    expect(getAppBaseUrl()).toBe('http://localhost:3000')
  })

  it('throws if SMTP_USER or SMTP_PASS is missing', async () => {
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS

    await expect(
      sendVerificationEmail({
        to: 'admin@example.com',
        name: 'Jenny',
        rawToken: 'abc123',
      }),
    ).rejects.toThrow(
      'Email service is not configured. Please set SMTP_USER and SMTP_PASS.',
    )

    process.env.SMTP_USER = 'sender@gmail.com'
    await expect(
      sendVerificationEmail({
        to: 'admin@example.com',
        name: 'Jenny',
        rawToken: 'abc123',
      }),
    ).rejects.toThrow(
      'Email service is not configured. Please set SMTP_USER and SMTP_PASS.',
    )
  })

  it('sends verification email via Nodemailer SMTP with escaped HTML, stripped app-password spaces, and text fallback', async () => {
    process.env.SMTP_USER = 'resort@gmail.com'
    process.env.SMTP_PASS = 'abcd efgh ijkl mnop'
    process.env.SMTP_FROM = 'Resort <noreply@jennyswhitehaven.com>'
    process.env.BETTER_AUTH_URL = 'https://jennyswhitehaven.com'
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_SECURE

    mockSendMail.mockResolvedValueOnce({ messageId: '<msg-1>' })

    await sendVerificationEmail({
      to: 'staff@anydomain.com',
      name: 'Jenny <Owner>',
      rawToken: 'raw-token-value',
      expiresInMinutes: 30,
    })

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resort@gmail.com',
        pass: 'abcdefghijklmnop',
      },
    })
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Resort <noreply@jennyswhitehaven.com>',
        to: 'staff@anydomain.com',
        subject: "Verify Your Email — Jenny's White Haven",
        html: expect.stringContaining('Jenny &lt;Owner&gt;'),
        text: expect.stringContaining(
          'https://jennyswhitehaven.com/verify-activation?token=raw-token-value',
        ),
      }),
    )
    expect(mockSendMail.mock.calls[0][0].html).toContain('30 minutes')
  })

  it('supports custom SMTP_HOST, SMTP_PORT, SMTP_SECURE, default from address, and handles sendMail errors', async () => {
    process.env.SMTP_USER = 'resort@gmail.com'
    process.env.SMTP_PASS = 'apppassword123456'
    process.env.SMTP_HOST = 'smtp.brevo.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_SECURE = 'false'
    delete process.env.SMTP_FROM

    mockSendMail.mockRejectedValueOnce(new Error('SMTP authentication failed'))

    await expect(
      sendVerificationEmail({
        to: 'other@example.com',
        name: 'Admin',
        rawToken: 'tok',
      }),
    ).rejects.toThrow('SMTP authentication failed')

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resort@gmail.com',
        pass: 'apppassword123456',
      },
    })

    mockSendMail.mockRejectedValueOnce('non-error rejection')

    await expect(
      sendVerificationEmail({
        to: 'other@example.com',
        name: 'Admin',
        rawToken: 'tok',
      }),
    ).rejects.toThrow('Failed to send verification email.')
  })

  it('sends password reset email and handles SMTP errors', async () => {
    process.env.SMTP_USER = 'resort@gmail.com'
    process.env.SMTP_PASS = 'apppassword123456'
    process.env.BETTER_AUTH_URL = 'https://jennyswhitehaven.com'
    delete process.env.SMTP_FROM

    mockSendMail.mockResolvedValueOnce({ messageId: '<reset-1>' })

    await sendPasswordResetEmail({
      to: 'admin@jennyswhitehaven.com',
      name: 'Jenny <Admin>',
      rawToken: 'reset-tok',
      expiresInMinutes: 60,
    })

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Jenny's White Haven <resort@gmail.com>",
        to: 'admin@jennyswhitehaven.com',
        subject: "Reset Your Password — Jenny's White Haven",
        html: expect.stringContaining('Jenny &lt;Admin&gt;'),
        text: expect.stringContaining(
          'https://jennyswhitehaven.com/reset-password?token=reset-tok',
        ),
      }),
    )

    mockSendMail.mockRejectedValueOnce(new Error(''))
    await expect(
      sendPasswordResetEmail({
        to: 'admin@jennyswhitehaven.com',
        name: 'Jenny',
        rawToken: 'reset-tok',
      }),
    ).rejects.toThrow('Failed to send password reset email.')
  })
})
