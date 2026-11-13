import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { hasPermission } from '#/lib/permissions'
import { requirePermission } from '#/server/room-actions'
import { createNotification } from '#/server/notification-actions'

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
  const user = await requirePermission('view:bookings')
  const canUpdateBookings = hasPermission(user, 'update:bookings')

  const { start, end, monthStart, monthEnd } = getResortDayRange()
  const include = { room: true, guest: true } as const

  const [
    arrivals,
    departures,
    rooms,
    recentBookings,
    outstandingCandidates,
    monthBookings,
  ] = await Promise.all([
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
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        checkIn: { gte: monthStart, lt: monthEnd },
      },
      select: { totalAmount: true, amountPaid: true },
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

  const unpaidBalances = outstandingCandidates.filter(
    (b) => Number(b.totalAmount) > Number(b.amountPaid),
  )

  let monthTotal = 0
  let monthPaid = 0
  let monthBalanceDue = 0
  for (const b of monthBookings) {
    const total = Number(b.totalAmount)
    const paid = Number(b.amountPaid)
    monthTotal += total
    monthPaid += paid
    monthBalanceDue += Math.max(total - paid, 0)
  }

  return {
    today: start.toISOString().slice(0, 10),
    canUpdateBookings,
    arrivals: arrivals.map(serializeBooking),
    departures: departures.map(serializeBooking),
    rooms: roomCounts,
    recentBookings: recentBookings.map(serializeBooking),
    outstanding: unpaidBalances.slice(0, 5).map(serializeBooking),
    outstandingCount: unpaidBalances.length,
    revenue: {
      monthTotal,
      monthPaid,
      monthBalanceDue,
      monthBookings: monthBookings.length,
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

  const booking = await prisma.$transaction(
    async (tx) => {
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
      if (target.room.deletedAt || target.room.status === 'MAINTENANCE') {
        throw new Error(
          `Room ${target.room.roomNumber} is currently unavailable for check-in.`,
        )
      }

      const activeCheckIn = await tx.booking.findFirst({
        where: {
          id: { not: data.id },
          roomId: target.roomId,
          deletedAt: null,
          status: 'CHECKED_IN',
        },
      })
      if (activeCheckIn) {
        throw new Error(
          `Room ${target.room.roomNumber} already has a checked-in guest (${activeCheckIn.bookingReference}).`,
        )
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
    },
    { isolationLevel: 'Serializable' },
  )

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_CHECKED_IN',
    description: `Checked in ${booking.guest.firstName} ${booking.guest.lastName} to Room ${booking.room.roomNumber} (${booking.bookingReference})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  await createNotification({
    type: 'BOOKING_CHECKIN',
    title: `Guest Checked In: ${booking.guest.firstName} ${booking.guest.lastName}`,
    message: `Room ${booking.room.roomNumber} · ${booking.bookingReference}`,
    href: '/admin',
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

  const booking = await prisma.$transaction(
    async (tx) => {
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

      const otherCheckedIn = await tx.booking.findFirst({
        where: {
          id: { not: data.id },
          roomId: target.roomId,
          deletedAt: null,
          status: 'CHECKED_IN',
        },
      })
      if (!otherCheckedIn) {
        await tx.room.update({
          where: { id: target.roomId },
          data: { status: 'CLEANING' },
        })
      }

      return target
    },
    { isolationLevel: 'Serializable' },
  )

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_CHECKED_OUT',
    description: `Checked out ${booking.guest.firstName} ${booking.guest.lastName} from Room ${booking.room.roomNumber} (${booking.bookingReference}); room set to CLEANING`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  await createNotification({
    type: 'BOOKING_CHECKOUT',
    title: `Guest Checked Out: ${booking.guest.firstName} ${booking.guest.lastName}`,
    message: `Room ${booking.room.roomNumber} (${booking.bookingReference}) set to CLEANING`,
    href: '/admin',
  })

  return { success: true }
}

export const checkOutBooking = createServerFn({ method: 'POST' })
  .validator(validateQuickActionInput)
  .handler(checkOutBookingHandler)
