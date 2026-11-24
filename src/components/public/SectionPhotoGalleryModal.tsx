import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react'
import type { SectionPhotoItem } from '#/lib/constants/cms'

interface SectionPhotoGalleryModalProps {
  isOpen: boolean
  sectionTitle: string
  sectionEyebrow?: string
  photos: SectionPhotoItem[]
  initialMode?: 'grid' | 'lightbox'
  initialIndex?: number
  onClose: () => void
}

export function SectionPhotoGalleryModal({
  isOpen,
  sectionTitle,
  sectionEyebrow,
  photos,
  initialMode = 'grid',
  initialIndex = 0,
  onClose,
}: SectionPhotoGalleryModalProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'lightbox'>(initialMode)
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setViewMode(initialMode)
    setActiveIndex(
      initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0,
    )
    return () => {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [isOpen, initialMode, initialIndex, photos.length])

  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })
  }, [isOpen, viewMode])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (
        viewMode === 'lightbox' &&
        e.key === 'ArrowRight' &&
        photos.length > 1
      ) {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % photos.length)
      } else if (
        viewMode === 'lightbox' &&
        e.key === 'ArrowLeft' &&
        photos.length > 1
      ) {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) {
          e.preventDefault()
          dialogRef.current.focus()
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
  }, [isOpen, viewMode, photos.length, onClose])

  if (!isOpen || photos.length === 0) return null

  const safeIndex =
    activeIndex >= 0 && activeIndex < photos.length ? activeIndex : 0
  const currentPhoto = photos[safeIndex]

  // Stage 2: Full-Screen Dark Lightbox Carousel (Image 4 & Image 5)
  if (viewMode === 'lightbox') {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-label={`${sectionTitle} photo viewer`}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xs text-white flex flex-col justify-between select-none"
      >
        {/* Top Bar: All Pictures button | Caption | 1/N counter & Close */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-white/10"
        >
          <div className="flex items-center gap-2 min-w-[110px]">
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-stone-100 transition cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>All Pictures</span>
              </button>
            )}
          </div>

          <div className="text-center min-w-0 flex-1">
            <p className="text-sm sm:text-base font-medium text-stone-100 truncate">
              {currentPhoto.caption || sectionTitle}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 min-w-[110px]">
            <span className="text-xs sm:text-sm font-medium text-stone-300 tabular-nums">
              {safeIndex + 1} / {photos.length}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close photo viewer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Main Photo Stage with Left / Right Arrows */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative flex-1 flex items-center justify-center px-4 sm:px-16 py-4 overflow-hidden min-h-0"
        >
          <img
            src={currentPhoto.url}
            alt={
              currentPhoto.caption ||
              `${sectionTitle} photo ${safeIndex + 1}`
            }
            className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex(
                    (prev) => (prev - 1 + photos.length) % photos.length,
                  )
                }
                aria-label="Previous photo"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-stone-900/70 hover:bg-stone-800 text-white border border-white/20 transition cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % photos.length)
                }
                aria-label="Next photo"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-stone-900/70 hover:bg-stone-800 text-white border border-white/20 transition cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Horizontal Thumbnail Strip */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t border-white/10 bg-stone-950/90 px-4 sm:px-8 py-3.5"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto pb-1">
            {photos.map((photo, idx) => {
              const isSelected = idx === safeIndex
              return (
                <button
                  key={`${photo.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={
                    photo.caption
                      ? `Select photo ${idx + 1}: ${photo.caption}`
                      : `Select photo ${idx + 1}`
                  }
                  aria-pressed={isSelected}
                  className={`relative shrink-0 w-16 sm:w-20 aspect-[16/10] rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-white opacity-100 scale-105 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Stage 1: "Pictures" Grid Modal (Image 3)
  return (
    <div
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby="section-pictures-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl rounded-3xl overflow-hidden bg-[#FAF8F4] border border-stone-200/80 shadow-2xl my-auto max-h-[90vh] flex flex-col"
      >
        {/* Grid Modal Header */}
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 py-5 border-b border-stone-200/80 bg-white">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-800 font-semibold">
              {sectionEyebrow || sectionTitle} · {photos.length}{' '}
              {photos.length === 1 ? 'Picture' : 'Pictures'}
            </p>
            <h2
              id="section-pictures-modal-title"
              className="text-2xl sm:text-3xl font-serif text-stone-900"
            >
              Pictures
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close pictures gallery"
            className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Column Pictures Grid (Image 3) */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {photos.map((photo, idx) => (
              <button
                key={`${photo.url}-${idx}`}
                type="button"
                onClick={() => {
                  setActiveIndex(idx)
                  setViewMode('lightbox')
                }}
                aria-label={
                  photo.caption
                    ? `Open photo ${idx + 1}: ${photo.caption}`
                    : `Open photo ${idx + 1}`
                }
                className="group relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-200 text-left shadow-xs hover:shadow-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800/60"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || `${sectionTitle} photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-transparent px-4 pt-8 pb-3">
                    <p className="text-sm font-semibold text-white drop-shadow-xs">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
