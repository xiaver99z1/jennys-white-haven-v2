import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { logActivity } from '#/lib/logger'
import { RoomStatus } from '@prisma/client'

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

// 1. Get All Rooms
export const getRoomsList = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('view:rooms')

    const rooms = await prisma.room.findMany({
      orderBy: { roomNumber: 'asc' },
    })

    // Safely serialize Decimal to number for the client
    return rooms.map((room) => ({
      ...room,
      pricePerNight: Number(room.pricePerNight),
    }))
  },
)

// 2. Create Room
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

    await logActivity({
      userId: admin.id,
      action: 'ROOM_CREATED',
      description: `${admin.email} created new room "${room.roomNumber}" (${room.name})`,
    })

    return {
      success: true,
      room: {
        ...room,
        pricePerNight: Number(room.pricePerNight),
      },
    }
  })

// 3. Update Room Details / Status
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
      images?: string[] // 👈 1. Add images to validator type here
    }) => data,
  )
  .handler(async ({ data }) => {
    const admin = await requirePermission('update:rooms')

    const targetRoom = await prisma.room.findUnique({ where: { id: data.id } })
    if (!targetRoom) throw new Error('Room not found.')

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
        images: data.images, // 👈 2. Pass images to prisma update here
      },
    })

    await logActivity({
      userId: admin.id,
      action: 'ROOM_UPDATED',
      description: `${admin.email} updated room "${updatedRoom.roomNumber}" details/status`,
    })

    return {
      success: true,
      room: {
        ...updatedRoom,
        pricePerNight: Number(updatedRoom.pricePerNight),
      },
    }
  })

// 4. Delete Room
export const deleteRoom = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requirePermission('delete:rooms')

    const room = await prisma.room.findUnique({ where: { id: data.id } })
    if (!room) throw new Error('Room not found.')

    await prisma.room.delete({ where: { id: data.id } })

    await logActivity({
      userId: admin.id,
      action: 'ROOM_DELETED',
      description: `${admin.email} deleted room "${room.roomNumber}"`,
    })

    return { success: true }
  })
