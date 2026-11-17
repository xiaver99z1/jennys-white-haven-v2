import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type * as R2Module from '#/lib/r2'
import {
  validateProfileActivity,
  logProfileActivityHandler,
  validateSaveProfileAvatar,
  saveProfileAvatarHandler,
} from './profile-actions'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { prisma } from '#/lib/prisma'

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/prisma', () => {
  const client = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    media: {
      upsert: vi.fn(),
    },
  }
  return {
    prisma: {
      ...client,
      $transaction: vi.fn((cb: (tx: typeof client) => unknown) => cb(client)),
    },
  }
})

vi.mock('#/lib/r2', async (importOriginal) => {
  const actual = await importOriginal<typeof R2Module>()
  return {
    ...actual,
    putR2Object: vi.fn().mockResolvedValue(true),
  }
})

vi.mock('#/server/upload', () => ({
  deleteSingleR2Media: vi.fn().mockResolvedValue(undefined),
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

  describe('saveProfileAvatar', () => {
    it('validates input and links Media + User.profileMediaId on save', async () => {
      expect(
        validateSaveProfileAvatar({ image: 'avatars/test.webp' }),
      ).toEqual({ image: 'avatars/test.webp' })

      vi.mocked(authSession).mockResolvedValueOnce(mockUserSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        image: '/api/media/view?key=avatars/old.webp',
        profileMediaId: 'm-old',
      } as any)
      vi.mocked(prisma.media.upsert).mockResolvedValueOnce({
        id: 'm-new',
        objectKey: 'avatars/new.webp',
      } as any)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any)

      const res = await saveProfileAvatarHandler({
        data: { image: '/api/media/view?key=avatars/new.webp' },
      })

      expect(res.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            profileMediaId: 'm-new',
          }),
        }),
      )
    })
  })
})

