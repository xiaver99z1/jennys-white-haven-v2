import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { requirePermission } from '#/server/room-actions'
import { formatFullName } from '#/lib/formatters'
import type {
  BookingStatus,
  BookingsReportData,
  GuestsReportData,
  OccupancyReportData,
  ReportDateRangeInput,
  ReportPreset,
  RevenueReportData,
  RoomType,
} from '#/types'

const MS_PER_DAY = 86_400_000
const PH_OFFSET_MS = 8 * 60 * 60 * 1000

function toPhDateString(date: Date): string {
  const ph = new Date(date.getTime() + PH_OFFSET_MS)
  return ph.toISOString().slice(0, 10)
}

function parseDateStartPh(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+08:00`)
}

function parseDateEndPh(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+08:00`)
}

export function resolveReportDateRange(input?: ReportDateRangeInput): {
  startDate: Date
  endDate: Date
  from: string
  to: string
  preset: ReportPreset
  dayCount: number
} {
  const now = new Date()
  const todayStr = toPhDateString(now)
  const preset: ReportPreset = input?.preset ?? 'thisMonth'

  let fromStr = todayStr
  let toStr = todayStr

  if (preset === 'custom' && input?.from && input.to) {
    fromStr = input.from <= input.to ? input.from : input.to
    toStr = input.from <= input.to ? input.to : input.from
  } else if (preset === 'today') {
    fromStr = todayStr
    toStr = todayStr
  } else if (preset === 'last7') {
    const start = new Date(parseDateStartPh(todayStr).getTime() - 6 * MS_PER_DAY)
    fromStr = toPhDateString(start)
    toStr = todayStr
  } else if (preset === 'lastMonth') {
    const [yearStr, monthStr] = todayStr.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr) // 1-12
    const prevMonthYear = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const lastDay = new Date(Date.UTC(prevMonthYear, prevMonth, 0)).getUTCDate()
    fromStr = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-01`
    toStr = `${prevMonthYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  } else if (preset === 'last90') {
    const start = new Date(
      parseDateStartPh(todayStr).getTime() - 89 * MS_PER_DAY,
    )
    fromStr = toPhDateString(start)
    toStr = todayStr
  } else if (preset === 'all') {
    fromStr = '2020-01-01'
    toStr = todayStr
  } else {
    // Default: thisMonth
    const [yearStr, monthStr] = todayStr.split('-')
    fromStr = `${yearStr}-${monthStr}-01`
    toStr = todayStr
  }

  const startDate = parseDateStartPh(fromStr)
  const endDate = parseDateEndPh(toStr)
  const dayCount = Math.max(
    1,
    Math.round(
      (parseDateStartPh(toStr).getTime() - startDate.getTime()) / MS_PER_DAY,
    ) + 1,
  )

  return { startDate, endDate, from: fromStr, to: toStr, preset, dayCount }
}

export function validateReportInput(data?: ReportDateRangeInput) {
  return data ?? {}
}

export async function getRevenueReportHandler({
  data,
}: {
  data?: ReportDateRangeInput
}): Promise<RevenueReportData> {
  await requirePermission('view:reports')
  const range = resolveReportDateRange(data)

  const [payments, bookingsInPeriod, outstandingRows] = await Promise.all([
    prisma.payment.findMany({
      where: {
        paidAt: { gte: range.startDate, lte: range.endDate },
        booking: { deletedAt: null },
      },
      orderBy: { paidAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            guest: { select: { firstName: true, lastName: true } },
          },
        },
        receivedBy: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        checkIn: { gte: range.startDate, lte: range.endDate },
      },
      select: { totalAmount: true },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      orderBy: { checkIn: 'asc' },
      take: 25,
      include: {
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { roomNumber: true } },
      },
    }),
  ])

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalBilled = bookingsInPeriod.reduce(
    (sum, b) => sum + Number(b.totalAmount),
    0,
  )

  const outstandingBookings = outstandingRows
    .map((b) => {
      const totalAmount = Number(b.totalAmount)
      const amountPaid = Number(b.amountPaid)
      return {
        id: b.id,
        bookingReference: b.bookingReference,
        guestName: formatFullName(b.guest.firstName, b.guest.lastName),
        roomNumber: b.room.roomNumber,
        checkIn: b.checkIn,
        totalAmount,
        amountPaid,
        balanceDue: Math.max(totalAmount - amountPaid, 0),
        paymentStatus: b.paymentStatus,
      }
    })
    .filter((b) => b.balanceDue > 0)

  const outstandingBalance = outstandingBookings.reduce(
    (sum, b) => sum + b.balanceDue,
    0,
  )

  const collectionRate =
    totalBilled > 0
      ? Math.min(Math.round((totalCollected / totalBilled) * 100), 100)
      : totalCollected > 0
        ? 100
        : 0

  const methodMap = new Map<string, { amount: number; count: number }>()
  const dailyMap = new Map<string, { amount: number; count: number }>()

  for (const p of payments) {
    const amt = Number(p.amount)
    const m = methodMap.get(p.method) ?? { amount: 0, count: 0 }
    methodMap.set(p.method, { amount: m.amount + amt, count: m.count + 1 })

    const dayKey = toPhDateString(new Date(p.paidAt))
    const d = dailyMap.get(dayKey) ?? { amount: 0, count: 0 }
    dailyMap.set(dayKey, { amount: d.amount + amt, count: d.count + 1 })
  }

  const byMethod = Array.from(methodMap.entries())
    .map(([method, stats]) => ({
      method,
      amount: stats.amount,
      count: stats.count,
      share:
        totalCollected > 0
          ? Math.round((stats.amount / totalCollected) * 100)
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      amount: stats.amount,
      count: stats.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    range: {
      from: range.from,
      to: range.to,
      preset: range.preset,
      dayCount: range.dayCount,
    },
    kpis: {
      totalCollected,
      totalBilled,
      outstandingBalance,
      collectionRate,
      paymentCount: payments.length,
    },
    byMethod,
    dailyTrend,
    recentPayments: payments.slice(0, 50).map((p) => ({
      id: p.id,
      bookingId: p.booking.id,
      bookingReference: p.booking.bookingReference,
      guestName: formatFullName(
        p.booking.guest.firstName,
        p.booking.guest.lastName,
      ),
      amount: Number(p.amount),
      method: p.method,
      referenceNo: p.referenceNo,
      paidAt: p.paidAt,
      receivedByName: p.receivedBy?.name ?? null,
    })),
    outstandingBookings,
  }
}

export const getRevenueReport = createServerFn({ method: 'GET' })
  .validator(validateReportInput)
  .handler(getRevenueReportHandler)

export async function getOccupancyReportHandler({
  data,
}: {
  data?: ReportDateRangeInput
}): Promise<OccupancyReportData> {
  await requirePermission('view:reports')
  const range = resolveReportDateRange(data)

  const [rooms, bookings] = await Promise.all([
    prisma.room.findMany({
      where: { deletedAt: null },
      orderBy: { roomNumber: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        checkIn: { lt: range.endDate },
        checkOut: { gt: range.startDate },
      },
      select: {
        roomId: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        totalAmount: true,
      },
    }),
  ])

  const roomStats = new Map<
    string,
    { nightsSold: number; revenue: number; bookingCount: number }
  >()

  const rangeStartMs = parseDateStartPh(range.from).getTime()
  const rangeEndExclusiveMs = parseDateStartPh(range.to).getTime() + MS_PER_DAY

  for (const b of bookings) {
    const checkInMs = parseDateStartPh(
      toPhDateString(new Date(b.checkIn)),
    ).getTime()
    const checkOutMs = parseDateStartPh(
      toPhDateString(new Date(b.checkOut)),
    ).getTime()

    const overlapStart = Math.max(checkInMs, rangeStartMs)
    const overlapEnd = Math.min(checkOutMs, rangeEndExclusiveMs)
    const overlapNights = Math.max(
      0,
      Math.round((overlapEnd - overlapStart) / MS_PER_DAY),
    )

    if (overlapNights <= 0) continue

    const totalNights = Math.max(b.nights, 1)
    const proratedRevenue =
      (Number(b.totalAmount) * overlapNights) / totalNights

    const current = roomStats.get(b.roomId) ?? {
      nightsSold: 0,
      revenue: 0,
      bookingCount: 0,
    }
    roomStats.set(b.roomId, {
      nightsSold: current.nightsSold + overlapNights,
      revenue: current.revenue + proratedRevenue,
      bookingCount: current.bookingCount + 1,
    })
  }

  const byRoom = rooms.map((r) => {
    const stats = roomStats.get(r.id) ?? {
      nightsSold: 0,
      revenue: 0,
      bookingCount: 0,
    }
    const occupancyRate = Math.min(
      Math.round((stats.nightsSold / range.dayCount) * 100),
      100,
    )
    return {
      id: r.id,
      roomNumber: r.roomNumber,
      name: r.name,
      type: r.type as RoomType,
      status: r.status,
      pricePerNight: Number(r.pricePerNight),
      nightsSold: stats.nightsSold,
      occupancyRate,
      revenue: Math.round(stats.revenue),
      bookingCount: stats.bookingCount,
    }
  })

  const typeMap = new Map<
    RoomType,
    { roomCount: number; nightsSold: number; revenue: number }
  >()
  for (const r of byRoom) {
    const cur = typeMap.get(r.type) ?? {
      roomCount: 0,
      nightsSold: 0,
      revenue: 0,
    }
    typeMap.set(r.type, {
      roomCount: cur.roomCount + 1,
      nightsSold: cur.nightsSold + r.nightsSold,
      revenue: cur.revenue + r.revenue,
    })
  }

  const byRoomType = Array.from(typeMap.entries()).map(([type, stats]) => {
    const availableNights = stats.roomCount * range.dayCount
    return {
      type,
      roomCount: stats.roomCount,
      nightsSold: stats.nightsSold,
      availableNights,
      occupancyRate:
        availableNights > 0
          ? Math.min(
              Math.round((stats.nightsSold / availableNights) * 100),
              100,
            )
          : 0,
      revenue: stats.revenue,
    }
  })

  const occupiedRoomNights = byRoom.reduce((sum, r) => sum + r.nightsSold, 0)
  const availableRoomNights = rooms.length * range.dayCount
  const totalRoomRevenue = byRoom.reduce((sum, r) => sum + r.revenue, 0)
  const occupancyRate =
    availableRoomNights > 0
      ? Math.min(
          Math.round((occupiedRoomNights / availableRoomNights) * 100),
          100,
        )
      : 0
  const adr =
    occupiedRoomNights > 0
      ? Math.round(totalRoomRevenue / occupiedRoomNights)
      : 0
  const revPar =
    availableRoomNights > 0
      ? Math.round(totalRoomRevenue / availableRoomNights)
      : 0

  return {
    range: {
      from: range.from,
      to: range.to,
      preset: range.preset,
      dayCount: range.dayCount,
    },
    kpis: {
      occupancyRate,
      occupiedRoomNights,
      availableRoomNights,
      adr,
      revPar,
      totalRoomRevenue,
      activeRoomCount: rooms.length,
    },
    byRoomType,
    byRoom,
  }
}

export const getOccupancyReport = createServerFn({ method: 'GET' })
  .validator(validateReportInput)
  .handler(getOccupancyReportHandler)

export async function getBookingsReportHandler({
  data,
}: {
  data?: ReportDateRangeInput
}): Promise<BookingsReportData> {
  await requirePermission('view:reports')
  const range = resolveReportDateRange(data)

  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      checkIn: { gte: range.startDate, lte: range.endDate },
    },
    orderBy: { checkIn: 'desc' },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      room: { select: { roomNumber: true, name: true } },
    },
  })

  const totalBookings = bookings.length
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length
  const confirmedOrCompleted = bookings.filter((b) =>
    ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status),
  ).length
  const cancellationRate =
    totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0

  const nonCancelled = bookings.filter((b) => b.status !== 'CANCELLED')
  const totalNights = nonCancelled.reduce((sum, b) => sum + b.nights, 0)
  const avgLengthOfStay =
    nonCancelled.length > 0
      ? Math.round((totalNights / nonCancelled.length) * 10) / 10
      : 0
  const totalGuestsHosted = nonCancelled.reduce(
    (sum, b) => sum + b.guestsCount,
    0,
  )

  const statusMap = new Map<
    BookingStatus,
    { count: number; revenue: number }
  >()
  for (const b of bookings) {
    const status = b.status
    const cur = statusMap.get(status) ?? { count: 0, revenue: 0 }
    statusMap.set(status, {
      count: cur.count + 1,
      revenue: cur.revenue + Number(b.totalAmount),
    })
  }

  const byStatus = Array.from(statusMap.entries()).map(([status, stats]) => ({
    status,
    count: stats.count,
    revenue: stats.revenue,
    share:
      totalBookings > 0 ? Math.round((stats.count / totalBookings) * 100) : 0,
  }))

  return {
    range: {
      from: range.from,
      to: range.to,
      preset: range.preset,
      dayCount: range.dayCount,
    },
    kpis: {
      totalBookings,
      confirmedOrCompleted,
      cancelledCount,
      cancellationRate,
      avgLengthOfStay,
      totalGuestsHosted,
    },
    byStatus,
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      guestName: formatFullName(b.guest.firstName, b.guest.lastName),
      roomNumber: b.room.roomNumber,
      roomName: b.room.name,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: b.nights,
      guestsCount: b.guestsCount,
      totalAmount: Number(b.totalAmount),
      amountPaid: Number(b.amountPaid),
      status: b.status,
      paymentStatus: b.paymentStatus,
    })),
  }
}

export const getBookingsReport = createServerFn({ method: 'GET' })
  .validator(validateReportInput)
  .handler(getBookingsReportHandler)

export async function getGuestsReportHandler({
  data,
}: {
  data?: ReportDateRangeInput
}): Promise<GuestsReportData> {
  await requirePermission('view:reports')
  const range = resolveReportDateRange(data)

  const guests = await prisma.guest.findMany({
    where: { deletedAt: null },
    include: {
      bookings: {
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: {
          totalAmount: true,
          nights: true,
          checkIn: true,
        },
        orderBy: { checkIn: 'desc' },
      },
    },
  })

  const totalGuests = guests.length
  const newGuestsInPeriod = guests.filter(
    (g) => g.createdAt >= range.startDate && g.createdAt <= range.endDate,
  ).length
  const repeatGuestsCount = guests.filter((g) => g.bookings.length >= 2).length
  const verifiedIdCount = guests.filter(
    (g) => Boolean(g.idType) && Boolean(g.idNumber),
  ).length
  const verifiedIdRate =
    totalGuests > 0 ? Math.round((verifiedIdCount / totalGuests) * 100) : 0

  const idTypeMap = new Map<string, number>()
  const nationalityMap = new Map<string, number>()

  for (const g of guests) {
    const idKey = g.idType || 'UNSPECIFIED'
    idTypeMap.set(idKey, (idTypeMap.get(idKey) ?? 0) + 1)

    const natKey = g.nationality?.trim() || 'Unspecified'
    nationalityMap.set(natKey, (nationalityMap.get(natKey) ?? 0) + 1)
  }

  const byIdType = Array.from(idTypeMap.entries())
    .map(([idType, count]) => ({
      idType,
      count,
      share: totalGuests > 0 ? Math.round((count / totalGuests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const byNationality = Array.from(nationalityMap.entries())
    .map(([nationality, count]) => ({
      nationality,
      count,
      share: totalGuests > 0 ? Math.round((count / totalGuests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const topGuests = guests
    .map((g) => ({
      id: g.id,
      name: formatFullName(g.firstName, g.lastName),
      email: g.email,
      phone: g.phone,
      nationality: g.nationality,
      bookingCount: g.bookings.length,
      totalNights: g.bookings.reduce((sum, b) => sum + b.nights, 0),
      totalSpent: g.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
      lastStay: g.bookings[0]?.checkIn ?? null,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent || b.bookingCount - a.bookingCount)
    .slice(0, 20)

  return {
    range: {
      from: range.from,
      to: range.to,
      preset: range.preset,
      dayCount: range.dayCount,
    },
    kpis: {
      totalGuests,
      newGuestsInPeriod,
      repeatGuestsCount,
      verifiedIdRate,
    },
    byIdType,
    byNationality,
    topGuests,
  }
}

export const getGuestsReport = createServerFn({ method: 'GET' })
  .validator(validateReportInput)
  .handler(getGuestsReportHandler)
