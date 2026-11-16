import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildObjectKey,
  extractObjectKey,
  getR2Config,
  isBase64DataUrl,
  resolvePublicMediaUrl,
} from './r2'

describe('r2 helpers', () => {
  const origEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET_NAME
    delete process.env.R2_PUBLIC_URL
  })

  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('detects base64 data URLs', () => {
    expect(isBase64DataUrl('data:image/png;base64,abc')).toBe(true)
    expect(isBase64DataUrl('rooms/123-photo.webp')).toBe(false)
  })

  it('builds sanitized object keys and room thumbnail keys', () => {
    const roomKeys = buildObjectKey('rooms', 'Deluxe Ocean View!.webp', 1000)
    expect(roomKeys).toEqual({
      objectKey: 'rooms/1000-deluxe-ocean-view-.webp',
      thumbnailKey: 'rooms/thumbs/1000-deluxe-ocean-view-.webp',
    })

    const receiptKeys = buildObjectKey('bookings', 'receipt.pdf', 2000)
    expect(receiptKeys).toEqual({
      objectKey: 'private/bookings/2000-receipt.pdf',
      thumbnailKey: null,
    })
  })

  it('resolves public CDN URLs and thumbnail variants and strips base64 URLs', () => {
    expect(resolvePublicMediaUrl('data:image/jpeg;base64,xyz')).toBe('')
    expect(resolvePublicMediaUrl('rooms/101.webp')).toBe(
      '/uploads/rooms/101.webp',
    )

    process.env.R2_PUBLIC_URL = 'https://cdn.jennyswhitehaven.com/'
    expect(resolvePublicMediaUrl('rooms/101.webp')).toBe(
      'https://cdn.jennyswhitehaven.com/rooms/101.webp',
    )
    expect(resolvePublicMediaUrl('rooms/101.webp', { thumbnail: true })).toBe(
      'https://cdn.jennyswhitehaven.com/cdn-cgi/image/width=640,quality=80,format=auto/rooms/101.webp',
    )
    expect(
      extractObjectKey('https://cdn.jennyswhitehaven.com/rooms/101.webp'),
    ).toBe('rooms/101.webp')
  })

  it('returns null from getR2Config when env vars are missing and config when set', () => {
    expect(getR2Config()).toBeNull()

    process.env.R2_ACCOUNT_ID = 'acc123'
    process.env.R2_ACCESS_KEY_ID = 'key123'
    process.env.R2_SECRET_ACCESS_KEY = 'sec123'
    process.env.R2_BUCKET_NAME = 'jwh-media'
    process.env.R2_PUBLIC_URL = 'https://cdn.jennyswhitehaven.com'

    expect(getR2Config()).toEqual({
      accountId: 'acc123',
      accessKeyId: 'key123',
      secretAccessKey: 'sec123',
      bucketName: 'jwh-media',
      privateBucketName: 'jwh-media',
      publicUrl: 'https://cdn.jennyswhitehaven.com',
    })
  })
})
