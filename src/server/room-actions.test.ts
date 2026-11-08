import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getRoomsListHandler,
  validateCreateRoom,
  createRoomHandler,
  validateUpdateRoom,
  updateRoomHandler,
  validateDeleteRoom,
  deleteRoomHandler,
  validateRestoreRoom,
  restoreRoomHandler,
  getImageNames,
} from './room-actions'
import { prisma } from '#/lib/prisma'
import { hasPermission } from '#/lib/permissions'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    room: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('#/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

vi.mock('#/lib/logger', () => ({
  logActivity: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

describe('room-actions handlers and validators', () => {
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
    vi.mocked(hasPermission).mockReturnValue(true)
  })

  describe('getImageNames utility', () => {
    it('returns empty array for empty or undefined images', () => {
      expect(getImageNames(undefined)).toEqual([])
      expect(getImageNames([])).toEqual([])
    })

    it('extracts base64 data names and URL filenames correctly', () => {
      const images = [
        'data:image/png;base64,iVBORw0KGgo=',
        'data:;base64,iVBORw0KGgo=',
        'https://example.com/uploads/room-pic.jpg',
        'https://example.com/trailing-slash/',
      ]
      expect(getImageNames(images)).toEqual([
        'Uploaded_Image_1.png',
        'Uploaded_Image_2.png',
        'room-pic.jpg',
        'Image_4',
      ])
    })
  })

  describe('getRoomsList', () => {
    it('successfully fetches and formats room list', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          roomNumber: '101',
          name: 'Deluxe Suite',
          pricePerNight: 5000,
          amenities: ['WiFi'],
          images: [],
        },
      ]
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce(mockRooms as any)

      const result = await getRoomsListHandler()

      expect(result).toEqual([
        {
          id: 'room-1',
          roomNumber: '101',
          name: 'Deluxe Suite',
          pricePerNight: 5000,
          amenities: ['WiFi'],
          images: [],
        },
      ])
    })

    it('throws error if user lacks view permission', async () => {
      vi.mocked(hasPermission).mockReturnValueOnce(false)

      await expect(getRoomsListHandler()).rejects.toThrow(
        'Unauthorized: Insufficient permissions.',
      )
    })
  })

  describe('createRoom', () => {
    const inputData = {
      roomNumber: '102',
      name: 'Executive Suite',
      type: 'SUITE',
      capacity: 2,
      pricePerNight: 7500,
      amenities: ['AC', 'WiFi'],
      images: ['https://example.com/img.jpg'],
    }

    it('validates input data correctly', () => {
      expect(validateCreateRoom(inputData)).toEqual(inputData)
    })

    it('successfully creates a room and logs activity', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)
      vi.mocked(prisma.room.create).mockResolvedValueOnce({
        id: 'room-2',
        ...inputData,
        description: null,
      } as any)

      const result = await createRoomHandler({ data: inputData })

      expect(result.success).toBe(true)
      expect(result.room.pricePerNight).toBe(7500)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROOM_CREATED', userId: 'admin-1' }),
      )
    })

    it('throws error if room number already exists', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        id: 'existing',
      } as any)

      await expect(createRoomHandler({ data: inputData })).rejects.toThrow(
        `Room number "${inputData.roomNumber}" already exists.`,
      )
    })
  })

  describe('updateRoom', () => {
    const existingRoomWithDetails = {
      id: 'room-1',
      roomNumber: '101',
      name: 'Standard Room',
      type: 'STANDARD',
      description: 'Old Description',
      capacity: 2,
      pricePerNight: 3000,
      status: 'AVAILABLE',
      amenities: ['WiFi', 'AC'],
      images: ['img1.jpg', 'img2.jpg'],
    }

    it('validates input data correctly', () => {
      const updateData = { id: 'room-1', name: 'Updated Name' }
      expect(validateUpdateRoom(updateData)).toEqual(updateData)
    })

    it('successfully calculates all field, amenity, and image diffs when updating a room', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(
        existingRoomWithDetails as any,
      )
      vi.mocked(prisma.room.update).mockResolvedValueOnce({
        ...existingRoomWithDetails,
        roomNumber: '102',
        name: 'Updated Name',
        type: 'SUITE',
        status: 'MAINTENANCE',
        capacity: 4,
        pricePerNight: 3500,
        description: 'New Description',
        amenities: ['WiFi', 'Pool Access'],
        images: ['img1.jpg', 'img3.jpg'],
      } as any)

      const result = await updateRoomHandler({
        data: {
          id: 'room-1',
          roomNumber: '102',
          name: 'Updated Name',
          type: 'SUITE',
          status: 'MAINTENANCE' as any,
          capacity: 4,
          pricePerNight: 3500,
          description: 'New Description',
          amenities: ['WiFi', 'Pool Access'],
          images: ['img1.jpg', 'img3.jpg'],
        },
      })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROOM_UPDATED',
          description: expect.stringContaining('Removed Amenities: [AC]'),
        }),
      )
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Removed Images: [img2.jpg]'),
        }),
      )
    })

    it('logs "No field changes" when updated values match existing values', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        ...existingRoomWithDetails,
        description: null,
      } as any)
      vi.mocked(prisma.room.update).mockResolvedValueOnce(
        existingRoomWithDetails as any,
      )

      const result = await updateRoomHandler({
        data: {
          id: 'room-1',
          description: '',
          amenities: ['WiFi', 'AC'],
          images: ['img1.jpg', 'img2.jpg'],
        },
      })

      expect(result.success).toBe(true)
    })

    it('throws error if room to update is not found', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)

      await expect(
        updateRoomHandler({ data: { id: 'missing', name: 'Test' } }),
      ).rejects.toThrow('Room not found.')
    })
  })

  describe('deleteRoom and restoreRoom', () => {
    it('validates delete and restore input data', () => {
      expect(validateDeleteRoom({ id: 'room-1' })).toEqual({ id: 'room-1' })
      expect(validateRestoreRoom({ id: 'room-1' })).toEqual({ id: 'room-1' })
    })

    it('successfully soft deletes a room', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        id: 'room-1',
        roomNumber: '101',
        name: 'Standard',
      } as any)
      vi.mocked(prisma.room.update).mockResolvedValueOnce({} as any)

      const result = await deleteRoomHandler({ data: { id: 'room-1' } })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROOM_DELETED' }),
      )
    })

    it('throws error if room to delete is not found', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)

      await expect(
        deleteRoomHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Room not found.')
    })

    it('successfully restores an archived room', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        id: 'room-1',
        roomNumber: '101',
        name: 'Standard',
        pricePerNight: 4000,
      } as any)
      vi.mocked(prisma.room.update).mockResolvedValueOnce({
        id: 'room-1',
        roomNumber: '101',
        name: 'Standard',
        pricePerNight: 4000,
        deletedAt: null,
      } as any)

      const result = await restoreRoomHandler({ data: { id: 'room-1' } })

      expect(result.success).toBe(true)
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROOM_RESTORED' }),
      )
    })

    it('throws error if room to restore is not found', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)

      await expect(
        restoreRoomHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Room not found.')
    })
  })
})
