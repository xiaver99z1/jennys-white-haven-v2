import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getGuestsListHandler,
  validateCreateGuest,
  createGuestHandler,
  validateUpdateGuest,
  updateGuestHandler,
  validateDeleteGuest,
  deleteGuestHandler,
  validateRestoreGuest,
  restoreGuestHandler,
} from './guest-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    guest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: vi.fn(),
}))

describe('guest-actions handlers and validators', () => {
  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@resort.com',
    role: 'OWNER',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authSession).mockResolvedValue({
      user: mockAdminUser,
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)
    vi.mocked(requirePermission).mockResolvedValue(mockAdminUser as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGuestsList', () => {
    it('successfully fetches guest list ordered by createdAt desc', async () => {
      const mockGuests = [
        {
          id: 'guest-1',
          firstName: 'Maria',
          lastName: 'Santos',
          phone: '+63 917 123 4567',
          email: 'maria@example.com',
        },
      ]
      vi.mocked(prisma.guest.findMany).mockResolvedValueOnce(mockGuests as any)

      const result = await getGuestsListHandler()

      expect(requirePermission).toHaveBeenCalledWith('view:guests')
      expect(prisma.guest.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockGuests)
    })
  })

  describe('createGuest', () => {
    const inputData = {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@example.com',
      phone: '+63 917 123 4567',
      idType: 'Passport',
      idNumber: 'P1234567',
      nationality: 'Filipino',
      specialNotes: 'VIP Guest',
    }

    it('validates input data correctly', () => {
      expect(validateCreateGuest(inputData)).toEqual(inputData)
    })

    it('successfully creates a guest with all fields and logs activity', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)
      vi.mocked(prisma.guest.create).mockResolvedValueOnce({
        id: 'guest-1',
        ...inputData,
      } as any)

      const result = await createGuestHandler({ data: inputData })

      expect(result.success).toBe(true)
      expect(result.guest.firstName).toBe('Maria')
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUEST_CREATED',
          userId: 'admin-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Vitest',
        }),
      )
    })

    it('successfully creates a guest without optional fields and handles null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.guest.create).mockResolvedValueOnce({
        id: 'guest-2',
        firstName: 'Juan',
        lastName: 'Cruz',
        email: null,
        phone: '09180001111',
        idType: null,
        idNumber: null,
        nationality: null,
        specialNotes: null,
      } as any)

      const result = await createGuestHandler({
        data: {
          firstName: 'Juan',
          lastName: 'Cruz',
          phone: '09180001111',
        },
      })

      expect(result.success).toBe(true)
      expect(prisma.guest.findUnique).not.toHaveBeenCalled()
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUEST_CREATED',
          ipAddress: null,
          userAgent: null,
          description: expect.stringContaining('Email: None'),
        }),
      )
    })

    it('throws error if guest email is already registered', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        id: 'existing-guest',
      } as any)

      await expect(createGuestHandler({ data: inputData })).rejects.toThrow(
        'Guest email "maria@example.com" is already registered.',
      )
    })
  })

  describe('updateGuest', () => {
    const existingGuest = {
      id: 'guest-1',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@example.com',
      phone: '+63 917 123 4567',
      idType: 'Passport',
      idNumber: 'P1234567',
      nationality: 'Filipino',
      specialNotes: 'Old note',
    }

    it('validates input data correctly', () => {
      const updateInput = { id: 'guest-1', firstName: 'Marie' }
      expect(validateUpdateGuest(updateInput)).toEqual(updateInput)
    })

    it('throws error if guest to update is not found', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)

      await expect(
        updateGuestHandler({ data: { id: 'missing', firstName: 'Test' } }),
      ).rejects.toThrow('Guest not found.')
    })

    it('throws error if updated email already belongs to another guest', async () => {
      vi.mocked(prisma.guest.findUnique)
        .mockResolvedValueOnce(existingGuest as any)
        .mockResolvedValueOnce({ id: 'other-guest' } as any)

      await expect(
        updateGuestHandler({
          data: { id: 'guest-1', email: 'taken@example.com' },
        }),
      ).rejects.toThrow(
        'Guest email "taken@example.com" is already registered.',
      )
    })

    it('calculates all field diffs when updating a guest', async () => {
      vi.mocked(prisma.guest.findUnique)
        .mockResolvedValueOnce(existingGuest as any)
        .mockResolvedValueOnce(null)
      vi.mocked(prisma.guest.update).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Marie',
        lastName: 'Reyes',
        email: 'marie@example.com',
        phone: '+63 999 888 7777',
        idType: 'National ID',
        idNumber: 'N999',
        nationality: 'American',
        specialNotes: 'New note',
      } as any)

      const result = await updateGuestHandler({
        data: {
          id: 'guest-1',
          firstName: 'Marie',
          lastName: 'Reyes',
          email: 'marie@example.com',
          phone: '+63 999 888 7777',
          idType: 'National ID',
          idNumber: 'N999',
          nationality: 'American',
          specialNotes: 'New note',
        },
      })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUEST_UPDATED',
          description: expect.stringContaining(
            'First Name: "Maria" → "Marie"',
          ),
        }),
      )
    })

    it('handles clearing optional fields to empty strings and transitions from null', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Maria',
        lastName: 'Santos',
        email: null,
        phone: '123',
        idType: null,
        idNumber: null,
        nationality: null,
        specialNotes: null,
      } as any)
      vi.mocked(prisma.guest.update).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Maria',
        lastName: 'Santos',
      } as any)

      await updateGuestHandler({
        data: {
          id: 'guest-1',
          email: 'added@example.com',
          idType: 'Passport',
          idNumber: 'P1',
          nationality: 'Canadian',
          specialNotes: 'VIP',
        },
      })

      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(
        existingGuest as any,
      )
      vi.mocked(prisma.guest.update).mockResolvedValueOnce(
        existingGuest as any,
      )

      await updateGuestHandler({
        data: {
          id: 'guest-1',
          email: '',
          idType: '',
          idNumber: '',
          nationality: '',
          specialNotes: '',
        },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(
            'Email: "maria@example.com" → "None"',
          ),
        }),
      )
    })

    it('logs "No field changes" when no fields are modified and handles null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(
        existingGuest as any,
      )
      vi.mocked(prisma.guest.update).mockResolvedValueOnce(
        existingGuest as any,
      )

      const result = await updateGuestHandler({
        data: { id: 'guest-1' },
      })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'GUEST_UPDATED',
        description: 'Updated Guest Maria Santos. No field changes',
        ipAddress: null,
        userAgent: null,
      })
    })
  })

  describe('deleteGuest and restoreGuest', () => {
    it('validates delete and restore input data', () => {
      expect(validateDeleteGuest({ id: 'guest-1' })).toEqual({ id: 'guest-1' })
      expect(validateRestoreGuest({ id: 'guest-1' })).toEqual({ id: 'guest-1' })
    })

    it('successfully soft deletes a guest and handles null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '12345',
      } as any)
      vi.mocked(prisma.guest.update).mockResolvedValueOnce({} as any)

      const result = await deleteGuestHandler({ data: { id: 'guest-1' } })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'GUEST_DELETED',
        description: 'Soft deleted (archived) Guest Maria Santos (12345)',
        ipAddress: null,
        userAgent: null,
      })
    })

    it('throws error if guest to delete is not found', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)

      await expect(
        deleteGuestHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Guest not found.')
    })

    it('successfully restores an archived guest and handles null session metadata', async () => {
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdminUser,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '12345',
      } as any)
      vi.mocked(prisma.guest.update).mockResolvedValueOnce({
        id: 'guest-1',
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '12345',
        deletedAt: null,
      } as any)

      const result = await restoreGuestHandler({ data: { id: 'guest-1' } })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'GUEST_RESTORED',
        description: 'Restored archived Guest Maria Santos (12345)',
        ipAddress: null,
        userAgent: null,
      })
    })

    it('throws error if guest to restore is not found', async () => {
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)

      await expect(
        restoreGuestHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Guest not found.')
    })
  })
})
