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
    hero: { maxDimension: 1920, quality: 0.82 },
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
      target: { value: 'system-ui, -apple-system, sans-serif' },
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
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 300,
      right: 500,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const dragItem = (label: string, clientX: number, clientY: number) => {
      const el = screen.getByLabelText(label)
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
      fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(el, { pointerId: 1, clientX, clientY })
      fireEvent.pointerUp(el, { pointerId: 1, clientX, clientY })
    }

    dragItem('Draggable hero text', 200, 125)
    dragItem('Draggable Explore Rooms button', 100, 150)
    dragItem('Draggable check-in and check-out section', 200, 200)

    const latest = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(latest.slides[0].textPosition).toEqual({ x: 50, y: 50 })
    expect(latest.ctaPosition).toEqual({ x: 25, y: 60 })
    expect(latest.bookingBarPosition).toEqual({ x: 50, y: 80 })

    // Reset positions snaps back to defaults
    fireEvent.click(screen.getByRole('button', { name: /Reset Positions/i }))
    const reset = onConfigChange.mock.lastCall?.[0] as HeroCarouselConfig
    expect(reset.ctaPosition).toEqual(DEFAULT_HERO_CONFIG.ctaPosition)
    expect(reset.bookingBarPosition).toEqual(
      DEFAULT_HERO_CONFIG.bookingBarPosition,
    )
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

    // Upload valid photo
    mockUploadAvatar.mockResolvedValueOnce('/api/media/view?key=cms/hero1.webp')
    const imgFile = new File(['img'], 'hero.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [imgFile] } })

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalledWith(imgFile, 1920, 0.82)
      expect(urlInput).toHaveValue('/api/media/view?key=cms/hero1.webp')
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
