import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Compass,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { TOURIST_SPOT_CATEGORIES } from '#/lib/constants/cms'
import { getErrorMessage } from '#/lib/formatters'
import {
  compressImageForUpload,
  IMAGE_UPLOAD_PRESETS,
} from '#/lib/image-compress'
import { uploadAvatar } from '#/server/upload'
import type { TouristSpotCategory, TouristSpotItem } from '#/types'

export type TouristSpotsUpdater = (
  prevSpots: TouristSpotItem[],
) => TouristSpotItem[]

interface TouristSpotsEditorProps {
  spots: TouristSpotItem[]
  disabled?: boolean
  onChange: (updater: TouristSpotsUpdater) => void
  onError: (message: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
}

export function TouristSpotsEditor({
  spots,
  disabled = false,
  onChange,
  onError,
  onUploadingChange,
}: TouristSpotsEditorProps) {
  const [uploadingSpotIds, setUploadingSpotIds] = useState<string[]>([])
  const activeUploadsRef = useRef(0)
  const imageVersionRef = useRef<Map<string, number>>(new Map())

  const bumpSpotImageVersion = (spotId: string): number => {
    const next = (imageVersionRef.current.get(spotId) ?? 0) + 1
    imageVersionRef.current.set(spotId, next)
    return next
  }

  const handleAddSpot = () => {
    const nextId = `spot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    onChange((prev) => [
      ...prev,
      {
        id: nextId,
        name: 'New Camotes Destination',
        category: 'Beach',
        location: 'San Francisco, Camotes Island',
        travelTime: '15 mins from resort',
        bestTime: 'Morning',
        entranceFee: 'Free / ₱50 entrance',
        description: '',
        tips: '',
        image: '',
      },
    ])
  }

  const handleUpdateSpot = (
    spotId: string,
    patch: Partial<TouristSpotItem>,
  ) => {
    onChange((prev) =>
      prev.map((spot) => (spot.id === spotId ? { ...spot, ...patch } : spot)),
    )
  }

  const handleRemoveSpot = (spotId: string) => {
    onChange((prev) => prev.filter((spot) => spot.id !== spotId))
  }

  const handleMoveSpot = (spotId: string, direction: -1 | 1) => {
    onChange((prev) => {
      const index = prev.findIndex((spot) => spot.id === spotId)
      const target = index + direction
      if (index === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const handleUploadSpotPhoto = async (spotId: string, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (JPG, PNG, WEBP, GIF).')
      return
    }

    const uploadVersion = bumpSpotImageVersion(spotId)
    activeUploadsRef.current += 1
    setUploadingSpotIds((prev) =>
      prev.includes(spotId) ? prev : [...prev, spotId],
    )
    onUploadingChange?.(true)
    onError(null)
    try {
      const compressed = await compressImageForUpload(
        file,
        IMAGE_UPLOAD_PRESETS.editorial.maxDimension,
        IMAGE_UPLOAD_PRESETS.editorial.quality,
      )
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('scope', 'cms')
      const url = await uploadAvatar({ data: formData })
      if (imageVersionRef.current.get(spotId) === uploadVersion) {
        handleUpdateSpot(spotId, { image: url })
      }
    } catch (err: unknown) {
      onError(getErrorMessage(err, 'Failed to upload tourist spot image.'))
    } finally {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1)
      setUploadingSpotIds((prev) => prev.filter((id) => id !== spotId))
      if (activeUploadsRef.current === 0) {
        onUploadingChange?.(false)
      }
    }
  }

  return (
    <div className="pt-4 border-t border-stone-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Camotes Island Tourist Spots ({spots.length})
          </h3>
          <p className="text-[11px] text-stone-400">
            Add, edit, reorder, and upload photos for places guests can visit
            during their stay.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddSpot}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white transition self-start cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Tourist Spot
        </button>
      </div>

      {spots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
          No tourist spots configured yet. Click &ldquo;Add Tourist Spot&rdquo;
          to add your first Camotes destination.
        </div>
      ) : (
        <div className="space-y-4">
          {spots.map((spot, idx) => {
            const isUploadingThis = uploadingSpotIds.includes(spot.id)
            return (
              <div
                key={spot.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-stone-900 truncate">
                      {spot.name.trim() || 'Untitled Destination'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || idx === 0}
                      onClick={() => handleMoveSpot(spot.id, -1)}
                      aria-label={`Move spot ${idx + 1} up`}
                      className="p-1.5 rounded-lg hover:bg-stone-200/70 text-stone-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || idx === spots.length - 1}
                      onClick={() => handleMoveSpot(spot.id, 1)}
                      aria-label={`Move spot ${idx + 1} down`}
                      className="p-1.5 rounded-lg hover:bg-stone-200/70 text-stone-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || isUploadingThis}
                      onClick={() => handleRemoveSpot(spot.id)}
                      aria-label={`Remove spot ${idx + 1}`}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo Preview + Upload / URL */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                  <div className="sm:col-span-4">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden border border-stone-200 bg-white flex items-center justify-center">
                      {spot.image ? (
                        <img
                          src={spot.image}
                          alt={spot.name.trim() || `Spot ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-stone-400 text-[11px]">
                          <Compass className="w-5 h-5" />
                          <span>No photo yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-8 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer transition">
                        {isUploadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="w-3.5 h-3.5" />
                        )}
                        {isUploadingThis
                          ? 'Uploading...'
                          : spot.image
                            ? 'Replace Photo'
                            : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={disabled || isUploadingThis}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            void handleUploadSpotPhoto(spot.id, file)
                          }}
                        />
                      </label>
                      {spot.image && (
                        <button
                          type="button"
                          disabled={disabled || isUploadingThis}
                          onClick={() => {
                            bumpSpotImageVersion(spot.id)
                            handleUpdateSpot(spot.id, { image: '' })
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="url"
                      aria-label={`Spot ${idx + 1} image URL`}
                      disabled={disabled || isUploadingThis}
                      value={spot.image}
                      onChange={(e) => {
                        bumpSpotImageVersion(spot.id)
                        handleUpdateSpot(spot.id, { image: e.target.value })
                      }}
                      placeholder="https://... or upload an image above"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Spot Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`spot-name-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Destination Name
                    </label>
                    <input
                      id={`spot-name-${spot.id}`}
                      type="text"
                      required
                      value={spot.name}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`spot-category-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Category
                    </label>
                    <select
                      id={`spot-category-${spot.id}`}
                      value={spot.category}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, {
                          category: e.target.value as TouristSpotCategory,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    >
                      {TOURIST_SPOT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`spot-location-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Location / Barangay
                    </label>
                    <input
                      id={`spot-location-${spot.id}`}
                      type="text"
                      value={spot.location}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, { location: e.target.value })
                      }
                      placeholder="Brgy. Santiago, San Francisco"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`spot-travel-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Travel Time from Resort
                    </label>
                    <input
                      id={`spot-travel-${spot.id}`}
                      type="text"
                      value={spot.travelTime}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, {
                          travelTime: e.target.value,
                        })
                      }
                      placeholder="15–20 mins from resort"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`spot-best-time-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Best Time to Visit
                    </label>
                    <input
                      id={`spot-best-time-${spot.id}`}
                      type="text"
                      value={spot.bestTime}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, { bestTime: e.target.value })
                      }
                      placeholder="Morning or sunset"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`spot-fee-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Entrance Fee / Access Info
                    </label>
                    <input
                      id={`spot-fee-${spot.id}`}
                      type="text"
                      value={spot.entranceFee}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, {
                          entranceFee: e.target.value,
                        })
                      }
                      placeholder="₱50 entrance"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`spot-desc-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id={`spot-desc-${spot.id}`}
                      rows={2}
                      value={spot.description}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="What makes this destination special for guests..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`spot-tips-${spot.id}`}
                      className="block text-[11px] font-semibold text-stone-600 mb-1"
                    >
                      Guest Tip
                    </label>
                    <input
                      id={`spot-tips-${spot.id}`}
                      type="text"
                      value={spot.tips}
                      onChange={(e) =>
                        handleUpdateSpot(spot.id, { tips: e.target.value })
                      }
                      placeholder="Helpful local advice, tide tips, or food stops..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
