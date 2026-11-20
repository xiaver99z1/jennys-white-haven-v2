import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkInitialSetupRequiredHandler,
  createInitialSuperAdminHandler,
  validateCreateInitialSuperAdmin,
} from './setup-actions'
import { prisma } from '#/lib/prisma'
import { getServerHeaders } from '#/lib/auth-helpers'
import { generateActivationToken, sendVerificationEmail } from '#/lib/email'
import { hashPassword } from 'better-auth/crypto'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('#/lib/auth-helpers', () => ({
  getServerHeaders: vi.fn(),
}))

vi.mock('#/lib/email', () => ({
  generateActivationToken: vi.fn(),
  sendVerificationEmail: vi.fn(),
}))

vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn(),
}))

describe('setup-actions handlers and validators', () => {
  const validInput = {
    name: '  Jenny Admin  ',
    email: '  Admin@JennysWhiteHaven.com  ',
    password: 'StrongPassword!123',
    confirmPassword: 'StrongPassword!123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateActivationToken).mockReturnValue({
      rawToken: 'raw-setup-token',
      tokenHash: 'hashed-setup-token',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates initial setup input cleanly', () => {
    expect(validateCreateInitialSuperAdmin(validInput)).toEqual(validInput)
  })

  describe('checkInitialSetupRequiredHandler', () => {
    it('returns needsSetup: true when no users exist', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      await expect(checkInitialSetupRequiredHandler()).resolves.toEqual({
        needsSetup: true,
      })
    })

    it('returns needsSetup: false when at least one user exists', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(2)
      await expect(checkInitialSetupRequiredHandler()).resolves.toEqual({
        needsSetup: false,
      })
    })
  })

  describe('createInitialSuperAdminHandler', () => {
    it('validates name length bounds', async () => {
      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, name: 'J' },
        }),
      ).rejects.toThrow('Full name must be between 2 and 100 characters.')

      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, name: 'A'.repeat(101) },
        }),
      ).rejects.toThrow('Full name must be between 2 and 100 characters.')
    })

    it('validates email format', async () => {
      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, email: 'invalid-email' },
        }),
      ).rejects.toThrow('Please enter a valid email address.')
    })

    it('validates password length and complexity', async () => {
      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, password: 'Aa1!', confirmPassword: 'Aa1!' },
        }),
      ).rejects.toThrow('Password must be between 8 and 128 characters long.')

      const tooLong = `Aa1!${'a'.repeat(125)}`
      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, password: tooLong, confirmPassword: tooLong },
        }),
      ).rejects.toThrow('Password must be between 8 and 128 characters long.')

      await expect(
        createInitialSuperAdminHandler({
          data: {
            ...validInput,
            password: 'lowercase!123',
            confirmPassword: 'lowercase!123',
          },
        }),
      ).rejects.toThrow(
        'Password must include uppercase, lowercase, a number, and a special character.',
      )

      await expect(
        createInitialSuperAdminHandler({
          data: {
            ...validInput,
            password: 'UPPERCASE!123',
            confirmPassword: 'UPPERCASE!123',
          },
        }),
      ).rejects.toThrow(
        'Password must include uppercase, lowercase, a number, and a special character.',
      )

      await expect(
        createInitialSuperAdminHandler({
          data: {
            ...validInput,
            password: 'NoNumbers!abc',
            confirmPassword: 'NoNumbers!abc',
          },
        }),
      ).rejects.toThrow(
        'Password must include uppercase, lowercase, a number, and a special character.',
      )

      await expect(
        createInitialSuperAdminHandler({
          data: {
            ...validInput,
            password: 'NoSpecial1234',
            confirmPassword: 'NoSpecial1234',
          },
        }),
      ).rejects.toThrow(
        'Password must include uppercase, lowercase, a number, and a special character.',
      )
    })

    it('validates password confirmation match', async () => {
      await expect(
        createInitialSuperAdminHandler({
          data: { ...validInput, confirmPassword: 'DifferentPassword!1' },
        }),
      ).rejects.toThrow('Passwords do not match.')
    })

    it('rejects before hashing when a user already exists', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(1)

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow('Initial setup has already been completed.')

      expect(hashPassword).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('creates unverified super_admin with hashed token, sends email, and returns requiresVerification', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)

      const mockHeaders = new Map([
        ['x-forwarded-for', '203.0.113.5'],
        ['user-agent', 'VitestAgent'],
      ])
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (key: string) => mockHeaders.get(key) ?? null,
      } as any)

      const mockTx = {
        user: {
          count: vi.fn().mockResolvedValueOnce(0),
          create: vi.fn().mockResolvedValueOnce({
            id: 'super-1',
            name: 'Jenny Admin',
            email: 'admin@jennyswhitehaven.com',
            role: 'super_admin',
          }),
        },
        account: {
          create: vi.fn().mockResolvedValueOnce({}),
        },
        activityLog: {
          create: vi.fn().mockResolvedValueOnce({}),
        },
      }

      vi.mocked(prisma.$transaction).mockImplementationOnce(
        async (callback: any, options: any) => {
          expect(options).toEqual({ isolationLevel: 'Serializable' })
          return callback(mockTx)
        },
      )

      const result = await createInitialSuperAdminHandler({ data: validInput })

      expect(result).toEqual({
        success: true,
        requiresVerification: true,
        message:
          'Super Admin account created! Please check your email to verify your account before signing in.',
        user: {
          id: 'super-1',
          name: 'Jenny Admin',
          email: 'admin@jennyswhitehaven.com',
          role: 'super_admin',
        },
      })
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Jenny Admin',
          email: 'admin@jennyswhitehaven.com',
          emailVerified: false,
          role: 'super_admin',
          activationToken: 'hashed-setup-token',
          activationTokenExpires: expect.any(Date),
          activationEmailCount: 1,
          lastActivationEmailSentAt: expect.any(Date),
        }),
      })
      expect(mockTx.account.create).toHaveBeenCalledWith({
        data: {
          userId: 'super-1',
          accountId: 'super-1',
          providerId: 'credential',
          password: 'hashed-secret',
        },
      })
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        to: 'admin@jennyswhitehaven.com',
        name: 'Jenny Admin',
        rawToken: 'raw-setup-token',
        expiresInMinutes: 60,
      })
    })

    it('uses x-real-ip and header fallbacks when x-forwarded-for or user-agent are absent', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (key: string) => (key === 'x-real-ip' ? '10.0.0.9' : null),
      } as any)

      const mockTx = {
        user: {
          count: vi.fn().mockResolvedValueOnce(0),
          create: vi.fn().mockResolvedValueOnce({
            id: 'super-2',
            name: 'Jenny Admin',
            email: 'admin@jennyswhitehaven.com',
            role: 'super_admin',
          }),
        },
        account: { create: vi.fn().mockResolvedValueOnce({}) },
        activityLog: { create: vi.fn().mockResolvedValueOnce({}) },
      }

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx),
      )

      await createInitialSuperAdminHandler({ data: validInput })

      expect(mockTx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '10.0.0.9',
          userAgent: 'Unknown User-Agent',
        }),
      })

      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(sendVerificationEmail).mockResolvedValueOnce({} as any)
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)

      const mockTx2 = {
        user: {
          count: vi.fn().mockResolvedValueOnce(0),
          create: vi.fn().mockResolvedValueOnce({
            id: 'super-3',
            name: 'Jenny Admin',
            email: 'admin@jennyswhitehaven.com',
            role: 'super_admin',
          }),
        },
        account: { create: vi.fn().mockResolvedValueOnce({}) },
        activityLog: { create: vi.fn().mockResolvedValueOnce({}) },
      }

      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx2),
      )

      await createInitialSuperAdminHandler({ data: validInput })

      expect(mockTx2.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'Unknown User-Agent',
        }),
      })
    })

    it('conditionally deletes unchanged unverified user on email failure, or preserves account if it already advanced', async () => {
      // 1. Unchanged unverified account is cleaned up (deleteMany count === 1)
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({ get: () => null } as any)
      vi.mocked(prisma.$transaction).mockResolvedValueOnce({
        id: 'super-rollback',
        name: 'Jenny Admin',
        email: 'admin@jennyswhitehaven.com',
        role: 'super_admin',
      })
      vi.mocked(sendVerificationEmail).mockRejectedValueOnce(
        new Error('Invalid RESEND_API_KEY'),
      )
      vi.mocked(prisma.user.deleteMany).mockResolvedValueOnce({ count: 1 })

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow(
        'Failed to send verification email: Invalid RESEND_API_KEY. Fix your email delivery configuration, then sign in and request a new verification email.',
      )

      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'super-rollback',
          emailVerified: false,
          activationToken: 'hashed-setup-token',
        },
      })

      // 2. Account already advanced (deleteMany count === 0): preserved and returns success
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({ get: () => null } as any)
      vi.mocked(prisma.$transaction).mockResolvedValueOnce({
        id: 'super-advanced',
        name: 'Jenny Admin',
        email: 'admin@jennyswhitehaven.com',
        role: 'super_admin',
      })
      vi.mocked(sendVerificationEmail).mockRejectedValueOnce(
        new Error('Late timeout'),
      )
      vi.mocked(prisma.user.deleteMany).mockResolvedValueOnce({ count: 0 })

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).resolves.toEqual({
        success: true,
        requiresVerification: true,
        message:
          'Super Admin account created! Please check your email to verify your account before signing in.',
        user: {
          id: 'super-advanced',
          name: 'Jenny Admin',
          email: 'admin@jennyswhitehaven.com',
          role: 'super_admin',
        },
      })

      // 3. Cleanup deleteMany throws + non-Error email failure still directs user to sign in and resend
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({ get: () => null } as any)
      vi.mocked(prisma.$transaction).mockResolvedValueOnce({
        id: 'super-rollback-2',
        name: 'Jenny Admin',
        email: 'admin@jennyswhitehaven.com',
        role: 'super_admin',
      })
      vi.mocked(sendVerificationEmail).mockRejectedValueOnce('network')
      vi.mocked(prisma.user.deleteMany).mockRejectedValueOnce(
        new Error('db fail'),
      )

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow(
        'Failed to send verification email: Email provider error. Fix your email delivery configuration, then sign in and request a new verification email.',
      )
    })

    it('rejects inside transaction if another user was inserted concurrently', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)

      const mockTx = {
        user: { count: vi.fn().mockResolvedValueOnce(1) },
      }
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
        cb(mockTx),
      )

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow('Initial setup has already been completed.')
    })

    it('maps Prisma P2034 and P2002 conflict errors to setup-already-completed message', async () => {
      for (const code of ['P2034', 'P2002']) {
        vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
        vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
        vi.mocked(getServerHeaders).mockReturnValueOnce({
          get: () => null,
        } as any)
        vi.mocked(prisma.$transaction).mockRejectedValueOnce({ code })

        await expect(
          createInitialSuperAdminHandler({ data: validInput }),
        ).rejects.toThrow('Initial setup has already been completed.')
      }
    })

    it('rethrows standard Error and wraps non-Error transaction failures', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(
        new Error('Database connection lost'),
      )

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow('Database connection lost')

      vi.mocked(prisma.user.count).mockResolvedValueOnce(0)
      vi.mocked(hashPassword).mockResolvedValueOnce('hashed-secret')
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: () => null,
      } as any)
      vi.mocked(prisma.$transaction).mockRejectedValueOnce('unknown failure')

      await expect(
        createInitialSuperAdminHandler({ data: validInput }),
      ).rejects.toThrow('Failed to complete initial setup.')
    })
  })
})
