import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAdminUserHandler,
  updateAdminUserHandler,
  blockAdminUserHandler,
  unblockAdminUserHandler,
  resendVerificationEmailHandler,
  validateCreateAdminUser,
  validateUpdateAdminUser,
  validateBlockAdminUser,
  validateUnblockAdminUser,
  validateResendVerificationEmail,
} from './admin-actions'
import { prisma } from '#/lib/prisma'
import { auth } from '#/lib/auth'
import { logActivity } from '#/lib/logger'
import { hashPassword } from 'better-auth/crypto'
import { authSession } from '#/lib/auth-helpers'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      updateMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('#/lib/auth', () => ({
  auth: {
    api: {
      createUser: vi.fn(),
    },
  },
}))

vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

describe('admin-actions handlers and validators', () => {
  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@resort.com',
    name: 'Admin User',
    role: 'OWNER',
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authSession).mockResolvedValue({
      user: mockAdminUser,
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)

    // Silence expected console.error logs during negative error-handling tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('validators', () => {
    it('validates create admin user input correctly', () => {
      const input = {
        name: 'Test',
        email: 'test@resort.com',
        role: 'MANAGER' as const,
      }
      expect(validateCreateAdminUser(input)).toEqual(input)
    })

    it('validates update admin user input correctly', () => {
      const input = {
        userId: 'user-1',
        name: 'Updated',
        password: 'newpass123',
        role: 'MANAGER' as const,
      }
      expect(validateUpdateAdminUser(input)).toEqual(input)
    })

    it('validates block and unblock user input correctly', () => {
      const input = { userId: 'user-1' }
      expect(validateBlockAdminUser(input)).toEqual(input)
      expect(validateUnblockAdminUser(input)).toEqual(input)
    })

    it('validates resend verification email input correctly', () => {
      const input = { userId: 'user-1' }
      expect(validateResendVerificationEmail(input)).toEqual(input)
    })
  })

  describe('createAdminUser', () => {
    const validData = {
      name: 'New Staff',
      email: 'staff@resort.com',
      role: 'STAFF' as const,
    }

    it('successfully creates an admin user, generates activation token, and logs activity', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      vi.mocked(auth.api.createUser).mockResolvedValueOnce({
        user: { id: 'new-user-1', email: validData.email },
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      const result = await createAdminUserHandler({ data: validData } as any)

      expect(result.success).toBe(true)
      expect(auth.api.createUser).toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'new-user-1' },
          data: expect.objectContaining({
            activationToken: expect.any(String),
            activationTokenExpires: expect.any(Date),
            activationEmailCount: 1,
            lastActivationEmailSentAt: expect.any(Date),
          }),
        }),
      )
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          userId: 'admin-1',
        }),
      )
    })

    it('throws error if email is already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'existing',
      } as any)

      await expect(
        createAdminUserHandler({ data: validData } as any),
      ).rejects.toThrow('This email address is already registered.')
    })

    it('throws error if auth.api.createUser returns an invalid user object', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      vi.mocked(auth.api.createUser).mockResolvedValueOnce({} as any)

      await expect(
        createAdminUserHandler({ data: validData } as any),
      ).rejects.toThrow('Failed to create user in authentication system.')
    })
  })

  describe('updateAdminUser', () => {
    it('successfully updates an admin user, updates password if provided, and logs activity', async () => {
      const currentAdmin = {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@resort.com',
      }
      const targetUser = {
        id: 'user-1',
        name: 'Old Name',
        email: 'staff@resort.com',
        role: 'STAFF',
      }

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(currentAdmin as any)
        .mockResolvedValueOnce(targetUser as any)

      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        ...targetUser,
        name: 'New Name',
      } as any)
      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({
        count: 1,
      } as any)

      const result = await updateAdminUserHandler({
        data: {
          userId: 'user-1',
          name: 'New Name',
          password: 'newpassword123',
          role: 'MANAGER' as any,
        },
      } as any)

      expect(result.success).toBe(true)
      expect(hashPassword).toHaveBeenCalledWith('newpassword123')
      expect(prisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', providerId: 'credential' },
        data: { password: 'hashed-password' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_UPDATED' }),
      )
    })

    it('throws error if target user not found', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        updateAdminUserHandler({
          data: { userId: 'missing', name: 'Test', role: 'STAFF' as any },
        } as any),
      ).rejects.toThrow('Target user not found.')
    })
  })

  describe('blockAdminUser and unblockAdminUser', () => {
    it('successfully blocks an admin user and deletes sessions', async () => {
      const targetUser = {
        id: 'user-1',
        email: 'user@resort.com',
        name: 'User',
      }
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(targetUser as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.session.deleteMany).mockResolvedValueOnce({
        count: 1,
      } as any)

      const result = await blockAdminUserHandler({
        data: { userId: 'user-1' },
      } as any)

      expect(result.success).toBe(true)
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_BLOCKED' }),
      )
    })

    it('throws error if user to block is not found', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        blockAdminUserHandler({ data: { userId: 'missing' } } as any),
      ).rejects.toThrow('User not found.')
    })

    it('successfully unblocks an admin user', async () => {
      const targetUser = {
        id: 'user-1',
        email: 'user@resort.com',
        name: 'User',
      }
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(targetUser as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      const result = await unblockAdminUserHandler({
        data: { userId: 'user-1' },
      } as any)

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_UNBLOCKED' }),
      )
    })

    it('throws error if user to unblock is not found', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        unblockAdminUserHandler({ data: { userId: 'missing' } } as any),
      ).rejects.toThrow('User not found.')
    })
  })

  describe('resendVerificationEmail', () => {
    it('successfully logs resend verification activity when within limits', async () => {
      const targetUser = {
        id: 'user-1',
        email: 'user@resort.com',
        name: 'User',
        emailVerified: false,
        activationEmailCount: 1,
        lastActivationEmailSentAt: new Date(Date.now() - 1000),
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(targetUser as any)

      const result = await resendVerificationEmailHandler({
        data: { userId: 'user-1' },
      } as any)

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESEND_VERIFICATION' }),
      )
    })

    it('throws error if user account not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'missing' } } as any),
      ).rejects.toThrow('User account not found.')
    })

    it('throws error if user account is already verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        emailVerified: true,
      } as any)

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'user-1' } } as any),
      ).rejects.toThrow('This user account is already verified.')
    })

    it('throws error if maximum daily verification emails limit is reached', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        emailVerified: false,
        activationEmailCount: 3,
        lastActivationEmailSentAt: new Date(),
      } as any)

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'user-1' } } as any),
      ).rejects.toThrow(
        'Maximum limit reached. You can only resend up to 3 verification emails per day for this user.',
      )
    })

    it('resets activation email count to 1 if last sent time was more than 24 hours ago', async () => {
      const targetUser = {
        id: 'user-1',
        email: 'user@resort.com',
        name: 'User',
        emailVerified: false,
        activationEmailCount: 3,
        lastActivationEmailSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(targetUser as any)

      const result = await resendVerificationEmailHandler({
        data: { userId: 'user-1' },
      } as any)

      expect(result.success).toBe(true)
      expect(result.count).toBe(1) // Hits the `else { currentCount = 1 }` branch!
    })
  })
})
