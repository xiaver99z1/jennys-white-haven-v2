import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateNights,
  generateBookingReference,
  getBookingsListHandler,
  validateCreateBooking,
  createBookingHandler,
  validateUpdateBooking,
  updateBookingHandler,
  validateBookingId,
  deleteBookingHandler,
  restoreBookingHandler,
} from './booking-actions'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    guest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

describe('booking-actions', () => {
  const mockAdmin = { id: 'admin-1', name: 'Admin', role: 'OWNER' }
  const mockRoom = {
    id: 'room-1',
    roomNumber: '101',
    name: 'Ocean Suite',
    type: 'Suite',
    capacity: 4,
    pricePerNight: 4500,
    status: 'AVAILABLE',
    deletedAt: null,
  }
  const mockGuest = {
    id: 'guest-1',
    firstName: 'Maria',
    lastName: 'Santos',
    phone: '09171234567',
    deletedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authSession).mockResolvedValue({
      user: mockAdmin,
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)
    vi.mocked(requirePermission).mockResolvedValue(mockAdmin as any)
  })

  describe('helpers and validators', () => {
    it('calculates nights and validates invalid or reversed dates', () => {
      expect(calculateNights('2026-11-10', '2026-11-13')).toBe(3)
      expect(() => calculateNights('invalid', '2026-11-13')).toThrow(
        'Invalid check-in or check-out date.',
      )
      expect(() => calculateNights('2026-11-13', '2026-11-10')).toThrow(
        'Check-out date must be after check-in date.',
      )
      expect(() => calculateNights('2026-11-10', '2026-11-10')).toThrow(
        'Check-out date must be after check-in date.',
      )
    })

    it('generates booking reference with custom and default suffix', () => {
      const ref1 = generateBookingReference(
        new Date('2026-11-12T00:00:00Z'),
        'ABCD',
      )
      expect(ref1).toBe('JWH-20261112-ABCD')

      const ref2 = generateBookingReference()
      expect(ref2).toMatch(/^JWH-\d{8}-[A-Z0-9]{4}$/)
    })

    it('validates create, update, and id inputs', () => {
      const createData = {
        roomId: 'r1',
        guestId: 'g1',
        checkIn: '2026-11-12',
        checkOut: '2026-11-14',
        guestsCount: 2,
      }
      expect(validateCreateBooking(createData)).toEqual(createData)

      const updateData = {
        id: 'b1',
        roomId: 'r1',
        guestId: 'g1',
        checkIn: '2026-11-12',
        checkOut: '2026-11-14',
        guestsCount: 2,
        totalAmount: 9000,
        amountPaid: 4500,
        paymentStatus: 'PARTIAL' as const,
        status: 'CONFIRMED' as const,
      }
      expect(validateUpdateBooking(updateData)).toEqual(updateData)
      expect(validateBookingId({ id: 'b1' })).toEqual({ id: 'b1' })
    })
  })

  describe('getBookingsListHandler', () => {
    it('fetches bookings, active rooms, and active guests and normalizes Decimals', async () => {
      vi.mocked(prisma.booking.findMany).mockResolvedValueOnce([
        {
          id: 'b-1',
          bookingReference: 'JWH-20261112-1234',
          totalAmount: '9000.00',
          amountPaid: '4500.00',
          room: { ...mockRoom, pricePerNight: '4500.00' },
          guest: mockGuest,
        },
      ] as any)
      vi.mocked(prisma.room.findMany).mockResolvedValueOnce([
        { ...mockRoom, pricePerNight: '4500.00' },
      ] as any)
      vi.mocked(prisma.guest.findMany).mockResolvedValueOnce([
        mockGuest,
      ] as any)

      const res = await getBookingsListHandler()

      expect(requirePermission).toHaveBeenCalledWith('view:bookings')
      expect(res.bookings[0].totalAmount).toBe(9000)
      expect(res.bookings[0].amountPaid).toBe(4500)
      expect(res.bookings[0].room.pricePerNight).toBe(4500)
      expect(res.rooms[0].pricePerNight).toBe(4500)
      expect(res.guests).toHaveLength(1)
    })
  })

  describe('createBookingHandler', () => {
    it('throws when room is missing or deleted, guest is missing or deleted, capacity exceeded, or dates overlap', async () => {
      const baseData = {
        roomId: 'room-1',
        guestId: 'guest-1',
        checkIn: '2026-11-12',
        checkOut: '2026-11-14',
        guestsCount: 2,
      }

      // 1. Room missing
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)
      await expect(createBookingHandler({ data: baseData })).rejects.toThrow(
        'Selected room is not available.',
      )

      // 2. Room soft-deleted
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        ...mockRoom,
        deletedAt: new Date(),
      } as any)
      await expect(createBookingHandler({ data: baseData })).rejects.toThrow(
        'Selected room is not available.',
      )

      // 3. Guest missing
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)
      await expect(createBookingHandler({ data: baseData })).rejects.toThrow(
        'Selected guest was not found.',
      )

      // 4. Guest soft-deleted
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        ...mockGuest,
        deletedAt: new Date(),
      } as any)
      await expect(createBookingHandler({ data: baseData })).rejects.toThrow(
        'Selected guest was not found.',
      )

      // 5. Capacity exceeded
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      await expect(
        createBookingHandler({ data: { ...baseData, guestsCount: 6 } }),
      ).rejects.toThrow('Room 101 has a maximum capacity of 4 guests.')

      // 6. Overlapping booking
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({
        id: 'existing-b',
        bookingReference: 'JWH-20261112-OVER',
      } as any)
      await expect(createBookingHandler({ data: baseData })).rejects.toThrow(
        'Room 101 is already booked for the selected dates (JWH-20261112-OVER).',
      )
    })

    it('creates booking with default and explicit fields, and syncs room status when CHECKED_IN', async () => {
      // Case A: Defaults + status CHECKED_IN
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.booking.create).mockResolvedValueOnce({
        id: 'b-new',
        bookingReference: 'JWH-20261112-NEW1',
        totalAmount: 9000,
        amountPaid: 0,
      } as any)

      const resA = await createBookingHandler({
        data: {
          roomId: 'room-1',
          guestId: 'guest-1',
          checkIn: '2026-11-12',
          checkOut: '2026-11-14',
          guestsCount: 2,
          status: 'CHECKED_IN',
        },
      })

      expect(resA.success).toBe(true)
      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'OCCUPIED' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'BOOKING_CREATED',
          description: expect.stringContaining(
            'Created booking JWH-20261112-NEW1',
          ),
        }),
      )

      // Case B: Explicit totalAmount, amountPaid, paymentMethod, specialRequests, and null ipAddress/userAgent
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.create).mockResolvedValueOnce({
        id: 'b-new-2',
        bookingReference: 'JWH-20261112-NEW2',
        totalAmount: 8000,
        amountPaid: 4000,
      } as any)

      const resB = await createBookingHandler({
        data: {
          roomId: 'room-1',
          guestId: 'guest-1',
          checkIn: '2026-11-15',
          checkOut: '2026-11-17',
          guestsCount: 2,
          totalAmount: 8000,
          amountPaid: 4000,
          paymentStatus: 'PARTIAL',
          paymentMethod: 'GCASH',
          specialRequests: 'Late arrival',
        },
      })

      expect(resB.booking.totalAmount).toBe(8000)

      // Case C: CANCELLED status on create skips overlap check
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.create).mockResolvedValueOnce({
        id: 'b-new-3',
        bookingReference: 'JWH-20261112-NEW3',
        totalAmount: 4500,
        amountPaid: 0,
      } as any)

      await createBookingHandler({
        data: {
          roomId: 'room-1',
          guestId: 'guest-1',
          checkIn: '2026-11-15',
          checkOut: '2026-11-16',
          guestsCount: 2,
          status: 'CANCELLED',
        },
      })
    })
  })

  describe('updateBookingHandler', () => {
    const existingBooking = {
      id: 'b-1',
      bookingReference: 'JWH-20261112-B001',
      roomId: 'room-1',
      guestId: 'guest-1',
      checkIn: new Date('2026-11-12'),
      checkOut: new Date('2026-11-14'),
      nights: 2,
      guestsCount: 2,
      totalAmount: 9000,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      paymentMethod: null,
      status: 'PENDING',
      specialRequests: null,
      room: mockRoom,
      guest: mockGuest,
    }

    const baseUpdate = {
      id: 'b-1',
      roomId: 'room-1',
      guestId: 'guest-1',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      guestsCount: 2,
      totalAmount: 9000,
      amountPaid: 0,
      paymentStatus: 'UNPAID' as const,
      status: 'PENDING' as const,
    }

    it('throws when booking, room, guest are missing, capacity exceeded, or dates overlap', async () => {
      // 1. Booking not found
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(null)
      await expect(updateBookingHandler({ data: baseUpdate })).rejects.toThrow(
        'Booking not found.',
      )

      // 2. Room not available
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        existingBooking as any,
      )
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null)
      await expect(updateBookingHandler({ data: baseUpdate })).rejects.toThrow(
        'Selected room is not available.',
      )

      // 3. Guest not found
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        existingBooking as any,
      )
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(null)
      await expect(updateBookingHandler({ data: baseUpdate })).rejects.toThrow(
        'Selected guest was not found.',
      )

      // 4. Capacity exceeded
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        existingBooking as any,
      )
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      await expect(
        updateBookingHandler({ data: { ...baseUpdate, guestsCount: 10 } }),
      ).rejects.toThrow('Room 101 has a maximum capacity of 4 guests.')

      // 5. Overlap
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        existingBooking as any,
      )
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({
        bookingReference: 'JWH-20261112-CONF',
      } as any)
      await expect(updateBookingHandler({ data: baseUpdate })).rejects.toThrow(
        'Room 101 is already booked for the selected dates (JWH-20261112-CONF).',
      )
    })

    it('logs all field changes and syncs room status for CHECKED_IN and CHECKED_OUT', async () => {
      // 1. Update all fields + status CHECKED_IN
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(
        existingBooking as any,
      )
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
        ...mockRoom,
        id: 'room-2',
        roomNumber: '102',
      } as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce({
        ...mockGuest,
        id: 'guest-2',
        firstName: 'Juan',
        lastName: 'Cruz',
      } as any)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.booking.update).mockResolvedValueOnce({
        ...existingBooking,
        totalAmount: 13500,
        amountPaid: 5000,
      } as any)

      await updateBookingHandler({
        data: {
          id: 'b-1',
          roomId: 'room-2',
          guestId: 'guest-2',
          checkIn: '2026-11-12',
          checkOut: '2026-11-15',
          guestsCount: 3,
          totalAmount: 13500,
          amountPaid: 5000,
          paymentStatus: 'PARTIAL',
          paymentMethod: 'CASH',
          status: 'CHECKED_IN',
          specialRequests: 'Sea view',
        },
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-2' },
        data: { status: 'OCCUPIED' },
      })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'BOOKING_UPDATED',
          description: expect.stringContaining('Room: "101" → "102"'),
        }),
      )

      // 2. Update to CHECKED_OUT (syncs room to CLEANING) and clear paymentMethod/specialRequests back to null
      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce({
        ...existingBooking,
        paymentMethod: 'CASH',
        specialRequests: 'Sea view',
        status: 'CHECKED_IN',
      } as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.update).mockResolvedValueOnce({
        ...existingBooking,
        totalAmount: 9000,
        amountPaid: 0,
      } as any)

      await updateBookingHandler({
        data: {
          ...baseUpdate,
          status: 'CHECKED_OUT',
          paymentMethod: '',
          specialRequests: '',
        },
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'CLEANING' },
      })

      // 3. No field changes & already CHECKED_OUT
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce({
        ...existingBooking,
        status: 'CHECKED_OUT',
      } as any)
      vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(mockRoom as any)
      vi.mocked(prisma.guest.findUnique).mockResolvedValueOnce(mockGuest as any)
      vi.mocked(prisma.booking.update).mockResolvedValueOnce({
        ...existingBooking,
        totalAmount: 9000,
        amountPaid: 0,
      } as any)

      await updateBookingHandler({
        data: {
          ...baseUpdate,
          status: 'CHECKED_OUT',
        },
      })

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'BOOKING_UPDATED',
          description:
            'Saved booking JWH-20261112-B001 with no field changes.',
        }),
      )
    })
  })

  describe('deleteBookingHandler and restoreBookingHandler', () => {
    it('throws when booking is not found and soft-deletes / restores when found', async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(null)
      await expect(
        deleteBookingHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce({
        id: 'b-1',
        bookingReference: 'JWH-20261112-B001',
        room: mockRoom,
        guest: mockGuest,
      } as any)
      vi.mocked(prisma.booking.update).mockResolvedValueOnce({} as any)

      const delRes = await deleteBookingHandler({ data: { id: 'b-1' } })
      expect(delRes).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'BOOKING_DELETED',
          description: expect.stringContaining(
            'Archived booking JWH-20261112-B001',
          ),
        }),
      )

      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce(null)
      await expect(
        restoreBookingHandler({ data: { id: 'missing' } }),
      ).rejects.toThrow('Booking not found.')

      vi.mocked(authSession).mockResolvedValueOnce({
        user: mockAdmin,
        session: { ipAddress: null, userAgent: null },
      } as any)
      vi.mocked(prisma.booking.findUnique).mockResolvedValueOnce({
        id: 'b-1',
        bookingReference: 'JWH-20261112-B001',
        room: mockRoom,
        guest: mockGuest,
      } as any)
      vi.mocked(prisma.booking.update).mockResolvedValueOnce({} as any)

      const resRes = await restoreBookingHandler({ data: { id: 'b-1' } })
      expect(resRes).toEqual({ success: true })
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'BOOKING_RESTORED',
          description: expect.stringContaining(
            'Restored booking JWH-20261112-B001',
          ),
        }),
      )
    })
  })
})
