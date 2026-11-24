import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPublicRoomsHandler,
  getPublicRoomByIdHandler,
  createPublicBookingHandler,
  lookupPublicBookingHandler,
  validatePublicRoomsSearch,
  validatePublicRoomId,
  validateCreatePublicBooking,
  validateLookupBooking,
} from './public-actions'

const {
  mockRoomFindMany,
  mockRoomFindFirst,
  mockBookingFindMany,
  mockBookingFindFirst,
  mockTransaction,
  mockCreateNotification,
} = vi.hoisted(() => ({
  mockRoomFindMany: vi.fn(),
  mockRoomFindFirst: vi.fn(),
  mockBookingFindMany: vi.fn(),
  mockBookingFindFirst: vi.fn(),
  mockTransaction: vi.fn(),
  mockCreateNotification: vi.fn(),
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    room: {
      findMany: mockRoomFindMany,
      findFirst: mockRoomFindFirst,
    },
    booking: {
      findMany: mockBookingFindMany,
      findFirst: mockBookingFindFirst,
    },
    $transaction: mockTransaction,
  },
}))

vi.mock('#/server/notification-actions', () => ({
  createNotification: mockCreateNotification,
}))

describe('public-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters out rooms with overlapping bookings and enforces Whole House mutual exclusivity', async () => {
    // 1. Individual room r1 is booked -> r1 AND Whole House (r-wh) are hidden, r2 remains available
    mockBookingFindMany.mockResolvedValueOnce([
      { roomId: 'r1', room: { type: 'Deluxe' } },
    ])
    mockRoomFindMany.mockResolvedValueOnce([
      {
        id: 'r1',
        roomNumber: '101',
        name: 'Booked Room',
        type: 'Deluxe',
        description: null,
        capacity: 2,
        pricePerNight: 3500,
        amenities: ['WiFi'],
        images: [],
        status: 'AVAILABLE',
      },
      {
        id: 'r2',
        roomNumber: '102',
        name: 'Open Deluxe',
        type: 'Deluxe',
        description: 'Ocean view',
        capacity: 4,
        pricePerNight: 5500,
        amenities: ['WiFi', 'AC'],
        images: ['https://example.com/r2.jpg'],
        status: 'AVAILABLE',
      },
      {
        id: 'r-wh',
        roomNumber: 'WH-01',
        name: 'Whole House Exclusive',
        type: 'Whole House',
        description: 'Entire house',
        capacity: 12,
        pricePerNight: 15000,
        amenities: ['WiFi', 'AC'],
        images: [],
        status: 'AVAILABLE',
      },
    ])

    const search = validatePublicRoomsSearch({
      checkIn: '2026-06-10',
      checkOut: '2026-06-12',
      guests: 2,
    })

    const rooms = await getPublicRoomsHandler({ data: search })
    expect(rooms).toHaveLength(1)
    expect(rooms[0].id).toBe('r2')

    // 2. Whole House is booked -> ALL rooms are hidden for those dates
    mockBookingFindMany.mockResolvedValueOnce([
      { roomId: 'r-wh', room: { type: 'Whole House' } },
    ])
    const noRooms = await getPublicRoomsHandler({ data: search })
    expect(noRooms).toEqual([])
  })

  it('returns room by id or null', async () => {
    mockRoomFindFirst.mockResolvedValueOnce({
      id: 'r2',
      roomNumber: '102',
      name: 'Open Suite',
      type: 'SUITE',
      description: 'Ocean view',
      capacity: 4,
      pricePerNight: 5500,
      amenities: [],
      images: [],
      status: 'AVAILABLE',
    })

    const found = await getPublicRoomByIdHandler({
      data: validatePublicRoomId({ id: 'r2' }),
    })
    expect(found?.name).toBe('Open Suite')

    mockRoomFindFirst.mockResolvedValueOnce(null)
    const missing = await getPublicRoomByIdHandler({ data: { id: 'missing' } })
    expect(missing).toBeNull()
  })

  it('creates a public pending booking and notifies staff', async () => {
    const tx = {
      room: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r2',
          roomNumber: '102',
          capacity: 4,
          pricePerNight: 5000,
          deletedAt: null,
          status: 'AVAILABLE',
        }),
      },
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'b1',
          bookingReference: 'JWH-123456',
        }),
      },
      guest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'g1' }),
      },
    }

    mockTransaction.mockImplementation(async (cb: (t: typeof tx) => unknown) =>
      cb(tx),
    )

    const input = validateCreatePublicBooking({
      roomId: 'r2',
      checkIn: '2026-06-10',
      checkOut: '2026-06-12',
      guestsCount: 2,
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '+639171234567',
      email: 'maria@example.com',
    })

    const res = await createPublicBookingHandler({ data: input })

    expect(res.success).toBe(true)
    expect(res.bookingReference).toBe('JWH-123456')
    expect(res.nights).toBe(2)
    expect(res.totalAmount).toBe(10000)
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BOOKING_CREATED' }),
    )
  })

  it('rejects public booking when dates are invalid or room overlaps', async () => {
    await expect(
      createPublicBookingHandler({
        data: {
          roomId: 'r2',
          checkIn: 'bad-date',
          checkOut: '2026-06-12',
          guestsCount: 2,
          firstName: 'Maria',
          lastName: 'Santos',
          phone: '+639171234567',
        },
      }),
    ).rejects.toThrow('Please provide valid check-in and check-out dates.')

    const txOverlap = {
      room: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r2',
          roomNumber: '102',
          capacity: 4,
          pricePerNight: 5000,
          deletedAt: null,
          status: 'AVAILABLE',
        }),
      },
      booking: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing' }),
      },
    }
    mockTransaction.mockImplementationOnce(
      async (cb: (t: typeof txOverlap) => unknown) => cb(txOverlap),
    )

    await expect(
      createPublicBookingHandler({
        data: {
          roomId: 'r2',
          checkIn: '2026-06-10',
          checkOut: '2026-06-12',
          guestsCount: 2,
          firstName: 'Maria',
          lastName: 'Santos',
          phone: '+639171234567',
        },
      }),
    ).rejects.toThrow('already reserved')

    const txMismatchEmail = {
      room: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r2',
          roomNumber: '102',
          capacity: 4,
          pricePerNight: 5000,
          deletedAt: null,
          status: 'AVAILABLE',
        }),
      },
      booking: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      guest: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'g-other',
          firstName: 'Juan',
          lastName: 'Cruz',
          phone: '+639999999999',
          deletedAt: null,
        }),
      },
    }
    mockTransaction.mockImplementationOnce(
      async (cb: (t: typeof txMismatchEmail) => unknown) => cb(txMismatchEmail),
    )

    await expect(
      createPublicBookingHandler({
        data: {
          roomId: 'r2',
          checkIn: '2026-06-10',
          checkOut: '2026-06-12',
          guestsCount: 2,
          firstName: 'Maria',
          lastName: 'Santos',
          phone: '+639171234567',
          email: 'juan@example.com',
        },
      }),
    ).rejects.toThrow('already exists with different details')
  })

  it('looks up public booking only when reference and contact match', async () => {
    mockBookingFindFirst.mockResolvedValue({
      bookingReference: 'JWH-123456',
      status: 'CONFIRMED',
      paymentStatus: 'PARTIAL',
      checkIn: new Date('2026-06-10T14:00:00+08:00'),
      checkOut: new Date('2026-06-12T12:00:00+08:00'),
      nights: 2,
      guestsCount: 2,
      totalAmount: 10000,
      amountPaid: 5000,
      room: { name: 'Ocean Villa', roomNumber: '101' },
      guest: {
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '+639171234567',
        email: 'Maria@Example.com',
      },
    })

    const matched = await lookupPublicBookingHandler({
      data: validateLookupBooking({
        bookingReference: 'jwh-123456',
        contact: 'maria@example.com',
      }),
    })

    expect(matched?.bookingReference).toBe('JWH-123456')
    expect(matched?.guestName).toBe('Maria Santos')
    expect(matched?.totalAmount).toBe(10000)

    const mismatch = await lookupPublicBookingHandler({
      data: {
        bookingReference: 'JWH-123456',
        contact: 'wrong@example.com',
      },
    })
    expect(mismatch).toBeNull()
  })
})
