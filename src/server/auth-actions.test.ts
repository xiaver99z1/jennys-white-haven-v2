import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateVerifyActivationToken,
  verifyActivationTokenHandler,
  logUserLoginHandler,
  logUserLogoutHandler,
} from './auth-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession, getServerHeaders } from '#/lib/auth-helpers'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

describe('auth-actions handlers and validators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('verifyActivationToken', () => {
    it('validates input data correctly', () => {
      const input = { token: 'valid-token' }
      expect(validateVerifyActivationToken(input)).toEqual(input)
    })

    it('throws error if token is missing', async () => {
      await expect(
        verifyActivationTokenHandler({ data: { token: '' } }),
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

    it('successfully verifies activation token, updates user, and logs activity', async () => {
      const mockUser = { id: 'user-1', email: 'user@resort.com' }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      const mockHeaders = new Map([
        ['x-forwarded-for', '192.168.1.10'],
        ['user-agent', 'TestBrowser'],
      ])
      vi.mocked(getServerHeaders).mockReturnValueOnce({
        get: (key: string) => mockHeaders.get(key) || null,
      } as any)

      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await verifyActivationTokenHandler({
        data: { token: 'valid-token' },
      })

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully!',
      })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
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
      const mockUser = { id: 'user-1', email: 'user@resort.com' }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

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
      const mockUser = { id: 'user-1', email: 'user@resort.com' }
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(mockUser as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

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

