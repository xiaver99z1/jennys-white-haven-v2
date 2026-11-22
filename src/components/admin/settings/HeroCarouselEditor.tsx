import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
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
  Monitor,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react'
import {
  DEFAULT_HERO_IMAGE_FOCAL_X,
  DEFAULT_HERO_MOBILE_POSITIONS,
  DEFAULT_HERO_MOBILE_TEXT_SCALE,
  DEFAULT_HERO_MOBILE_TEXT_WIDTH,
  DEFAULT_HERO_POSITIONS,
  DEFAULT_HERO_TEXT_WIDTH,
  HERO_CANVAS_HEIGHT,
  HERO_CANVAS_WIDTH,
  HERO_MOBILE_CANVAS_HEIGHT,
  HERO_MOBILE_CANVAS_WIDTH,
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
type PreviewDevice = 'desktop' | 'mobile'

const MOBILE_TEXT_SCALE_OPTIONS = [
  { label: '45%', value: 0.45 },
  { label: '55% (Auto)', value: 0.55 },
  { label: '65%', value: 0.65 },
  { label: '75%', value: 0.75 },
  { label: '85%', value: 0.85 },
  { label: '100%', value: 1 },
]

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
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop')
  const [uploadingSlideIds, setUploadingSlideIds] = useState<string[]>([])
  const [draggingTarget, setDraggingTarget] = useState<DragTarget | null>(null)
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(
    null,
  )
  const [snappedCenterX, setSnappedCenterX] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5)

  const isMobilePreview = previewDevice === 'mobile'
  const canvasWidth = isMobilePreview
    ? HERO_MOBILE_CANVAS_WIDTH
    : HERO_CANVAS_WIDTH
  const canvasHeight = isMobilePreview
    ? HERO_MOBILE_CANVAS_HEIGHT
    : HERO_CANVAS_HEIGHT

  const activeUploadsRef = useRef(0)
  const imageVersionRef = useRef<Map<string, number>>(new Map())
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    target: DragTarget
    slideId: string
    pointerId: number
    isMobile: boolean
    canvasWidth: number
    canvasHeight: number
    grabOffsetX: number
    grabOffsetY: number
    elWidth: number
    elHeight: number
  } | null>(null)
  const resizeStateRef = useRef<{
    side: 'left' | 'right'
    slideId: string
    pointerId: number
    isMobile: boolean
    canvasWidth: number
    anchorEdgePx: number
  } | null>(null)

  function switchPreviewDevice(nextDevice: PreviewDevice) {
    dragStateRef.current = null
    resizeStateRef.current = null
    setDraggingTarget(null)
    setResizingSide(null)
    setSnappedCenterX(false)
    setPreviewDevice(nextDevice)
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const updateScale = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) {
        setPreviewScale(width / canvasWidth)
      }
    }
    updateScale()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateScale)
    observer.observe(el)
    return () => observer.disconnect()
  }, [canvasWidth])

  const activeSlideIndex = Math.max(
    0,
    config.slides.findIndex((s) => s.id === selectedSlideId),
  )
  const activeSlide = config.slides[activeSlideIndex] ?? config.slides[0]
  const isUploadingActive = uploadingSlideIds.includes(activeSlide.id)

  const activeTextPos = isMobilePreview
    ? (activeSlide.mobileTextPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.text)
    : activeSlide.textPosition
  const activeTextWidth = isMobilePreview
    ? (activeSlide.mobileTextWidth ?? DEFAULT_HERO_MOBILE_TEXT_WIDTH)
    : (activeSlide.textWidth ?? DEFAULT_HERO_TEXT_WIDTH)
  const activeMobileTextScale =
    activeSlide.mobileTextScale ?? DEFAULT_HERO_MOBILE_TEXT_SCALE
  const activeMobileFocalX =
    activeSlide.mobileImageFocalX ?? DEFAULT_HERO_IMAGE_FOCAL_X
  const activeCtaPos = isMobilePreview
    ? (config.mobileCtaPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.cta)
    : config.ctaPosition
  const activeBookingPos = isMobilePreview
    ? (config.mobileBookingBarPosition ??
      DEFAULT_HERO_MOBILE_POSITIONS.bookingBar)
    : config.bookingBarPosition

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
          mobileTextPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.text },
          mobileTextWidth: DEFAULT_HERO_MOBILE_TEXT_WIDTH,
          mobileTextScale: DEFAULT_HERO_MOBILE_TEXT_SCALE,
          mobileImageFocalX: DEFAULT_HERO_IMAGE_FOCAL_X,
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

  function bumpSlideImageVersion(slideId: string): number {
    const next = (imageVersionRef.current.get(slideId) ?? 0) + 1
    imageVersionRef.current.set(slideId, next)
    return next
  }

  async function handleUploadSlideImage(slideId: string, file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (JPG, PNG, WEBP, GIF).')
      return
    }

    const uploadVersion = bumpSlideImageVersion(slideId)
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
      if (imageVersionRef.current.get(slideId) === uploadVersion) {
        updateSlide(slideId, { image: url })
      }
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
      stageRect.width > 0 ? stageRect.width / canvasWidth : previewScale
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
      isMobile: isMobilePreview,
      canvasWidth,
      canvasHeight,
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
      stageRect.width > 0
        ? stageRect.width / drag.canvasWidth
        : previewScale

    const nextCenterX =
      (e.clientX - stageRect.left) / scale - drag.grabOffsetX
    const nextCenterY =
      (e.clientY - stageRect.top) / scale - drag.grabOffsetY

    const halfW = Math.min(drag.elWidth / 2, drag.canvasWidth / 2)
    const halfH = Math.min(drag.elHeight / 2, drag.canvasHeight / 2)

    const clampedX = Math.min(
      drag.canvasWidth - halfW,
      Math.max(halfW, nextCenterX),
    )
    const clampedY = Math.min(
      drag.canvasHeight - halfH,
      Math.max(halfH, nextCenterY),
    )

    let pctX = Math.round((clampedX / drag.canvasWidth) * 1000) / 10
    const isNearCenter = Math.abs(pctX - 50) <= 1.5
    if (isNearCenter) pctX = 50
    setSnappedCenterX(isNearCenter)

    const pctY = Math.round((clampedY / drag.canvasHeight) * 1000) / 10
    const nextPos: HeroElementPosition = { x: pctX, y: pctY }

    if (drag.target === 'text') {
      updateSlide(
        drag.slideId,
        drag.isMobile
          ? { mobileTextPosition: nextPos }
          : { textPosition: nextPos },
      )
    } else if (drag.target === 'cta') {
      onChange((prev) =>
        drag.isMobile
          ? { ...prev, mobileCtaPosition: nextPos }
          : { ...prev, ctaPosition: nextPos },
      )
    } else {
      onChange((prev) =>
        drag.isMobile
          ? { ...prev, mobileBookingBarPosition: nextPos }
          : { ...prev, bookingBarPosition: nextPos },
      )
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
    const currentWidthPct = activeTextWidth
    const currentWidthPx = (currentWidthPct / 100) * canvasWidth
    const currentCenterPx = (activeTextPos.x / 100) * canvasWidth
    const leftEdgePx = currentCenterPx - currentWidthPx / 2
    const rightEdgePx = currentCenterPx + currentWidthPx / 2

    resizeStateRef.current = {
      side,
      slideId: activeSlide.id,
      pointerId: e.pointerId,
      isMobile: isMobilePreview,
      canvasWidth,
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
      stageRect.width > 0
        ? stageRect.width / resize.canvasWidth
        : previewScale
    const pointerCanvasX = (e.clientX - stageRect.left) / scale

    const minWidthPx = (MIN_HERO_TEXT_WIDTH / 100) * resize.canvasWidth
    const maxWidthPx = (MAX_HERO_TEXT_WIDTH / 100) * resize.canvasWidth

    let nextLeftPx: number
    let nextRightPx: number

    if (resize.side === 'right') {
      nextLeftPx = Math.max(0, resize.anchorEdgePx)
      nextRightPx = Math.min(
        resize.canvasWidth,
        Math.max(nextLeftPx + minWidthPx, pointerCanvasX),
      )
      if (nextRightPx - nextLeftPx > maxWidthPx) {
        nextRightPx = nextLeftPx + maxWidthPx
      }
    } else {
      nextRightPx = Math.min(resize.canvasWidth, resize.anchorEdgePx)
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
        Math.round(((nextRightPx - nextLeftPx) / resize.canvasWidth) * 1000) /
          10,
      ),
    )
    const nextCenterX =
      Math.round(
        (((nextLeftPx + nextRightPx) / 2) / resize.canvasWidth) * 1000,
      ) / 10

    onChange((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => {
        if (s.id !== resize.slideId) return s
        if (resize.isMobile) {
          const prevPos =
            s.mobileTextPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.text
          return {
            ...s,
            mobileTextWidth: nextWidthPct,
            mobileTextPosition: { ...prevPos, x: nextCenterX },
          }
        }
        return {
          ...s,
          textWidth: nextWidthPct,
          textPosition: { ...s.textPosition, x: nextCenterX },
        }
      }),
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

  function handleNudgeTarget(
    target: DragTarget,
    e: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (disabled) return
    const step = e.shiftKey ? 5 : 1
    let dx = 0
    let dy = 0
    if (e.key === 'ArrowLeft') dx = -step
    else if (e.key === 'ArrowRight') dx = step
    else if (e.key === 'ArrowUp') dy = -step
    else if (e.key === 'ArrowDown') dy = step
    else return

    e.preventDefault()
    const clampPct = (val: number) =>
      Math.min(100, Math.max(0, Math.round(val * 10) / 10))

    if (target === 'text') {
      onChange((prev) => ({
        ...prev,
        slides: prev.slides.map((s) => {
          if (s.id !== activeSlide.id) return s
          if (isMobilePreview) {
            const cur =
              s.mobileTextPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.text
            return {
              ...s,
              mobileTextPosition: {
                x: clampPct(cur.x + dx),
                y: clampPct(cur.y + dy),
              },
            }
          }
          return {
            ...s,
            textPosition: {
              x: clampPct(s.textPosition.x + dx),
              y: clampPct(s.textPosition.y + dy),
            },
          }
        }),
      }))
    } else if (target === 'cta') {
      onChange((prev) => {
        if (isMobilePreview) {
          const cur =
            prev.mobileCtaPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.cta
          return {
            ...prev,
            mobileCtaPosition: {
              x: clampPct(cur.x + dx),
              y: clampPct(cur.y + dy),
            },
          }
        }
        return {
          ...prev,
          ctaPosition: {
            x: clampPct(prev.ctaPosition.x + dx),
            y: clampPct(prev.ctaPosition.y + dy),
          },
        }
      })
    } else {
      onChange((prev) => {
        if (isMobilePreview) {
          const cur =
            prev.mobileBookingBarPosition ??
            DEFAULT_HERO_MOBILE_POSITIONS.bookingBar
          return {
            ...prev,
            mobileBookingBarPosition: {
              x: clampPct(cur.x + dx),
              y: clampPct(cur.y + dy),
            },
          }
        }
        return {
          ...prev,
          bookingBarPosition: {
            x: clampPct(prev.bookingBarPosition.x + dx),
            y: clampPct(prev.bookingBarPosition.y + dy),
          },
        }
      })
    }
  }

  function handleKeyboardResize(
    side: 'left' | 'right',
    e: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (disabled) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    e.stopPropagation()

    const step = e.shiftKey ? 5 : 2
    const delta =
      side === 'right'
        ? e.key === 'ArrowRight'
          ? step
          : -step
        : e.key === 'ArrowLeft'
          ? step
          : -step

    onChange((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => {
        if (s.id !== activeSlide.id) return s
        if (isMobilePreview) {
          const currentWidth =
            s.mobileTextWidth ?? DEFAULT_HERO_MOBILE_TEXT_WIDTH
          const nextWidth = Math.min(
            MAX_HERO_TEXT_WIDTH,
            Math.max(MIN_HERO_TEXT_WIDTH, currentWidth + delta),
          )
          return { ...s, mobileTextWidth: nextWidth }
        }
        const currentWidth = s.textWidth ?? DEFAULT_HERO_TEXT_WIDTH
        const nextWidth = Math.min(
          MAX_HERO_TEXT_WIDTH,
          Math.max(MIN_HERO_TEXT_WIDTH, currentWidth + delta),
        )
        return { ...s, textWidth: nextWidth }
      }),
    }))
  }

  function handleResetPositions() {
    if (isMobilePreview) {
      onChange((prev) => ({
        ...prev,
        mobileCtaPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.cta },
        mobileBookingBarPosition: {
          ...DEFAULT_HERO_MOBILE_POSITIONS.bookingBar,
        },
        slides: prev.slides.map((s) =>
          s.id === activeSlide.id
            ? {
                ...s,
                mobileTextPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.text },
                mobileTextWidth: DEFAULT_HERO_MOBILE_TEXT_WIDTH,
                mobileTextScale: DEFAULT_HERO_MOBILE_TEXT_SCALE,
                mobileImageFocalX: DEFAULT_HERO_IMAGE_FOCAL_X,
              }
            : s,
        ),
      }))
      return
    }

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
      {/* 1. True 1:1 Scaled Desktop (1280×720) & Mobile (390×520) WYSIWYG Hero Canvas */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Live Hero Canvas — Drag Elements to Position (
              {isMobilePreview ? 'Mobile View' : 'Desktop View'})
            </h3>
            <p className="text-[11px] text-stone-400">
              {isMobilePreview
                ? 'Scaled 1:1 mobile phone preview (390×520). Drag text, button, or compact 2×2 booking bar and tune mobile text scale & photo framing independently from desktop.'
                : 'Scaled 1:1 desktop preview (1280×720). Drag slide text, Explore Rooms button, or Check-in/Check-out bar to place them accurately.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Desktop / Mobile View Switcher */}
            <div
              role="group"
              aria-label="Preview device mode"
              className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-100 p-0.5"
            >
              <button
                type="button"
                aria-pressed={!isMobilePreview}
                onClick={() => switchPreviewDevice('desktop')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  !isMobilePreview
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop (1280×720)
              </button>
              <button
                type="button"
                aria-pressed={isMobilePreview}
                onClick={() => switchPreviewDevice('mobile')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  isMobilePreview
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile (390×520)
              </button>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={handleResetPositions}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-[11px] font-semibold text-stone-600 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              {isMobilePreview
                ? 'Reset Mobile Layout'
                : 'Reset Positions'}
            </button>
          </div>
        </div>

        {/* Mobile View Responsive Controls Bar (Text Scale + Photo Focal Point) */}
        {isMobilePreview && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <span className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                Slide {activeSlideIndex + 1} Mobile Text Size Scale
              </span>
              <div
                role="group"
                aria-label="Mobile text size scale"
                className="flex flex-wrap items-center gap-1"
              >
                {MOBILE_TEXT_SCALE_OPTIONS.map((opt) => {
                  const isSelected =
                    Math.abs(activeMobileTextScale - opt.value) < 0.02
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() =>
                        updateSlide(activeSlide.id, {
                          mobileTextScale: opt.value,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  htmlFor="mobile-focal-x"
                  className="text-[11px] font-semibold text-stone-700"
                >
                  Mobile Photo Framing (Left ↔ Right):{' '}
                  <span className="text-amber-900 font-bold">
                    {Math.round(activeMobileFocalX)}%
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Left', val: 25 },
                    { label: 'Center', val: 50 },
                    { label: 'Right', val: 75 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        updateSlide(activeSlide.id, {
                          mobileImageFocalX: preset.val,
                        })
                      }
                      className="px-2 py-0.5 rounded-md border border-stone-200 bg-white hover:bg-stone-100 text-[10px] font-semibold text-stone-600 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="mobile-focal-x"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                aria-label="Mobile photo horizontal focal point"
                value={activeMobileFocalX}
                onChange={(e) =>
                  updateSlide(activeSlide.id, {
                    mobileImageFocalX: Number(e.target.value),
                  })
                }
                className="w-full accent-stone-900 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          aria-label="Interactive hero preview canvas"
          className={
            isMobilePreview
              ? 'relative w-full max-w-[360px] mx-auto aspect-[390/520] rounded-[28px] overflow-hidden border-4 border-stone-800 shadow-xl bg-stone-900 select-none touch-none'
              : 'relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 select-none touch-none'
          }
        >
          {/* Scaled canonical stage matching public HeroCarouselSection 1:1 */}
          <div
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
            className="absolute top-0 left-0 overflow-hidden bg-stone-900"
          >
            {activeSlide.image ? (
              <img
                src={activeSlide.image}
                alt={`Slide ${activeSlideIndex + 1} preview`}
                style={
                  isMobilePreview
                    ? { objectPosition: `${activeMobileFocalX}% 50%` }
                    : undefined
                }
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

            {/* Draggable & Resizable Slide Text Overlay */}
            {showPreviewText && (
              <div
                role="group"
                tabIndex={disabled ? -1 : 0}
                aria-label="Draggable hero text"
                style={
                  {
                    ...centerAnchorStyle(activeTextPos),
                    width: `${activeTextWidth}%`,
                    '--hero-font-scale': isMobilePreview
                      ? String(activeMobileTextScale)
                      : '1',
                  } as CSSProperties
                }
                onPointerDown={(e) => handleDragStart('text', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onKeyDown={(e) => handleNudgeTarget('text', e)}
                className={`absolute z-20 rounded-xl border-2 border-dashed transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                  draggingTarget === 'text' || resizingSide !== null
                    ? 'border-amber-300 bg-stone-950/35'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  Slide Text ({Math.round(activeTextPos.x)}%,{' '}
                  {Math.round(activeTextPos.y)}%) · W{' '}
                  {Math.round(activeTextWidth)}%
                </div>

                {/* Left Width Resize Handle */}
                <div
                  role="separator"
                  tabIndex={disabled ? -1 : 0}
                  aria-orientation="vertical"
                  aria-label="Resize hero text from left"
                  onPointerDown={(e) => handleResizeStart('left', e)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onKeyDown={(e) => handleKeyboardResize('left', e)}
                  className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize z-30 focus:outline-none focus:ring-2 focus:ring-amber-300 rounded-full"
                >
                  <span className="w-1.5 h-7 rounded-full bg-amber-300 border border-stone-900 shadow-sm" />
                </div>

                {/* Right Width Resize Handle */}
                <div
                  role="separator"
                  tabIndex={disabled ? -1 : 0}
                  aria-orientation="vertical"
                  aria-label="Resize hero text from right"
                  onPointerDown={(e) => handleResizeStart('right', e)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onKeyDown={(e) => handleKeyboardResize('right', e)}
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize z-30 focus:outline-none focus:ring-2 focus:ring-amber-300 rounded-full"
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

            {/* Draggable Explore Rooms CTA Overlay */}
            {showPreviewCta && (
              <div
                role="group"
                tabIndex={disabled ? -1 : 0}
                aria-label="Draggable Explore Rooms button"
                style={centerAnchorStyle(activeCtaPos)}
                onPointerDown={(e) => handleDragStart('cta', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onKeyDown={(e) => handleNudgeTarget('cta', e)}
                className={`absolute z-20 rounded-full border-2 border-dashed cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                  draggingTarget === 'cta'
                    ? 'border-amber-300 bg-stone-950/40'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  CTA ({Math.round(activeCtaPos.x)}%,{' '}
                  {Math.round(activeCtaPos.y)}%)
                </div>
                <div
                  className={`inline-flex items-center rounded-full bg-[#FAF8F4] text-stone-900 uppercase tracking-[0.18em] font-semibold shadow-lg whitespace-nowrap pointer-events-none ${
                    isMobilePreview
                      ? 'gap-2 px-5 py-2.5 text-[11px]'
                      : 'gap-2.5 px-6 py-3 text-xs'
                  }`}
                >
                  {ctaLabel}
                  <ArrowRight
                    className={
                      isMobilePreview ? 'w-3.5 h-3.5' : 'w-4 h-4'
                    }
                  />
                </div>
              </div>
            )}

            {/* Draggable Check-in / Check-out Bar Overlay (2×2 on mobile, 4-col on desktop) */}
            {config.showBookingBar && (
              <div
                role="group"
                tabIndex={disabled ? -1 : 0}
                aria-label="Draggable check-in and check-out section"
                style={centerAnchorStyle(activeBookingPos)}
                onPointerDown={(e) => handleDragStart('bookingBar', e)}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onKeyDown={(e) => handleNudgeTarget('bookingBar', e)}
                className={`absolute z-10 ${
                  isMobilePreview ? 'w-[92%]' : 'w-[88%] max-w-5xl'
                } rounded-2xl border-2 border-dashed cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                  draggingTarget === 'bookingBar'
                    ? 'border-amber-400'
                    : 'border-white/40 hover:border-amber-300/80'
                }`}
              >
                <div className="absolute -top-7 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/85 text-[11px] uppercase tracking-wider text-amber-200 whitespace-nowrap pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5" />
                  Booking Bar ({Math.round(activeBookingPos.x)}%,{' '}
                  {Math.round(activeBookingPos.y)}%)
                </div>
                <div
                  className={`bg-[#FAF8F4]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/60 grid items-end pointer-events-none ${
                    isMobilePreview
                      ? 'p-3 grid-cols-2 gap-2'
                      : 'p-5 grid-cols-4 gap-3'
                  }`}
                >
                  <div>
                    <div
                      className={`flex items-center gap-1 uppercase text-stone-500 font-semibold ${
                        isMobilePreview
                          ? 'text-[10px] tracking-[0.16em] mb-1'
                          : 'text-[11px] tracking-[0.18em] mb-1.5'
                      }`}
                    >
                      <Calendar
                        className={
                          isMobilePreview ? 'w-3 h-3' : 'w-3.5 h-3.5'
                        }
                      />
                      Check-in
                    </div>
                    <div
                      className={`rounded-xl border border-stone-200 bg-white text-stone-400 ${
                        isMobilePreview
                          ? 'px-2.5 py-2 text-xs'
                          : 'px-3 py-2.5 text-sm'
                      }`}
                    >
                      dd/mm/yyyy
                    </div>
                  </div>
                  <div>
                    <div
                      className={`flex items-center gap-1 uppercase text-stone-500 font-semibold ${
                        isMobilePreview
                          ? 'text-[10px] tracking-[0.16em] mb-1'
                          : 'text-[11px] tracking-[0.18em] mb-1.5'
                      }`}
                    >
                      <Calendar
                        className={
                          isMobilePreview ? 'w-3 h-3' : 'w-3.5 h-3.5'
                        }
                      />
                      Check-out
                    </div>
                    <div
                      className={`rounded-xl border border-stone-200 bg-white text-stone-400 ${
                        isMobilePreview
                          ? 'px-2.5 py-2 text-xs'
                          : 'px-3 py-2.5 text-sm'
                      }`}
                    >
                      dd/mm/yyyy
                    </div>
                  </div>
                  <div>
                    <div
                      className={`flex items-center gap-1 uppercase text-stone-500 font-semibold ${
                        isMobilePreview
                          ? 'text-[10px] tracking-[0.16em] mb-1'
                          : 'text-[11px] tracking-[0.18em] mb-1.5'
                      }`}
                    >
                      <Users
                        className={
                          isMobilePreview ? 'w-3 h-3' : 'w-3.5 h-3.5'
                        }
                      />
                      Guests
                    </div>
                    <div
                      className={`rounded-xl border border-stone-200 bg-white text-stone-800 ${
                        isMobilePreview
                          ? 'px-2.5 py-2 text-xs'
                          : 'px-3 py-2.5 text-sm'
                      }`}
                    >
                      2 Guests
                    </div>
                  </div>
                  <div
                    className={`w-full rounded-xl bg-stone-900 text-[#FAF8F4] uppercase font-semibold text-center whitespace-nowrap ${
                      isMobilePreview
                        ? 'py-2.5 px-3 text-[10px] tracking-[0.14em]'
                        : 'py-3 px-5 text-xs tracking-[0.18em]'
                    }`}
                  >
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
                    onClick={() => {
                      bumpSlideImageVersion(activeSlide.id)
                      updateSlide(activeSlide.id, { image: '' })
                    }}
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
              disabled={disabled || isUploadingActive}
              value={activeSlide.image}
              onChange={(e) => {
                bumpSlideImageVersion(activeSlide.id)
                updateSlide(activeSlide.id, { image: e.target.value })
              }}
              placeholder="https://... or upload an image above"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-60"
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
