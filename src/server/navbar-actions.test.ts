import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAdminNotificationsHandler,
  globalAdminSearchHandler,
  validateGlobalSearch,
} from './navbar-actions'

const {
  mockAuthSession,
  mockBookingFindMany,
  mockGuestFindMany,
  mockRoomFindMany,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockBookingFindMany: vi.fn(),
  mockGuestFindMany: vi.fn(),
  mockRoomFindMany: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    booking: { findMany: mockBookingFindMany },
    guest: { findMany: mockGuestFindMany },
    room: { findMany: mockRoomFindMany },
  },
}))

describe('navbar-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthSession.mockResolvedValue({ user: { id: 'u1', role: 'owner' } })
  })

  it('returns empty search results when query is shorter than 2 characters', async () => {
    expect(validateGlobalSearch({ query: 'ab' })).toEqual({ query: 'ab' })
    const res = await globalAdminSearchHandler({ data: { query: 'a' } })
    expect(res).toEqual({ bookings: [], guests: [], rooms: [] })
    expect(mockBookingFindMany).not.toHaveBeenCalled()
  })

  it('searches bookings, guests, and rooms', async () => {
    mockBookingFindMany.mockResolvedValue([
      {
        id: 'b1',
        bookingReference: 'JWH-123',
        status: 'CONFIRMED',
        guest: { firstName: 'Maria', lastName: 'Santos' },
        room: { roomNumber: '101', name: 'Ocean Suite' },
      },
    ])
    mockGuestFindMany.mockResolvedValue([
      {
        id: 'g1',
        firstName: 'Maria',
        lastName: 'Santos',
        phone: '0917',
        email: 'maria@example.com',
      },
    ])
    mockRoomFindMany.mockResolvedValue([
      {
        id: 'r1',
        roomNumber: '101',
        name: 'Ocean Suite',
        type: 'Suite',
        status: 'AVAILABLE',
      },
    ])

    const res = await globalAdminSearchHandler({ data: { query: 'Maria' } })
    expect(res.bookings).toHaveLength(1)
    expect(res.bookings[0].guestName).toBe('Maria Santos')
    expect(res.guests[0].name).toBe('Maria Santos')
    expect(res.rooms[0].roomNumber).toBe('101')
  })

  it('aggregates arrivals, departures, and outstanding balances into notifications', async () => {
    mockBookingFindMany
      .mockResolvedValueOnce([
        {
          id: 'a1',
          bookingReference: 'JWH-A1',
          guest: { firstName: 'Ana', lastName: 'Cruz' },
          room: { roomNumber: '101' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'd1',
          bookingReference: 'JWH-D1',
          guest: { firstName: 'Ben', lastName: 'Lim' },
          room: { roomNumber: '102' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'p1',
          bookingReference: 'JWH-P1',
          totalAmount: '3000',
          amountPaid: '1000',
          guest: { firstName: 'Cara', lastName: 'Reyes' },
          room: { roomNumber: '103' },
        },
      ])

    const res = await getAdminNotificationsHandler()
    expect(res.totalCount).toBe(3)
    expect(res.items[0].type).toBe('arrival')
    expect(res.items[1].type).toBe('departure')
    expect(res.items[2].title).toBe('Balance Due: ₱2,000')
  })
})
