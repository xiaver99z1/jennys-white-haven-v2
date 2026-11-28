import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Users,
} from 'lucide-react'
import {
  DEFAULT_HERO_IMAGE_FOCAL_X,
  DEFAULT_HERO_MOBILE_POSITIONS,
  DEFAULT_HERO_MOBILE_TEXT_SCALE,
  DEFAULT_HERO_MOBILE_TEXT_WIDTH,
  DEFAULT_HERO_TEXT_WIDTH,
  parseHeroConfig,
} from '#/lib/constants/cms'
import { hasVisibleRichText } from '#/lib/hero-rich-text'
import { useI18n } from '#/lib/i18n'
import { HeroRichTextContent } from '#/components/public/HeroRichTextContent'
import { StayDateRangePicker } from '#/components/public/StayDateRangePicker'
import type { CmsSectionData, HeroElementPosition } from '#/types'

interface HeroCarouselSectionProps {
  hero: CmsSectionData
  onSearch: (params: {
    checkIn?: string
    checkOut?: string
    guests: number
  }) => void
}

function responsivePositionVars(
  desktopPos: HeroElementPosition,
  mobilePos: HeroElementPosition,
  options?: {
    desktopWidthPct?: number
    mobileWidthPct?: number
    mobileTextScale?: number
  },
): CSSProperties {
  return {
    '--hx': `${desktopPos.x}%`,
    '--hy': `${desktopPos.y}%`,
    '--mhx': `${mobilePos.x}%`,
    '--mhy': `${mobilePos.y}%`,
    ...(options?.desktopWidthPct !== undefined
      ? { '--hw': `${options.desktopWidthPct}%` }
      : {}),
    ...(options?.mobileWidthPct !== undefined
      ? { '--mhw': `${options.mobileWidthPct}%` }
      : {}),
    ...(options?.mobileTextScale !== undefined
      ? { '--mscale': String(options.mobileTextScale) }
      : {}),
  } as CSSProperties
}

export function HeroCarouselSection({
  hero,
  onSearch,
}: HeroCarouselSectionProps) {
  const { t } = useI18n()
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
  const [isHoverPaused, setIsHoverPaused] = useState(false)
  const [isFocusPaused, setIsFocusPaused] = useState(false)
  const [isManuallyPaused, setIsManuallyPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  const slideCount = config.slides.length
  const safeIndex = activeIndex < slideCount ? activeIndex : 0
  const activeSlide = config.slides[safeIndex]

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isAutoplayPaused =
    isHoverPaused || isFocusPaused || isManuallyPaused || prefersReducedMotion

  useEffect(() => {
    if (slideCount <= 1 || !config.autoplay || isAutoplayPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount)
    }, config.intervalMs)
    return () => clearInterval(timer)
  }, [slideCount, config.autoplay, config.intervalMs, isAutoplayPaused])

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
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      onFocusCapture={() => setIsFocusPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocusPaused(false)
        }
      }}
      className="relative h-[clamp(480px,calc(100svh-4rem),600px)] md:h-[calc(100svh-5rem)] md:min-h-[540px] overflow-hidden bg-stone-900"
    >
      {/* Background Carousel Slides */}
      {config.slides.map((slide, idx) => {
        const isActive = idx === safeIndex
        const focalX = slide.mobileImageFocalX ?? DEFAULT_HERO_IMAGE_FOCAL_X
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
                sizes="100vw"
                style={{ '--m-focal-x': `${focalX}%` } as CSSProperties}
                className="w-full h-full object-cover object-[var(--m-focal-x)_50%] md:object-center opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-900 to-amber-950/80" />
            )}
          </div>
        )
      })}

      {/* Editorial Gradient Scrim */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-stone-950/20 pointer-events-none" />

      {/* Carousel Prev / Next Controls (bottom corners on mobile to avoid CTA overlap, vertically centered on desktop) */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label={t.home.prevHeroSlide}
            className="absolute left-3 bottom-3 md:bottom-auto md:left-4 md:top-1/2 md:-translate-y-1/2 z-20 p-1.5 md:p-2.5 rounded-full bg-stone-950/45 hover:bg-stone-950/75 text-[#FAF8F4] backdrop-blur-xs border border-white/15 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label={t.home.nextHeroSlide}
            className="absolute right-3 bottom-3 md:bottom-auto md:right-4 md:top-1/2 md:-translate-y-1/2 z-20 p-1.5 md:p-2.5 rounded-full bg-stone-950/45 hover:bg-stone-950/75 text-[#FAF8F4] backdrop-blur-xs border border-white/15 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </>
      )}

      {/* Content Overlay Stage: customizable mobile positions (<md) & desktop positions (md+) */}
      <div className="relative z-10 max-w-[1280px] mx-auto w-full h-full">
        {/* Per-Slide Rich Text (Title & Subtitle) */}
        {showSlideText && (
          <div
            style={responsivePositionVars(
              activeSlide.textPosition,
              activeSlide.mobileTextPosition ??
                DEFAULT_HERO_MOBILE_POSITIONS.text,
              {
                desktopWidthPct:
                  activeSlide.textWidth ?? DEFAULT_HERO_TEXT_WIDTH,
                mobileWidthPct:
                  activeSlide.mobileTextWidth ??
                  DEFAULT_HERO_MOBILE_TEXT_WIDTH,
                mobileTextScale:
                  activeSlide.mobileTextScale ??
                  DEFAULT_HERO_MOBILE_TEXT_SCALE,
              },
            )}
            className="absolute z-20 text-[#FAF8F4] [--hero-font-scale:var(--mscale)] md:[--hero-font-scale:1] w-[var(--mhw)] md:w-[var(--hw)] left-[clamp(calc(var(--mhw)/2),var(--mhx),calc(100%-var(--mhw)/2))] top-[clamp(2.25rem,var(--mhy),calc(100%-2.25rem))] md:left-[clamp(calc(var(--hw)/2),var(--hx),calc(100%-var(--hw)/2))] md:top-[clamp(3rem,var(--hy),calc(100%-3rem))] -translate-x-1/2 -translate-y-1/2"
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
            style={responsivePositionVars(
              config.ctaPosition,
              config.mobileCtaPosition ?? DEFAULT_HERO_MOBILE_POSITIONS.cta,
            )}
            className="absolute z-20 left-[clamp(5.5rem,var(--mhx),calc(100%-5.5rem))] top-[clamp(2rem,var(--mhy),calc(100%-3rem))] md:left-[clamp(8rem,var(--hx),calc(100%-8rem))] md:top-[clamp(2.5rem,var(--hy),calc(100%-3.5rem))] -translate-x-1/2 -translate-y-1/2"
          >
            <Link
              to={hero.ctaHref || '/rooms'}
              className="inline-flex items-center gap-2 md:gap-2.5 px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-[#FAF8F4] text-stone-900 text-[11px] md:text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-100 transition shadow-lg whitespace-nowrap"
            >
              {hero.ctaLabel}
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Link>
          </div>
        )}

        {/* Single Shared Check-in / Check-out Availability Search Bar (compact 2x2 on mobile, 4-col on desktop) */}
        {config.showBookingBar && (
          <div
            style={responsivePositionVars(
              config.bookingBarPosition,
              config.mobileBookingBarPosition ??
                DEFAULT_HERO_MOBILE_POSITIONS.bookingBar,
            )}
            className="absolute z-10 w-[92%] md:w-[88%] md:max-w-5xl left-[clamp(46%,var(--mhx),54%)] top-[clamp(4.25rem,var(--mhy),calc(100%-4.25rem))] md:left-[clamp(44%,var(--hx),56%)] md:top-[clamp(4.5rem,var(--hy),calc(100%-4.5rem))] -translate-x-1/2 -translate-y-1/2"
          >
            <form
              onSubmit={handleFormSubmit}
              className="bg-[#FAF8F4]/95 backdrop-blur-md rounded-2xl p-3 sm:p-5 shadow-2xl border border-stone-200/60 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 items-end"
            >
              <StayDateRangePicker
                idPrefix="hero"
                compact
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={({ checkIn: nextIn, checkOut: nextOut }) => {
                  setCheckIn(nextIn)
                  setCheckOut(nextOut)
                }}
                className="col-span-2"
              />

              <div>
                <label
                  htmlFor="hero-guests"
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-stone-500 font-semibold mb-1 sm:mb-1.5"
                >
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t.common.guests}
                </label>
                <select
                  id="hero-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {t.common.guestCount(n)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-3 sm:py-3 sm:px-5 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.18em] font-semibold transition cursor-pointer whitespace-nowrap"
              >
                {t.home.checkAvailability}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Carousel Slide Indicators + Accessible Autoplay Pause/Play Control */}
      {slideCount > 1 && (
        <div className="absolute bottom-3.5 md:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {config.autoplay && (
            <button
              type="button"
              aria-pressed={isManuallyPaused}
              aria-label={
                isManuallyPaused
                  ? t.home.playSlideshow
                  : t.home.pauseSlideshow
              }
              onClick={() => setIsManuallyPaused((p) => !p)}
              className="p-1.5 rounded-full bg-stone-950/45 hover:bg-stone-950/75 text-[#FAF8F4] border border-white/15 backdrop-blur-xs transition cursor-pointer"
            >
              {isManuallyPaused ? (
                <Play className="w-3 h-3" />
              ) : (
                <Pause className="w-3 h-3" />
              )}
            </button>
          )}
          <div
            role="tablist"
            aria-label={t.home.heroSlidesLabel}
            className="flex items-center gap-2"
          >
            {config.slides.map((slide, idx) => {
              const isActive = idx === safeIndex
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={t.home.goToSlide(idx + 1)}
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
        </div>
      )}
    </section>
  )
}
