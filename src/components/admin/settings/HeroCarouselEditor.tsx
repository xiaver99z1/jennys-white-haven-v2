import { useEffect, useRef, useState } from 'react'
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
import {
  DEFAULT_HERO_POSITIONS,
  DEFAULT_HERO_TEXT_WIDTH,
  HERO_CANVAS_HEIGHT,
  HERO_CANVAS_WIDTH,
  MAX_HERO_TEXT_WIDTH,
  MIN_HERO_TEXT_WIDTH,
} from '#/lib/constants/cms'
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

function centerAnchorStyle(pos: HeroElementPosition): CSSProperties {
  return {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: 'translate(-50%, -50%)',
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
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(
    null,
  )
  const [snappedCenterX, setSnappedCenterX] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5)

  const activeUploadsRef = useRef(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    target: DragTarget
    slideId: string
    pointerId: number
    grabOffsetX: number
    grabOffsetY: number
    elWidth: number
    elHeight: number
  } | null>(null)
  const resizeStateRef = useRef<{
    side: 'left' | 'right'
    slideId: string
    pointerId: number
    anchorEdgePx: number
  } | null>(null)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const updateScale = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) {
        setPreviewScale(width / HERO_CANVAS_WIDTH)
      }
    }
    updateScale()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateScale)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
          textWidth: DEFAULT_HERO_TEXT_WIDTH,
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
    const viewport = viewportRef.current
    if (!viewport) return

    const stageRect = viewport.getBoundingClientRect()
    const scale =
      stageRect.width > 0 ? stageRect.width / HERO_CANVAS_WIDTH : previewScale
    const elRect = e.currentTarget.getBoundingClientRect()

    const elWidth = elRect.width / scale
    const elHeight = elRect.height / scale
    const elCenterX =
      (elRect.left + elRect.width / 2 - stageRect.left) / scale
    const elCenterY =
      (elRect.top + elRect.height / 2 - stageRect.top) / scale
    const pointerCanvasX = (e.clientX - stageRect.left) / scale
    const pointerCanvasY = (e.clientY - stageRect.top) / scale

    dragStateRef.current = {
      target,
      slideId: activeSlide.id,
      pointerId: e.pointerId,
      grabOffsetX: pointerCanvasX - elCenterX,
      grabOffsetY: pointerCanvasY - elCenterY,
      elWidth,
      elHeight,
    }
    setDraggingTarget(target)
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function handleDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current
    const viewport = viewportRef.current
    if (!drag || !viewport || drag.pointerId !== e.pointerId) return

    const stageRect = viewport.getBoundingClientRect()
    const scale =
      stageRect.width > 0 ? stageRect.width / HERO_CANVAS_WIDTH : previewScale

    const nextCenterX =
      (e.clientX - stageRect.left) / scale - drag.grabOffsetX
    const nextCenterY =
      (e.clientY - stageRect.top) / scale - drag.grabOffsetY

    const halfW = Math.min(drag.elWidth / 2, HERO_CANVAS_WIDTH / 2)
    const halfH = Math.min(drag.elHeight / 2, HERO_CANVAS_HEIGHT / 2)

    const clampedX = Math.min(
      HERO_CANVAS_WIDTH - halfW,
      Math.max(halfW, nextCenterX),
    )
    const clampedY = Math.min(
      HERO_CANVAS_HEIGHT - halfH,
      Math.max(halfH, nextCenterY),
    )

    let pctX = Math.round((clampedX / HERO_CANVAS_WIDTH) * 1000) / 10
    const isNearCenter = Math.abs(pctX - 50) <= 1.5
    if (isNearCenter) pctX = 50
    setSnappedCenterX(isNearCenter)

    const pctY = Math.round((clampedY / HERO_CANVAS_HEIGHT) * 1000) / 10
    const nextPos: HeroElementPosition = { x: pctX, y: pctY }

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
    setSnappedCenterX(false)
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function handleResizeStart(
    side: 'left' | 'right',
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (disabled) return
    e.stopPropagation()
    const currentWidthPct = activeSlide.textWidth ?? DEFAULT_HERO_TEXT_WIDTH
    const currentWidthPx = (currentWidthPct / 100) * HERO_CANVAS_WIDTH
    const currentCenterPx =
      (activeSlide.textPosition.x / 100) * HERO_CANVAS_WIDTH
    const leftEdgePx = currentCenterPx - currentWidthPx / 2
    const rightEdgePx = currentCenterPx + currentWidthPx / 2

    resizeStateRef.current = {
      side,
      slideId: activeSlide.id,
      pointerId: e.pointerId,
      anchorEdgePx: side === 'right' ? leftEdgePx : rightEdgePx,
    }
    setResizingSide(side)
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  function handleResizeMove(e: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeStateRef.current
    const viewport = viewportRef.current
    if (!resize || !viewport || resize.pointerId !== e.pointerId) return
    e.stopPropagation()

    const stageRect = viewport.getBoundingClientRect()
    const scale =
      stageRect.width > 0 ? stageRect.width / HERO_CANVAS_WIDTH : previewScale
    const pointerCanvasX = (e.clientX - stageRect.left) / scale

    const minWidthPx = (MIN_HERO_TEXT_WIDTH / 100) * HERO_CANVAS_WIDTH
    const maxWidthPx = (MAX_HERO_TEXT_WIDTH / 100) * HERO_CANVAS_WIDTH

    let nextLeftPx: number
    let nextRightPx: number

    if (resize.side === 'right') {
      nextLeftPx = Math.max(0, resize.anchorEdgePx)
      nextRightPx = Math.min(
        HERO_CANVAS_WIDTH,
        Math.max(nextLeftPx + minWidthPx, pointerCanvasX),
      )
      if (nextRightPx - nextLeftPx > maxWidthPx) {
        nextRightPx = nextLeftPx + maxWidthPx
      }
    } else {
      nextRightPx = Math.min(HERO_CANVAS_WIDTH, resize.anchorEdgePx)
      nextLeftPx = Math.max(
        0,
        Math.min(nextRightPx - minWidthPx, pointerCanvasX),
      )
      if (nextRightPx - nextLeftPx > maxWidthPx) {
        nextLeftPx = nextRightPx - maxWidthPx
      }
    }

    const nextWidthPct = Math.min(
      MAX_HERO_TEXT_WIDTH,
      Math.max(
        MIN_HERO_TEXT_WIDTH,
        Math.round(((nextRightPx - nextLeftPx) / HERO_CANVAS_WIDTH) * 1000) /
          10,
      ),
    )
    const nextCenterX =
      Math.round((((nextLeftPx + nextRightPx) / 2) / HERO_CANVAS_WIDTH) * 1000) /
      10

    onChange((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === resize.slideId
          ? {
              ...s,
              textWidth: nextWidthPct,
              textPosition: { ...s.textPosition, x: nextCenterX },
            }
          : s,
      ),
    }))
  }

  function handleResizeEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeStateRef.current
    if (!resize || resize.pointerId !== e.pointerId) return
    e.stopPropagation()
    resizeStateRef.current = null
    setResizingSide(null)
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
          ? {
              ...s,
              textPosition: { ...DEFAULT_HERO_POSITIONS.text },
              textWidth: DEFAULT_HERO_TEXT_WIDTH,
            }
          : s,
      ),
    }))
  }

  const showPreviewText =
    activeSlide.showText && hasVisibleRichText(activeSlide.contentHtml)
  const showPreviewCta = config.showCta && Boolean(ctaLabel.trim())

  return (
    <div className="space-y-6">
      {/* 1. True 1:1 Scaled 1280×720 WYSIWYG Hero Canvas */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Live Hero Canvas — Drag Elements to Position
            </h3>
            <p className="text-[11px] text-stone-400">
              Scaled 1:1 desktop preview (1280×720). Drag slide text, Explore
              Rooms button, or Check-in/Check-out bar to place them accurately.
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
          ref={viewportRef}
          aria-label="Interactive hero preview canvas"
          className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 select-none touch-none"
        >
          {/* Scaled canonical 1280×720 stage matching public HeroCarouselSection 1:1 */}
          <div
            style={{
              width: HERO_CANVAS_WIDTH,
              height: HERO_CANVAS_HEIGHT,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
            className="absolute top-0 left-0 overflow-hidden bg-stone-900"
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
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-stone-950/20 pointer-events-none" />

            {/* Subtle Center Snap Guide Line */}
            {draggingTarget && snappedCenterX && (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l-2 border-dashed border-amber-300/80 z-30 pointer-events-none"
              />
            )}

            {/* Draggable & Resizable Slide Text Overlay (exact real-size HeroRichTextContent) */}
            {showPreviewText && (
              <div
                role="group"
                aria-label="Draggable hero text"
                style={{
                  ...centerAnchorStyle(activeSlide.textPosition),
                  width: `${activeSlide.textWidth ?? DEFAULT_HERO_TEXT_WIDTH}%`,
                }}
                onPointerDown={(e) => handleDragStart('text', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                className={`absolute z-20 rounded-xl border-2 border-dashed transition-colors cursor-grab active:cursor-grabbing ${
                  draggingTarget === 'text' || resizingSide !== null
                    ? 'border-amber-300 bg-stone-950/35'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  Slide Text ({Math.round(activeSlide.textPosition.x)}%,{' '}
                  {Math.round(activeSlide.textPosition.y)}%) · W{' '}
                  {Math.round(
                    activeSlide.textWidth ?? DEFAULT_HERO_TEXT_WIDTH,
                  )}
                  %
                </div>

                {/* Left Width Resize Handle */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize hero text from left"
                  onPointerDown={(e) => handleResizeStart('left', e)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize z-30"
                >
                  <span className="w-1.5 h-7 rounded-full bg-amber-300 border border-stone-900 shadow-sm" />
                </div>

                {/* Right Width Resize Handle */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize hero text from right"
                  onPointerDown={(e) => handleResizeStart('right', e)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize z-30"
                >
                  <span className="w-1.5 h-7 rounded-full bg-amber-300 border border-stone-900 shadow-sm" />
                </div>

                <div className="pointer-events-none text-[#FAF8F4]">
                  <HeroRichTextContent
                    html={activeSlide.contentHtml}
                    className="drop-shadow-xs"
                  />
                </div>
              </div>
            )}

            {/* Draggable Explore Rooms CTA Overlay (exact real-size button) */}
            {showPreviewCta && (
              <div
                role="group"
                aria-label="Draggable Explore Rooms button"
                style={centerAnchorStyle(config.ctaPosition)}
                onPointerDown={(e) => handleDragStart('cta', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                className={`absolute z-20 rounded-full border-2 border-dashed cursor-grab active:cursor-grabbing ${
                  draggingTarget === 'cta'
                    ? 'border-amber-300 bg-stone-950/40'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  CTA ({Math.round(config.ctaPosition.x)}%,{' '}
                  {Math.round(config.ctaPosition.y)}%)
                </div>
                <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#FAF8F4] text-stone-900 text-xs uppercase tracking-[0.18em] font-semibold shadow-lg whitespace-nowrap pointer-events-none">
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Draggable Check-in / Check-out Bar Overlay (exact real-size 4-column bar) */}
            {config.showBookingBar && (
              <div
                role="group"
                aria-label="Draggable check-in and check-out section"
                style={centerAnchorStyle(config.bookingBarPosition)}
                onPointerDown={(e) => handleDragStart('bookingBar', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                className={`absolute z-10 w-[88%] max-w-5xl rounded-2xl border-2 border-dashed cursor-grab active:cursor-grabbing ${
                  draggingTarget === 'bookingBar'
                    ? 'border-amber-400'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  Booking Bar ({Math.round(config.bookingBarPosition.x)}%,{' '}
                  {Math.round(config.bookingBarPosition.y)}%)
                </div>
                <div className="bg-[#FAF8F4]/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-stone-200/60 grid grid-cols-4 gap-3 items-end pointer-events-none">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Check-in
                    </div>
                    <div className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-400">
                      dd/mm/yyyy
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Check-out
                    </div>
                    <div className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-400">
                      dd/mm/yyyy
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Guests
                    </div>
                    <div className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800">
                      2 Guests
                    </div>
                  </div>
                  <div className="w-full py-3 px-5 rounded-xl bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold text-center">
                    Check Availability
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview slide switcher arrows (unscaled so buttons stay comfortable to click) */}
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
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-stone-950/60 text-white hover:bg-stone-950/85 cursor-pointer"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-stone-950/60 text-white hover:bg-stone-950/85 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
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
