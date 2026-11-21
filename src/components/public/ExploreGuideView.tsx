import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Compass, MapPin, Sun, Ticket } from 'lucide-react'
import { parseTouristSpots } from '#/lib/constants/cms'
import type { CmsSectionData, TouristSpotCategory } from '#/types'

interface ExploreGuideViewProps {
  exploreSection?: CmsSectionData
}

export function ExploreGuideView({ exploreSection }: ExploreGuideViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | TouristSpotCategory
  >('ALL')

  const meta = exploreSection?.metadata ?? {}
  const spots = useMemo(
    () => parseTouristSpots(meta.spotsJson),
    [meta.spotsJson],
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

  const heroImage = exploreSection?.images[0]

  return (
    <div className="pb-24">
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

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-900/80 font-semibold">
              {meta.eyebrow || 'Island Guide · Camotes, Cebu'}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-stone-900 tracking-tight leading-[1.1]">
              {exploreSection?.title || 'Explore Camotes Island'}
            </h1>
            {exploreSection?.subtitle && (
              <p className="text-base sm:text-lg text-stone-700 leading-relaxed font-light">
                {exploreSection.subtitle}
              </p>
            )}
            {exploreSection?.body && (
              <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                {exploreSection.body}
              </p>
            )}
          </div>

          {meta.travelNote && (
            <div className="mt-10 max-w-3xl rounded-2xl bg-white/80 backdrop-blur-xs border border-stone-200/80 px-5 py-4 flex items-start gap-3">
              <Compass className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {meta.travelNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Filter Bar + Tourist Spots Showcase */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-16 space-y-10">
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
            {visibleSpots.map((spot) => (
              <article
                key={spot.id}
                className="group rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-xs hover:shadow-md transition flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-[#EDE7DC] overflow-hidden">
                  {spot.image ? (
                    <img
                      src={spot.image}
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
                </div>

                <div className="p-6 sm:p-8 flex-1 flex flex-col gap-5">
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl text-stone-900 leading-snug">
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
                  {(spot.travelTime || spot.bestTime || spot.entranceFee) && (
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
              </article>
            ))}
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
            to={exploreSection?.ctaHref || '/rooms'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-stone-900 text-[#FAF8F4] hover:bg-amber-900 text-xs uppercase tracking-[0.16em] font-medium transition self-start md:self-auto shrink-0"
          >
            <span>{exploreSection?.ctaLabel || 'Browse Rooms & Rates'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
