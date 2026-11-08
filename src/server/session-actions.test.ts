import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateGetUserSessions,
  getUserSessionsHandler,
  validateRevokeSession,
  revokeSessionHandler,
} from './session-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { parseUserAgent } from '#/lib/parse-user-agent'
import { authSession } from '#/lib/auth-helpers'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/parse-user-agent', () => ({
  parseUserAgent: vi.fn().mockReturnValue('Chrome on Windows'),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

describe('session-actions handlers and validators', () => {
  const mockAdminSession = {
    user: { id: 'admin-1', email: 'admin@resort.com' },
    session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserSessions', () => {
    it('validates input data correctly', () => {
      const input = { userId: 'user-123' }
      expect(validateGetUserSessions(input)).toEqual(input)
    })

    it('successfully fetches active sessions and session history', async () => {
      const mockActive = [
        { id: 's-1', token: 'tok-1', expiresAt: new Date(Date.now() + 10000) },
      ]
      const mockHistory = [
        { id: 's-2', token: 'tok-2', expiresAt: new Date(Date.now() - 10000) },
      ]

      vi.mocked(prisma.session.findMany)
        .mockResolvedValueOnce(mockActive as any)
        .mockResolvedValueOnce(mockHistory as any)

      const result = await getUserSessionsHandler({
        data: { userId: 'user-123' },
      })

      expect(result).toEqual({
        success: true,
        activeSessions: mockActive,
        sessionHistory: mockHistory,
      })
    })

    it('throws error if fetching sessions fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(prisma.session.findMany).mockRejectedValueOnce(
        new Error('DB Error'),
      )

      await expect(
        getUserSessionsHandler({ data: { userId: 'user-123' } }),
      ).rejects.toThrow('Failed to fetch user sessions.')

      consoleSpy.mockRestore()
    })
  })

  describe('revokeSession', () => {
    it('validates input data correctly', () => {
      const input = { token: 'session-token-xyz' }
      expect(validateRevokeSession(input)).toEqual(input)
    })

    it('successfully revokes an active session and logs activity', async () => {
      const targetSession = {
        token: 'token-123',
        ipAddress: '192.168.1.5',
        userAgent: 'Mozilla/5.0',
        user: { email: 'target@resort.com' },
      }

      vi.mocked(authSession).mockResolvedValueOnce(mockAdminSession as any)
      vi.mocked(prisma.session.findUnique).mockResolvedValueOnce(
        targetSession as any,
      )
      vi.mocked(prisma.session.update).mockResolvedValueOnce({} as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await revokeSessionHandler({
        data: { token: 'token-123' },
      })

      expect(result).toEqual({
        success: true,
        message: 'Session revoked successfully.',
      })
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { token: 'token-123' },
        data: { expiresAt: expect.any(Date) },
      })
      expect(parseUserAgent).toHaveBeenCalledWith('Mozilla/5.0')
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SESSION_REVOKED',
          userId: 'admin-1',
          ipAddress: '192.168.1.5',
        }),
      )
    })

    it('throws error if session to revoke is not found', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authSession).mockResolvedValueOnce(mockAdminSession as any)
      vi.mocked(prisma.session.findUnique).mockResolvedValueOnce(null)

      await expect(
        revokeSessionHandler({ data: { token: 'missing-token' } }),
      ).rejects.toThrow('Failed to revoke session.')

      consoleSpy.mockRestore()
    })
  })
})
