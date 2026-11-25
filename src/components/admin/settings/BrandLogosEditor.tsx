import { useRef, useState } from 'react'
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react'
import {
  DEFAULT_ADMIN_AUTH_LOGO,
  DEFAULT_ADMIN_ICON_LOGO,
  DEFAULT_PUBLIC_BRAND_LOGO,
} from '#/lib/constants/cms'
import { getErrorMessage } from '#/lib/formatters'
import {
  IMAGE_UPLOAD_PRESETS,
  compressImageForUpload,
} from '#/lib/image-compress'
import { uploadAvatar } from '#/server/upload'

type LogoFieldKey = 'adminIconLogo' | 'adminAuthLogo' | 'publicBrandLogo'

interface BrandLogosEditorProps {
  metadata: Record<string, string>
  disabled?: boolean
  onChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void
  onError: (msg: string | null) => void
  onUploadingChange: (uploading: boolean) => void
}

const LOGO_ICON_PRESET =
  (
    IMAGE_UPLOAD_PRESETS as Record<
      string,
      { maxDimension: number; quality: number } | undefined
    >
  ).logoIcon ?? { maxDimension: 256, quality: 0.9 }

const LOGO_BRAND_PRESET =
  (
    IMAGE_UPLOAD_PRESETS as Record<
      string,
      { maxDimension: number; quality: number } | undefined
    >
  ).logoBrand ?? { maxDimension: 560, quality: 0.9 }

const LOGO_SLOTS: ReadonlyArray<{
  key: LogoFieldKey
  title: string
  placement: string
  defaultUrl: string
  recommendedSpec: string
  previewBgClass: string
  previewImgClass: string
  preset: { maxDimension: number; quality: number }
}> = [
  {
    key: 'adminIconLogo',
    title: 'Admin Navbar & Favicon Icon',
    placement: 'Top-left mark in the Admin Dashboard navbar and browser tab icon.',
    defaultUrl: DEFAULT_ADMIN_ICON_LOGO,
    recommendedSpec: 'Auto-optimized to 256px max WebP · Transparent background recommended',
    previewBgClass:
      'bg-gradient-to-r from-sky-200 via-amber-200/60 to-teal-100 border-stone-200/80',
    previewImgClass: 'h-12 w-auto object-contain',
    preset: LOGO_ICON_PRESET,
  },
  {
    key: 'adminAuthLogo',
    title: 'Admin Login & Auth Logo',
    placement: 'Displayed above the card on Admin Sign-In, Initial Setup, and Password Reset pages.',
    defaultUrl: DEFAULT_ADMIN_AUTH_LOGO,
    recommendedSpec: 'Auto-optimized to 560px max WebP · Transparent background recommended',
    previewBgClass:
      'bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 border-stone-200/80',
    previewImgClass: 'h-24 w-auto object-contain',
    preset: LOGO_BRAND_PRESET,
  },
  {
    key: 'publicBrandLogo',
    title: 'Public Website Header & Footer Logo',
    placement: 'Displayed in the top navigation bar and footer across all guest-facing pages.',
    defaultUrl: DEFAULT_PUBLIC_BRAND_LOGO,
    recommendedSpec: 'Auto-optimized to 560px max WebP · Transparent background recommended',
    previewBgClass: 'bg-[#FAF8F4] border-stone-200/80',
    previewImgClass: 'h-16 w-auto object-contain',
    preset: LOGO_BRAND_PRESET,
  },
]

export function BrandLogosEditor({
  metadata,
  disabled = false,
  onChange,
  onError,
  onUploadingChange,
}: BrandLogosEditorProps) {
  const [uploadingSlot, setUploadingSlot] = useState<LogoFieldKey | null>(null)
  const fileRefs = useRef<Record<LogoFieldKey, HTMLInputElement | null>>({
    adminIconLogo: null,
    adminAuthLogo: null,
    publicBrandLogo: null,
  })

  async function handleLogoFileChange(
    slot: (typeof LOGO_SLOTS)[number],
    file: File | undefined,
  ) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (PNG, WEBP, JPG, SVG).')
      return
    }
    setUploadingSlot(slot.key)
    onUploadingChange(true)
    onError(null)
    try {
      const optimized = await compressImageForUpload(
        file,
        slot.preset.maxDimension,
        slot.preset.quality,
      )
      const formData = new FormData()
      formData.append('file', optimized)
      formData.append('scope', 'cms')
      const uploadedUrl = await uploadAvatar({ data: formData })
      onChange((prev) => ({
        ...prev,
        [slot.key]: uploadedUrl,
      }))
    } catch (err) {
      onError(getErrorMessage(err, `Failed to upload ${slot.title}.`))
    } finally {
      setUploadingSlot(null)
      onUploadingChange(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-stone-50 border border-stone-200/80 px-4 py-3 text-xs text-stone-600 leading-relaxed">
        Upload transparent PNG or WebP files for best results. Uploaded logos are
        automatically resized and compressed for Retina displays before saving.
        Click <strong>Save Changes</strong> at the bottom after updating.
      </div>

      <div className="grid grid-cols-1 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const customUrl = (metadata[slot.key] ?? '').trim()
          const activeUrl = customUrl || slot.defaultUrl
          const isSlotUploading = uploadingSlot === slot.key

          return (
            <div
              key={slot.key}
              className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900">
                      {slot.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        customUrl
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {customUrl ? 'Custom Uploaded' : 'Optimized Default'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">{slot.placement}</p>
                  <p className="text-[11px] text-stone-400">
                    {slot.recommendedSpec}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {customUrl && (
                    <button
                      type="button"
                      disabled={disabled || uploadingSlot !== null}
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          [slot.key]: '',
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 cursor-pointer transition disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Use Default
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={disabled || uploadingSlot !== null}
                    onClick={() => fileRefs.current[slot.key]?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-amber-900 text-white text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                  >
                    {isSlotUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                    {isSlotUploading ? 'Optimizing...' : 'Replace Logo'}
                  </button>
                  <input
                    ref={(el) => {
                      fileRefs.current[slot.key] = el
                    }}
                    type="file"
                    accept="image/*"
                    tabIndex={-1}
                    className="hidden"
                    disabled={disabled || uploadingSlot !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      void handleLogoFileChange(slot, file)
                    }}
                  />
                </div>
              </div>

              {/* Contextual Live Surface Preview */}
              <div
                className={`rounded-xl border h-32 flex items-center justify-center p-4 ${slot.previewBgClass}`}
              >
                <img
                  src={activeUrl}
                  alt={slot.title}
                  className={slot.previewImgClass}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
