import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  compressImageForUpload,
  getCmsUploadPreset,
  IMAGE_UPLOAD_PRESETS,
} from './image-compress'

describe('image-compress helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns exact CMS dimension and quality presets per section key', () => {
    expect(getCmsUploadPreset('branding')).toEqual(
      IMAGE_UPLOAD_PRESETS.logoBrand,
    )
    expect(getCmsUploadPreset('hero')).toEqual(IMAGE_UPLOAD_PRESETS.hero)
    expect(getCmsUploadPreset('story')).toEqual(IMAGE_UPLOAD_PRESETS.editorial)
    expect(getCmsUploadPreset('amenities')).toEqual(
      IMAGE_UPLOAD_PRESETS.editorial,
    )
    expect(getCmsUploadPreset('gallery')).toEqual(IMAGE_UPLOAD_PRESETS.gallery)
    expect(getCmsUploadPreset('rooms')).toEqual(IMAGE_UPLOAD_PRESETS.gallery)
    expect(getCmsUploadPreset('contact')).toEqual(IMAGE_UPLOAD_PRESETS.gallery)
  })

  it('returns original file for non-images or GIFs', async () => {
    const pdf = new File(['abc'], 'doc.pdf', { type: 'application/pdf' })
    const gif = new File(['abc'], 'anim.gif', { type: 'image/gif' })

    await expect(compressImageForUpload(pdf)).resolves.toBe(pdf)
    await expect(compressImageForUpload(gif)).resolves.toBe(gif)
  })

  it('downscales oversized images and encodes to WebP', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    class MockImage {
      naturalWidth = 3000
      naturalHeight = 2000
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        if (this.onload) this.onload()
      }
    }
    vi.stubGlobal('Image', MockImage)

    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (cb: BlobCallback) => {
        cb(new Blob(['webp-data'], { type: 'image/webp' }))
      },
    )

    const rawFile = new File(['very-large-jpeg-payload'], 'beach.jpg', {
      type: 'image/jpeg',
    })
    const compressed = await compressImageForUpload(rawFile, 1500, 0.82)

    expect(compressed.name).toBe('beach.webp')
    expect(compressed.type).toBe('image/webp')
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1500,
      1000,
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('preserves original WebP when already within target dimensions and smaller than re-encoded blob', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    class MockImage {
      naturalWidth = 400
      naturalHeight = 300
      onload: (() => void) | null = null
      set src(_v: string) {
        if (this.onload) this.onload()
      }
    }
    vi.stubGlobal('Image', MockImage)

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (cb: BlobCallback) => {
        cb(new Blob(['larger-reencoded-webp-payload'], { type: 'image/webp' }))
      },
    )

    const smallWebp = new File(['tiny'], 'icon.webp', { type: 'image/webp' })
    const result = await compressImageForUpload(smallWebp, 1200, 0.82)

    expect(result).toBe(smallWebp)
  })
})
