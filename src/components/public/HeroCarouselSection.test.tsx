import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { HeroCarouselSection } from './HeroCarouselSection'
import {
  DEFAULT_CMS_SECTIONS,
  DEFAULT_HERO_CONFIG,
  serializeHeroConfig,
} from '#/lib/constants/cms'
import type { CmsSectionData } from '#/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('HeroCarouselSection', () => {
  const defaultHero = DEFAULT_CMS_SECTIONS.find((s) => s.key === 'hero')!

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders carousel slides with per-slide text, single CTA, single check-in/out bar, and no eyebrow', () => {
    const onSearch = vi.fn()
    const hero: CmsSectionData = {
      ...defaultHero,
      ctaLabel: 'Explore Rooms',
      ctaHref: '/rooms',
      metadata: {
        eyebrow: 'Should Never Appear',
        heroConfigJson: serializeHeroConfig({
          ...DEFAULT_HERO_CONFIG,
          autoplay: true,
          intervalMs: 4000,
          slides: [
            {
              id: 's1',
              image: 'https://cdn.example.com/slide1.webp',
              contentHtml:
                '<p><span style="font-size: 48px; font-weight: bold">Slide One Title</span></p>',
              showText: true,
              textPosition: { x: 10, y: 30 },
              mobileTextPosition: { x: 48, y: 24 },
              mobileTextWidth: 84,
              mobileTextScale: 0.6,
              mobileImageFocalX: 35,
            },
            {
              id: 's2',
              image: 'https://cdn.example.com/slide2.webp',
              contentHtml:
                '<p><em>Slide Two Subtitle</em><br /><span>Relax</span></p>',
              showText: true,
              textPosition: { x: 50, y: 40 },
            },
          ],
        }),
      },
    }

    render(<HeroCarouselSection hero={hero} onSearch={onSearch} />)

    expect(screen.queryByText('Should Never Appear')).not.toBeInTheDocument()
    const titleSpan = screen.getByText('Slide One Title')
    expect(titleSpan).toBeInTheDocument()
    expect(titleSpan.getAttribute('style')).toContain(
      'max(12px, calc(48px * var(--hero-font-scale, 1)))',
    )
    const textContainer = titleSpan.closest('[style*="--mhx"]')
    expect(textContainer?.getAttribute('style')).toContain('--mhx: 48%')
    expect(textContainer?.getAttribute('style')).toContain('--mhy: 24%')
    expect(textContainer?.getAttribute('style')).toContain('--mhw: 84%')
    expect(textContainer?.getAttribute('style')).toContain('--mscale: 0.6')
    const slide1Img = screen.getByAltText('Hero slide 1')
    expect(slide1Img.getAttribute('style')).toContain('--m-focal-x: 35%')
    expect(screen.getAllByRole('link', { name: /Explore Rooms/i })).toHaveLength(
      1,
    )
    expect(
      screen.getAllByRole('button', { name: /Check Availability/i }),
    ).toHaveLength(1)

    // Navigate to next slide via button
    fireEvent.click(screen.getByRole('button', { name: 'Next hero slide' }))
    expect(screen.getByText('Slide Two Subtitle')).toBeInTheDocument()

    // Navigate back via previous button
    fireEvent.click(screen.getByRole('button', { name: 'Previous hero slide' }))
    expect(screen.getByText('Slide One Title')).toBeInTheDocument()

    // Autoplay advances slide when not hovered
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByText('Slide Two Subtitle')).toBeInTheDocument()

    // Hovering pauses autoplay
    const section = screen.getByLabelText('Hero showcase')
    fireEvent.mouseEnter(section)
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText('Slide Two Subtitle')).toBeInTheDocument()
    fireEvent.mouseLeave(section)

    // Keyboard/touch Pause & Play button stops and resumes autoplay
    const pauseBtn = screen.getByRole('button', {
      name: 'Pause hero slideshow',
    })
    fireEvent.click(pauseBtn)
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'true')
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText('Slide Two Subtitle')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Play hero slideshow' }),
    )

    // Keyboard focus inside hero also pauses autoplay
    const checkInInput = screen.getByLabelText(/Check-in/i)
    fireEvent.focus(checkInInput)
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText('Slide Two Subtitle')).toBeInTheDocument()
    fireEvent.blur(checkInInput)

    // Dot indicator switches directly to slide 1
    fireEvent.click(screen.getByRole('tab', { name: 'Go to slide 1' }))
    expect(screen.getByText('Slide One Title')).toBeInTheDocument()

    // Submit availability form
    fireEvent.change(screen.getByLabelText(/Check-in/i), {
      target: { value: '2026-12-01' },
    })
    fireEvent.change(screen.getByLabelText(/Check-out/i), {
      target: { value: '2026-12-03' },
    })
    fireEvent.change(screen.getByLabelText(/Guests/i), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Check Availability/i }))

    expect(onSearch).toHaveBeenCalledWith({
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      guests: 4,
    })
  })

  it('respects visibility toggles to hide slide text, Explore Rooms button, and check-in/out bar', () => {
    const hero: CmsSectionData = {
      ...defaultHero,
      ctaLabel: 'Explore Rooms',
      metadata: {
        heroConfigJson: serializeHeroConfig({
          ...DEFAULT_HERO_CONFIG,
          showCta: false,
          showBookingBar: false,
          slides: [
            {
              id: 'only-slide',
              image: '',
              contentHtml: '<p>Hidden Text</p>',
              showText: false,
              textPosition: { x: 10, y: 20 },
            },
          ],
        }),
      },
    }

    render(<HeroCarouselSection hero={hero} onSearch={vi.fn()} />)

    expect(screen.queryByText('Hidden Text')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Explore Rooms/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Check Availability/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Next hero slide' }),
    ).not.toBeInTheDocument()
  })
})
