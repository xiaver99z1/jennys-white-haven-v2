import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react'
import { DEFAULT_HERO_POSITIONS } from '#/lib/constants/cms'
import { getErrorMessage } from '#/lib/formatters'
import { hasVisibleRichText } from '#/lib/hero-rich-text'
import {
  compressImageForUpload,
  IMAGE_UPLOAD_PRESETS,
} from '#/lib/image-compress'
import { uploadAvatar } from '#/server/upload'
import { HeroRichTextContent } from '#/components/public/HeroRichTextContent'
import { HeroRichTextEditor } from '#/components/admin/settings/HeroRichTextEditor'
import type {
  HeroCarouselConfig,
  HeroElementPosition,
  HeroSlideItem,
} from '#/types'

export type HeroConfigUpdater = (
  prev: HeroCarouselConfig,
) => HeroCarouselConfig

type DragTarget = 'text' | 'cta' | 'bookingBar'

interface HeroCarouselEditorProps {
  config: HeroCarouselConfig
  ctaLabel: string
  ctaHref: string
  disabled?: boolean
  onChange: (updater: HeroConfigUpdater) => void
  onCtaLabelChange: (value: string) => void
  onCtaHrefChange: (value: string) => void
  onError: (message: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
}

function posStyle(pos: HeroElementPosition): CSSProperties {
  return {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: `translate(-${pos.x}%, -${pos.y}%)`,
  }
}

export function HeroCarouselEditor({
  config,
  ctaLabel,
  ctaHref,
  disabled = false,
  onChange,
  onCtaLabelChange,
  onCtaHrefChange,
  onError,
  onUploadingChange,
}: HeroCarouselEditorProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string>(
    config.slides[0]?.id ?? 'hero-slide-1',
  )
  const [uploadingSlideIds, setUploadingSlideIds] = useState<string[]>([])
  const [draggingTarget, setDraggingTarget] = useState<DragTarget | null>(null)

  const activeUploadsRef = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    target: DragTarget
    slideId: string
    pointerId: number
    offsetX: number
    offsetY: number
    elWidth: number
    elHeight: number
  } | null>(null)

  const activeSlideIndex = Math.max(
    0,
    config.slides.findIndex((s) => s.id === selectedSlideId),
  )
  const activeSlide = config.slides[activeSlideIndex] ?? config.slides[0]
  const isUploadingActive = uploadingSlideIds.includes(activeSlide.id)

  function updateSlide(slideId: string, patch: Partial<HeroSlideItem>) {
    onChange((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId ? { ...s, ...patch } : s,
      ),
    }))
  }

  function handleAddSlide() {
    const newId = `hero-slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    onChange((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: newId,
          image: '',
          contentHtml: '',
          showText: true,
          textPosition: { ...DEFAULT_HERO_POSITIONS.text },
        },
      ],
    }))
    setSelectedSlideId(newId)
  }

  function handleRemoveSlide(slideId: string) {
    if (config.slides.length <= 1) return
    const nextFallback = config.slides.find((s) => s.id !== slideId)
    onChange((prev) => {
      if (prev.slides.length <= 1) return prev
      return {
        ...prev,
        slides: prev.slides.filter((s) => s.id !== slideId),
      }
    })
    if (nextFallback) {
      setSelectedSlideId(nextFallback.id)
    }
  }

  function handleMoveSlide(slideId: string, direction: -1 | 1) {
    onChange((prev) => {
      const idx = prev.slides.findIndex((s) => s.id === slideId)
      const target = idx + direction
      if (idx === -1 || target < 0 || target >= prev.slides.length) return prev
      const next = [...prev.slides]
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return { ...prev, slides: next }
    })
  }

  async function handleUploadSlideImage(slideId: string, file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (JPG, PNG, WEBP, GIF).')
      return
    }

    activeUploadsRef.current += 1
    setUploadingSlideIds((prev) =>
      prev.includes(slideId) ? prev : [...prev, slideId],
    )
    onUploadingChange?.(true)
    onError(null)
    try {
      const compressed = await compressImageForUpload(
        file,
        IMAGE_UPLOAD_PRESETS.hero.maxDimension,
        IMAGE_UPLOAD_PRESETS.hero.quality,
      )
      const formData = new FormData()
      formData.append('file', compressed)
      formData.append('scope', 'cms')
      const url = await uploadAvatar({ data: formData })
      updateSlide(slideId, { image: url })
    } catch (err: unknown) {
      onError(getErrorMessage(err, 'Failed to upload hero slide image.'))
    } finally {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1)
      setUploadingSlideIds((prev) => prev.filter((id) => id !== slideId))
      if (activeUploadsRef.current === 0) {
        onUploadingChange?.(false)
      }
    }
  }

  function handleDragStart(
    target: DragTarget,
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (disabled) return
    const stage = stageRef.current
    if (!stage) return
    const elRect = e.currentTarget.getBoundingClientRect()
    dragStateRef.current = {
      target,
      slideId: activeSlide.id,
      pointerId: e.pointerId,
      offsetX: e.clientX - elRect.left,
      offsetY: e.clientY - elRect.top,
      elWidth: elRect.width,
      elHeight: elRect.height,
    }
    setDraggingTarget(target)
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function handleDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current
    const stage = stageRef.current
    if (!drag || !stage || drag.pointerId !== e.pointerId) return

    const stageRect = stage.getBoundingClientRect()
    const maxX = Math.max(1, stageRect.width - drag.elWidth)
    const maxY = Math.max(1, stageRect.height - drag.elHeight)
    const rawX = ((e.clientX - drag.offsetX - stageRect.left) / maxX) * 100
    const rawY = ((e.clientY - drag.offsetY - stageRect.top) / maxY) * 100
    const nextPos: HeroElementPosition = {
      x: Math.min(100, Math.max(0, Math.round(rawX * 10) / 10)),
      y: Math.min(100, Math.max(0, Math.round(rawY * 10) / 10)),
    }

    if (drag.target === 'text') {
      updateSlide(drag.slideId, { textPosition: nextPos })
    } else if (drag.target === 'cta') {
      onChange((prev) => ({ ...prev, ctaPosition: nextPos }))
    } else {
      onChange((prev) => ({ ...prev, bookingBarPosition: nextPos }))
    }
  }

  function handleDragEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragStateRef.current = null
    setDraggingTarget(null)
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function handleResetPositions() {
    onChange((prev) => ({
      ...prev,
      ctaPosition: { ...DEFAULT_HERO_POSITIONS.cta },
      bookingBarPosition: { ...DEFAULT_HERO_POSITIONS.bookingBar },
      slides: prev.slides.map((s) =>
        s.id === activeSlide.id
          ? { ...s, textPosition: { ...DEFAULT_HERO_POSITIONS.text } }
          : s,
      ),
    }))
  }

  const showPreviewText =
    activeSlide.showText && hasVisibleRichText(activeSlide.contentHtml)
  const showPreviewCta = config.showCta && Boolean(ctaLabel.trim())

  return (
    <div className="space-y-6">
      {/* 1. Interactive Live Hero Canvas (Drag & Drop Positioning) */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Live Hero Canvas — Drag Elements to Position
            </h3>
            <p className="text-[11px] text-stone-400">
              Drag the slide text, Explore Rooms button, or Check-in/Check-out
              bar anywhere on the hero preview.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleResetPositions}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-semibold text-stone-600 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Positions
          </button>
        </div>

        <div
          ref={stageRef}
          aria-label="Interactive hero preview canvas"
          className="relative w-full aspect-[16/9] min-h-[280px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 select-none touch-none"
        >
          {activeSlide.image ? (
            <img
              src={activeSlide.image}
              alt={`Slide ${activeSlideIndex + 1} preview`}
              className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-amber-950/80 pointer-events-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/30 to-stone-950/15 pointer-events-none" />

          {/* Preview slide switcher arrows */}
          {config.slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Preview previous slide"
                onClick={() => {
                  const prevIdx =
                    (activeSlideIndex - 1 + config.slides.length) %
                    config.slides.length
                  setSelectedSlideId(config.slides[prevIdx].id)
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-stone-950/50 text-white hover:bg-stone-950/80 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Preview next slide"
                onClick={() => {
                  const nextIdx = (activeSlideIndex + 1) % config.slides.length
                  setSelectedSlideId(config.slides[nextIdx].id)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-stone-950/50 text-white hover:bg-stone-950/80 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Draggable Slide Text Overlay */}
          {showPreviewText && (
            <div
              role="group"
              aria-label="Draggable hero text"
              style={posStyle(activeSlide.textPosition)}
              onPointerDown={(e) => handleDragStart('text', e)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              className={`absolute z-10 max-w-[75%] px-3 py-2 rounded-xl border border-dashed transition-colors cursor-grab active:cursor-grabbing ${
                draggingTarget === 'text'
                  ? 'border-amber-300 bg-stone-950/50'
                  : 'border-white/40 hover:border-amber-300/80 bg-stone-950/20'
              }`}
            >
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-amber-200/90 mb-1 pointer-events-none">
                <GripVertical className="w-3 h-3" />
                Slide Text ({Math.round(activeSlide.textPosition.x)}%,{' '}
                {Math.round(activeSlide.textPosition.y)}%)
              </div>
              <div className="pointer-events-none origin-top-left scale-75 sm:scale-90">
                <HeroRichTextContent html={activeSlide.contentHtml} />
              </div>
            </div>
          )}

          {/* Draggable Explore Rooms CTA Overlay */}
          {showPreviewCta && (
            <div
              role="group"
              aria-label="Draggable Explore Rooms button"
              style={posStyle(config.ctaPosition)}
              onPointerDown={(e) => handleDragStart('cta', e)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              className={`absolute z-10 p-1 rounded-full border border-dashed cursor-grab active:cursor-grabbing ${
                draggingTarget === 'cta'
                  ? 'border-amber-300 bg-stone-950/50'
                  : 'border-white/40 hover:border-amber-300/80'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FAF8F4] text-stone-900 text-[10px] uppercase tracking-[0.16em] font-semibold pointer-events-none">
                <GripVertical className="w-3 h-3 text-stone-400" />
                {ctaLabel}
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* Draggable Check-in / Check-out Bar Overlay */}
          {config.showBookingBar && (
            <div
              role="group"
              aria-label="Draggable check-in and check-out section"
              style={posStyle(config.bookingBarPosition)}
              onPointerDown={(e) => handleDragStart('bookingBar', e)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              className={`absolute z-10 w-[86%] max-w-lg rounded-xl p-2 bg-[#FAF8F4]/95 border-2 border-dashed shadow-xl cursor-grab active:cursor-grabbing ${
                draggingTarget === 'bookingBar'
                  ? 'border-amber-500'
                  : 'border-stone-300 hover:border-amber-400'
              }`}
            >
              <div className="grid grid-cols-4 gap-1.5 items-center text-[9px] text-stone-600 pointer-events-none">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-stone-200">
                  <Calendar className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                  <span className="truncate">Check-in</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-stone-200">
                  <Calendar className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                  <span className="truncate">Check-out</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-stone-200">
                  <Users className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                  <span className="truncate">2 Guests</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-stone-900 text-[#FAF8F4] text-center font-semibold truncate">
                  Check Availability
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Visibility Controls & Shared Hero Settings */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Visibility &amp; Shared Carousel Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={activeSlide.showText}
            onClick={() =>
              updateSlide(activeSlide.id, { showText: !activeSlide.showText })
            }
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              activeSlide.showText
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span>Slide {activeSlideIndex + 1} Text</span>
            {activeSlide.showText ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={config.showCta}
            onClick={() =>
              onChange((prev) => ({ ...prev, showCta: !prev.showCta }))
            }
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              config.showCta
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span>Explore Rooms Button</span>
            {config.showCta ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-pressed={config.showBookingBar}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                showBookingBar: !prev.showBookingBar,
              }))
            }
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              config.showBookingBar
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-white text-stone-500'
            }`}
          >
            <span>Check-in / Check-out Bar</span>
            {config.showBookingBar ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Shared CTA Label/Link + Autoplay Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-200/70">
          <div>
            <label
              htmlFor="hero-cta-label"
              className="block text-[11px] font-semibold text-stone-600 mb-1"
            >
              Explore Button Label
            </label>
            <input
              id="hero-cta-label"
              type="text"
              value={ctaLabel}
              onChange={(e) => onCtaLabelChange(e.target.value)}
              placeholder="Explore Rooms"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>
          <div>
            <label
              htmlFor="hero-cta-href"
              className="block text-[11px] font-semibold text-stone-600 mb-1"
            >
              Explore Button Link
            </label>
            <input
              id="hero-cta-href"
              type="text"
              value={ctaHref}
              onChange={(e) => onCtaHrefChange(e.target.value)}
              placeholder="/rooms"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>
          <div>
            <label
              htmlFor="hero-autoplay"
              className="block text-[11px] font-semibold text-stone-600 mb-1"
            >
              Carousel Autoplay
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer">
              <input
                id="hero-autoplay"
                type="checkbox"
                checked={config.autoplay}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, autoplay: e.target.checked }))
                }
                className="rounded border-stone-300"
              />
              <span>Auto-rotate slides</span>
            </label>
          </div>
          <div>
            <label
              htmlFor="hero-interval"
              className="block text-[11px] font-semibold text-stone-600 mb-1"
            >
              Slide Speed
            </label>
            <select
              id="hero-interval"
              value={config.intervalMs}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  intervalMs: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none"
            >
              <option value={4000}>4 seconds</option>
              <option value={6000}>6 seconds</option>
              <option value={8000}>8 seconds</option>
              <option value={10000}>10 seconds</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Carousel Slides Manager & Active Slide Editor */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {config.slides.map((slide, idx) => {
              const isSelected = slide.id === activeSlide.id
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setSelectedSlideId(slide.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Slide {idx + 1}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slide
          </button>
        </div>

        {/* Active Slide Settings Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <span className="text-sm font-semibold text-stone-900">
              Slide {activeSlideIndex + 1} Settings
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={disabled || activeSlideIndex === 0}
                onClick={() => handleMoveSlide(activeSlide.id, -1)}
                aria-label="Move slide left"
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={
                  disabled || activeSlideIndex === config.slides.length - 1
                }
                onClick={() => handleMoveSlide(activeSlide.id, 1)}
                aria-label="Move slide right"
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={
                  disabled || config.slides.length <= 1 || isUploadingActive
                }
                onClick={() => handleRemoveSlide(activeSlide.id)}
                aria-label="Delete slide"
                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Slide Background Photo */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-stone-600">
                Slide Background Photo
              </span>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer transition">
                  {isUploadingActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  {isUploadingActive
                    ? 'Uploading...'
                    : activeSlide.image
                      ? 'Replace Photo'
                      : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled || isUploadingActive}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      void handleUploadSlideImage(activeSlide.id, file)
                    }}
                  />
                </label>
                {activeSlide.image && (
                  <button
                    type="button"
                    disabled={disabled || isUploadingActive}
                    onClick={() => updateSlide(activeSlide.id, { image: '' })}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              inputMode="url"
              aria-label="Slide background image URL"
              value={activeSlide.image}
              onChange={(e) =>
                updateSlide(activeSlide.id, { image: e.target.value })
              }
              placeholder="https://... or upload an image above"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          {/* Single Unified Title & Subtitle Rich-Text Editor */}
          <HeroRichTextEditor
            key={activeSlide.id}
            value={activeSlide.contentHtml}
            disabled={disabled}
            onChange={(nextHtml) =>
              updateSlide(activeSlide.id, { contentHtml: nextHtml })
            }
          />
        </div>
      </div>
    </div>
  )
}
