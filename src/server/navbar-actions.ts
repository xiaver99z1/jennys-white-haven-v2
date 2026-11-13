import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import { getResortDayRange } from '#/server/dashboard-actions'
import { formatFullName, formatPeso } from '#/lib/formatters'
import type {
  AdminNotificationItem,
  AdminNotificationsData,
  GlobalSearchResults,
} from '#/types'

export async function globalAdminSearchHandler({
  data,
}: {
  data: { query: string }
}): Promise<GlobalSearchResults> {
  await authSession()

  const q = data.query.trim()
  if (q.length < 2) {
    return { bookings: [], guests: [], rooms: [] }
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const guestNameFilter = {
    AND: tokens.map((token) => ({
      OR: [
        { firstName: { contains: token, mode: 'insensitive' as const } },
        { lastName: { contains: token, mode: 'insensitive' as const } },
      ],
    })),
  }

  const [bookings, guests, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        OR: [
          { bookingReference: { contains: q, mode: 'insensitive' } },
          { guest: guestNameFilter },
          {
            room: {
              OR: [
                { roomNumber: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
      take: 5,
      orderBy: { checkIn: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true, name: true } },
      },
    }),
    prisma.guest.findMany({
      where: {
        deletedAt: null,
        OR: [
          guestNameFilter,
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.room.findMany({
      where: {
        deletedAt: null,
        OR: [
          { roomNumber: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { roomNumber: 'asc' },
    }),
  ])

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      guestName: formatFullName(b.guest.firstName, b.guest.lastName),
      roomLabel: `Room ${b.room.roomNumber} · ${b.room.name}`,
      status: b.status,
    })),
    guests: guests.map((g) => ({
      id: g.id,
      name: formatFullName(g.firstName, g.lastName),
      phone: g.phone,
      email: g.email,
    })),
    rooms: rooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      name: r.name,
      type: r.type,
      status: r.status,
    })),
  }
}

export function validateGlobalSearch(data: { query: string }) {
  return data
}

export const globalAdminSearch = createServerFn({ method: 'GET' })
  .validator(validateGlobalSearch)
  .handler(globalAdminSearchHandler)

export async function getAdminNotificationsHandler(): Promise<AdminNotificationsData> {
  await authSession()

  const { start, end } = getResortDayRange()

  const [arrivals, departures, balances] = await Promise.all([
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkIn: { gte: start, lt: end },
      },
      take: 5,
      orderBy: { checkIn: 'asc' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: 'CHECKED_IN',
        checkOut: { gte: start, lt: end },
      },
      take: 5,
      orderBy: { checkOut: 'asc' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      take: 5,
      orderBy: { checkIn: 'asc' },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true } },
      },
    }),
  ])

  const items: AdminNotificationItem[] = [
    ...arrivals.map((b) => ({
      id: `arrival-${b.id}`,
      type: 'arrival' as const,
      title: `Arrival: ${formatFullName(b.guest.firstName, b.guest.lastName)}`,
      subtitle: `${b.bookingReference} · Room ${b.room.roomNumber}`,
      href: '/admin' as const,
    })),
    ...departures.map((b) => ({
      id: `departure-${b.id}`,
      type: 'departure' as const,
      title: `Departure: ${formatFullName(b.guest.firstName, b.guest.lastName)}`,
      subtitle: `${b.bookingReference} · Room ${b.room.roomNumber}`,
      href: '/admin' as const,
    })),
    ...balances.map((b) => {
      const due = Math.max(Number(b.totalAmount) - Number(b.amountPaid), 0)
      return {
        id: `balance-${b.id}`,
        type: 'balance' as const,
        title: `Balance Due: ${formatPeso(due)}`,
        subtitle: `${formatFullName(b.guest.firstName, b.guest.lastName)} · ${b.bookingReference}`,
        href: '/admin/bookings' as const,
      }
    }),
  ]

  return {
    totalCount: items.length,
    items,
  }
}

export const getAdminNotifications = createServerFn({ method: 'GET' }).handler(
  getAdminNotificationsHandler,
)
