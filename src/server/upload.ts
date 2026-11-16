import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import {
  buildObjectKey,
  createR2PresignedDownloadUrl,
  createR2PresignedUploadUrl,
  deleteR2Object,
  extractObjectKey,
  isBase64DataUrl,
  isR2ManagedObjectKey,
  putR2Object,
  resolvePublicMediaUrl,
} from '#/lib/r2'
import type { MediaScope } from '#/lib/r2'

export function validateUploadAvatar(formData: FormData) {
  return formData
}

export interface PresignedUploadInput {
  filename: string
  mimeType: string
  sizeBytes?: number
  scope?: MediaScope
}

export function validatePresignedUploadInput(data: PresignedUploadInput) {
  return data
}

export async function getPresignedUploadUrlHandler({
  data,
}: {
  data: PresignedUploadInput
}) {
  const filename = data.filename.trim()
  if (!filename) {
    throw new Error('Filename is required')
  }

  const scope: MediaScope = data.scope ?? 'rooms'
  const isPrivate = scope === 'bookings'
  const mimeType = data.mimeType.trim() || 'image/webp'
  const { objectKey, thumbnailKey } = buildObjectKey(scope, filename)

  const media = await prisma.$transaction(async (tx) => {
    return await tx.media.upsert({
      where: { objectKey },
      create: {
        objectKey,
        thumbnailKey,
        bucket: isPrivate ? 'private' : 'public',
        mimeType,
        sizeBytes: data.sizeBytes ?? null,
        status: 'PENDING_UPLOAD',
      },
      update: {
        thumbnailKey,
        mimeType,
        sizeBytes: data.sizeBytes ?? null,
        status: 'PENDING_UPLOAD',
        deletedAt: null,
      },
    })
  })

  const presigned = await createR2PresignedUploadUrl({
    objectKey,
    mimeType,
    isPrivate,
  })

  return {
    mediaId: media.id,
    objectKey,
    thumbnailKey,
    uploadUrl: presigned?.uploadUrl ?? null,
    publicUrl:
      presigned?.publicUrl ??
      (isPrivate ? objectKey : resolvePublicMediaUrl(objectKey)),
  }
}

export const getPresignedUploadUrl = createServerFn({ method: 'POST' })
  .validator(validatePresignedUploadInput)
  .handler(getPresignedUploadUrlHandler)

export function validatePrivateMediaInput(data: { objectKey: string }) {
  return data
}

export async function getPrivateMediaUrlHandler({
  data,
}: {
  data: { objectKey: string }
}) {
  const key = extractObjectKey(data.objectKey)
  if (!key) {
    throw new Error('Object key is required')
  }
  const signedUrl = await createR2PresignedDownloadUrl({ objectKey: key })
  return { url: signedUrl ?? `/uploads/${key}` }
}

export const getPrivateMediaUrl = createServerFn({ method: 'POST' })
  .validator(validatePrivateMediaInput)
  .handler(getPrivateMediaUrlHandler)

/**
 * Deletes a single R2 object after marking its Media row PENDING_DELETE in PostgreSQL.
 */
export async function deleteSingleR2Media(
  keyOrUrl: string,
  isPrivate: boolean = false,
): Promise<void> {
  if (!isR2ManagedObjectKey(keyOrUrl)) return
  const objectKey = extractObjectKey(keyOrUrl)
  if (!objectKey) return

  const prismaAny = prisma as unknown as { media?: typeof prisma.media }

  if (prismaAny.media) {
    await prismaAny.media.updateMany({
      where: { objectKey },
      data: {
        status: 'PENDING_DELETE',
        deletedAt: new Date(),
      },
    })
  }

  try {
    await deleteR2Object({ objectKey, isPrivate })
    if (prismaAny.media) {
      await prismaAny.media.deleteMany({
        where: { objectKey, status: 'PENDING_DELETE' },
      })
    }
  } catch (err) {
    console.warn('Deferred R2 deletion to cleanup job:', err)
    if (prismaAny.media) {
      await prismaAny.media.updateMany({
        where: { objectKey },
        data: { status: 'FAILED_DELETE' },
      })
    }
  }
}

/**
 * Compares previous image URLs/keys with updated image URLs/keys and deletes any
 * removed or replaced R2 objects after a DB update commits.
 */
export async function purgeReplacedR2Objects(
  oldUrlsOrKeys: string[],
  newUrlsOrKeys: string[],
): Promise<void> {
  const keptKeys = new Set(
    newUrlsOrKeys.map((u) => extractObjectKey(u)).filter(Boolean),
  )

  for (const oldItem of oldUrlsOrKeys) {
    if (!isR2ManagedObjectKey(oldItem)) continue
    const oldKey = extractObjectKey(oldItem)
    if (oldKey && !keptKeys.has(oldKey)) {
      await deleteSingleR2Media(oldKey, oldKey.startsWith('private/bookings/'))
    }
  }
}

/**
 * Converts any Base64 data URLs from AddRoomModal / EditRoomModal into real
 * Cloudflare R2 objects, syncs Media + RoomMedia rows, and returns the public R2 CDN URLs.
 */
export async function persistRoomImagesToR2(params: {
  roomId?: string
  roomNumber: string
  images: string[]
  uploadedById?: string
}): Promise<string[]> {
  const resolvedUrls: string[] = []
  const mediaEntries: Array<{
    objectKey: string
    thumbnailKey: string | null
    mimeType: string
    sizeBytes: number | null
  }> = []

  for (const [idx, raw] of params.images.entries()) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    if (isBase64DataUrl(trimmed)) {
      const match = /^data:([^;]+);base64,(.+)$/s.exec(trimmed)
      const mimeType = match?.[1] || 'image/jpeg'
      const base64Data = match?.[2] || ''
      const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const bytes = new Uint8Array(Buffer.from(base64Data, 'base64'))
      const { objectKey, thumbnailKey } = buildObjectKey(
        'rooms',
        `room-${params.roomNumber}-${idx + 1}.${ext}`,
        Date.now() + idx,
      )

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
        const destPath = path.join(process.cwd(), 'public', 'uploads', objectKey)
        await mkdir(path.dirname(destPath), { recursive: true })
        await writeFile(destPath, bytes)
      }

      // Rule #1: Store ONLY the object key in PostgreSQL (resolved to URL on read)
      resolvedUrls.push(objectKey)
      mediaEntries.push({
        objectKey,
        thumbnailKey,
        mimeType,
        sizeBytes: bytes.byteLength,
      })
    } else {
      const objectKey = extractObjectKey(trimmed)
      resolvedUrls.push(objectKey || trimmed)
      if (objectKey) {
        mediaEntries.push({
          objectKey,
          thumbnailKey: isR2ManagedObjectKey(objectKey)
            ? `rooms/thumbs/${objectKey.replace(/^rooms\//, '')}`
            : null,
          mimeType: 'image/webp',
          sizeBytes: null,
        })
      }
    }
  }

  const prismaAny = prisma as unknown as {
    media?: typeof prisma.media
    roomMedia?: typeof prisma.roomMedia
  }
  if (params.roomId && prismaAny.media && prismaAny.roomMedia) {
    await prismaAny.roomMedia.deleteMany({ where: { roomId: params.roomId } })
    for (const [idx, entry] of mediaEntries.entries()) {
      const mediaRow = await prismaAny.media.upsert({
        where: { objectKey: entry.objectKey },
        create: {
          objectKey: entry.objectKey,
          thumbnailKey: entry.thumbnailKey,
          bucket: 'public',
          mimeType: entry.mimeType,
          sizeBytes: entry.sizeBytes,
          status: 'READY',
          uploadedById: params.uploadedById ?? null,
        },
        update: {
          thumbnailKey: entry.thumbnailKey,
          status: 'READY',
          deletedAt: null,
        },
      })
      await prismaAny.roomMedia.create({
        data: {
          roomId: params.roomId,
          mediaId: mediaRow.id,
          sortOrder: idx,
          isPrimary: idx === 0,
        },
      })
    }
  }

  return resolvedUrls
}

export async function uploadAvatarHandler({ data }: { data: FormData }) {
  const file = data.get('file') as File | null
  const oldImageUrl = data.get('oldImageUrl') as string | null
  const rawScope = (data.get('scope') as string | null)?.trim()
  const scope: MediaScope =
    rawScope === 'rooms' || rawScope === 'cms' || rawScope === 'bookings'
      ? rawScope
      : 'avatars'

  if (!file) {
    throw new Error('No file provided')
  }

  const isPrivate = scope === 'bookings'
  const mimeType = file.type || 'image/webp'
  const { objectKey, thumbnailKey } = buildObjectKey(
    scope,
    file.name || 'upload.webp',
  )

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  // 1. Store file in Cloudflare R2 (or local public/uploads disk fallback in dev — NEVER Base64 in DB)
  const uploadedToR2 = await putR2Object({
    objectKey,
    body: bytes,
    mimeType,
    isPrivate,
  })

  if (!uploadedToR2 && process.env.NODE_ENV !== 'test') {
    const [{ mkdir, writeFile }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ])
    const destPath = path.join(process.cwd(), 'public', 'uploads', objectKey)
    await mkdir(path.dirname(destPath), { recursive: true })
    await writeFile(destPath, bytes)
  }

  const oldKey =
    oldImageUrl && !isBase64DataUrl(oldImageUrl)
      ? extractObjectKey(oldImageUrl)
      : ''

  // 2. Record Media key in PostgreSQL & mark old Media as PENDING_DELETE inside a transaction
  await prisma.$transaction(async (tx) => {
    await tx.media.upsert({
      where: { objectKey },
      create: {
        objectKey,
        thumbnailKey,
        bucket: isPrivate ? 'private' : 'public',
        mimeType,
        sizeBytes: file.size || bytes.byteLength,
        status: 'READY',
      },
      update: {
        thumbnailKey,
        mimeType,
        sizeBytes: file.size || bytes.byteLength,
        status: 'READY',
        deletedAt: null,
      },
    })

    if (oldKey && oldKey !== objectKey) {
      await tx.media.updateMany({
        where: { objectKey: oldKey },
        data: {
          status: 'PENDING_DELETE',
          deletedAt: new Date(),
        },
      })
    }
  })

  // 3. Delete old R2 object ONLY AFTER DB transaction commits; mark FAILED_DELETE for cleanup job if R2 fails
  if (oldKey && oldKey !== objectKey) {
    try {
      await deleteR2Object({ objectKey: oldKey, isPrivate })
      await prisma.media.deleteMany({
        where: { objectKey: oldKey, status: 'PENDING_DELETE' },
      })
    } catch (err) {
      console.warn('Deferred R2 deletion to cleanup job:', err)
      await prisma.media.updateMany({
        where: { objectKey: oldKey },
        data: { status: 'FAILED_DELETE' },
      })
    }
  }

  return isPrivate ? objectKey : resolvePublicMediaUrl(objectKey)
}

export const uploadAvatar = createServerFn({ method: 'POST' })
  .validator(validateUploadAvatar)
  .handler(uploadAvatarHandler)

export function validateDeleteMediaInput(data: { keyOrUrl: string }) {
  return data
}

export async function deleteUploadedMediaHandler({
  data,
}: {
  data: { keyOrUrl: string }
}) {
  await deleteSingleR2Media(data.keyOrUrl)
  return { success: true }
}

export const deleteUploadedMedia = createServerFn({ method: 'POST' })
  .validator(validateDeleteMediaInput)
  .handler(deleteUploadedMediaHandler)

/**
 * Rule #6: Background / scheduled cleanup job for PENDING_DELETE & FAILED_DELETE R2 objects.
 */
export async function cleanupPendingMediaDeletionsHandler(): Promise<{
  deletedCount: number
  failedCount: number
}> {
  const pending = await prisma.media.findMany({
    where: {
      status: { in: ['PENDING_DELETE', 'FAILED_DELETE'] },
    },
    take: 50,
  })

  let deletedCount = 0
  let failedCount = 0

  for (const item of pending) {
    try {
      await deleteR2Object({
        objectKey: item.objectKey,
        isPrivate: item.bucket === 'private',
      })
      await prisma.media.delete({ where: { id: item.id } })
      deletedCount += 1
    } catch {
      await prisma.media.update({
        where: { id: item.id },
        data: { status: 'FAILED_DELETE' },
      })
      failedCount += 1
    }
  }

  return { deletedCount, failedCount }
}

export const cleanupPendingMediaDeletions = createServerFn({
  method: 'POST',
}).handler(cleanupPendingMediaDeletionsHandler)
