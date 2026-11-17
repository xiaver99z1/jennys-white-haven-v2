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
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: null, profileMediaId: null },
      })
      if (existingUser?.image && isR2ManagedObjectKey(existingUser.image)) {
        await deleteSingleR2Media(existingUser.image)
      }
      return { success: true, image: null }
    }

    let objectKey = ''
    let mimeType = 'image/webp'
    let sizeBytes: number | null = null

    if (isBase64DataUrl(raw)) {
      const match = /^data:([^;]+);base64,(.+)$/s.exec(raw)
      mimeType = (match?.[1] || 'image/webp').toLowerCase()
      const base64Data = match?.[2] || ''
      const ext = (mimeType.split('/')[1] || 'webp').replace('jpeg', 'jpg')
      const bytes = new Uint8Array(Buffer.from(base64Data, 'base64'))
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
      await deleteSingleR2Media(existingUser.image)
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
