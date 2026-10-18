import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { logActivity } from '#/lib/logger'
import { RoomStatus } from '@prisma/client'
import { authSession } from '#/lib/auth-helpers'

// Helper for server-side authorization with strict permission typing
async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
) {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })

  if (!session?.user || !hasPermission(session.user as any, permission)) {
    throw new Error('Unauthorized: Insufficient permissions.')
  }
  return session.user
}

// Utility to parse/extract a display name from an image URL or Base64 string
function getImageNames(images?: string[]): string[] {
  if (!images || images.length === 0) return []
  return images.map((img, idx) => {
    if (img.startsWith('data:')) {
      const mime = img.split(';')[0].split('/')[1] || 'png'
      return `Uploaded_Image_${idx + 1}.${mime}`
    }
    return img.split('/').pop() || `Image_${idx + 1}`
  })
}

export const getRoomsList = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('view:rooms')

    const rooms = await prisma.room.findMany({
      // 👇 Remove the deletedAt restriction here so the page receives archived rooms too
      orderBy: { createdAt: 'desc' },
    })

    return rooms.map((room) => ({
      ...room,
      pricePerNight: Number(room.pricePerNight),
    }))
  },
)

export const createRoom = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      roomNumber: string
      name: string
      type: string
      description?: string
      capacity: number
      pricePerNight: number
      amenities?: string[]
      images?: string[] // 👈 Add images validator
    }) => data, // Synchronous identity validator
  )
  .handler(async ({ data }) => {
    const admin = await requirePermission('create:rooms')

    const existingRoom = await prisma.room.findUnique({
      where: { roomNumber: data.roomNumber },
    })

    if (existingRoom) {
      throw new Error(`Room number "${data.roomNumber}" already exists.`)
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: data.roomNumber.trim(),
        name: data.name.trim(),
        type: data.type,
        description: data.description?.trim(),
        capacity: data.capacity,
        pricePerNight: data.pricePerNight,
        amenities: data.amenities,
        images: data.images || [], // 👈 Save images array
      },
    })

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
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return {
      success: true,
      room: {
        ...room,
        pricePerNight: Number(room.pricePerNight),
      },
    }
  })

export const updateRoom = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      id: string
      roomNumber?: string
      name?: string
      type?: string
      description?: string
      capacity?: number
      pricePerNight?: number
      status?: RoomStatus
      amenities?: string[]
      images?: string[]
    }) => data,
  )
  .handler(async ({ data }) => {
    const admin = await requirePermission('update:rooms')

    const existingRoom = await prisma.room.findUnique({
      where: { id: data.id },
    })
    if (!existingRoom) throw new Error('Room not found.')

    const updatedRoom = await prisma.room.update({
      where: { id: data.id },
      data: {
        roomNumber: data.roomNumber,
        name: data.name,
        type: data.type,
        description: data.description,
        capacity: data.capacity,
        pricePerNight: data.pricePerNight,
        status: data.status,
        amenities: data.amenities,
        images: data.images,
      },
    })

    // Calculate changes/diffs
    const changes: string[] = []

    if (data.roomNumber && data.roomNumber !== existingRoom.roomNumber) {
      changes.push(
        `Room Number: "${existingRoom.roomNumber}" → "${data.roomNumber}"`,
      )
    }
    if (data.name && data.name !== existingRoom.name) {
      changes.push(`Display Name: "${existingRoom.name}" → "${data.name}"`)
    }
    if (data.type && data.type !== existingRoom.type) {
      changes.push(`Type: "${existingRoom.type}" → "${data.type}"`)
    }
    if (data.status && data.status !== existingRoom.status) {
      changes.push(`Status: "${existingRoom.status}" → "${data.status}"`)
    }
    if (data.capacity && data.capacity !== existingRoom.capacity) {
      changes.push(
        `Capacity: ${existingRoom.capacity} → ${data.capacity} guests`,
      )
    }
    if (
      data.pricePerNight &&
      Number(data.pricePerNight) !== Number(existingRoom.pricePerNight)
    ) {
      changes.push(
        `Price: ₱${existingRoom.pricePerNight} → ₱${data.pricePerNight}`,
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

    // Calculate Amenity Diffs
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

    // Calculate Image Diffs
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
        ? `Updated Room ${updatedRoom.roomNumber} - Changes: ${changes.join(' | ')}`
        : `Updated Room ${updatedRoom.roomNumber} - No field changes`

    const session = await authSession()
    await logActivity({
      userId: admin.id,
      action: 'ROOM_UPDATED',
      description: logDetails,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return {
      success: true,
      room: {
        ...updatedRoom,
        pricePerNight: Number(updatedRoom.pricePerNight),
      },
    }
  })

export const deleteRoom = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requirePermission('delete:rooms')

    const room = await prisma.room.findUnique({ where: { id: data.id } })
    if (!room) throw new Error('Room not found.')

    // Soft delete by updating deletedAt timestamp
    await prisma.room.update({
      where: { id: data.id },
      data: { deletedAt: new Date() },
    })

    const session = await authSession()
    await logActivity({
      userId: admin.id,
      action: 'ROOM_DELETED',
      description: `Soft deleted (archived) Room ${room.roomNumber} (${room.name})`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    return { success: true }
  })

// Restore Soft-Deleted Room Action
export const restoreRoom = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requirePermission('update:rooms')

    const room = await prisma.room.findUnique({ where: { id: data.id } })
    if (!room) throw new Error('Room not found.')

    // Set deletedAt back to null to restore room
    const restoredRoom = await prisma.room.update({
      where: { id: data.id },
      data: { deletedAt: null },
    })

    const session = await authSession()
    await logActivity({
      userId: admin.id,
      action: 'ROOM_RESTORED',
      description: `Restored archived Room ${restoredRoom.roomNumber} (${restoredRoom.name})`,
      ipAddress: session?.session?.ipAddress ?? null,
      userAgent: session?.session?.userAgent ?? null,
    })

    // Map Decimal to Number for TanStack Start serialization
    return {
      success: true,
      room: {
        ...restoredRoom,
        pricePerNight: Number(restoredRoom.pricePerNight),
      },
    }
  })
