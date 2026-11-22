import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Compass,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { getSpotImages, TOURIST_SPOT_CATEGORIES } from '#/lib/constants/cms'
import { getErrorMessage } from '#/lib/formatters'
import {
  compressImageForUpload,
  IMAGE_UPLOAD_PRESETS,
  isSupportedImageFile,
} from '#/lib/image-compress'
import { isBase64DataUrl, isR2ManagedObjectKey } from '#/lib/r2'
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
  const [expandedSpotIds, setExpandedSpotIds] = useState<string[]>([])
  const [photoModalSpotId, setPhotoModalSpotId] = useState<string | null>(null)
  const [uploadingSpotIds, setUploadingSpotIds] = useState<string[]>([])
  const [spotErrors, setSpotErrors] = useState<Record<string, string>>({})
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({})

  const activeUploadsRef = useRef(0)
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const modalDialogRef = useRef<HTMLDivElement>(null)
  const modalCloseBtnRef = useRef<HTMLButtonElement>(null)
  const modalTriggerRef = useRef<HTMLElement | null>(null)

  const setSpotError = (spotId: string, message: string | null) => {
    setSpotErrors((prev) => {
      if (!message) {
        if (!(spotId in prev)) return prev
        const { [spotId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [spotId]: message }
    })
    onError(message)
  }

  const toggleExpandSpot = (spotId: string) => {
    setExpandedSpotIds((prev) =>
      prev.includes(spotId)
        ? prev.filter((id) => id !== spotId)
        : [...prev, spotId],
    )
  }

  const allExpanded =
    spots.length > 0 && spots.every((s) => expandedSpotIds.includes(s.id))

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedSpotIds([])
    } else {
      setExpandedSpotIds(spots.map((s) => s.id))
    }
  }

  const handleClosePhotoModal = useCallback(() => {
    setPhotoModalSpotId(null)
    const trigger = modalTriggerRef.current
    modalTriggerRef.current = null
    trigger?.focus()
  }, [])

  const activeModalSpotIndex = photoModalSpotId
    ? spots.findIndex((s) => s.id === photoModalSpotId)
    : -1
  const activeModalSpot =
    activeModalSpotIndex !== -1 ? spots[activeModalSpotIndex] : null

  useEffect(() => {
    if (!activeModalSpot) return
    modalCloseBtnRef.current?.focus()
  }, [activeModalSpot])

  useEffect(() => {
    if (!activeModalSpot) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClosePhotoModal()
      } else if (e.key === 'Tab' && modalDialogRef.current) {
        const focusable = Array.from(
          modalDialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) {
          e.preventDefault()
          modalDialogRef.current.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModalSpot, handleClosePhotoModal])

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
        images: [],
      },
    ])
    setExpandedSpotIds((prev) => [...prev, nextId])
  }

  const handleUpdateSpot = (
    spotId: string,
    patch: Partial<TouristSpotItem>,
  ) => {
    onChange((prev) =>
      prev.map((spot) => (spot.id === spotId ? { ...spot, ...patch } : spot)),
    )
  }

  const handleSetSpotImages = (
    spotId: string,
    updater: (prevImages: string[]) => string[],
  ) => {
    onChange((prev) =>
      prev.map((spot) => {
        if (spot.id !== spotId) return spot
        const currentImages = getSpotImages(spot)
        const nextImages = Array.from(
          new Set(updater(currentImages).map((u) => u.trim()).filter(Boolean)),
        )
        return {
          ...spot,
          image: nextImages[0] ?? '',
          images: nextImages,
        }
      }),
    )
  }

  const handleRemoveSpot = (spotId: string) => {
    if (photoModalSpotId === spotId) {
      setPhotoModalSpotId(null)
    }
    setExpandedSpotIds((prev) => prev.filter((id) => id !== spotId))
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

  const handleMovePhoto = (
    spotId: string,
    photoIndex: number,
    direction: -1 | 1,
  ) => {
    handleSetSpotImages(spotId, (prevImages) => {
      const target = photoIndex + direction
      if (target < 0 || target >= prevImages.length) return prevImages
      const next = [...prevImages]
      const [moved] = next.splice(photoIndex, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const handleRemovePhoto = (spotId: string, photoIndex: number) => {
    handleSetSpotImages(spotId, (prevImages) =>
      prevImages.filter((_, idx) => idx !== photoIndex),
    )
  }

  const handleAddPhotoUrl = (spotId: string) => {
    const raw = (urlDrafts[spotId] ?? '').trim()
    if (!raw) return
    if (isBase64DataUrl(raw)) {
      setSpotError(
        spotId,
        'Base64 data URLs cannot be stored in PostgreSQL. Please upload image files to Cloudflare R2.',
      )
      return
    }
    if (!isR2ManagedObjectKey(raw)) {
      setSpotError(
        spotId,
        'External image URLs are not allowed. Please upload photos to Cloudflare R2 or enter an R2 media key.',
      )
      return
    }
    setSpotError(spotId, null)
    handleSetSpotImages(spotId, (prevImages) => [...prevImages, raw])
    setUrlDrafts((prev) => ({ ...prev, [spotId]: '' }))
  }

  const handleUploadSpotPhotos = async (spotId: string, files: File[]) => {
    if (files.length === 0) return

    const validFiles = files.filter((file) => isSupportedImageFile(file))
    if (validFiles.length === 0) {
      setSpotError(
        spotId,
        'Please select valid image files (JPG, PNG, WEBP, AVIF, GIF).',
      )
      return
    }
    if (validFiles.length < files.length) {
      setSpotError(
        spotId,
        'Some unsupported files were skipped. Only image files (JPG, PNG, WEBP, AVIF, GIF) are allowed.',
      )
    } else {
      setSpotError(spotId, null)
    }

    activeUploadsRef.current += 1
    setUploadingSpotIds((prev) =>
      prev.includes(spotId) ? prev : [...prev, spotId],
    )
    onUploadingChange?.(true)

    try {
      for (const file of validFiles) {
        const compressed = await compressImageForUpload(
          file,
          IMAGE_UPLOAD_PRESETS.editorial.maxDimension,
          IMAGE_UPLOAD_PRESETS.editorial.quality,
        )
        const formData = new FormData()
        formData.append('file', compressed)
        formData.append('scope', 'cms')
        const url = await uploadAvatar({ data: formData })
        if (url) {
          handleSetSpotImages(spotId, (prevImages) => [...prevImages, url])
        }
      }
    } catch (err: unknown) {
      setSpotError(
        spotId,
        getErrorMessage(err, 'Failed to upload tourist spot image.'),
      )
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
            Click a destination to expand and edit details, or use the arrows to
            reorder quickly.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {spots.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-600 transition cursor-pointer"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddSpot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tourist Spot
          </button>
        </div>
      </div>

      {spots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
          No tourist spots configured yet. Click &ldquo;Add Tourist Spot&rdquo;
          to add your first Camotes destination.
        </div>
      ) : (
        <div className="space-y-2.5">
          {spots.map((spot, idx) => {
            const isExpanded = expandedSpotIds.includes(spot.id)
            const isUploadingThis = uploadingSpotIds.includes(spot.id)
            const spotImages = getSpotImages(spot)
            const coverImage = spotImages[0]
            const spotError = spotErrors[spot.id]

            return (
              <div
                key={spot.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/60 overflow-hidden transition"
              >
                {/* Hidden Multi-File Input for This Spot */}
                <input
                  ref={(node) => {
                    if (node) {
                      fileInputRefs.current.set(spot.id, node)
                    } else {
                      fileInputRefs.current.delete(spot.id)
                    }
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  tabIndex={-1}
                  aria-label={`Upload photos for spot ${idx + 1}`}
                  className="hidden"
                  disabled={disabled || isUploadingThis}
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    void handleUploadSpotPhotos(spot.id, selectedFiles)
                  }}
                />

                {/* Compact Accordion Header Row (Always Visible) */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white/80">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} spot ${idx + 1}`}
                    onClick={() => toggleExpandSpot(spot.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    {coverImage && (
                      <img
                        src={coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                    )}
                    <span className="text-sm font-semibold text-stone-900 group-hover:text-amber-900 transition truncate">
                      {spot.name.trim() || 'Untitled Destination'}
                    </span>
                    <span className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 shrink-0">
                      {spot.category}
                    </span>
                    {spotImages.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-600 shrink-0">
                        {spotImages.length}{' '}
                        {spotImages.length === 1 ? 'photo' : 'photos'}
                      </span>
                    )}
                    <span className="text-stone-400 group-hover:text-stone-700 transition ml-1 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {/* Ordering & Delete Controls (Always Visible) */}
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

                {/* Expanded Body: Only Mounted When Expanded for Fast Rendering */}
                {isExpanded && (
                  <div className="p-4 pt-3 border-t border-stone-200/70 space-y-4">
                    {/* Compact 1-Row Photo Summary Bar (Opens Modal to View/Manage All Photos) */}
                    <div className="rounded-xl border border-stone-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center shrink-0">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={`${spot.name.trim() || `Spot ${idx + 1}`} cover`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Compass className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-800">
                            Spot Photos ({spotImages.length})
                          </div>
                          <p className="text-[11px] text-stone-400 truncate">
                            {spotImages.length > 0
                              ? 'First photo is the card cover · Click Manage Photos to view, reorder, or remove.'
                              : 'No photos yet — upload photos or open Manage Photos.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            modalTriggerRef.current = e.currentTarget
                            setPhotoModalSpotId(spot.id)
                          }}
                          aria-label={`Manage photos for spot ${idx + 1}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer transition"
                        >
                          <Images className="w-3.5 h-3.5" />
                          Manage Photos ({spotImages.length})
                        </button>
                        <button
                          type="button"
                          disabled={disabled || isUploadingThis}
                          onClick={() =>
                            fileInputRefs.current.get(spot.id)?.click()
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white cursor-pointer transition disabled:opacity-50"
                        >
                          {isUploadingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="w-3.5 h-3.5" />
                          )}
                          {isUploadingThis ? 'Uploading...' : 'Upload Photos'}
                        </button>
                      </div>
                    </div>

                    {spotError && photoModalSpotId !== spot.id && (
                      <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
                      >
                        {spotError}
                      </div>
                    )}

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
                            handleUpdateSpot(spot.id, {
                              location: e.target.value,
                            })
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
                            handleUpdateSpot(spot.id, {
                              bestTime: e.target.value,
                            })
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dedicated Spot Photos Modal (On-Demand Rendering & Uniform Fixed-Height Thumbnails) */}
      {activeModalSpot && (
        <div
          ref={modalDialogRef}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby="spot-photos-modal-title"
          onClick={handleClosePhotoModal}
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {(() => {
            const modalSpotImages = getSpotImages(activeModalSpot)
            const isUploadingModalSpot = uploadingSpotIds.includes(
              activeModalSpot.id,
            )
            const modalSpotError = spotErrors[activeModalSpot.id]
            const modalDraftUrl = urlDrafts[activeModalSpot.id] ?? ''

            return (
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-2xl my-auto max-h-[88vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-100">
                  <div className="min-w-0">
                    <h4
                      id="spot-photos-modal-title"
                      className="text-sm font-bold text-stone-900 truncate"
                    >
                      {activeModalSpot.name.trim() || 'Untitled Destination'} —
                      Photos ({modalSpotImages.length})
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      First photo (#1) is used as the cover on the Explore
                      Camotes card.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || isUploadingModalSpot}
                      onClick={() =>
                        fileInputRefs.current.get(activeModalSpot.id)?.click()
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white cursor-pointer transition disabled:opacity-50"
                    >
                      {isUploadingModalSpot ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5" />
                      )}
                      {isUploadingModalSpot ? 'Uploading...' : 'Upload Photos'}
                    </button>
                    <button
                      ref={modalCloseBtnRef}
                      type="button"
                      onClick={handleClosePhotoModal}
                      aria-label="Close spot photos modal"
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  {modalSpotError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
                    >
                      {modalSpotError}
                    </div>
                  )}

                  {/* Add Image by R2 Key / Path */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="url"
                      aria-label={`Spot ${activeModalSpotIndex + 1} image URL`}
                      disabled={disabled || isUploadingModalSpot}
                      value={modalDraftUrl}
                      onChange={(e) =>
                        setUrlDrafts((prev) => ({
                          ...prev,
                          [activeModalSpot.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddPhotoUrl(activeModalSpot.id)
                        }
                      }}
                      placeholder="/api/media/view?key=cms/... or cms/... R2 media key"
                      className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={
                        disabled ||
                        isUploadingModalSpot ||
                        !modalDraftUrl.trim()
                      }
                      onClick={() => handleAddPhotoUrl(activeModalSpot.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add URL
                    </button>
                  </div>

                  {/* Uniform Fixed-Height Photo Grid */}
                  {modalSpotImages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-10 px-4 flex flex-col items-center justify-center gap-1.5 text-stone-400 text-xs">
                      <Compass className="w-6 h-6" />
                      <span>
                        No photos yet — click &ldquo;Upload Photos&rdquo; above
                        to add one or multiple images.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {modalSpotImages.map((src, photoIdx) => (
                        <div
                          key={`${src}-${photoIdx}`}
                          className="rounded-xl overflow-hidden border border-stone-200 bg-white flex flex-col"
                        >
                          <div className="relative h-32 w-full bg-stone-100 overflow-hidden">
                            <img
                              src={src}
                              alt={`${activeModalSpot.name.trim() || `Spot ${activeModalSpotIndex + 1}`} photo ${photoIdx + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                            {photoIdx === 0 && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-stone-900/85 text-white text-[9px] font-semibold uppercase tracking-wider">
                                Cover
                              </span>
                            )}
                          </div>
                          <div className="px-2.5 py-1.5 flex items-center justify-between gap-1 border-t border-stone-100 bg-stone-50/50">
                            <span className="text-[10px] font-medium text-stone-500">
                              #{photoIdx + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={
                                  disabled ||
                                  isUploadingModalSpot ||
                                  photoIdx === 0
                                }
                                onClick={() =>
                                  handleMovePhoto(
                                    activeModalSpot.id,
                                    photoIdx,
                                    -1,
                                  )
                                }
                                aria-label={`Move spot ${activeModalSpotIndex + 1} photo ${photoIdx + 1} left`}
                                className="p-1 rounded hover:bg-stone-200/70 text-stone-600 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={
                                  disabled ||
                                  isUploadingModalSpot ||
                                  photoIdx === modalSpotImages.length - 1
                                }
                                onClick={() =>
                                  handleMovePhoto(
                                    activeModalSpot.id,
                                    photoIdx,
                                    1,
                                  )
                                }
                                aria-label={`Move spot ${activeModalSpotIndex + 1} photo ${photoIdx + 1} right`}
                                className="p-1 rounded hover:bg-stone-200/70 text-stone-600 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={disabled || isUploadingModalSpot}
                                onClick={() =>
                                  handleRemovePhoto(
                                    activeModalSpot.id,
                                    photoIdx,
                                  )
                                }
                                aria-label={`Remove spot ${activeModalSpotIndex + 1} photo ${photoIdx + 1}`}
                                className="p-1 rounded hover:bg-rose-50 text-rose-600 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
