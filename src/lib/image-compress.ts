/**
 * Resizes and compresses an image File to WebP in the browser before upload
 * so large mobile photos stay well under serverless body limits and upload fast.
 * Falls back to the original file if browser canvas APIs are unavailable.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.85,
): Promise<File> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !file.type.startsWith('image/') ||
    file.type === 'image/gif'
  ) {
    return file
  }

  try {
    const objectUrl = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Image decode timed out')),
          2000,
        )
        const image = new Image()
        image.onload = () => {
          clearTimeout(timer)
          resolve(image)
        }
        image.onerror = () => {
          clearTimeout(timer)
          reject(new Error('Image decode failed'))
        }
        image.src = objectUrl
      })

      const { naturalWidth, naturalHeight } = img
      if (!naturalWidth || !naturalHeight) return file

      const scale = Math.min(
        1,
        maxDimension / Math.max(naturalWidth, naturalHeight),
      )
      const width = Math.max(1, Math.round(naturalWidth * scale))
      const height = Math.max(1, Math.round(naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file

      ctx.drawImage(img, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', quality),
      )
      if (!blob || blob.size === 0 || blob.type !== 'image/webp') {
        return file
      }

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload'
      return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  } catch {
    return file
  }
}
