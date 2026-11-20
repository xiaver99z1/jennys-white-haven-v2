import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateVerifyActivationToken,
  verifyActivationTokenHandler,
  validateResendVerificationByEmail,
  resendVerificationByEmailHandler,
  logUserLoginHandler,
  logUserLogoutHandler,
} from './auth-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession, getServerHeaders } from '#/lib/auth-helpers'
import {
  generateActivationToken,
  hashActivationToken,
  sendVerificationEmail,
} from '#/lib/email'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
  getServerHeaders: vi.fn(),
}))

vi.mock('#/lib/email', () => ({
  generateActivationToken: vi.fn(),
  hashActivationToken: vi.fn((t: string) => `hash:${t}`),
  sendVerificationEmail: vi.fn(),
}))

describe('auth-actions handlers and validators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hashActivationToken).mockImplementation((t: string) => `hash:${t}`)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('verifyActivationToken', () => {
    it('validates input data correctly', () => {
      const input = { token: 'valid-token' }
      expect(validateVerifyActivationToken(input)).toEqual(input)
    })

    it('throws error if token is missing or whitespace', async () => {
      await expect(
        verifyActivationTokenHandler({ data: { token: '   ' } }),
      ).rejects.toThrow('Verification token is missing.')
    })

    it('throws error if token is invalid or expired', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null)

      await expect(
        verifyActivationTokenHandler({ data: { token: 'invalid-token' } }),
      ).rejects.toThrow(
        'This activation link is invalid or has already been consumed.',
      )
    })

    it('rejects submission of the stored token hash while accepting the raw emailed token', async () => {
      const storedHash = 'hash:raw-emailed-token'

      // Simulate DB matching only when where.activationToken === storedHash
      vi.mocked(prisma.user.findFirst).mockImplementation((async (args: any) => {
        if (args?.where?.activationToken === storedHash) {
          return {
            id: 'user-1',
            email: 'user@resort.com',
            activationToken: storedHash,
          }
        }
        return null
      }) as any)

      // 1. Submitting the stored hash itself must fail (hashes to 'hash:hash:raw-emailed-token')
      await expect(
        verifyActivationTokenHandler({ data: { token: storedHash } }),
      ).rejects.toThrow(
        'This activation link is invalid or has already been consumed.',
      )
      expect(prisma.user.updateMany).not.toHaveBeenCalled()

      // 2. Submitting the raw emailed token succeeds (hashes to 'hash:raw-emailed-token')
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      await expect(
        verifyActivationTokenHandler({ data: { token: 'raw-emailed-token' } }),
      ).resolves.toEqual({
        success: true,
        message: 'Email verified successfully!',
      })
    })

    it('throws error if atomic updateMany detects concurrent consumption', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@resort.com',
        activationToken: 'hash:valid-token',
      } as any)
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 0 })

      await expect(
        verifyActivationTokenHandler({ data: { token: 'valid-token' } }),
      ).rejects.toThrow(
        'This activation link is invalid or has already been consumed.',
      )
    })

    it('successfully verifies hashed activation token, atomically updates user, and logs activity', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@resort.com',
        activationToken: 'hash:valid-token',
      }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })

      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.10'],
        ['user-agent', 'TestBrowser'],
      ])
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any)

      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await verifyActivationTokenHandler({
        data: { token: '  valid-token  ' },
      })

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully!',
      })
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          emailVerified: false,
          activationToken: 'hash:valid-token',
          activationTokenExpires: { gte: expect.any(Date) },
        },
      })
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          emailVerified: false,
          activationToken: 'hash:valid-token',
          activationTokenExpires: { gte: expect.any(Date) },
        },
        data: {
          emailVerified: true,
          activationToken: null,
          activationTokenExpires: null,
        },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_ACTIVATED',
          userId: 'user-1',
          ipAddress: '192.168.1.10',
          userAgent: 'TestBrowser',
        }),
      )
    })

    it('uses x-real-ip when x-forwarded-for is absent', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@resort.com',
        activationToken: 'hash:valid-token',
      }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })

      const mockHeaders = new Map([['x-real-ip', '10.0.0.5']])
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any)

      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      await verifyActivationTokenHandler({
        data: { token: 'valid-token' },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.5',
          userAgent: 'Unknown User-Agent',
        }),
      )
    })

    it('falls back to 127.0.0.1 and Unknown User-Agent when headers are missing', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@resort.com',
        activationToken: 'hash:valid-token',
      }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })

      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)

      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      await verifyActivationTokenHandler({
        data: { token: 'valid-token' },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'Unknown User-Agent',
        }),
      )
    })
  })

  describe('resendVerificationByEmail', () => {
    const genericMsg =
      'If an unverified account exists for this email, a fresh verification link has been sent.'

    it('validates email input cleanly', () => {
      const input = { email: 'admin@resort.com' }
      expect(validateResendVerificationByEmail(input)).toEqual(input)
    })

    it('rejects malformed email addresses', async () => {
      await expect(
        resendVerificationByEmailHandler({ data: { email: 'bad-email' } }),
      ).rejects.toThrow('Please enter a valid email address.')
    })

    it('returns generic success without sending for missing, verified, or banned users', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'missing@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        emailVerified: true,
        banned: false,
      } as any)
      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'verified@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u2',
        emailVerified: false,
        banned: true,
      } as any)
      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'banned@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      expect(sendVerificationEmail).not.toHaveBeenCalled()
    })

    it('enforces 60-second cooldown, 3-per-day rate limit, and concurrent reservation race with generic response', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 1. Cooldown active
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationEmailCount: 1,
        lastActivationEmailSentAt: new Date(Date.now() - 10_000),
      } as any)

      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'admin@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      // 2. Daily limit reached
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationEmailCount: 3,
        lastActivationEmailSentAt: new Date(Date.now() - 5 * 60 * 1000),
      } as any)

      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'admin@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      // 3. Concurrent reservation race (updateMany count === 0)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: 'old-hash',
        activationEmailCount: 1,
        lastActivationEmailSentAt: new Date(Date.now() - 5 * 60 * 1000),
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'race-raw',
        tokenHash: 'race-hash',
      })
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 0 })

      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'admin@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      expect(sendVerificationEmail).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledTimes(3)
    })

    it('atomically reserves resend, rotates token, sends email, logs activity, and resets count after 24h', async () => {
      const oldSentAt = new Date(Date.now() - 25 * 60 * 60 * 1000)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        name: 'Jenny Admin',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: 'prev-hash',
        activationEmailCount: 3,
        lastActivationEmailSentAt: oldSentAt,
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'new-raw-token',
        tokenHash: 'new-hash-token',
      })
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (k: string) =>
          k === 'x-forwarded-for' ? '1.2.3.4' : k === 'user-agent' ? 'UA' : null,
      } as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const res = await resendVerificationByEmailHandler({
        data: { email: '  Admin@Resort.com  ' },
      })

      expect(res).toEqual({ success: true, message: genericMsg })
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          emailVerified: false,
          banned: false,
          activationToken: 'prev-hash',
          activationEmailCount: 3,
          lastActivationEmailSentAt: oldSentAt,
        },
        data: expect.objectContaining({
          activationToken: 'new-hash-token',
          activationEmailCount: 1,
        }),
      })
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        to: 'admin@resort.com',
        name: 'Jenny Admin',
        rawToken: 'new-raw-token',
        expiresInMinutes: 60,
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'RESEND_VERIFICATION',
          ipAddress: '1.2.3.4',
          userAgent: 'UA',
        }),
      )
    })

    it('increments count within same 24h window and falls back headers when missing', async () => {
      const sentAt = new Date(Date.now() - 10 * 60 * 1000)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        name: 'Jenny Admin',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: 'h1',
        activationEmailCount: 0,
        lastActivationEmailSentAt: sentAt,
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'raw-2',
        tokenHash: 'hash-2',
      })
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (k: string) => (k === 'x-real-ip' ? '10.0.0.1' : null),
      } as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      await resendVerificationByEmailHandler({
        data: { email: 'admin@resort.com' },
      })

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'u1' }),
        data: expect.objectContaining({ activationEmailCount: 1 }),
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
          userAgent: 'Unknown User-Agent',
        }),
      )

      // Also cover lastSent null + no IP headers fallback
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u2',
        name: 'Admin 2',
        email: 'admin2@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: null,
        activationEmailCount: 0,
        lastActivationEmailSentAt: null,
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'raw-3',
        tokenHash: 'hash-3',
      })
      vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 1 })
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      await resendVerificationByEmailHandler({
        data: { email: 'admin2@resort.com' },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'Unknown User-Agent',
        }),
      )
    })

    it('conditionally restores previous token metadata and returns generic response when email delivery fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const prevDate = new Date(Date.now() - 10 * 60 * 1000)

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        name: 'Jenny Admin',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: 'old-hash',
        activationTokenExpires: prevDate,
        activationEmailCount: 1,
        lastActivationEmailSentAt: prevDate,
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'new-raw',
        tokenHash: 'new-hash',
      })
      vi.mocked(prisma.user.updateMany)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 })
      vi.mocked(sendVerificationEmail).mockRejectedValueOnce(
        new Error('Resend API down'),
      )

      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'admin@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })

      expect(prisma.user.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          id: 'u1',
          emailVerified: false,
          activationToken: 'new-hash',
        },
        data: {
          activationToken: 'old-hash',
          activationTokenExpires: prevDate,
          activationEmailCount: 1,
          lastActivationEmailSentAt: prevDate,
        },
      })

      // Also cover rollback updateMany throwing an error
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        name: 'Jenny Admin',
        email: 'admin@resort.com',
        emailVerified: false,
        banned: false,
        activationToken: 'old-hash',
        activationTokenExpires: prevDate,
        activationEmailCount: 1,
        lastActivationEmailSentAt: prevDate,
      } as any)
      vi.mocked(generateActivationToken).mockReturnValueOnce({
        rawToken: 'new-raw-2',
        tokenHash: 'new-hash-2',
      })
      vi.mocked(prisma.user.updateMany)
        .mockResolvedValueOnce({ count: 1 })
        .mockRejectedValueOnce(new Error('DB rollback failed'))
      vi.mocked(sendVerificationEmail).mockRejectedValueOnce('string error')

      await expect(
        resendVerificationByEmailHandler({
          data: { email: 'admin@resort.com' },
        }),
      ).resolves.toEqual({ success: true, message: genericMsg })
      expect(errorSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('logUserLogin', () => {
    it('successfully logs user login and falls back to null when session ipAddress and userAgent are missing', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@resort.com' },
        session: { ipAddress: null, userAgent: null },
      }
      vi.mocked(authSession).mockResolvedValueOnce(mockSession as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logUserLoginHandler()

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          userId: 'user-1',
          ipAddress: null,
          userAgent: null,
        }),
      )
    })

    it('successfully logs user login with ipAddress and userAgent', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@resort.com' },
        session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
      }
      vi.mocked(authSession).mockResolvedValueOnce(mockSession as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logUserLoginHandler()

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
        }),
      )
    })

    it('returns success: false if no active session or user is found', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authSession).mockResolvedValueOnce(null as any)

      const result = await logUserLoginHandler()

      expect(result).toEqual({
        success: false,
        error: 'No active session found.',
      })
    })

    it('handles errors gracefully and returns success: false', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authSession).mockRejectedValueOnce(new Error('Session error'))

      const result = await logUserLoginHandler()

      expect(result).toEqual({ success: false, error: 'Session error' })
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('logUserLogout', () => {
    it('successfully logs user logout and handles null ipAddress and userAgent', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@resort.com' },
        session: { ipAddress: null, userAgent: null },
      }
      vi.mocked(authSession).mockResolvedValueOnce(mockSession as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logUserLogoutHandler()

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          userId: 'user-1',
          ipAddress: null,
          userAgent: null,
        }),
      )
    })

    it('successfully logs user logout with ipAddress and userAgent', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'user@resort.com' },
        session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
      }
      vi.mocked(authSession).mockResolvedValueOnce(mockSession as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logUserLogoutHandler()

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          userId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
        }),
      )
    })

    it('handles errors gracefully during logout and returns success: false', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authSession).mockRejectedValueOnce(
        new Error('Logout log failed'),
      )

      const result = await logUserLogoutHandler()

      expect(result).toEqual({ success: false, error: 'Logout log failed' })
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
