import { put, del } from '@vercel/blob'
import { createServerFn } from '@tanstack/react-start'

export const uploadAvatar = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => formData)
  .handler(async ({ data }) => {
    const file = data.get('file') as File
    const oldImageUrl = data.get('oldImageUrl') as string | null

    if (!file) {
      throw new Error('No file provided')
    }

    const isProduction = process.env.NODE_ENV === 'production'

    // PRODUCTION: Use Vercel Blob
    if (isProduction) {
      // Deletes old image from Vercel Blob if present
      if (oldImageUrl && oldImageUrl.includes('vercel-storage.com')) {
        try {
          await del(oldImageUrl)
        } catch (err) {
          console.warn('Failed to delete old Vercel Blob file:', err)
        }
      }

      // Upload new image to Vercel Blob
      const blob = await put(`avatars/${Date.now()}-${file.name}`, file, {
        access: 'public',
      })

      return blob.url
    }

    // LOCAL / DEVELOPMENT: Return Base64 Data URL or Local Path
    // (This saves directly to DB via authClient without using Vercel Blob quota)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/webp'

    return `data:${mimeType};base64,${base64}`
  })
