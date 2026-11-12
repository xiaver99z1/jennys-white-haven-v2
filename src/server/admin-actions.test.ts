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
      role: 'RECEPTIONIST' as const,
    }

    it('successfully creates an admin user, generates activation token, and logs activity', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      vi.mocked(auth.api.createUser).mockResolvedValueOnce({
        user: { id: 'new-user-1', email: validData.email },
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      const result = await createAdminUserHandler({ data: validData })

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

    it('handles null ipAddress and userAgent when logging activity', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      vi.mocked(auth.api.createUser).mockResolvedValueOnce({
        user: { id: 'new-user-1', email: validData.email },
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      await createAdminUserHandler({ data: validData })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
          userAgent: null,
        }),
      )
    })

    it('throws error if email is already registered', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'existing',
      } as any)

      await expect(createAdminUserHandler({ data: validData })).rejects.toThrow(
        'This email address is already registered.',
      )
    })

    it('throws error if auth.api.createUser returns an invalid user object', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
      vi.mocked(auth.api.createUser).mockResolvedValueOnce({} as any)

      await expect(createAdminUserHandler({ data: validData })).rejects.toThrow(
        'Failed to create user in authentication system.',
      )
    })

    it('throws fallback error message when caught error has no message', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error(''))

      await expect(createAdminUserHandler({ data: validData })).rejects.toThrow(
        'Failed to process request.',
      )
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
        role: 'RECEPTIONIST',
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
      })

      const result = await updateAdminUserHandler({
        data: {
          userId: 'user-1',
          name: 'New Name',
          password: 'newpassword123',
          role: 'MANAGER',
        },
      })

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

    it('formats a single change, falls back to name or defaults when emails/roles are missing, and handles null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          id: 'admin-1',
          email: '',
          name: 'AdminByName',
        } as any)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: '',
          name: 'TargetByName',
          role: null,
        } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: 'user-1',
        name: 'TargetByName',
        role: 'manager',
      } as any)

      await updateAdminUserHandler({
        data: {
          userId: 'user-1',
          name: 'TargetByName',
          role: 'MANAGER',
        },
      })

      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'USER_UPDATED',
        description:
          'AdminByName updated TargetByName role from "none" to "MANAGER"',
        ipAddress: null,
        userAgent: null,
      })
    })

    it('falls back to "Admin" and "user" when both email and name are empty, and skips logActivity when no changes occur', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: '',
          name: '',
          role: 'manager',
        } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      await updateAdminUserHandler({
        data: {
          userId: 'user-1',
          name: 'Updated Name',
          role: 'MANAGER',
        },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Admin updated user name from "" to "Updated Name"',
        }),
      )

      vi.clearAllMocks()
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
      } as any)
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'staff@resort.com',
          name: 'Same Name',
          role: 'manager',
        } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      await updateAdminUserHandler({
        data: {
          userId: 'user-1',
          name: 'Same Name',
          role: 'MANAGER',
        },
      })

      expect(logActivity).not.toHaveBeenCalled()
    })

    it('throws error if target user not found', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        updateAdminUserHandler({
          data: { userId: 'missing', name: 'Test', role: 'RECEPTIONIST' },
        }),
      ).rejects.toThrow('Target user not found.')
    })

    it('throws fallback error message when update fails with empty error message', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error(''))

      await expect(
        updateAdminUserHandler({
          data: { userId: 'user-1', name: 'Test', role: 'RECEPTIONIST' },
        }),
      ).rejects.toThrow('Failed to update staff profile.')
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
      })

      const result = await blockAdminUserHandler({
        data: { userId: 'user-1' },
      })

      expect(result.success).toBe(true)
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_BLOCKED' }),
      )
    })

    it('handles identifier fallbacks and null session metadata when blocking a user', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          id: 'admin-1',
          email: '',
          name: 'AdminName',
        } as any)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: '',
          name: 'TargetName',
        } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.session.deleteMany).mockResolvedValueOnce({ count: 0 })

      await blockAdminUserHandler({ data: { userId: 'user-1' } })

      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'USER_BLOCKED',
        description: 'AdminName blocked user TargetName',
        ipAddress: null,
        userAgent: null,
      })

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-1', email: '', name: '' } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.session.deleteMany).mockResolvedValueOnce({ count: 0 })

      await blockAdminUserHandler({ data: { userId: 'user-1' } })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Admin blocked user user',
        }),
      )
    })

    it('throws error if user to block is not found or fails with empty error message', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        blockAdminUserHandler({ data: { userId: 'missing' } }),
      ).rejects.toThrow('User not found.')

      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error(''))
      await expect(
        blockAdminUserHandler({ data: { userId: 'user-1' } }),
      ).rejects.toThrow('Failed to block user.')
    })

    it('successfully unblocks an admin user and handles identifier fallbacks and null session metadata', async () => {
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
      })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_UNBLOCKED' }),
      )

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          id: 'admin-1',
          email: '',
          name: 'AdminName',
        } as any)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: '',
          name: 'TargetName',
        } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      await unblockAdminUserHandler({ data: { userId: 'user-1' } })

      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'USER_UNBLOCKED',
        description: 'AdminName unblocked user TargetName',
        ipAddress: null,
        userAgent: null,
      })

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-1', email: '', name: '' } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      await unblockAdminUserHandler({ data: { userId: 'user-1' } })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Admin unblocked user user',
        }),
      )
    })

    it('throws error if user to unblock is not found or fails with empty error message', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdminUser as any)
        .mockResolvedValueOnce(null)

      await expect(
        unblockAdminUserHandler({ data: { userId: 'missing' } }),
      ).rejects.toThrow('User not found.')

      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error(''))
      await expect(
        unblockAdminUserHandler({ data: { userId: 'user-1' } }),
      ).rejects.toThrow('Failed to unblock user.')
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
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESEND_VERIFICATION' }),
      )
    })

    it('handles zero activationEmailCount and null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@resort.com',
        name: 'User',
        emailVerified: false,
        activationEmailCount: 0,
        lastActivationEmailSentAt: null,
      } as any)

      const result = await resendVerificationEmailHandler({
        data: { userId: 'user-1' },
      })

      expect(result.count).toBe(1)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
          userAgent: null,
        }),
      )
    })

    it('throws error if user account not found or fails with empty error message', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'missing' } }),
      ).rejects.toThrow('User account not found.')

      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error(''))

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'user-1' } }),
      ).rejects.toThrow('Failed to resend verification email.')
    })

    it('throws error if user account is already verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        emailVerified: true,
      } as any)

      await expect(
        resendVerificationEmailHandler({ data: { userId: 'user-1' } }),
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
        resendVerificationEmailHandler({ data: { userId: 'user-1' } }),
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
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1) // Hits the `else { currentCount = 1 }` branch!
    })
  })
})

