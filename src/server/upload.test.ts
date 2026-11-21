import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type * as R2Module from '#/lib/r2'
import {
  validateUploadAvatar,
  validatePresignedUploadInput,
  validatePrivateMediaInput,
  normalizeImageMimeType,
  getPresignedUploadUrlHandler,
  getPrivateMediaUrlHandler,
  uploadAvatarHandler,
  cleanupPendingMediaDeletionsHandler,
} from './upload'

const {
  mockAuthSession,
  mockTransaction,
  mockMediaFindUnique,
  mockMediaUpsert,
  mockMediaUpdateMany,
  mockMediaDeleteMany,
  mockMediaFindMany,
  mockMediaDelete,
  mockMediaUpdate,
  mockCreatePresignedUploadUrl,
  mockCreatePresignedDownloadUrl,
  mockPutR2Object,
  mockDeleteR2Object,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockTransaction: vi.fn(),
  mockMediaFindUnique: vi.fn(),
  mockMediaUpsert: vi.fn(),
  mockMediaUpdateMany: vi.fn(),
  mockMediaDeleteMany: vi.fn(),
  mockMediaFindMany: vi.fn(),
  mockMediaDelete: vi.fn(),
  mockMediaUpdate: vi.fn(),
  mockCreatePresignedUploadUrl: vi.fn(),
  mockCreatePresignedDownloadUrl: vi.fn(),
  mockPutR2Object: vi.fn(),
  mockDeleteR2Object: vi.fn(),
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    media: {
      findUnique: mockMediaFindUnique,
      upsert: mockMediaUpsert,
      updateMany: mockMediaUpdateMany,
      deleteMany: mockMediaDeleteMany,
      findMany: mockMediaFindMany,
      delete: mockMediaDelete,
      update: mockMediaUpdate,
    },
  },
}))

vi.mock('#/lib/r2', async (importOriginal) => {
  const actual = await importOriginal<typeof R2Module>()
  return {
    ...actual,
    createR2PresignedUploadUrl: mockCreatePresignedUploadUrl,
    createR2PresignedDownloadUrl: mockCreatePresignedDownloadUrl,
    putR2Object: mockPutR2Object,
    deleteR2Object: mockDeleteR2Object,
  }
})

describe('upload-actions (Cloudflare R2 + Media)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.R2_PUBLIC_URL
    delete process.env.R2_ACCOUNT_ID
    mockAuthSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'owner' },
      session: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    })
    mockMediaFindUnique.mockResolvedValue(null)
    mockTransaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) =>
        await cb({
          media: {
            upsert: mockMediaUpsert,
            updateMany: mockMediaUpdateMany,
          },
        }),
    )
    mockMediaUpdateMany.mockResolvedValue({ count: 1 })
    mockMediaUpsert.mockResolvedValue({ id: 'media-1', objectKey: 'rooms/1.webp' })
    mockPutR2Object.mockResolvedValue(true)
    mockDeleteR2Object.mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('validates input helpers and normalizes image MIME types without mislabeling unknown extensions as WebP', () => {
    const fd = new FormData()
    expect(validateUploadAvatar(fd)).toBe(fd)
    expect(
      validatePresignedUploadInput({ filename: 'a.webp', mimeType: 'image/webp' }),
    ).toEqual({ filename: 'a.webp', mimeType: 'image/webp' })
    expect(validatePrivateMediaInput({ objectKey: 'private/rec.pdf' })).toEqual(
      { objectKey: 'private/rec.pdf' },
    )
    expect(normalizeImageMimeType('image/jpg', 'photo.jpg')).toBe('image/jpeg')
    expect(normalizeImageMimeType('', 'photo.jfif')).toBe('image/jpeg')
    expect(normalizeImageMimeType('', 'photo.png')).toBe('image/png')
    expect(normalizeImageMimeType('', 'photo.webp')).toBe('image/webp')
    expect(normalizeImageMimeType('', 'photo.bmp')).toBe('')
    expect(normalizeImageMimeType('', 'noext')).toBe('')
  })

  it('creates presigned upload URL and stores PENDING_UPLOAD Media in transaction', async () => {
    mockCreatePresignedUploadUrl.mockResolvedValue({
      uploadUrl: 'https://r2.example.com/presigned-put',
      publicUrl: 'https://cdn.example.com/rooms/photo.webp',
    })

    const res = await getPresignedUploadUrlHandler({
      data: {
        filename: 'Ocean Suite.webp',
        mimeType: 'image/webp',
        sizeBytes: 2048,
        scope: 'rooms',
      },
    })

    expect(res.mediaId).toBe('media-1')
    expect(res.objectKey).toMatch(/^rooms\/\d+-[a-f0-9]+-ocean-suite\.webp$/)
    expect(res.thumbnailKey).toMatch(
      /^rooms\/thumbs\/\d+-[a-f0-9]+-ocean-suite\.webp$/,
    )
    expect(res.uploadUrl).toBe('https://r2.example.com/presigned-put')
    expect(res.publicUrl).toBe('https://cdn.example.com/rooms/photo.webp')
  })

  it('rejects blank filename in getPresignedUploadUrlHandler', async () => {
    await expect(
      getPresignedUploadUrlHandler({
        data: { filename: '   ', mimeType: 'image/webp' },
      }),
    ).rejects.toThrow('Filename is required')
  })

  it('creates signed download URL for private booking receipts', async () => {
    mockCreatePresignedDownloadUrl.mockResolvedValue(
      'https://r2.example.com/signed-get',
    )

    const res = await getPrivateMediaUrlHandler({
      data: { objectKey: 'private/bookings/123-receipt.pdf' },
    })
    expect(res.url).toBe('https://r2.example.com/signed-get')

    await expect(
      getPrivateMediaUrlHandler({ data: { objectKey: '   ' } }),
    ).rejects.toThrow('Object key is required')
  })

  it('uploads file to R2, stores only object key in DB, and deletes old R2 object after DB commit', async () => {
    const formData = new FormData()
    const file = new File(['image-bytes'], 'beach.webp', {
      type: 'image/webp',
    })
    formData.append('file', file)
    formData.append('scope', 'cms')
    formData.append('oldImageUrl', 'cms/old-photo.webp')

    const url = await uploadAvatarHandler({ data: formData })

    expect(url).toMatch(/^\/uploads\/cms\/\d+-[a-f0-9]+-beach\.webp$/)
    expect(url).not.toMatch(/^data:/)
    expect(mockPutR2Object).toHaveBeenCalled()
    expect(mockMediaUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { objectKey: 'cms/old-photo.webp' },
        data: expect.objectContaining({ status: 'PENDING_DELETE' }),
      }),
    )
    expect(mockDeleteR2Object).toHaveBeenCalledWith({
      objectKey: 'cms/old-photo.webp',
      isPrivate: false,
    })
    expect(mockMediaDeleteMany).toHaveBeenCalledWith({
      where: { objectKey: 'cms/old-photo.webp', status: 'PENDING_DELETE' },
    })
  })

  it('marks old media as FAILED_DELETE if R2 deletion fails so cleanup job can retry', async () => {
    mockDeleteR2Object.mockRejectedValueOnce(new Error('R2 network timeout'))

    const formData = new FormData()
    formData.append(
      'file',
      new File(['bytes'], 'avatar.png', { type: 'image/png' }),
    )
    formData.append('oldImageUrl', 'avatars/prev.png')

    await uploadAvatarHandler({ data: formData })

    expect(mockMediaUpdateMany).toHaveBeenLastCalledWith({
      where: { objectKey: 'avatars/prev.png' },
      data: { status: 'FAILED_DELETE' },
    })
  })

  it('runs background cleanupPendingMediaDeletionsHandler for PENDING_DELETE and FAILED_DELETE rows', async () => {
    mockMediaFindMany.mockResolvedValue([
      { id: 'm1', objectKey: 'rooms/old1.webp', bucket: 'public' },
      { id: 'm2', objectKey: 'private/bookings/old2.pdf', bucket: 'private' },
    ])
    mockDeleteR2Object
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Failed'))

    const res = await cleanupPendingMediaDeletionsHandler()

    expect(res).toEqual({ deletedCount: 1, failedCount: 1 })
    expect(mockMediaDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'm1', status: 'PENDING_DELETE' }),
      }),
    )
    expect(mockMediaUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'm2', status: 'PENDING_DELETE' }),
        data: { status: 'FAILED_DELETE' },
      }),
    )
  })

  it('skips deleting R2 object when another room or section still references it', async () => {
    mockMediaFindUnique.mockResolvedValueOnce({
      id: 'm-shared',
      objectKey: 'rooms/shared.webp',
      _count: {
        roomMedia: 1,
        businessMedia: 0,
        bookingMedia: 0,
        userProfiles: 0,
      },
    })

    const formData = new FormData()
    formData.append(
      'file',
      new File(['bytes'], 'new.webp', { type: 'image/webp' }),
    )
    formData.append('oldImageUrl', 'rooms/shared.webp')

    await uploadAvatarHandler({ data: formData })

    expect(mockDeleteR2Object).not.toHaveBeenCalled()
  })
})
