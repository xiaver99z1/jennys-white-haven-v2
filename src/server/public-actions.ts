import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import {
  DEFAULT_EXTRA_CHILD_FEE,
  DEFAULT_EXTRA_PERSON_FEE,
  calculateExtraGuestsFee,
  formatExtraGuestsNote,
  isWholeHouseRoom,
} from '#/lib/constants/rooms'
import { isValidCalendarDate, formatPeso } from '#/lib/formatters'
import { isBase64DataUrl, resolvePublicMediaUrl } from '#/lib/r2'
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
  extraPersonFee?: unknown
  extraChildFee?: unknown
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
    extraPersonFee: Number(r.extraPersonFee ?? DEFAULT_EXTRA_PERSON_FEE),
    extraChildFee: Number(r.extraChildFee ?? DEFAULT_EXTRA_CHILD_FEE),
    amenities: r.amenities,
    images: r.images
      .filter((img) => Boolean(img.trim()) && !isBase64DataUrl(img))
      .map((img) => resolvePublicMediaUrl(img)),
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
  let wholeHouseBooked = false
  let anyRoomBooked = false
  if (hasValidDates) {
    const checkInDate = new Date(`${data.checkIn}T14:00:00+08:00`)
    const checkOutDate = new Date(`${data.checkOut}T12:00:00+08:00`)
    const [overlapping, overlappingBlocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          room: { deletedAt: null },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
        },
        select: {
          roomId: true,
          room: { select: { type: true } },
        },
      }),
      prisma.blockedDate.findMany({
        where: {
          startDate: { lt: checkOutDate },
          endDate: { gt: checkInDate },
        },
        select: {
          roomId: true,
          room: { select: { type: true, deletedAt: true } },
        },
      }),
    ])
    for (const b of overlapping) {
      anyRoomBooked = true
      unavailableRoomIds.add(b.roomId)
      if (isWholeHouseRoom(b.room)) {
        wholeHouseBooked = true
      }
    }
    for (const block of overlappingBlocks) {
      if (block.room?.deletedAt) continue
      anyRoomBooked = true
      if (!block.roomId || isWholeHouseRoom(block.room)) {
        wholeHouseBooked = true
      } else {
        unavailableRoomIds.add(block.roomId)
      }
    }
  }

  if (wholeHouseBooked) {
    return []
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
    .filter(
      (r) =>
        !unavailableRoomIds.has(r.id) &&
        !(anyRoomBooked && isWholeHouseRoom(r)),
    )
    .map(serializeRoom)
}

export const getPublicRooms = createServerFn({ method: 'GET' })
  .validator(validatePublicRoomsSearch)
  .handler(getPublicRoomsHandler)

export function validatePublicRoomId(data: { id: string }) {
  return data
}

function toPhIsoDate(date: Date): string {
  const phOffsetMs = 8 * 60 * 60 * 1000
  return new Date(date.getTime() + phOffsetMs).toISOString().slice(0, 10)
}

export async function getPublicRoomByIdHandler({
  data,
}: {
  data: { id: string }
}): Promise<PublicRoomItem | null> {
  const room = await prisma.room.findFirst({
    where: { id: data.id, deletedAt: null },
  })
  if (!room) return null

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let bookedRanges: Array<{ checkIn: string; checkOut: string }> = []
  try {
    const isWholeHouse = isWholeHouseRoom(room)
    const [activeBookings, activeBlockedDates] = await Promise.all([
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkOut: { gt: startOfToday },
          ...(isWholeHouse
            ? { room: { deletedAt: null } }
            : {
                OR: [
                  { roomId: room.id },
                  {
                    room: {
                      deletedAt: null,
                      type: { equals: 'Whole House', mode: 'insensitive' },
                    },
                  },
                ],
              }),
        },
        select: { checkIn: true, checkOut: true },
        orderBy: { checkIn: 'asc' },
      }),
      prisma.blockedDate.findMany({
        where: {
          endDate: { gt: startOfToday },
          ...(isWholeHouse
            ? {}
            : {
                OR: [
                  { roomId: null },
                  { roomId: room.id },
                  {
                    room: {
                      deletedAt: null,
                      type: { equals: 'Whole House', mode: 'insensitive' },
                    },
                  },
                ],
              }),
        },
        select: { startDate: true, endDate: true },
        orderBy: { startDate: 'asc' },
      }),
    ])
    bookedRanges = [
      ...activeBookings.map((b) => ({
        checkIn: toPhIsoDate(new Date(b.checkIn)),
        checkOut: toPhIsoDate(new Date(b.checkOut)),
      })),
      ...activeBlockedDates.map((b) => ({
        checkIn: toPhIsoDate(new Date(b.startDate)),
        checkOut: toPhIsoDate(new Date(b.endDate)),
      })),
    ]
  } catch {
    bookedRanges = []
  }

  return {
    ...serializeRoom(room),
    bookedRanges,
  }
}

export const getPublicRoomById = createServerFn({ method: 'GET' })
  .validator(validatePublicRoomId)
  .handler(getPublicRoomByIdHandler)

export interface CreatePublicBookingInput {
  roomId: string
  checkIn: string
  checkOut: string
  guestsCount: number
  extraChildren?: number
  extraAdults?: number
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

  const extraChildren = Number(data.extraChildren ?? 0)
  const extraAdults = Number(data.extraAdults ?? 0)
  if (
    !Number.isInteger(extraChildren) ||
    extraChildren < 0 ||
    !Number.isInteger(extraAdults) ||
    extraAdults < 0
  ) {
    throw new Error('Additional person counts must be non-negative whole numbers.')
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

      const isWholeHouse = isWholeHouseRoom(targetRoom)

      if ((tx as { blockedDate?: typeof prisma.blockedDate }).blockedDate?.findFirst) {
        const overlappingBlock = await tx.blockedDate.findFirst({
          where: {
            startDate: { lt: checkOutDate },
            endDate: { gt: checkInDate },
            ...(isWholeHouse
              ? {}
              : {
                  OR: [
                    { roomId: null },
                    { roomId: data.roomId },
                    {
                      room: {
                        deletedAt: null,
                        type: { equals: 'Whole House', mode: 'insensitive' },
                      },
                    },
                  ],
                }),
          },
        })
        if (overlappingBlock) {
          throw new Error(
            'Sorry, the property is unavailable for the selected dates.',
          )
        }
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
          ...(isWholeHouse
            ? { room: { deletedAt: null } }
            : {
                OR: [
                  { roomId: data.roomId },
                  {
                    room: {
                      deletedAt: null,
                      type: { equals: 'Whole House', mode: 'insensitive' },
                    },
                  },
                ],
              }),
        },
        include: {
          room: { select: { type: true } },
        },
      })
      if (overlapping) {
        if (isWholeHouse && !isWholeHouseRoom(overlapping.room)) {
          throw new Error(
            'Sorry, the Whole House cannot be reserved for the selected dates because one or more rooms are already booked.',
          )
        }
        if (!isWholeHouse && isWholeHouseRoom(overlapping.room)) {
          throw new Error(
            'Sorry, the entire house is already reserved for an exclusive stay on the selected dates.',
          )
        }
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
          guestId: guest.id,
          deletedAt: null,
          status: 'PENDING',
          checkIn: { lt: checkOutDate },
          checkOut: { gt: checkInDate },
          ...(isWholeHouse
            ? { room: { deletedAt: null } }
            : {
                OR: [
                  { roomId: data.roomId },
                  {
                    room: {
                      deletedAt: null,
                      type: { equals: 'Whole House', mode: 'insensitive' },
                    },
                  },
                ],
              }),
        },
        select: { bookingReference: true },
      })
      if (duplicatePending) {
        throw new Error(
          `You already have a pending reservation request (${duplicatePending.bookingReference}) for these dates.`,
        )
      }

      const extraPersonRate = Number(
        (targetRoom as { extraPersonFee?: unknown }).extraPersonFee ??
          DEFAULT_EXTRA_PERSON_FEE,
      )
      const extraChildRate = Number(
        (targetRoom as { extraChildFee?: unknown }).extraChildFee ??
          DEFAULT_EXTRA_CHILD_FEE,
      )
      const extraCounts = { extraChildren, extraAdults }
      const extraRates = {
        extraAdultFee: extraPersonRate,
        extraChildFee: extraChildRate,
      }
      const extraFeeTotal = calculateExtraGuestsFee(
        extraCounts,
        extraRates,
        nights,
      )
      const computedTotal =
        nights * Number(targetRoom.pricePerNight) + extraFeeTotal
      const extraNote = formatExtraGuestsNote(
        extraCounts,
        extraRates,
        nights,
      )
      const combinedSpecialRequests =
        [data.specialRequests?.trim(), extraNote]
          .filter(Boolean)
          .join(' ') || null

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
          specialRequests: combinedSpecialRequests,
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

  let existingReview: PublicBookingLookupResult['existingReview'] = null
  try {
    const foundReview = await prisma.review.findFirst({
      where: { bookingReference: booking.bookingReference },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true,
      },
    })
    if (foundReview) {
      existingReview = foundReview
    }
  } catch {
    existingReview = null
  }

  const canSubmitReview =
    booking.status === 'CHECKED_OUT' &&
    booking.paymentStatus === 'PAID' &&
    !existingReview

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
    canSubmitReview,
    existingReview,
  }
}

export const lookupPublicBooking = createServerFn({ method: 'POST' })
  .validator(validateLookupBooking)
  .handler(lookupPublicBookingHandler)
