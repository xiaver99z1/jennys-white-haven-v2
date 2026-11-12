import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'
import type { BookingStatus, PaymentStatus } from '#/lib/constants/rooms'

export function calculateNights(
  checkIn: string | Date,
  checkOut: string | Date,
): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid check-in or check-out date.')
  }

  const diffMs = end.getTime() - start.getTime()
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (nights < 1) {
    throw new Error('Check-out date must be after check-in date.')
  }

  return nights
}

export function generateBookingReference(
  now: Date = new Date(),
  suffix?: string,
): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const rand =
    suffix ||
    Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X')
  return `JWH-${yyyy}${mm}${dd}-${rand}`
}

// --- 1. GET BOOKINGS LIST ---
export async function getBookingsListHandler() {
  await requirePermission('view:bookings')

  const [bookings, rooms, guests] = await Promise.all([
    prisma.booking.findMany({
      include: {
        room: true,
        guest: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.room.findMany({
      where: { deletedAt: null },
      orderBy: { roomNumber: 'asc' },
    }),
    prisma.guest.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ])

  return {
    bookings: bookings.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      amountPaid: Number(b.amountPaid),
      room: {
        ...b.room,
        pricePerNight: Number(b.room.pricePerNight),
      },
    })),
    rooms: rooms.map((r) => ({
      ...r,
      pricePerNight: Number(r.pricePerNight),
    })),
    guests,
  }
}

export const getBookingsList = createServerFn({ method: 'GET' }).handler(
  getBookingsListHandler,
)

// --- 2. CREATE BOOKING ---
export interface CreateBookingInput {
  roomId: string
  guestId: string
  checkIn: string
  checkOut: string
  guestsCount: number
  totalAmount?: number
  amountPaid?: number
  paymentStatus?: PaymentStatus
  paymentMethod?: string
  status?: BookingStatus
  specialRequests?: string
}

export function validateCreateBooking(data: CreateBookingInput) {
  return data
}

export async function createBookingHandler({
  data,
}: {
  data: CreateBookingInput
}) {
  const admin = await requirePermission('create:bookings')

  const nights = calculateNights(data.checkIn, data.checkOut)
  const checkInDate = new Date(data.checkIn)
  const checkOutDate = new Date(data.checkOut)

  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
  })
  if (!room || room.deletedAt) {
    throw new Error('Selected room is not available.')
  }

  const guest = await prisma.guest.findUnique({
    where: { id: data.guestId },
  })
  if (!guest || guest.deletedAt) {
    throw new Error('Selected guest was not found.')
  }

  if (data.guestsCount > room.capacity) {
    throw new Error(
      `Room ${room.roomNumber} has a maximum capacity of ${room.capacity} guests.`,
    )
  }

  const status: BookingStatus = data.status || 'PENDING'
  if (status !== 'CANCELLED' && status !== 'CHECKED_OUT') {
    const overlapping = await prisma.booking.findFirst({
      where: {
        roomId: data.roomId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
    })

    if (overlapping) {
      throw new Error(
        `Room ${room.roomNumber} is already booked for the selected dates (${overlapping.bookingReference}).`,
      )
    }
  }

  const totalAmount =
    data.totalAmount !== undefined
      ? Number(data.totalAmount)
      : nights * Number(room.pricePerNight)
  const amountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : 0
  const paymentStatus: PaymentStatus = data.paymentStatus || 'UNPAID'
  const paymentMethod = data.paymentMethod?.trim() || null
  const specialRequests = data.specialRequests?.trim() || null

  const booking = await prisma.booking.create({
    data: {
      bookingReference: generateBookingReference(),
      roomId: data.roomId,
      guestId: data.guestId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      guestsCount: data.guestsCount,
      totalAmount,
      amountPaid,
      paymentStatus,
      paymentMethod,
      status,
      specialRequests,
    },
  })

  if (status === 'CHECKED_IN') {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'OCCUPIED' },
    })
  }

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_CREATED',
    description: `Created booking ${booking.bookingReference} for ${guest.firstName} ${guest.lastName} in Room ${room.roomNumber} (${nights} night(s), ₱${totalAmount.toLocaleString()})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    booking: {
      ...booking,
      totalAmount: Number(booking.totalAmount),
      amountPaid: Number(booking.amountPaid),
    },
  }
}

export const createBooking = createServerFn({ method: 'POST' })
  .validator(validateCreateBooking)
  .handler(createBookingHandler)

// --- 3. UPDATE BOOKING ---
export interface UpdateBookingInput {
  id: string
  roomId: string
  guestId: string
  checkIn: string
  checkOut: string
  guestsCount: number
  totalAmount: number
  amountPaid: number
  paymentStatus: PaymentStatus
  paymentMethod?: string
  status: BookingStatus
  specialRequests?: string
}

export function validateUpdateBooking(data: UpdateBookingInput) {
  return data
}

export async function updateBookingHandler({
  data,
}: {
  data: UpdateBookingInput
}) {
  const admin = await requirePermission('update:bookings')

  const existingBooking = await prisma.booking.findUnique({
    where: { id: data.id },
    include: { room: true, guest: true },
  })

  if (!existingBooking) {
    throw new Error('Booking not found.')
  }

  const nights = calculateNights(data.checkIn, data.checkOut)
  const checkInDate = new Date(data.checkIn)
  const checkOutDate = new Date(data.checkOut)

  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
  })
  if (!room || room.deletedAt) {
    throw new Error('Selected room is not available.')
  }

  const guest = await prisma.guest.findUnique({
    where: { id: data.guestId },
  })
  if (!guest || guest.deletedAt) {
    throw new Error('Selected guest was not found.')
  }

  if (data.guestsCount > room.capacity) {
    throw new Error(
      `Room ${room.roomNumber} has a maximum capacity of ${room.capacity} guests.`,
    )
  }

  if (data.status !== 'CANCELLED' && data.status !== 'CHECKED_OUT') {
    const overlapping = await prisma.booking.findFirst({
      where: {
        id: { not: data.id },
        roomId: data.roomId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
    })

    if (overlapping) {
      throw new Error(
        `Room ${room.roomNumber} is already booked for the selected dates (${overlapping.bookingReference}).`,
      )
    }
  }

  const nextPaymentMethod =
    data.paymentMethod !== undefined
      ? data.paymentMethod.trim() || null
      : existingBooking.paymentMethod
  const nextSpecialRequests =
    data.specialRequests !== undefined
      ? data.specialRequests.trim() || null
      : existingBooking.specialRequests

  const updatedBooking = await prisma.booking.update({
    where: { id: data.id },
    data: {
      roomId: data.roomId,
      guestId: data.guestId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      guestsCount: data.guestsCount,
      totalAmount: data.totalAmount,
      amountPaid: data.amountPaid,
      paymentStatus: data.paymentStatus,
      paymentMethod: nextPaymentMethod,
      status: data.status,
      specialRequests: nextSpecialRequests,
    },
  })

  if (data.status === 'CHECKED_IN') {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'OCCUPIED' },
    })
  } else if (
    data.status === 'CHECKED_OUT' &&
    existingBooking.status !== 'CHECKED_OUT'
  ) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'CLEANING' },
    })
  }

  const changes: string[] = []
  if (data.roomId !== existingBooking.roomId) {
    changes.push(
      `Room: "${existingBooking.room.roomNumber}" → "${room.roomNumber}"`,
    )
  }
  if (data.guestId !== existingBooking.guestId) {
    changes.push(
      `Guest: "${existingBooking.guest.firstName} ${existingBooking.guest.lastName}" → "${guest.firstName} ${guest.lastName}"`,
    )
  }
  if (data.status !== existingBooking.status) {
    changes.push(`Status: ${existingBooking.status} → ${data.status}`)
  }
  if (data.paymentStatus !== existingBooking.paymentStatus) {
    changes.push(
      `Payment Status: ${existingBooking.paymentStatus} → ${data.paymentStatus}`,
    )
  }
  if (Number(data.amountPaid) !== Number(existingBooking.amountPaid)) {
    changes.push(
      `Amount Paid: ₱${Number(existingBooking.amountPaid)} → ₱${Number(data.amountPaid)}`,
    )
  }
  if (Number(data.totalAmount) !== Number(existingBooking.totalAmount)) {
    changes.push(
      `Total: ₱${Number(existingBooking.totalAmount)} → ₱${Number(data.totalAmount)}`,
    )
  }
  if (nights !== existingBooking.nights) {
    changes.push(`Nights: ${existingBooking.nights} → ${nights}`)
  }
  if (data.guestsCount !== existingBooking.guestsCount) {
    changes.push(`Guests: ${existingBooking.guestsCount} → ${data.guestsCount}`)
  }
  if (nextPaymentMethod !== existingBooking.paymentMethod) {
    changes.push(
      `Payment Method: "${existingBooking.paymentMethod || 'None'}" → "${nextPaymentMethod || 'None'}"`,
    )
  }
  if (nextSpecialRequests !== existingBooking.specialRequests) {
    changes.push(
      `Special Requests: "${existingBooking.specialRequests || 'None'}" → "${nextSpecialRequests || 'None'}"`,
    )
  }

  const logDetails =
    changes.length > 0
      ? `Updated booking ${existingBooking.bookingReference}: [ ${changes.join(' | ')} ]`
      : `Saved booking ${existingBooking.bookingReference} with no field changes.`

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_UPDATED',
    description: logDetails,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    booking: {
      ...updatedBooking,
      totalAmount: Number(updatedBooking.totalAmount),
      amountPaid: Number(updatedBooking.amountPaid),
    },
  }
}

export const updateBooking = createServerFn({ method: 'POST' })
  .validator(validateUpdateBooking)
  .handler(updateBookingHandler)

// --- 4. SOFT DELETE BOOKING ---
export function validateBookingId(data: { id: string }) {
  return data
}

export async function deleteBookingHandler({
  data,
}: {
  data: { id: string }
}) {
  const admin = await requirePermission('delete:bookings')

  const booking = await prisma.booking.findUnique({
    where: { id: data.id },
    include: { room: true, guest: true },
  })
  if (!booking) {
    throw new Error('Booking not found.')
  }

  await prisma.booking.update({
    where: { id: data.id },
    data: { deletedAt: new Date() },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_DELETED',
    description: `Archived booking ${booking.bookingReference} (${booking.guest.firstName} ${booking.guest.lastName} - Room ${booking.room.roomNumber})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const deleteBooking = createServerFn({ method: 'POST' })
  .validator(validateBookingId)
  .handler(deleteBookingHandler)

// --- 5. RESTORE ARCHIVED BOOKING ---
export async function restoreBookingHandler({
  data,
}: {
  data: { id: string }
}) {
  const admin = await requirePermission('delete:bookings')

  const booking = await prisma.booking.findUnique({
    where: { id: data.id },
    include: { room: true, guest: true },
  })
  if (!booking) {
    throw new Error('Booking not found.')
  }

  await prisma.booking.update({
    where: { id: data.id },
    data: { deletedAt: null },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'BOOKING_RESTORED',
    description: `Restored booking ${booking.bookingReference} (${booking.guest.firstName} ${booking.guest.lastName} - Room ${booking.room.roomNumber}) from archive`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const restoreBooking = createServerFn({ method: 'POST' })
  .validator(validateBookingId)
  .handler(restoreBookingHandler)
