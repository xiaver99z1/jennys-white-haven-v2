import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateUploadAvatar, uploadAvatarHandler } from './upload'
import { put, del } from '@vercel/blob'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

describe('upload-actions handlers and validators', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('uploadAvatar', () => {
    it('validates input FormData correctly', () => {
      const formData = new FormData()
      expect(validateUploadAvatar(formData)).toEqual(formData)
    })

    it('throws error if file is missing', async () => {
      const formData = new FormData() // No file attached

      await expect(uploadAvatarHandler({ data: formData })).rejects.toThrow(
        'No file provided',
      )
    })

    it('handles development environment by returning a base64 data URL', async () => {
      process.env.NODE_ENV = 'development'
      const formData = new FormData()
      const mockFile = new File(['dummy content'], 'avatar.png', {
        type: 'image/png',
      })
      formData.append('file', mockFile)

      const result = await uploadAvatarHandler({ data: formData })

      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(put).not.toHaveBeenCalled()
    })

    it('handles production environment by uploading to Vercel Blob and deleting old image', async () => {
      process.env.NODE_ENV = 'production'
      const formData = new FormData()
      const mockFile = new File(['dummy content'], 'avatar.png', {
        type: 'image/png',
      })
      formData.append('file', mockFile)
      formData.append(
        'oldImageUrl',
        'https://abc.public.blob.vercel-storage.com/avatars/old.png',
      )

      vi.mocked(put).mockResolvedValueOnce({
        url: 'https://abc.public.blob.vercel-storage.com/avatars/new.png',
      } as any)
      vi.mocked(del).mockResolvedValueOnce(undefined as any)

      const result = await uploadAvatarHandler({ data: formData })

      expect(del).toHaveBeenCalledWith(
        'https://abc.public.blob.vercel-storage.com/avatars/old.png',
      )
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('avatars/'),
        mockFile,
        { access: 'public' },
      )
      expect(result).toBe(
        'https://abc.public.blob.vercel-storage.com/avatars/new.png',
      )
    })

    it('warns and continues if deleting old Vercel Blob file fails', async () => {
      process.env.NODE_ENV = 'production'
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      const formData = new FormData()
      const mockFile = new File(['dummy content'], 'avatar.png', {
        type: 'image/png',
      })
      formData.append('file', mockFile)
      formData.append(
        'oldImageUrl',
        'https://abc.public.blob.vercel-storage.com/avatars/old.png',
      )

      vi.mocked(del).mockRejectedValueOnce(new Error('Deletion failed'))
      vi.mocked(put).mockResolvedValueOnce({
        url: 'https://abc.public.blob.vercel-storage.com/avatars/new.png',
      } as any)

      const result = await uploadAvatarHandler({ data: formData })

      expect(del).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to delete old Vercel Blob file:',
        expect.any(Error),
      )
      expect(result).toBe(
        'https://abc.public.blob.vercel-storage.com/avatars/new.png',
      )

      consoleWarnSpy.mockRestore()
    })
  })
})
