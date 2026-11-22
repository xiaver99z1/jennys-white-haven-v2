import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Images,
  MapPin,
  Sun,
  Ticket,
  X,
} from 'lucide-react'
import { getSpotImages, parseTouristSpots } from '#/lib/constants/cms'
import type {
  CmsSectionData,
  TouristSpotCategory,
  TouristSpotItem,
} from '#/types'

interface ExploreGuideViewProps {
  exploreSection?: CmsSectionData
}

export function ExploreGuideView({ exploreSection }: ExploreGuideViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | TouristSpotCategory
  >('ALL')
  const [activeSpot, setActiveSpot] = useState<TouristSpotItem | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const handleCloseModal = useCallback(() => {
    setActiveSpot(null)
    const trigger = triggerRef.current
    triggerRef.current = null
    trigger?.focus()
  }, [])

  const isPublished = Boolean(exploreSection?.isPublished)
  const meta = exploreSection?.metadata ?? {}
  const spots = useMemo(
    () => (isPublished ? parseTouristSpots(meta.spotsJson) : []),
    [isPublished, meta.spotsJson],
  )

  const categories = useMemo(() => {
    const present = new Set<TouristSpotCategory>()
    for (const spot of spots) {
      present.add(spot.category)
    }
    return Array.from(present)
  }, [spots])

  const visibleSpots = useMemo(
    () =>
      selectedCategory === 'ALL'
        ? spots
        : spots.filter((spot) => spot.category === selectedCategory),
    [selectedCategory, spots],
  )

  const activeSpotImages = useMemo(
    () => (activeSpot ? getSpotImages(activeSpot) : []),
    [activeSpot],
  )

  useEffect(() => {
    if (!activeSpot) return
    closeButtonRef.current?.focus()
  }, [activeSpot])

  useEffect(() => {
    if (!activeSpot) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseModal()
      } else if (e.key === 'ArrowRight' && activeSpotImages.length > 1) {
        setActivePhotoIndex((prev) => (prev + 1) % activeSpotImages.length)
      } else if (e.key === 'ArrowLeft' && activeSpotImages.length > 1) {
        setActivePhotoIndex(
          (prev) =>
            (prev - 1 + activeSpotImages.length) % activeSpotImages.length,
        )
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
  }, [activeSpot, activeSpotImages.length, handleCloseModal])

  function handleOpenSpot(
    spot: TouristSpotItem,
    triggerEl?: HTMLElement | null,
  ) {
    triggerRef.current =
      triggerEl ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    setActiveSpot(spot)
    setActivePhotoIndex(0)
  }

  if (!isPublished || !exploreSection) {
    return (
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-24 lg:py-32 text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F3EFE7] border border-stone-200/80 flex items-center justify-center">
          <Compass className="w-5 h-5 text-amber-800" />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-900/80 font-semibold">
            Island Guide · Camotes, Cebu
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">
            Camotes Island Guide Unavailable
          </h1>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl mx-auto">
            Our island destination guide is currently hidden while we update
            recommendations for your stay. Browse our rooms or reach out to our
            team for local travel tips.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 text-[#FAF8F4] hover:bg-amber-900 text-xs uppercase tracking-[0.16em] font-medium transition"
          >
            <span>Browse Rooms &amp; Rates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs uppercase tracking-[0.16em] font-medium transition"
          >
            Return to Sanctuary
          </Link>
        </div>
      </section>
    )
  }

  const heroImage = exploreSection.images[0]
  const safePhotoIndex =
    activePhotoIndex < activeSpotImages.length ? activePhotoIndex : 0

  return (
    <div className="pb-14 sm:pb-20">
      {/* Editorial Hero Header */}
      <section className="relative overflow-hidden border-b border-stone-200/70 bg-[#F3EFE7]">
        {heroImage && (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt={exploreSection.title || 'Explore Camotes Island'}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4]/75 via-[#FAF8F4]/65 to-[#FAF8F4]" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-900/80 font-semibold">
              {meta.eyebrow || 'Island Guide · Camotes, Cebu'}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 tracking-tight leading-[1.1]">
              {exploreSection.title || 'Explore Camotes Island'}
            </h1>
            {exploreSection.subtitle && (
              <p className="text-base sm:text-lg text-stone-700 leading-relaxed font-light">
                {exploreSection.subtitle}
              </p>
            )}
            {exploreSection.body && (
              <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                {exploreSection.body}
              </p>
            )}
          </div>

          {meta.travelNote && (
            <div className="mt-6 sm:mt-8 max-w-3xl rounded-2xl bg-white/80 backdrop-blur-xs border border-stone-200/80 px-5 py-4 flex items-start gap-3">
              <Compass className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {meta.travelNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Filter Bar + Tourist Spots Showcase */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 sm:pt-12 lg:pt-14 space-y-8">
        {categories.length > 1 && (
          <div
            role="tablist"
            aria-label="Filter destinations by category"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.14em] transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-stone-900 text-[#FAF8F4]'
                  : 'bg-white border border-stone-200/90 text-stone-600 hover:border-stone-400 hover:text-stone-900'
              }`}
            >
              All Spots ({spots.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.14em] transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-[#FAF8F4]'
                    : 'bg-white border border-stone-200/90 text-stone-600 hover:border-stone-400 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {visibleSpots.length === 0 ? (
          <div className="rounded-3xl border border-stone-200/80 bg-white p-12 text-center space-y-2">
            <p className="font-serif text-xl text-stone-800">
              No destinations listed yet
            </p>
            <p className="text-sm text-stone-500">
              Check back soon for our curated Camotes Island guide.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {visibleSpots.map((spot) => {
              const spotImages = getSpotImages(spot)
              const coverImage = spotImages[0]
              return (
                <article
                  key={spot.id}
                  className="group rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-xs hover:shadow-md transition flex flex-col"
                >
                  <button
                    type="button"
                    onClick={(e) => handleOpenSpot(spot, e.currentTarget)}
                    aria-label={`View gallery for ${spot.name}`}
                    className="text-left flex-1 flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800/50 rounded-3xl"
                  >
                    <div className="relative aspect-[16/10] w-full bg-[#EDE7DC] overflow-hidden">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={spot.name}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2 p-6 text-center">
                          <Compass className="w-8 h-8 text-amber-800/40" />
                          <span className="text-[11px] uppercase tracking-[0.22em] text-stone-500">
                            {spot.category} · Camotes Island
                          </span>
                        </div>
                      )}

                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] bg-[#FAF8F4]/92 text-stone-800 backdrop-blur-xs border border-stone-200/70">
                        {spot.category}
                      </span>

                      {spotImages.length > 0 && (
                        <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-stone-900/75 text-[#FAF8F4] backdrop-blur-xs">
                          <Images className="w-3 h-3" />
                          {spotImages.length}{' '}
                          {spotImages.length === 1 ? 'Photo' : 'Photos'}
                        </span>
                      )}
                    </div>

                    <div className="p-6 sm:p-8 flex-1 flex flex-col gap-5 w-full">
                      <div className="space-y-2">
                        <h2 className="font-serif text-2xl text-stone-900 group-hover:text-amber-900 transition leading-snug">
                          {spot.name}
                        </h2>
                        {spot.location && (
                          <p className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                            <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                            <span>{spot.location}</span>
                          </p>
                        )}
                      </div>

                      {spot.description && (
                        <p className="text-sm text-stone-600 leading-relaxed">
                          {spot.description}
                        </p>
                      )}

                      {/* Quick Visitor Info Grid */}
                      {(spot.travelTime ||
                        spot.bestTime ||
                        spot.entranceFee) && (
                        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-stone-100 text-xs">
                          {spot.travelTime && (
                            <div className="space-y-1">
                              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                                <Clock className="w-3 h-3 text-amber-800" />
                                Distance
                              </dt>
                              <dd className="text-stone-700 font-medium">
                                {spot.travelTime}
                              </dd>
                            </div>
                          )}
                          {spot.bestTime && (
                            <div className="space-y-1">
                              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                                <Sun className="w-3 h-3 text-amber-800" />
                                Best Time
                              </dt>
                              <dd className="text-stone-700 font-medium">
                                {spot.bestTime}
                              </dd>
                            </div>
                          )}
                          {spot.entranceFee && (
                            <div className="space-y-1">
                              <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                                <Ticket className="w-3 h-3 text-amber-800" />
                                Fee / Access
                              </dt>
                              <dd className="text-stone-700 font-medium">
                                {spot.entranceFee}
                              </dd>
                            </div>
                          )}
                        </dl>
                      )}

                      {spot.tips && (
                        <div className="mt-auto rounded-2xl bg-[#FAF8F4] border border-stone-200/70 px-4 py-3 text-xs text-stone-600 leading-relaxed">
                          <span className="font-semibold text-amber-900 uppercase tracking-[0.14em] text-[10px] mr-2">
                            Guest Tip
                          </span>
                          {spot.tips}
                        </div>
                      )}
                    </div>
                  </button>
                </article>
              )
            })}
          </div>
        )}

        {/* Calm Bottom Staycation CTA */}
        <div className="rounded-3xl bg-[#F3EFE7] border border-stone-200/80 p-8 sm:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-900/80 font-semibold">
              Stay at Jenny&apos;s White Haven
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-900">
              Return to coastal quiet after your island adventure.
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Book your room directly with us and let our local team help plan
              your Camotes Island itinerary.
            </p>
          </div>
          <Link
            to={exploreSection.ctaHref || '/rooms'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-stone-900 text-[#FAF8F4] hover:bg-amber-900 text-xs uppercase tracking-[0.16em] font-medium transition self-start md:self-auto shrink-0"
          >
            <span>{exploreSection.ctaLabel || 'Browse Rooms & Rates'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Spot Photo Gallery & Details Modal */}
      {activeSpot && (
        <div
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby="spot-modal-title"
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-[#FAF8F4] border border-stone-200/80 shadow-2xl my-auto max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-stone-200/70 bg-white">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-900 font-semibold">
                  {activeSpot.category}
                </p>
                <h2
                  id="spot-modal-title"
                  className="font-serif text-xl sm:text-2xl text-stone-900 truncate"
                >
                  {activeSpot.name}
                </h2>
                {activeSpot.location && (
                  <p className="inline-flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-800 shrink-0" />
                    <span>{activeSpot.location}</span>
                  </p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleCloseModal}
                aria-label="Close destination gallery"
                className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1">
              {/* Main Photo Viewer */}
              <div className="relative bg-stone-900 aspect-[16/10] max-h-[55vh] w-full flex items-center justify-center overflow-hidden">
                {activeSpotImages.length > 0 ? (
                  <>
                    <img
                      src={activeSpotImages[safePhotoIndex]}
                      alt={`${activeSpot.name} photo ${safePhotoIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {activeSpotImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIndex(
                              (prev) =>
                                (prev - 1 + activeSpotImages.length) %
                                activeSpotImages.length,
                            )
                          }
                          aria-label="Previous destination photo"
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-950/60 hover:bg-stone-950/85 text-white border border-white/15 cursor-pointer transition"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePhotoIndex(
                              (prev) => (prev + 1) % activeSpotImages.length,
                            )
                          }
                          aria-label="Next destination photo"
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-950/60 hover:bg-stone-950/85 text-white border border-white/15 cursor-pointer transition"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-stone-950/70 text-white text-[11px] font-semibold">
                          {safePhotoIndex + 1} / {activeSpotImages.length}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-stone-400 p-8 text-center">
                    <Compass className="w-9 h-9 text-amber-200/50" />
                    <span className="text-xs uppercase tracking-[0.2em] text-stone-300">
                      Photos coming soon
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip when spot has 2+ photos */}
              {activeSpotImages.length > 1 && (
                <div className="flex items-center gap-2 px-6 py-3 bg-stone-100/80 border-b border-stone-200/70 overflow-x-auto">
                  {activeSpotImages.map((src, idx) => {
                    const isSelected = idx === safePhotoIndex
                    return (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        aria-label={`Select photo ${idx + 1}`}
                        aria-pressed={isSelected}
                        className={`relative shrink-0 w-20 aspect-[16/10] rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-stone-900 shadow-xs'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`${activeSpot.name} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Destination Info */}
              <div className="p-6 space-y-4 bg-[#FAF8F4]">
                {activeSpot.description && (
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {activeSpot.description}
                  </p>
                )}

                {(activeSpot.travelTime ||
                  activeSpot.bestTime ||
                  activeSpot.entranceFee) && (
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-200/70 text-xs">
                    {activeSpot.travelTime && (
                      <div className="space-y-1">
                        <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                          <Clock className="w-3 h-3 text-amber-800" />
                          Distance
                        </dt>
                        <dd className="text-stone-800 font-medium">
                          {activeSpot.travelTime}
                        </dd>
                      </div>
                    )}
                    {activeSpot.bestTime && (
                      <div className="space-y-1">
                        <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                          <Sun className="w-3 h-3 text-amber-800" />
                          Best Time
                        </dt>
                        <dd className="text-stone-800 font-medium">
                          {activeSpot.bestTime}
                        </dd>
                      </div>
                    )}
                    {activeSpot.entranceFee && (
                      <div className="space-y-1">
                        <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-400 font-semibold">
                          <Ticket className="w-3 h-3 text-amber-800" />
                          Fee / Access
                        </dt>
                        <dd className="text-stone-800 font-medium">
                          {activeSpot.entranceFee}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                {activeSpot.tips && (
                  <div className="rounded-2xl bg-white border border-stone-200/80 px-4 py-3 text-xs text-stone-600 leading-relaxed">
                    <span className="font-semibold text-amber-900 uppercase tracking-[0.14em] text-[10px] mr-2">
                      Guest Tip
                    </span>
                    {activeSpot.tips}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
