import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { isValidCalendarDate, formatPeso } from '#/lib/formatters'
import {
  calculateNights,
  generateBookingReference,
} from '#/server/booking-actions'
import { createNotification } from '#/server/notification-actions'
import type {
  PublicBookingLookupResult,
  PublicRoomItem,
  RoomType,
} from '#/types'

export interface PublicRoomsSearchInput {
  checkIn?: string
  checkOut?: string
  guests?: number
  type?: string
}

export function validatePublicRoomsSearch(data?: PublicRoomsSearchInput) {
  return data ?? {}
}

function serializeRoom(r: {
  id: string
  roomNumber: string
  name: string
  type: string
  description: string | null
  capacity: number
  pricePerNight: unknown
  amenities: string[]
  images: string[]
  status: PublicRoomItem['status']
}): PublicRoomItem {
  return {
    id: r.id,
    roomNumber: r.roomNumber,
    name: r.name,
    type: r.type as RoomType,
    description: r.description,
    capacity: r.capacity,
    pricePerNight: Number(r.pricePerNight),
    amenities: r.amenities,
    images: r.images,
    status: r.status,
  }
}

export async function getPublicRoomsHandler({
  data,
}: {
  data?: PublicRoomsSearchInput
}): Promise<PublicRoomItem[]> {
  const guests =
    data?.guests && Number.isFinite(data.guests) && data.guests > 0
      ? data.guests
      : undefined
  const type = data?.type && data.type !== 'ALL' ? data.type : undefined

  const hasValidDates =
    isValidCalendarDate(data?.checkIn) &&
    isValidCalendarDate(data.checkOut) &&
    data.checkIn < data.checkOut

  const unavailableRoomIds = new Set<string>()
  if (hasValidDates) {
    const checkInDate = new Date(`${data.checkIn}T14:00:00+08:00`)
    const checkOutDate = new Date(`${data.checkOut}T12:00:00+08:00`)
    const overlapping = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
      select: { roomId: true },
    })
    for (const b of overlapping) {
      unavailableRoomIds.add(b.roomId)
    }
  }

  const rooms = await prisma.room.findMany({
    where: {
      deletedAt: null,
      status: { not: 'MAINTENANCE' },
      ...(guests ? { capacity: { gte: guests } } : {}),
      ...(type ? { type: { equals: type, mode: 'insensitive' } } : {}),
    },
    orderBy: { pricePerNight: 'asc' },
  })

  return rooms
    .filter((r) => !unavailableRoomIds.has(r.id))
    .map(serializeRoom)
}

export const getPublicRooms = createServerFn({ method: 'GET' })
  .validator(validatePublicRoomsSearch)
  .handler(getPublicRoomsHandler)

export function validatePublicRoomId(data: { id: string }) {
  return data
}

export async function getPublicRoomByIdHandler({
  data,
}: {
  data: { id: string }
}): Promise<PublicRoomItem | null> {
  const room = await prisma.room.findFirst({
    where: { id: data.id, deletedAt: null },
  })
  return room ? serializeRoom(room) : null
}

export const getPublicRoomById = createServerFn({ method: 'GET' })
  .validator(validatePublicRoomId)
  .handler(getPublicRoomByIdHandler)

export interface CreatePublicBookingInput {
  roomId: string
  checkIn: string
  checkOut: string
  guestsCount: number
  firstName: string
  lastName: string
  phone: string
  email?: string
  specialRequests?: string
}

export function validateCreatePublicBooking(data: CreatePublicBookingInput) {
  return data
}

export async function createPublicBookingHandler({
  data,
}: {
  data: CreatePublicBookingInput
}): Promise<{
  success: true
  bookingReference: string
  totalAmount: number
  nights: number
}> {
  if (!isValidCalendarDate(data.checkIn) || !isValidCalendarDate(data.checkOut)) {
    throw new Error('Please provide valid check-in and check-out dates.')
  }

  const checkInDate = new Date(`${data.checkIn}T14:00:00+08:00`)
  const checkOutDate = new Date(`${data.checkOut}T12:00:00+08:00`)
  const nights = calculateNights(checkInDate, checkOutDate)

  const firstName = data.firstName.trim()
  const lastName = data.lastName.trim()
  const phone = data.phone.trim()
  const email = data.email?.trim() || null

  if (!firstName || !lastName || !phone) {
    throw new Error('First name, last name, and phone number are required.')
  }

  const guestsCount = Number(data.guestsCount)
  if (!Number.isInteger(guestsCount) || guestsCount < 1) {
    throw new Error('Number of guests must be at least 1.')
  }

  const { booking, room, totalAmount } = await prisma.$transaction(
    async (tx) => {
      const targetRoom = await tx.room.findUnique({
        where: { id: data.roomId },
      })
      if (!targetRoom || targetRoom.deletedAt || targetRoom.status === 'MAINTENANCE') {
        throw new Error('Selected room is not available for booking.')
      }

      if (guestsCount > targetRoom.capacity) {
        throw new Error(
          `Room ${targetRoom.roomNumber} accommodates up to ${targetRoom.capacity} guests.`,
        )
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          roomId: data.roomId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
      })
      if (overlapping) {
        throw new Error(
          'Sorry, this room is already reserved for the selected dates.',
        )
      }

      // Resolve guest safely without attaching to an unrelated guest profile
      let guest = null as { id: string } | null
      if (email) {
        const byEmail = await tx.guest.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            deletedAt: true,
          },
        })
        if (byEmail) {
          const samePerson =
            byEmail.deletedAt === null &&
            byEmail.phone.trim() === phone &&
            byEmail.firstName.trim().toLowerCase() === firstName.toLowerCase() &&
            byEmail.lastName.trim().toLowerCase() === lastName.toLowerCase()
          if (!samePerson) {
            throw new Error(
              'A guest profile with this email already exists with different details. Please verify your name and phone number, or leave email blank.',
            )
          }
          guest = { id: byEmail.id }
        }
      }

      if (!guest) {
        guest = await tx.guest.findFirst({
          where: {
            deletedAt: null,
            phone,
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
          },
          select: { id: true },
        })
      }

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            firstName,
            lastName,
            phone,
            email,
          },
          select: { id: true },
        })
      }

      const duplicatePending = await tx.booking.findFirst({
        where: {
          roomId: data.roomId,
          guestId: guest.id,
          deletedAt: null,
          status: 'PENDING',
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        select: { bookingReference: true },
      })
      if (duplicatePending) {
        throw new Error(
          `You already have a pending reservation request (${duplicatePending.bookingReference}) for these dates.`,
        )
      }

      const computedTotal = nights * Number(targetRoom.pricePerNight)
      const created = await tx.booking.create({
        data: {
          bookingReference: generateBookingReference(),
          roomId: targetRoom.id,
          guestId: guest.id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights,
          guestsCount,
          totalAmount: computedTotal,
          amountPaid: 0,
          paymentStatus: 'UNPAID',
          status: 'PENDING',
          specialRequests: data.specialRequests?.trim() || null,
        },
      })

      return { booking: created, room: targetRoom, totalAmount: computedTotal }
    },
    { isolationLevel: 'Serializable' },
  )

  await createNotification({
    type: 'BOOKING_CREATED',
    title: `Online Booking Request: ${booking.bookingReference}`,
    message: `${firstName} ${lastName} requested Room ${room.roomNumber} (${nights}n · ${formatPeso(totalAmount)})`,
    href: '/admin/bookings',
  })

  return {
    success: true,
    bookingReference: booking.bookingReference,
    totalAmount,
    nights,
  }
}

export const createPublicBooking = createServerFn({ method: 'POST' })
  .validator(validateCreatePublicBooking)
  .handler(createPublicBookingHandler)

export interface LookupBookingInput {
  bookingReference: string
  contact: string
}

export function validateLookupBooking(data: LookupBookingInput) {
  return data
}

export async function lookupPublicBookingHandler({
  data,
}: {
  data: LookupBookingInput
}): Promise<PublicBookingLookupResult | null> {
  const ref = data.bookingReference.trim().toUpperCase()
  const contact = data.contact.trim().toLowerCase()
  if (!ref || !contact) {
    throw new Error('Booking reference and phone or email are required.')
  }

  const booking = await prisma.booking.findFirst({
    where: {
      bookingReference: ref,
      deletedAt: null,
    },
    include: {
      room: { select: { name: true, roomNumber: true } },
      guest: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
    },
  })

  if (!booking) return null

  const matchesPhone = booking.guest.phone.trim().toLowerCase() === contact
  const matchesEmail =
    (booking.guest.email?.trim().toLowerCase() ?? '') === contact

  if (!matchesPhone && !matchesEmail) {
    return null
  }

  const totalAmount = Number(booking.totalAmount)
  const amountPaid = Number(booking.amountPaid)

  return {
    bookingReference: booking.bookingReference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: booking.nights,
    guestsCount: booking.guestsCount,
    totalAmount,
    amountPaid,
    balanceDue: Math.max(totalAmount - amountPaid, 0),
    roomName: booking.room.name,
    roomNumber: booking.room.roomNumber,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
  }
}

export const lookupPublicBooking = createServerFn({ method: 'POST' })
  .validator(validateLookupBooking)
  .handler(lookupPublicBookingHandler)
