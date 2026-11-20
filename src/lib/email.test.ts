import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  escapeHtml,
  generateActivationToken,
  getAppBaseUrl,
  hashActivationToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email'

const mockEmailsSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: {
        send: mockEmailsSend,
      },
    }
  }),
}))

describe('email helpers', () => {
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

  it('escapes HTML special characters safely', () => {
    expect(escapeHtml(`<script>"O'Brien" & Co</script>`)).toBe(
      '&lt;script&gt;&quot;O&#39;Brien&quot; &amp; Co&lt;/script&gt;',
    )
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

  it('throws if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    await expect(
      sendVerificationEmail({
        to: 'admin@example.com',
        name: 'Jenny',
        rawToken: 'abc123',
      }),
    ).rejects.toThrow(
      'Email service is not configured. Please set RESEND_API_KEY.',
    )
  })

  it('sends verification email with escaped HTML and text fallback', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_FROM_EMAIL = 'Resort <noreply@jennyswhitehaven.com>'
    process.env.BETTER_AUTH_URL = 'https://jennyswhitehaven.com'

    mockEmailsSend.mockResolvedValueOnce({
      data: { id: 'email-1' },
      error: null,
    })

    await sendVerificationEmail({
      to: 'admin@jennyswhitehaven.com',
      name: 'Jenny <Owner>',
      rawToken: 'raw-token-value',
      expiresInMinutes: 30,
    })

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Resort <noreply@jennyswhitehaven.com>',
        to: ['admin@jennyswhitehaven.com'],
        subject: "Verify Your Email — Jenny's White Haven",
        html: expect.stringContaining('Jenny &lt;Owner&gt;'),
        text: expect.stringContaining(
          'https://jennyswhitehaven.com/verify-activation?token=raw-token-value',
        ),
      }),
    )
    expect(mockEmailsSend.mock.calls[0][0].html).toContain('30 minutes')
  })

  it('throws when Resend returns an error object', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    delete process.env.RESEND_FROM_EMAIL

    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Sandbox recipient not allowed' },
    })

    await expect(
      sendVerificationEmail({
        to: 'other@example.com',
        name: 'Admin',
        rawToken: 'tok',
      }),
    ).rejects.toThrow('Sandbox recipient not allowed')

    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: {},
    })

    await expect(
      sendVerificationEmail({
        to: 'other@example.com',
        name: 'Admin',
        rawToken: 'tok',
      }),
    ).rejects.toThrow('Failed to send verification email.')
  })

  it('sends password reset email and handles missing API key or Resend errors', async () => {
    delete process.env.RESEND_API_KEY
    await expect(
      sendPasswordResetEmail({
        to: 'admin@example.com',
        name: 'Jenny',
        rawToken: 'reset-tok',
      }),
    ).rejects.toThrow(
      'Email service is not configured. Please set RESEND_API_KEY.',
    )

    process.env.RESEND_API_KEY = 're_test_key'
    process.env.BETTER_AUTH_URL = 'https://jennyswhitehaven.com'
    mockEmailsSend.mockResolvedValueOnce({
      data: { id: 'reset-1' },
      error: null,
    })

    await sendPasswordResetEmail({
      to: 'admin@jennyswhitehaven.com',
      name: 'Jenny <Admin>',
      rawToken: 'reset-tok',
      expiresInMinutes: 60,
    })

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['admin@jennyswhitehaven.com'],
        subject: "Reset Your Password — Jenny's White Haven",
        html: expect.stringContaining('Jenny &lt;Admin&gt;'),
        text: expect.stringContaining(
          'https://jennyswhitehaven.com/reset-password?token=reset-tok',
        ),
      }),
    )

    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rate limit exceeded' },
    })
    await expect(
      sendPasswordResetEmail({
        to: 'admin@jennyswhitehaven.com',
        name: 'Jenny',
        rawToken: 'reset-tok',
      }),
    ).rejects.toThrow('Rate limit exceeded')

    mockEmailsSend.mockResolvedValueOnce({
      data: null,
      error: {},
    })
    await expect(
      sendPasswordResetEmail({
        to: 'admin@jennyswhitehaven.com',
        name: 'Jenny',
        rawToken: 'reset-tok',
      }),
    ).rejects.toThrow('Failed to send password reset email.')
  })
})
