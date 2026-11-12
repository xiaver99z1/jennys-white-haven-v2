import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'

// --- 1. GET GUESTS LIST ---
export async function getGuestsListHandler() {
  await requirePermission('view:guests')

  const guests = await prisma.guest.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return guests
}

export const getGuestsList = createServerFn({ method: 'GET' }).handler(
  getGuestsListHandler,
)

// --- 2. CREATE GUEST ---
export function validateCreateGuest(data: {
  firstName: string
  lastName: string
  email?: string
  phone: string
  idType?: string
  idNumber?: string
  nationality?: string
  specialNotes?: string
}) {
  return data
}

export async function createGuestHandler({
  data,
}: {
  data: {
    firstName: string
    lastName: string
    email?: string
    phone: string
    idType?: string
    idNumber?: string
    nationality?: string
    specialNotes?: string
  }
}) {
  const admin = await requirePermission('create:guests')
  const normalizedEmail = data.email?.trim() || null

  if (normalizedEmail) {
    const existingGuest = await prisma.guest.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingGuest) {
      throw new Error(`Guest email "${normalizedEmail}" is already registered.`)
    }
  }

  const guest = await prisma.guest.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
      phone: data.phone.trim(),
      idType: data.idType?.trim() || null,
      idNumber: data.idNumber?.trim() || null,
      nationality: data.nationality?.trim() || 'Filipino',
      specialNotes: data.specialNotes?.trim() || null,
    },
  })

  const logDetails = [
    `Created Guest ${guest.firstName} ${guest.lastName}`,
    `Phone: ${guest.phone}`,
    `Email: ${guest.email || 'None'}`,
    `Nationality: ${guest.nationality || 'Filipino'}`,
    `ID: ${guest.idType || 'None'} (${guest.idNumber || 'None'})`,
    `Notes: ${guest.specialNotes || 'None'}`,
  ].join(' | ')

  const session = await authSession()

  await logActivity({
    userId: admin.id,
    action: 'GUEST_CREATED',
    description: logDetails,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    guest,
  }
}

export const createGuest = createServerFn({ method: 'POST' })
  .validator(validateCreateGuest)
  .handler(createGuestHandler)

// --- 3. UPDATE GUEST ---
export function validateUpdateGuest(data: {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  idType?: string
  idNumber?: string
  nationality?: string
  specialNotes?: string
}) {
  return data
}

export async function updateGuestHandler({
  data,
}: {
  data: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    idType?: string
    idNumber?: string
    nationality?: string
    specialNotes?: string
  }
}) {
  const admin = await requirePermission('update:guests')

  const existingGuest = await prisma.guest.findUnique({
    where: { id: data.id },
  })
  if (!existingGuest) throw new Error('Guest not found.')

  const normalizedEmail =
    data.email !== undefined ? data.email.trim() || null : existingGuest.email

  if (normalizedEmail && normalizedEmail !== existingGuest.email) {
    const duplicateEmail = await prisma.guest.findUnique({
      where: { email: normalizedEmail },
    })
    if (duplicateEmail) {
      throw new Error(`Guest email "${normalizedEmail}" is already registered.`)
    }
  }

  const updatedGuest = await prisma.guest.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim(),
      idType: data.idType !== undefined ? data.idType.trim() || null : undefined,
      idNumber:
        data.idNumber !== undefined ? data.idNumber.trim() || null : undefined,
      nationality:
        data.nationality !== undefined
          ? data.nationality.trim() || 'Filipino'
          : undefined,
      specialNotes:
        data.specialNotes !== undefined
          ? data.specialNotes.trim() || null
          : undefined,
    },
  })

  const changes: string[] = []

  if (data.firstName && data.firstName.trim() !== existingGuest.firstName) {
    changes.push(
      `First Name: "${existingGuest.firstName}" → "${data.firstName.trim()}"`,
    )
  }
  if (data.lastName && data.lastName.trim() !== existingGuest.lastName) {
    changes.push(
      `Last Name: "${existingGuest.lastName}" → "${data.lastName.trim()}"`,
    )
  }
  if (data.phone && data.phone.trim() !== existingGuest.phone) {
    changes.push(`Phone: "${existingGuest.phone}" → "${data.phone.trim()}"`)
  }
  if (data.email !== undefined && normalizedEmail !== existingGuest.email) {
    changes.push(
      `Email: "${existingGuest.email || 'None'}" → "${normalizedEmail || 'None'}"`,
    )
  }
  const nextNationality =
    data.nationality !== undefined
      ? data.nationality.trim() || 'Filipino'
      : undefined
  const prevNationality = existingGuest.nationality || 'Filipino'
  if (nextNationality !== undefined && nextNationality !== prevNationality) {
    changes.push(`Nationality: "${prevNationality}" → "${nextNationality}"`)
  }
  if (
    data.idType !== undefined &&
    (data.idType.trim() || null) !== existingGuest.idType
  ) {
    changes.push(
      `ID Type: "${existingGuest.idType || 'None'}" → "${data.idType.trim() || 'None'}"`,
    )
  }
  if (
    data.idNumber !== undefined &&
    (data.idNumber.trim() || null) !== existingGuest.idNumber
  ) {
    changes.push(
      `ID Number: "${existingGuest.idNumber || 'None'}" → "${data.idNumber.trim() || 'None'}"`,
    )
  }
  if (
    data.specialNotes !== undefined &&
    (data.specialNotes.trim() || null) !== existingGuest.specialNotes
  ) {
    changes.push(
      `Special Notes: "${existingGuest.specialNotes || 'None'}" → "${data.specialNotes.trim() || 'None'}"`,
    )
  }

  const logDetails =
    changes.length > 0
      ? `Updated Guest ${updatedGuest.firstName} ${updatedGuest.lastName}. Changes: ${changes.join(' | ')}`
      : `Updated Guest ${updatedGuest.firstName} ${updatedGuest.lastName}. No field changes`

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'GUEST_UPDATED',
    description: logDetails,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    guest: updatedGuest,
  }
}

export const updateGuest = createServerFn({ method: 'POST' })
  .validator(validateUpdateGuest)
  .handler(updateGuestHandler)

// --- 4. DELETE GUEST (SOFT DELETE) ---
export function validateDeleteGuest(data: { id: string }) {
  return data
}

export async function deleteGuestHandler({ data }: { data: { id: string } }) {
  const admin = await requirePermission('delete:guests')

  const guest = await prisma.guest.findUnique({ where: { id: data.id } })
  if (!guest) throw new Error('Guest not found.')

  await prisma.guest.update({
    where: { id: data.id },
    data: { deletedAt: new Date() },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'GUEST_DELETED',
    description: `Soft deleted (archived) Guest ${guest.firstName} ${guest.lastName} (${guest.phone})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return { success: true }
}

export const deleteGuest = createServerFn({ method: 'POST' })
  .validator(validateDeleteGuest)
  .handler(deleteGuestHandler)

// --- 5. RESTORE GUEST ---
export function validateRestoreGuest(data: { id: string }) {
  return data
}

export async function restoreGuestHandler({ data }: { data: { id: string } }) {
  const admin = await requirePermission('update:guests')

  const guest = await prisma.guest.findUnique({ where: { id: data.id } })
  if (!guest) throw new Error('Guest not found.')

  const restoredGuest = await prisma.guest.update({
    where: { id: data.id },
    data: { deletedAt: null },
  })

  const session = await authSession()
  await logActivity({
    userId: admin.id,
    action: 'GUEST_RESTORED',
    description: `Restored archived Guest ${restoredGuest.firstName} ${restoredGuest.lastName} (${restoredGuest.phone})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    guest: restoredGuest,
  }
}

export const restoreGuest = createServerFn({ method: 'POST' })
  .validator(validateRestoreGuest)
  .handler(restoreGuestHandler)
