export type MediaScope = 'avatars' | 'rooms' | 'cms' | 'bookings'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  privateBucketName: string
  publicUrl: string
}

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? ''
  const bucketName = process.env.R2_BUCKET_NAME?.trim() ?? ''
  const rawPrivateBucket =
    process.env.R2_PRIVATE_BUCKET_NAME?.split('#')[0]?.trim() ?? ''
  const privateBucketName = rawPrivateBucket || bucketName
  const publicUrl = (
    process.env.R2_PUBLIC_URL?.split('#')[0]?.trim() ?? ''
  ).replace(/\/+$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    privateBucketName,
    publicUrl,
  }
}

function resolveTargetBucket(config: R2Config, isPrivate?: boolean): string {
  if (!isPrivate) return config.bucketName
  const explicitPrivate =
    process.env.R2_PRIVATE_BUCKET_NAME?.split('#')[0]?.trim() ?? ''
  if (!explicitPrivate || explicitPrivate === config.bucketName) {
    throw new Error(
      'R2_PRIVATE_BUCKET_NAME must be set to a dedicated private bucket for private documents.',
    )
  }
  return explicitPrivate
}

async function getR2Client(config: R2Config) {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Rule #1: Never store image binary / Base64 data URLs in PostgreSQL.
 */
export function isBase64DataUrl(value: string): boolean {
  return value.trim().toLowerCase().startsWith('data:')
}

/**
 * Sanitizes a filename and builds an R2 object key + optional thumbnail key.
 */
export function buildObjectKey(
  scope: MediaScope,
  filename: string,
  timestamp?: number,
): { objectKey: string; thumbnailKey: string | null } {
  const cleaned = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const safeName = cleaned || 'asset.webp'
  const prefix = scope === 'bookings' ? 'private/bookings' : scope
  const uniqueId =
    timestamp !== undefined
      ? String(timestamp)
      : `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const objectKey = `${prefix}/${uniqueId}-${safeName}`
  const thumbnailKey =
    scope === 'rooms' ? `rooms/thumbs/${uniqueId}-${safeName}` : null
  return { objectKey, thumbnailKey }
}

/**
 * Extracts a normalized R2 object key from a stored key, `/uploads/...` path, or full CDN / `.r2.dev` URL.
 */
export function extractObjectKey(keyOrUrl: string): string {
  const trimmed = keyOrUrl.trim()
  if (!trimmed || isBase64DataUrl(trimmed)) return ''

  const publicUrl = (process.env.R2_PUBLIC_URL?.trim() ?? '').replace(
    /\/+$/,
    '',
  )
  if (publicUrl && trimmed.startsWith(`${publicUrl}/`)) {
    return trimmed.slice(publicUrl.length + 1)
  }

  if (trimmed.startsWith('/api/media/view')) {
    const qIdx = trimmed.indexOf('?')
    if (qIdx !== -1) {
      const params = new URLSearchParams(trimmed.slice(qIdx + 1))
      const k = params.get('key')
      if (k) return k
    }
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed.slice('/uploads/'.length)
  }

  const r2DevMatch = /^https?:\/\/[^/]+\.r2\.dev\/(.+)$/i.exec(trimmed)
  if (r2DevMatch?.[1]) {
    return r2DevMatch[1]
  }

  return trimmed
}

/**
 * Checks whether a normalized key belongs to our R2 bucket (as opposed to an external URL like Unsplash).
 */
export function isR2ManagedObjectKey(keyOrUrl: string): boolean {
  const key = extractObjectKey(keyOrUrl)
  if (!key || key.startsWith('http://') || key.startsWith('https://')) {
    return false
  }
  return /^(avatars|rooms|cms|private\/bookings)\/.+/.test(key)
}

/**
 * Rule #3 & #5: Resolves an object key or external URL into a public CDN URL
 * (or thumbnail variant for room listing pages).
 */
export function resolvePublicMediaUrl(
  keyOrUrl: string,
  options?: { thumbnail?: boolean },
): string {
  const trimmed = keyOrUrl.trim()
  if (!trimmed || isBase64DataUrl(trimmed)) return ''

  const publicUrl = (process.env.R2_PUBLIC_URL?.trim() ?? '').replace(
    /\/+$/,
    '',
  )

  // If a stored value is an .r2.dev URL or matches R2_PUBLIC_URL, normalize it to its object key first
  const extractedKey = extractObjectKey(trimmed)
  const hasR2 = getR2Config() !== null
  if (isR2ManagedObjectKey(extractedKey)) {
    // Serve via first-party /api/media/view?key=... route when using .r2.dev or when R2 is configured without a custom CDN domain
    if (publicUrl.endsWith('.r2.dev') || (!publicUrl && hasR2)) {
      return `/api/media/view?key=${encodeURIComponent(extractedKey)}`
    }
    if (publicUrl) {
      if (options?.thumbnail) {
        return `${publicUrl}/cdn-cgi/image/width=640,quality=80,format=auto/${extractedKey}`
      }
      return `${publicUrl}/${extractedKey}`
    }
    return `/uploads/${extractedKey}`
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed
  }

  if (publicUrl && !publicUrl.endsWith('.r2.dev')) {
    if (options?.thumbnail) {
      return `${publicUrl}/cdn-cgi/image/width=640,quality=80,format=auto/${trimmed}`
    }
    return `${publicUrl}/${trimmed}`
  }

  return `/uploads/${trimmed}`
}

/**
 * Creates a presigned PUT URL for uploading directly to Cloudflare R2.
 */
export async function createR2PresignedUploadUrl(params: {
  objectKey: string
  mimeType: string
  isPrivate?: boolean
  expiresInSeconds?: number
}): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const config = getR2Config()
  if (!config) return null

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const client = await getR2Client(config)
  const bucket = resolveTargetBucket(config, params.isPrivate)
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.objectKey,
    ContentType: params.mimeType,
  })

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 600,
  })
  const publicUrl = params.isPrivate
    ? params.objectKey
    : resolvePublicMediaUrl(params.objectKey)

  return { uploadUrl, publicUrl }
}

/**
 * Rule #4: Creates a presigned GET URL for private booking receipts & documents.
 */
export async function createR2PresignedDownloadUrl(params: {
  objectKey: string
  expiresInSeconds?: number
}): Promise<string | null> {
  const config = getR2Config()
  if (!config) return null

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const client = await getR2Client(config)
  const bucket = resolveTargetBucket(config, true)
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.objectKey,
  })

  return await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 900,
  })
}

/**
 * Uploads a binary buffer directly to Cloudflare R2.
 */
export async function putR2Object(params: {
  objectKey: string
  body: Uint8Array
  mimeType: string
  isPrivate?: boolean
}): Promise<boolean> {
  const config = getR2Config()
  if (!config) return false

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = await getR2Client(config)
  const bucket = resolveTargetBucket(config, params.isPrivate)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
      Body: params.body,
      ContentType: params.mimeType,
      CacheControl: params.isPrivate
        ? 'private, no-store'
        : 'public, max-age=31536000, immutable',
    }),
  )
  return true
}

/**
 * Fetches an object from Cloudflare R2 via the S3 API for the /api/media/$ route.
 */
export async function getR2Object(params: {
  objectKey: string
  isPrivate?: boolean
}): Promise<{ body: Uint8Array; contentType: string } | null> {
  const config = getR2Config()
  if (!config) return null

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = await getR2Client(config)
  const bucket = resolveTargetBucket(config, params.isPrivate)
  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
    }),
  )
  if (!res.Body) return null
  const bytes = await res.Body.transformToByteArray()
  return {
    body: bytes,
    contentType: res.ContentType || 'image/jpeg',
  }
}

/**
 * Rule #6: Deletes an object from Cloudflare R2 (call ONLY after DB commit).
 */
export async function deleteR2Object(params: {
  objectKey: string
  isPrivate?: boolean
}): Promise<boolean> {
  const config = getR2Config()
  if (!config) {
    throw new Error('R2 storage is not configured for object deletion.')
  }

  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
  const client = await getR2Client(config)
  const bucket = resolveTargetBucket(config, params.isPrivate)
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
    }),
  )
  return true
}
