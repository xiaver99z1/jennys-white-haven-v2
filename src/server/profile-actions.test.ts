import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateProfileActivity,
  logProfileActivityHandler,
} from './profile-actions'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

describe('profile-actions handlers and validators', () => {
  const mockUserSession = {
    user: { id: 'user-1', email: 'user@resort.com' },
    session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logProfileActivity', () => {
    it('validates input data correctly', () => {
      const input = {
        action: 'PROFILE_UPDATED' as const,
        description: 'Updated profile name',
      }
      expect(validateProfileActivity(input)).toEqual(input)
    })

    it('successfully logs profile activity when session exists', async () => {
      vi.mocked(authSession).mockResolvedValueOnce(mockUserSession as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logProfileActivityHandler({
        data: {
          action: 'AVATAR_UPDATED',
          description: 'Updated user avatar',
        },
      })

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'AVATAR_UPDATED',
        description: 'Updated user avatar',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      })
    })

    it('falls back to null when session ipAddress and userAgent are missing', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: { id: 'user-1', email: 'user@resort.com' },
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(logActivity).mockResolvedValueOnce({} as any)

      const result = await logProfileActivityHandler({
        data: {
          action: 'PROFILE_UPDATED',
          description: 'Updated profile name',
        },
      })

      expect(result).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'PROFILE_UPDATED',
        description: 'Updated profile name',
        ipAddress: null,
        userAgent: null,
      })
    })

    it('handles errors gracefully and returns success: false if session or logging fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authSession).mockRejectedValueOnce(new Error('Unauthorized'))

      const result = await logProfileActivityHandler({
        data: {
          action: 'PASSWORD_UPDATED',
          description: 'Changed password',
        },
      })

      expect(result).toEqual({ success: false, error: 'Unauthorized' })
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})

