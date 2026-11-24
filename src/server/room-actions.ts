import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { hasPermission } from '#/lib/permissions'
import { logActivity } from '#/lib/logger'
import type { RoomStatus } from '@prisma/client'
import { authSession } from '#/lib/auth-helpers'
import {
  DEFAULT_EXTRA_CHILD_FEE,
  DEFAULT_EXTRA_PERSON_FEE,
  isWholeHouseRoom,
} from '#/lib/constants/rooms'
import { isBase64DataUrl, resolvePublicMediaUrl } from '#/lib/r2'
import {
  persistRoomImagesToR2,
  purgeReplacedR2Objects,
} from '#/server/upload'

// Helper for server-side authorization with strict permission typing
export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
) {
  const session = await authSession()

  if (!hasPermission(session.user, permission)) {
    throw new Error('Unauthorized: Insufficient permissions.')
  }
  return session.user
}

// Utility to parse/extract a display name from an image URL or Base64 string
export function getImageNames(images?: string[]): string[] {
  if (!images || images.length === 0) return []
  return images.map((img, idx) => {
    if (img.startsWith('data:')) {
      const mime = img.split(';')[0].split('/')[1] || 'png'
      return `Uploaded_Image_${idx + 1}.${mime}`
    }
    return img.split('/').pop() || `Image_${idx + 1}`
  })
}

// --- 1. GET ROOMS LIST ---
export async function getRoomsListHandler() {
  await requirePermission('view:rooms')

  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return rooms.map((room) => ({
    ...room,
    pricePerNight: Number(room.pricePerNight),
    extraPersonFee: Number(
      (room as { extraPersonFee?: unknown }).extraPersonFee ??
        DEFAULT_EXTRA_PERSON_FEE,
    ),
    extraChildFee: Number(
      (room as { extraChildFee?: unknown }).extraChildFee ??
        DEFAULT_EXTRA_CHILD_FEE,
    ),
    images: room.images
      .filter(
        (img) =>
          Boolean(img.trim()) &&
          !isBase64DataUrl(img) &&
          !img.includes('vercel-storage.com'),
      )
      .map((img) => resolvePublicMediaUrl(img)),
  }))
}

export const getRoomsList = createServerFn({ method: 'GET' }).handler(
  getRoomsListHandler,
)

// --- 2. CREATE ROOM ---
export function validateCreateRoom(data: {
  roomNumber: string
  name: string
  type: string
  description?: string
  capacity: number
  pricePerNight: number
  extraPersonFee?: number
  extraChildFee?: number
  amenities?: string[]
  images?: string[]
}) {
  return data
}

export async function createRoomHandler({
  data,
}: {
  data: {
    roomNumber: string
    name: string
    type: string
    description?: string
    capacity: number
    pricePerNight: number
    extraPersonFee?: number
    extraChildFee?: number
    amenities?: string[]
    images?: string[]
  }
}) {
  const admin = await requirePermission('create:rooms')

  const existingRoom = await prisma.room.findUnique({
    where: { roomNumber: data.roomNumber },
  })

  if (existingRoom) {
    throw new Error(`Room number "${data.roomNumber}" already exists.`)
  }

  const uploadedImages = data.images
    ? await persistRoomImagesToR2({
        roomNumber: data.roomNumber.trim(),
        images: data.images,
        uploadedById: admin.id,
      })
    : []

  const normalizedType = isWholeHouseRoom({ type: data.type })
    ? 'Whole House'
    : data.type.trim()
  const extraPersonFee =
    data.extraPersonFee !== undefined
      ? Math.max(0, Number(data.extraPersonFee))
      : DEFAULT_EXTRA_PERSON_FEE
  const extraChildFee =
    data.extraChildFee !== undefined
      ? Math.max(0, Number(data.extraChildFee))
      : DEFAULT_EXTRA_CHILD_FEE

  const room = await prisma.room.create({
    data: {
      roomNumber: data.roomNumber.trim(),
      name: data.name.trim(),
      type: normalizedType,
      description: data.description?.trim(),
      capacity: data.capacity,
      pricePerNight: data.pricePerNight,
      extraPersonFee,
      extraChildFee,
      amenities: data.amenities,
      images: uploadedImages,
    },
  })

  if (uploadedImages.length > 0) {
    await persistRoomImagesToR2({
      roomId: room.id,
      roomNumber: room.roomNumber,
      images: uploadedImages,
      uploadedById: admin.id,
    })
  }

  const imageNames = getImageNames(data.images)

  const logDetails = [
    `Created Room ${room.roomNumber} (${room.name})`,
    `Type: ${room.type}`,
    `Capacity: ${room.capacity} guests`,
    `Price: ₱${room.pricePerNight.toLocaleString()}/night`,
    `Description: ${room.description || 'None'}`,
    `Amenities (${room.amenities.length}): ${room.amenities.join(', ') || 'None'}`,
    `Uploaded Images (${imageNames.length}): ${imageNames.join(', ') || 'None'}`,
  ].join(' | ')

  const session = await authSession()

  await logActivity({
    userId: admin.id,
    action: 'ROOM_CREATED',
    description: logDetails,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    room: {
      ...room,
      pricePerNight: Number(room.pricePerNight),
      extraPersonFee: Number(
        (room as { extraPersonFee?: unknown }).extraPersonFee ?? extraPersonFee,
      ),
      extraChildFee: Number(
        (room as { extraChildFee?: unknown }).extraChildFee ?? extraChildFee,
      ),
      images: room.images.map((img) => resolvePublicMediaUrl(img)),
    },
  }
}

export const createRoom = createServerFn({ method: 'POST' })
  .validator(validateCreateRoom)
  .handler(createRoomHandler)

// --- 3. UPDATE ROOM ---
export function validateUpdateRoom(data: {
  id: string
  roomNumber?: string
  name?: string
  type?: string
  description?: string
  capacity?: number
  pricePerNight?: number
  extraPersonFee?: number
  extraChildFee?: number
  status?: RoomStatus
  amenities?: string[]
  images?: string[]
}) {
  return data
}

export async function updateRoomHandler({
  data,
}: {
  data: {
    id: string
    roomNumber?: string
    name?: string
    type?: string
    description?: string
    capacity?: number
    pricePerNight?: number
    extraPersonFee?: number
    extraChildFee?: number
    status?: RoomStatus
    amenities?: string[]
    images?: string[]
  }
}) {
  const admin = await requirePermission('update:rooms')

  const existingRoom = await prisma.room.findUnique({
    where: { id: data.id },
  })
  if (!existingRoom) throw new Error('Room not found.')

  const normalizedType =
    data.type !== undefined
      ? isWholeHouseRoom({ type: data.type })
        ? 'Whole House'
        : data.type.trim()
      : undefined

  // Prevent converting a room to Whole House when its active bookings overlap with other rooms' active bookings
  if (
    normalizedType &&
    isWholeHouseRoom({ type: normalizedType }) &&
    !isWholeHouseRoom(existingRoom)
  ) {
    const ownActiveBookings = await prisma.booking.findMany({
      where: {
        roomId: data.id,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
      select: {
        id: true,
        bookingReference: true,
        checkIn: true,
        checkOut: true,
      },
    })

    for (const ownBooking of ownActiveBookings) {
      const conflict = await prisma.booking.findFirst({
        where: {
          roomId: { not: data.id },
          deletedAt: null,
          room: { deletedAt: null },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: ownBooking.checkOut },
          checkOut: { gt: ownBooking.checkIn },
        },
        include: {
          room: { select: { roomNumber: true, name: true } },
        },
      })
      if (conflict) {
        throw new Error(
          `Cannot convert Room ${existingRoom.roomNumber} to Whole House because its active booking (${ownBooking.bookingReference}) overlaps with Room ${conflict.room.roomNumber} (${conflict.bookingReference}).`,
        )
      }
    }
  }

  const nextImages = data.images
    ? await persistRoomImagesToR2({
        roomNumber: data.roomNumber ?? existingRoom.roomNumber,
        images: data.images,
        uploadedById: admin.id,
      })
    : undefined

  const updatedRoom = await prisma.room.update({
    where: { id: data.id },
    data: {
      roomNumber: data.roomNumber,
      name: data.name,
      type: normalizedType,
      description: data.description,
      capacity: data.capacity,
      pricePerNight: data.pricePerNight,
      ...(data.extraPersonFee !== undefined
        ? { extraPersonFee: Math.max(0, Number(data.extraPersonFee)) }
        : {}),
      ...(data.extraChildFee !== undefined
        ? { extraChildFee: Math.max(0, Number(data.extraChildFee)) }
        : {}),
      status: data.status,
      amenities: data.amenities,
      images: nextImages,
    },
  })

  if (nextImages) {
    await persistRoomImagesToR2({
      roomId: updatedRoom.id,
      roomNumber: updatedRoom.roomNumber,
      images: nextImages,
      uploadedById: admin.id,
    })
    await purgeReplacedR2Objects(existingRoom.images, nextImages)
  }

  const changes: string[] = []

  if (data.roomNumber && data.roomNumber !== existingRoom.roomNumber) {
    changes.push(
      `Room Number: "${existingRoom.roomNumber}" → "${data.roomNumber}"`,
    )
  }
  if (data.name && data.name !== existingRoom.name) {
    changes.push(`Display Name: "${existingRoom.name}" → "${data.name}"`)
  }
  if (normalizedType && normalizedType !== existingRoom.type) {
    changes.push(`Type: "${existingRoom.type}" → "${normalizedType}"`)
  }
  if (data.status && data.status !== existingRoom.status) {
    changes.push(`Status: "${existingRoom.status}" → "${data.status}"`)
  }
  if (data.capacity && data.capacity !== existingRoom.capacity) {
    changes.push(`Capacity: ${existingRoom.capacity} → ${data.capacity} guests`)
  }
  if (
    data.pricePerNight !== undefined &&
    Number(data.pricePerNight) !== Number(existingRoom.pricePerNight)
  ) {
    changes.push(
      `Price: ₱${existingRoom.pricePerNight} → ₱${data.pricePerNight}`,
    )
  }
  const existingExtraFee = Number(
    (existingRoom as { extraPersonFee?: unknown }).extraPersonFee ??
      DEFAULT_EXTRA_PERSON_FEE,
  )
  if (
    data.extraPersonFee !== undefined &&
    Number(data.extraPersonFee) !== existingExtraFee
  ) {
    changes.push(
      `Extra Adult Fee: ₱${existingExtraFee} → ₱${data.extraPersonFee}`,
    )
  }
  const existingChildFee = Number(
    (existingRoom as { extraChildFee?: unknown }).extraChildFee ??
      DEFAULT_EXTRA_CHILD_FEE,
  )
  if (
    data.extraChildFee !== undefined &&
    Number(data.extraChildFee) !== existingChildFee
  ) {
    changes.push(
      `Extra Child Fee: ₱${existingChildFee} → ₱${data.extraChildFee}`,
    )
  }
  if (
    data.description !== undefined &&
    data.description !== existingRoom.description
  ) {
    changes.push(
      `Description: "${existingRoom.description || 'None'}" → "${data.description || 'None'}"`,
    )
  }

  if (data.amenities) {
    const addedAmenities = data.amenities.filter(
      (a) => !existingRoom.amenities.includes(a),
    )
    const removedAmenities = existingRoom.amenities.filter(
      (a) => !data.amenities?.includes(a),
    )

    if (addedAmenities.length > 0) {
      changes.push(`Added Amenities: [${addedAmenities.join(', ')}]`)
    }
    if (removedAmenities.length > 0) {
      changes.push(`Removed Amenities: [${removedAmenities.join(', ')}]`)
    }
  }

  if (data.images) {
    const oldImageNames = getImageNames(existingRoom.images)
    const newImageNames = getImageNames(data.images)

    const addedImages = newImageNames.filter(
      (img) => !oldImageNames.includes(img),
    )
    const removedImages = oldImageNames.filter(
      (img) => !newImageNames.includes(img),
    )

    if (addedImages.length > 0) {
      changes.push(`Added Images: [${addedImages.join(', ')}]`)
    }
    if (removedImages.length > 0) {
      changes.push(`Removed Images: [${removedImages.join(', ')}]`)
    }
  }

  const logDetails =
    changes.length > 0
      ? `Updated Room ${updatedRoom.roomNumber}. Changes: ${changes.join(' | ')}`
      : `Updated Room ${updatedRoom.roomNumber}. No field changes`

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'ROOM_UPDATED',
    description: logDetails,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    room: {
      ...updatedRoom,
      pricePerNight: Number(updatedRoom.pricePerNight),
      extraPersonFee: Number(
        (updatedRoom as { extraPersonFee?: unknown }).extraPersonFee ??
          data.extraPersonFee ??
          DEFAULT_EXTRA_PERSON_FEE,
      ),
      extraChildFee: Number(
        (updatedRoom as { extraChildFee?: unknown }).extraChildFee ??
          data.extraChildFee ??
          DEFAULT_EXTRA_CHILD_FEE,
      ),
      images: updatedRoom.images.map((img) => resolvePublicMediaUrl(img)),
    },
  }
}

export const updateRoom = createServerFn({ method: 'POST' })
  .validator(validateUpdateRoom)
  .handler(updateRoomHandler)

// --- 4. DELETE ROOM ---
export function validateDeleteRoom(data: { id: string }) {
  return data
}

export async function deleteRoomHandler({ data }: { data: { id: string } }) {
  const admin = await requirePermission('delete:rooms')

  const room = await prisma.room.findUnique({ where: { id: data.id } })
  if (!room) throw new Error('Room not found.')

  await prisma.room.update({
    where: { id: data.id },
    data: { deletedAt: new Date() },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'ROOM_DELETED',
    description: `Soft deleted (archived) Room ${room.roomNumber} (${room.name})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const deleteRoom = createServerFn({ method: 'POST' })
  .validator(validateDeleteRoom)
  .handler(deleteRoomHandler)

// --- 5. RESTORE ROOM ---
export function validateRestoreRoom(data: { id: string }) {
  return data
}

export async function restoreRoomHandler({ data }: { data: { id: string } }) {
  const admin = await requirePermission('update:rooms')

  const room = await prisma.room.findUnique({ where: { id: data.id } })
  if (!room) throw new Error('Room not found.')

  const ownActiveBookings = await prisma.booking.findMany({
    where: {
      roomId: room.id,
      deletedAt: null,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    },
    select: {
      id: true,
      bookingReference: true,
      checkIn: true,
      checkOut: true,
    },
  })

  if (ownActiveBookings.length > 0) {
    const restoringWholeHouse = isWholeHouseRoom(room)
    for (const ownBooking of ownActiveBookings) {
      const conflict = await prisma.booking.findFirst({
        where: {
          roomId: { not: room.id },
          deletedAt: null,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          checkIn: { lt: ownBooking.checkOut },
          checkOut: { gt: ownBooking.checkIn },
          room: restoringWholeHouse
            ? { deletedAt: null }
            : {
                deletedAt: null,
                type: { equals: 'Whole House', mode: 'insensitive' },
              },
        },
        include: {
          room: { select: { roomNumber: true, name: true } },
        },
      })
      if (conflict) {
        throw new Error(
          `Cannot restore Room ${room.roomNumber} because its active booking (${ownBooking.bookingReference}) conflicts with Room ${conflict.room.roomNumber} (${conflict.bookingReference}).`,
        )
      }
    }
  }

  const restoredRoom = await prisma.room.update({
    where: { id: data.id },
    data: { deletedAt: null },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'ROOM_RESTORED',
    description: `Restored archived Room ${restoredRoom.roomNumber} (${restoredRoom.name})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    room: {
      ...restoredRoom,
      pricePerNight: Number(restoredRoom.pricePerNight),
      extraPersonFee: Number(
        (restoredRoom as { extraPersonFee?: unknown }).extraPersonFee ??
          DEFAULT_EXTRA_PERSON_FEE,
      ),
      extraChildFee: Number(
        (restoredRoom as { extraChildFee?: unknown }).extraChildFee ??
          DEFAULT_EXTRA_CHILD_FEE,
      ),
    },
  }
}

export const restoreRoom = createServerFn({ method: 'POST' })
  .validator(validateRestoreRoom)
  .handler(restoreRoomHandler)
