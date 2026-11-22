import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HeroCarouselEditor } from './HeroCarouselEditor'
import type { HeroConfigUpdater } from './HeroCarouselEditor'
import { DEFAULT_HERO_CONFIG } from '#/lib/constants/cms'
import type { HeroCarouselConfig } from '#/types'

const { mockUploadAvatar, mockCompressImage } = vi.hoisted(() => ({
  mockUploadAvatar: vi.fn(),
  mockCompressImage: vi.fn(async (file: File) => file),
}))

vi.mock('#/server/upload', () => ({
  uploadAvatar: mockUploadAvatar,
}))

vi.mock('#/lib/image-compress', () => ({
  compressImageForUpload: mockCompressImage,
  IMAGE_UPLOAD_PRESETS: {
    hero: { maxDimension: 2560, quality: 0.88 },
  },
}))

function StatefulHeroHarness({
  initialConfig = DEFAULT_HERO_CONFIG,
  onError = vi.fn(),
  onUploadingChange = vi.fn(),
  onConfigChange,
}: {
  initialConfig?: HeroCarouselConfig
  onError?: (msg: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
  onConfigChange?: (next: HeroCarouselConfig) => void
}) {
  const [config, setConfig] = useState(initialConfig)
  const [ctaLabel, setCtaLabel] = useState('Explore Rooms')
  const [ctaHref, setCtaHref] = useState('/rooms')

  const handleChange = (updater: HeroConfigUpdater) => {
    setConfig((prev) => {
      const next = updater(prev)
      onConfigChange?.(next)
      return next
    })
  }

  return (
    <HeroCarouselEditor
      config={config}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      onChange={handleChange}
      onCtaLabelChange={setCtaLabel}
      onCtaHrefChange={setCtaHref}
      onError={onError}
      onUploadingChange={onUploadingChange}
    />
  )
}

describe('HeroCarouselEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds, reorders, toggles visibility, formats rich text, and removes carousel slides', () => {
    const onConfigChange = vi.fn()
    render(<StatefulHeroHarness onConfigChange={onConfigChange} />)

    // Rich text toolbar actions (font style, font size, bold, italic, align, color, preset lines)
    fireEvent.change(screen.getByLabelText('Font style'), {
      target: { value: "'DM Sans', system-ui, sans-serif" },
    })
    fireEvent.change(screen.getByLabelText('Font size'), {
      target: { value: '36px' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Toggle bold' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle italic' }))
    fireEvent.click(screen.getByRole('button', { name: 'Align center' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set color Warm Gold' }))
    fireEvent.click(screen.getByRole('button', { name: 'Title Line' }))
    fireEvent.click(screen.getByRole('button', { name: 'Subtitle Line' }))

    // Visibility toggles hide/show slide text, Explore Rooms button, and Check-in/out bar
    const slideTextToggle = screen.getByRole('button', { name: /Slide 1 Text/i })
    fireEvent.click(slideTextToggle)
    expect(slideTextToggle).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.queryByLabelText('Draggable hero text'),
    ).not.toBeInTheDocument()

    const ctaToggle = screen.getByRole('button', {
      name: /Explore Rooms Button/i,
    })
    fireEvent.click(ctaToggle)
    expect(ctaToggle).toHaveAttribute('aria-pressed', 'false')

    const bookingToggle = screen.getByRole('button', {
      name: /Check-in \/ Check-out Bar/i,
    })
    fireEvent.click(bookingToggle)
    expect(bookingToggle).toHaveAttribute('aria-pressed', 'false')

    // Shared CTA & autoplay inputs (optional, not required)
    fireEvent.change(screen.getByLabelText(/Explore Button Label/i), {
      target: { value: 'See Suites' },
    })
    fireEvent.change(screen.getByLabelText(/Explore Button Link/i), {
      target: { value: '/rooms' },
    })
    fireEvent.click(screen.getByLabelText(/Carousel Autoplay/i))
    fireEvent.change(screen.getByLabelText(/Slide Speed/i), {
      target: { value: '8000' },
    })

    // Add slide 2, move left, preview prev/next, then delete slide
    fireEvent.click(screen.getByRole('button', { name: /Add Slide/i }))
    expect(screen.getByText('Slide 2 Settings')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Preview previous slide' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preview next slide' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move slide left' }))
    expect(screen.getByText('Slide 1 Settings')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move slide right' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete slide' }))
    expect(screen.getByText('Slide 1 Settings')).toBeInTheDocument()
  })

  it('drags hero text, CTA button, and check-in/out bar on the live canvas and resets positions', () => {
    const onConfigChange = vi.fn()
    render(<StatefulHeroHarness onConfigChange={onConfigChange} />)

    const stage = screen.getByLabelText('Interactive hero preview canvas')
    // Preview viewport is 640x360 => exact 0.5x scale of canonical 1280x720 stage
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 360,
      right: 640,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const dragItem = (label: string, clientX: number, clientY: number) => {
      const el = screen.getByLabelText(label)
      // Scaled box 100x50 centered at (50, 25) in viewport coords => 200x100 in 1280x720
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        right: 100,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
      fireEvent.pointerDown(el, { pointerId: 1, clientX: 50, clientY: 25 })
      fireEvent.pointerMove(el, { pointerId: 1, clientX, clientY })
      fireEvent.pointerUp(el, { pointerId: 1, clientX, clientY })
    }

    // Center at (320, 180) in 640x360 viewport => (50%, 50%)
    dragItem('Draggable hero text', 320, 180)
    // Center at (160, 216) in 640x360 viewport => (25%, 60%)
    dragItem('Draggable Explore Rooms button', 160, 216)
    // Center at (320, 288) in 640x360 viewport => (50%, 80%)
    dragItem('Draggable check-in and check-out section', 320, 288)

    const latest = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(latest.slides[0].textPosition).toEqual({ x: 50, y: 50 })
    expect(latest.ctaPosition).toEqual({ x: 25, y: 60 })
    expect(latest.bookingBarPosition).toEqual({ x: 50, y: 80 })

    // Resize text box wider from the right handle (to fit one line)
    const rightHandle = screen.getByLabelText('Resize hero text from right')
    fireEvent.pointerDown(rightHandle, { pointerId: 2, clientX: 550, clientY: 180 })
    fireEvent.pointerMove(rightHandle, { pointerId: 2, clientX: 620, clientY: 180 })
    fireEvent.pointerUp(rightHandle, { pointerId: 2, clientX: 620, clientY: 180 })

    const resizedRight = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(resizedRight.slides[0].textWidth).toBeGreaterThan(72)

    // Resize text box from the left handle
    const leftHandle = screen.getByLabelText('Resize hero text from left')
    fireEvent.pointerDown(leftHandle, { pointerId: 3, clientX: 90, clientY: 180 })
    fireEvent.pointerMove(leftHandle, { pointerId: 3, clientX: 30, clientY: 180 })
    fireEvent.pointerUp(leftHandle, { pointerId: 3, clientX: 30, clientY: 180 })

    const resizedLeft = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(resizedLeft.slides[0].textWidth).toBeGreaterThan(
      resizedRight.slides[0].textWidth ?? 0,
    )

    // Keyboard nudging and keyboard resizing work for accessible control
    const textBox = screen.getByLabelText('Draggable hero text')
    fireEvent.keyDown(textBox, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(textBox, { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByLabelText('Draggable Explore Rooms button'), {
      key: 'ArrowLeft',
    })
    fireEvent.keyDown(
      screen.getByLabelText('Draggable check-in and check-out section'),
      { key: 'ArrowUp' },
    )
    fireEvent.keyDown(rightHandle, { key: 'ArrowLeft', shiftKey: true })
    fireEvent.keyDown(leftHandle, { key: 'ArrowLeft' })

    const afterKeyboard = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(afterKeyboard.slides[0].textPosition.y).toBe(51)
    expect(afterKeyboard.ctaPosition.x).toBe(24)
    expect(afterKeyboard.bookingBarPosition.y).toBe(79)

    // Reset positions snaps back to defaults including textWidth
    fireEvent.click(screen.getByRole('button', { name: /Reset Positions/i }))
    const reset = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(reset.ctaPosition).toEqual(DEFAULT_HERO_CONFIG.ctaPosition)
    expect(reset.bookingBarPosition).toEqual(
      DEFAULT_HERO_CONFIG.bookingBarPosition,
    )
    expect(reset.slides[0].textWidth).toBe(72)

    // Switch to Mobile (390×520) view and customize mobile positions, text width, text scale, and photo focal point
    fireEvent.click(
      screen.getByRole('button', { name: /Mobile \(390×520\)/i }),
    )
    // Mobile viewport is 390x520 => 1.0x scale of canonical 390x520 mobile stage
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 390,
      height: 520,
      right: 390,
      bottom: 520,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    dragItem('Draggable hero text', 195, 130)
    dragItem('Draggable Explore Rooms button', 195, 260)
    dragItem('Draggable check-in and check-out section', 195, 416)

    // Mobile text resize + keyboard nudge + scale + photo focal point
    fireEvent.pointerDown(rightHandle, { pointerId: 4, clientX: 350, clientY: 130 })
    fireEvent.pointerMove(rightHandle, { pointerId: 4, clientX: 370, clientY: 130 })
    fireEvent.pointerUp(rightHandle, { pointerId: 4, clientX: 370, clientY: 130 })

    fireEvent.keyDown(screen.getByLabelText('Draggable hero text'), {
      key: 'ArrowDown',
    })
    fireEvent.keyDown(screen.getByLabelText('Draggable Explore Rooms button'), {
      key: 'ArrowRight',
    })
    fireEvent.keyDown(
      screen.getByLabelText('Draggable check-in and check-out section'),
      { key: 'ArrowUp' },
    )
    fireEvent.keyDown(rightHandle, { key: 'ArrowLeft' })

    fireEvent.click(screen.getByRole('button', { name: '65%' }))
    fireEvent.click(screen.getByRole('button', { name: 'Left' }))
    fireEvent.change(
      screen.getByLabelText('Mobile photo horizontal focal point'),
      { target: { value: '35' } },
    )

    const afterMobileEdit = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(afterMobileEdit.slides[0].mobileTextPosition?.y).toBe(26)
    expect(afterMobileEdit.slides[0].mobileTextWidth).toBe(85.9)
    expect(afterMobileEdit.slides[0].mobileTextScale).toBe(0.65)
    expect(afterMobileEdit.slides[0].mobileImageFocalX).toBe(35)
    expect(afterMobileEdit.mobileCtaPosition).toEqual({ x: 51, y: 50 })
    expect(afterMobileEdit.mobileBookingBarPosition).toEqual({ x: 50, y: 79 })
    // Desktop positions remain untouched by mobile edits
    expect(afterMobileEdit.ctaPosition).toEqual(DEFAULT_HERO_CONFIG.ctaPosition)
    expect(afterMobileEdit.bookingBarPosition).toEqual(
      DEFAULT_HERO_CONFIG.bookingBarPosition,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Reset Mobile Layout/i }),
    )
    const afterMobileReset =
      onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(afterMobileReset.slides[0].mobileTextPosition).toEqual({
      x: 50,
      y: 26,
    })
    expect(afterMobileReset.mobileCtaPosition).toEqual({ x: 50, y: 47 })
    expect(afterMobileReset.mobileBookingBarPosition).toEqual({ x: 50, y: 76 })
    expect(afterMobileReset.slides[0].mobileTextScale).toBe(0.55)
    expect(afterMobileReset.slides[0].mobileImageFocalX).toBe(50)
    expect(afterMobileReset.slides[0].mobileTextWidth).toBe(86)
  })

  it('uploads compressed slide photos, supports relative URLs, and handles upload errors', async () => {
    const onError = vi.fn()
    const onUploadingChange = vi.fn()
    const { container } = render(
      <StatefulHeroHarness
        onError={onError}
        onUploadingChange={onUploadingChange}
      />,
    )

    const urlInput = screen.getByLabelText('Slide background image URL')
    expect(urlInput).toHaveAttribute('type', 'text')

    const fileInput = container.querySelector<HTMLInputElement>(
      'input[type="file"]',
    )!

    // Reject non-image
    const pdf = new File(['x'], 'test.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [pdf] } })
    expect(onError).toHaveBeenCalledWith(
      'Please select a valid image file (JPG, PNG, WEBP, GIF).',
    )

    // Upload valid photo (URL input locks during upload so it cannot be overwritten)
    let resolveUpload!: (url: string) => void
    mockUploadAvatar.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveUpload = resolve
        }),
    )
    const imgFile = new File(['img'], 'hero.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [imgFile] } })

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledTimes(1)
      expect(urlInput).toBeDisabled()
    })

    resolveUpload('/api/media/view?key=cms/hero1.webp')

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalledWith(imgFile, 2560, 0.88)
      expect(urlInput).toHaveValue('/api/media/view?key=cms/hero1.webp')
      expect(urlInput).not.toBeDisabled()
    })
    expect(onUploadingChange).toHaveBeenCalledWith(true)
    expect(onUploadingChange).toHaveBeenCalledWith(false)

    // Remove photo
    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo' }))
    expect(urlInput).toHaveValue('')

    // Upload failure
    mockUploadAvatar.mockRejectedValueOnce(new Error('R2 upload failed'))
    fireEvent.change(fileInput, { target: { files: [imgFile] } })
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('R2 upload failed')
    })
  })
})
