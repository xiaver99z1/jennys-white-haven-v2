import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { parseHeroConfig } from '#/lib/constants/cms'
import { hasVisibleRichText } from '#/lib/hero-rich-text'
import { HeroRichTextContent } from '#/components/public/HeroRichTextContent'
import type { CmsSectionData, HeroElementPosition } from '#/types'

interface HeroCarouselSectionProps {
  hero: CmsSectionData
  onSearch: (params: {
    checkIn?: string
    checkOut?: string
    guests: number
  }) => void
}

function positionVars(pos: HeroElementPosition): CSSProperties {
  return {
    '--hx': `${pos.x}%`,
    '--hy': `${pos.y}%`,
  } as CSSProperties
}

export function HeroCarouselSection({
  hero,
  onSearch,
}: HeroCarouselSectionProps) {
  const config = useMemo(
    () =>
      parseHeroConfig(hero.metadata.heroConfigJson, {
        title: hero.title,
        subtitle: hero.subtitle,
        images: hero.images,
      }),
    [hero.metadata.heroConfigJson, hero.title, hero.subtitle, hero.images],
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  const slideCount = config.slides.length
  const safeIndex = activeIndex < slideCount ? activeIndex : 0
  const activeSlide = config.slides[safeIndex]

  useEffect(() => {
    if (slideCount <= 1 || !config.autoplay || isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount)
    }, config.intervalMs)
    return () => clearInterval(timer)
  }, [slideCount, config.autoplay, config.intervalMs, isPaused])

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch({
      ...(checkIn ? { checkIn } : {}),
      ...(checkOut ? { checkOut } : {}),
      guests,
    })
  }

  function handlePrevSlide() {
    setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount)
  }

  function handleNextSlide() {
    setActiveIndex((prev) => (prev + 1) % slideCount)
  }

  const showSlideText =
    activeSlide.showText && hasVisibleRichText(activeSlide.contentHtml)
  const showCta = config.showCta && Boolean(hero.ctaLabel.trim())

  return (
    <section
      aria-label="Hero showcase"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative min-h-[78vh] md:min-h-[82vh] flex flex-col justify-end overflow-hidden bg-stone-900"
    >
      {/* Background Carousel Slides */}
      {config.slides.map((slide, idx) => {
        const isActive = idx === safeIndex
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            {slide.image ? (
              <img
                src={slide.image}
                alt={`Hero slide ${idx + 1}`}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-900 to-amber-950/80" />
            )}
          </div>
        )
      })}

      {/* Editorial Gradient Scrim */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-stone-950/20 pointer-events-none" />

      {/* Carousel Prev / Next Controls */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous hero slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-stone-950/40 hover:bg-stone-950/70 text-[#FAF8F4] backdrop-blur-xs border border-white/15 transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next hero slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-stone-950/40 hover:bg-stone-950/70 text-[#FAF8F4] backdrop-blur-xs border border-white/15 transition cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Content Overlay Stage: stacked on mobile, custom dragged positions on md+ */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-10 pt-24 pb-16 md:p-0 md:min-h-[82vh] flex flex-col justify-end gap-6 md:block">
        {/* Per-Slide Rich Text (Title & Subtitle) */}
        {showSlideText && (
          <div
            style={positionVars(activeSlide.textPosition)}
            className="max-w-2xl text-[#FAF8F4] md:absolute md:left-[var(--hx)] md:top-[var(--hy)] md:[transform:translate(calc(var(--hx)*-1),calc(var(--hy)*-1))] md:px-6 lg:px-10"
          >
            <HeroRichTextContent
              html={activeSlide.contentHtml}
              className="drop-shadow-xs"
            />
          </div>
        )}

        {/* Single Shared Explore Rooms CTA Button */}
        {showCta && (
          <div
            style={positionVars(config.ctaPosition)}
            className="md:absolute md:left-[var(--hx)] md:top-[var(--hy)] md:[transform:translate(calc(var(--hx)*-1),calc(var(--hy)*-1))] md:px-6 lg:px-10"
          >
            <Link
              to={hero.ctaHref || '/rooms'}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#FAF8F4] text-stone-900 text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-100 transition shadow-lg"
            >
              {hero.ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Single Shared Check-in / Check-out Availability Search Bar */}
        {config.showBookingBar && (
          <div
            style={positionVars(config.bookingBarPosition)}
            className="w-full md:max-w-5xl md:px-6 lg:px-10 md:absolute md:left-[var(--hx)] md:top-[var(--hy)] md:[transform:translate(calc(var(--hx)*-1),calc(var(--hy)*-1))]"
          >
            <form
              onSubmit={handleFormSubmit}
              className="bg-[#FAF8F4]/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-stone-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label
                  htmlFor="hero-checkin"
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Check-in
                </label>
                <input
                  id="hero-checkin"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-checkout"
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Check-out
                </label>
                <input
                  id="hero-checkout"
                  type="date"
                  value={checkOut}
                  min={checkIn || undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-guests"
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  Guests
                </label>
                <select
                  id="hero-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
              >
                Check Availability
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Carousel Slide Indicators */}
      {slideCount > 1 && (
        <div
          role="tablist"
          aria-label="Hero slides"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        >
          {config.slides.map((slide, idx) => {
            const isActive = idx === safeIndex
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'w-7 bg-[#FAF8F4]'
                    : 'w-2 bg-white/45 hover:bg-white/75'
                }`}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
