import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'

// Camotes Island, Cebu runs on Philippine Standard Time (UTC+8, no DST).
export const RESORT_UTC_OFFSET_HOURS = 8
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Returns the resort's current calendar day and month as UTC-midnight ranges.
 * Booking dates are stored as UTC midnight of the selected calendar day,
 * so these ranges line up with how check-in / check-out are saved.
 */
export function getResortDayRange(now: Date = new Date()) {
  const local = new Date(now.getTime() + RESORT_UTC_OFFSET_HOURS * HOUR_MS)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()

  const start = new Date(Date.UTC(year, month, local.getUTCDate()))
  const end = new Date(start.getTime() + DAY_MS)
  const monthStart = new Date(Date.UTC(year, month, 1))
  const monthEnd = new Date(Date.UTC(year, month + 1, 1))

  return { start, end, monthStart, monthEnd }
}

type BookingWithRelations = {
  totalAmount: unknown
  amountPaid: unknown
  room: { pricePerNight: unknown }
}

function serializeBooking<T extends BookingWithRelations>(booking: T) {
  return {
    ...booking,
    totalAmount: Number(booking.totalAmount),
    amountPaid: Number(booking.amountPaid),
    room: {
      ...booking.room,
      pricePerNight: Number(booking.room.pricePerNight),
    },
  }
}

type RoomCountKey = 'available' | 'occupied' | 'cleaning' | 'maintenance'

// --- 1. DASHBOARD STATS ---
export async function getDashboardStatsHandler() {
  await requirePermission('view:bookings')

  const { start, end, monthStart, monthEnd } = getResortDayRange()
  const include = { room: true, guest: true } as const

  const [arrivals, departures, rooms, recentBookings, outstanding, monthAgg] =
    await Promise.all([
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          checkIn: { gte: start, lt: end },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
        include,
        orderBy: { checkIn: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          checkOut: { gte: start, lt: end },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
        include,
        orderBy: { checkOut: 'asc' },
      }),
      prisma.room.findMany({
        where: { deletedAt: null },
        select: { status: true },
      }),
      prisma.booking.findMany({
        where: { deletedAt: null },
        include,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        include,
        orderBy: { checkIn: 'asc' },
        take: 5,
      }),
      prisma.booking.aggregate({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          checkIn: { gte: monthStart, lt: monthEnd },
        },
        _sum: { totalAmount: true, amountPaid: true },
        _count: { _all: true },
      }),
    ])

  const roomCounts: Record<RoomCountKey, number> & { total: number } = {
    total: rooms.length,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
  }
  for (const room of rooms) {
    roomCounts[room.status.toLowerCase() as RoomCountKey] += 1
  }

  return {
    today: start.toISOString().slice(0, 10),
    arrivals: arrivals.map(serializeBooking),
    departures: departures.map(serializeBooking),
    rooms: roomCounts,
    recentBookings: recentBookings.map(serializeBooking),
    outstanding: outstanding.map(serializeBooking),
    revenue: {
      monthTotal: Number(monthAgg._sum.totalAmount ?? 0),
      monthCollected: Number(monthAgg._sum.amountPaid ?? 0),
      monthBookings: monthAgg._count._all,
    },
  }
}

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  getDashboardStatsHandler,
)

// --- 2. QUICK CHECK-IN ---
export function validateQuickActionInput(data: { id: string }) {
  return data
}

export async function checkInBookingHandler({
  data,
}: {
  data: { id: string }
}) {
  const admin = await requirePermission('update:bookings')

  const booking = await prisma.$transaction(async (tx) => {
    const target = await tx.booking.findUnique({
      where: { id: data.id },
      include: { room: true, guest: true },
    })
    if (!target || target.deletedAt) {
      throw new Error('Booking not found.')
    }
    if (target.status !== 'PENDING' && target.status !== 'CONFIRMED') {
      throw new Error('Only pending or confirmed bookings can be checked in.')
    }

    await tx.booking.update({
      where: { id: data.id },
      data: { status: 'CHECKED_IN' },
    })
    await tx.room.update({
      where: { id: target.roomId },
      data: { status: 'OCCUPIED' },
    })

    return target
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_CHECKED_IN',
    description: `Checked in ${booking.guest.firstName} ${booking.guest.lastName} to Room ${booking.room.roomNumber} (${booking.bookingReference})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const checkInBooking = createServerFn({ method: 'POST' })
  .validator(validateQuickActionInput)
  .handler(checkInBookingHandler)

// --- 3. QUICK CHECK-OUT ---
export async function checkOutBookingHandler({
  data,
}: {
  data: { id: string }
}) {
  const admin = await requirePermission('update:bookings')

  const booking = await prisma.$transaction(async (tx) => {
    const target = await tx.booking.findUnique({
      where: { id: data.id },
      include: { room: true, guest: true },
    })
    if (!target || target.deletedAt) {
      throw new Error('Booking not found.')
    }
    if (target.status !== 'CHECKED_IN') {
      throw new Error('Only checked-in bookings can be checked out.')
    }

    await tx.booking.update({
      where: { id: data.id },
      data: { status: 'CHECKED_OUT' },
    })
    await tx.room.update({
      where: { id: target.roomId },
      data: { status: 'CLEANING' },
    })

    return target
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_CHECKED_OUT',
    description: `Checked out ${booking.guest.firstName} ${booking.guest.lastName} from Room ${booking.room.roomNumber} (${booking.bookingReference}); room set to CLEANING`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const checkOutBooking = createServerFn({ method: 'POST' })
  .validator(validateQuickActionInput)
  .handler(checkOutBookingHandler)
