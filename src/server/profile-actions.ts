import { createServerFn } from '@tanstack/react-start'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { prisma } from '#/lib/prisma'
import {
  buildObjectKey,
  extractObjectKey,
  isBase64DataUrl,
  isR2ManagedObjectKey,
  putR2Object,
  resolvePublicMediaUrl,
} from '#/lib/r2'
import { deleteSingleR2Media } from '#/server/upload'

export type ProfileActionType =
  | 'AVATAR_UPDATED'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_UPDATED'

export function validateProfileActivity(data: {
  action: ProfileActionType
  description: string
}) {
  return data
}

export async function logProfileActivityHandler({
  data,
}: {
  data: {
    action: ProfileActionType
    description: string
  }
}) {
  try {
    const session = await authSession()

    await logActivity({
      userId: session.user.id,
      action: data.action,
      description: data.description,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to log profile activity:', error)
    return { success: false, error: error.message }
  }
}

export const logProfileActivity = createServerFn({ method: 'POST' })
  .validator(validateProfileActivity)
  .handler(logProfileActivityHandler)

export function validateSaveProfileAvatar(data: { image: string | null }) {
  return data
}

/**
 * Inspects decoded file header magic bytes so we never trust client-supplied MIME types.
 */
function detectImageFormat(
  bytes: Uint8Array,
): { mimeType: string; ext: string } | null {
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg' }
  }
  if (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: 'png' }
  }
  if (
    bytes.byteLength >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { mimeType: 'image/gif', ext: 'gif' }
  }
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mimeType: 'image/webp', ext: 'webp' }
  }
  if (
    bytes.byteLength >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) {
    return { mimeType: 'image/avif', ext: 'avif' }
  }
  return null
}

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

export async function saveProfileAvatarHandler({
  data,
}: {
  data: { image: string | null }
}): Promise<{ success: boolean; image: string | null; error?: string }> {
  try {
    const session = await authSession()
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true, profileMediaId: true },
    })

    const raw = data.image?.trim() ?? ''
    if (!raw) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: session.user.id },
          data: { image: null, profileMediaId: null },
        })
      })
      if (existingUser?.image && isR2ManagedObjectKey(existingUser.image)) {
        try {
          await deleteSingleR2Media(existingUser.image)
        } catch (cleanupErr) {
          console.warn('Deferred old avatar cleanup:', cleanupErr)
        }
      }
      return { success: true, image: null }
    }

    let objectKey = ''
    let mimeType = 'image/webp'
    let sizeBytes: number | null = null

    if (isBase64DataUrl(raw)) {
      const match = /^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/s.exec(raw)
      if (!match) {
        throw new Error('Invalid image data URL')
      }
      const declaredMime = match[1].trim().toLowerCase()
      if (!ALLOWED_AVATAR_MIME_TYPES.has(declaredMime)) {
        throw new Error(`Unsupported avatar image type: ${declaredMime}`)
      }
      const base64Data = match[2]
      const bytes = new Uint8Array(Buffer.from(base64Data, 'base64'))
      if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error('Avatar image must be between 1 byte and 5MB')
      }
      const detected = detectImageFormat(bytes)
      if (!detected) {
        throw new Error('Decoded avatar bytes do not match an allowed image format')
      }
      mimeType = detected.mimeType
      const ext = detected.ext
      sizeBytes = bytes.byteLength
      const built = buildObjectKey('avatars', `avatar.${ext}`)
      objectKey = built.objectKey

      const uploadedToR2 = await putR2Object({
        objectKey,
        body: bytes,
        mimeType,
        isPrivate: false,
      })

      if (!uploadedToR2 && process.env.NODE_ENV !== 'test') {
        const [{ mkdir, writeFile }, path] = await Promise.all([
          import('node:fs/promises'),
          import('node:path'),
        ])
        const destPath = path.join(
          process.cwd(),
          'public',
          'uploads',
          objectKey,
        )
        await mkdir(path.dirname(destPath), { recursive: true })
        await writeFile(destPath, bytes)
      }
    } else {
      objectKey = extractObjectKey(raw)
      if (!objectKey) {
        throw new Error('Invalid avatar image reference')
      }
    }

    const displayUrl = resolvePublicMediaUrl(objectKey)

    await prisma.$transaction(async (tx) => {
      const media = await tx.media.upsert({
        where: { objectKey },
        create: {
          objectKey,
          bucket: 'public',
          mimeType,
          sizeBytes,
          status: 'READY',
          uploadedById: session.user.id,
        },
        update: {
          status: 'READY',
          deletedAt: null,
        },
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          image: displayUrl,
          profileMediaId: media.id,
        },
      })
    })

    if (
      existingUser?.image &&
      isR2ManagedObjectKey(existingUser.image) &&
      extractObjectKey(existingUser.image) !== objectKey
    ) {
      try {
        await deleteSingleR2Media(existingUser.image)
      } catch (cleanupErr) {
        console.warn('Deferred old avatar cleanup:', cleanupErr)
      }
    }

    return { success: true, image: displayUrl }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update avatar'
    return { success: false, image: null, error: message }
  }
}

export const saveProfileAvatar = createServerFn({ method: 'POST' })
  .validator(validateSaveProfileAvatar)
  .handler(saveProfileAvatarHandler)
