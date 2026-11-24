import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { getFeaturedGalleryPhotos } from '#/lib/constants/cms'
import { getPublicCmsSections } from '#/server/cms-actions'
import { getPublicRooms } from '#/server/public-actions'
import { getPublicReviews } from '#/server/review-actions'
import { HeroCarouselSection } from '#/components/public/HeroCarouselSection'
import { PublicLayout } from '#/components/public/PublicLayout'
import { SectionPhotoGalleryModal } from '#/components/public/SectionPhotoGalleryModal'
import { formatPeso } from '#/lib/formatters'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [sections, rooms, reviewsSummary] = await Promise.all([
      getPublicCmsSections(),
      getPublicRooms({ data: {} }),
      getPublicReviews(),
    ])
    return { sections, rooms, reviewsSummary }
  },
  head: () => ({
    meta: [{ title: "Jenny's White Haven | Camotes Island, Cebu" }],
  }),
  component: LandingPage,
})

function LandingPage() {
  const { sections, rooms, reviewsSummary } = Route.useLoaderData()
  const navigate = useNavigate()
  const [selectedTopPhotoIdx, setSelectedTopPhotoIdx] = useState<number | null>(
    null,
  )

  const byKey = new Map(sections.map((s) => [s.key, s]))
  const hero = byKey.get('hero')
  const story = byKey.get('story')
  const roomsSection = byKey.get('rooms')
  const amenities = byKey.get('amenities')
  const gallery = byKey.get('gallery')
  const contact = byKey.get('contact')

  const featuredRooms = rooms.slice(0, 3)
  const amenityItems = (amenities?.metadata.items ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const topSixGalleryPhotos = getFeaturedGalleryPhotos(
    gallery?.images ?? [],
    gallery?.metadata.imageCaptionsJson,
    gallery?.metadata.featuredHomeFlagsJson,
    6,
  )

  return (
    <PublicLayout
      contactSection={contact}
      showExploreLink={Boolean(byKey.get('explore'))}
    >
      {/* Hero Carousel Section */}
      {hero && (
        <HeroCarouselSection
          hero={hero}
          onSearch={(search) => {
            void navigate({ to: '/rooms', search })
          }}
        />
      )}

      {/* Sanctuary Section: Left Top 6 Gallery Photos + Right Sanctuary Image + Included With Every Stay Below */}
      {(story || topSixGalleryPhotos.length > 0 || amenityItems.length > 0) && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16 lg:py-20 space-y-10 lg:space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Top 6 Selected Gallery Photos (3x2 Grid) + Included With Every Stay */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                    {story?.metadata.eyebrow || 'The Sanctuary'}
                  </p>
                  {gallery && topSixGalleryPhotos.length > 0 && (
                    <Link
                      to="/gallery"
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] font-semibold text-stone-700 hover:text-amber-900 transition"
                    >
                      <span>All Pictures</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {topSixGalleryPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5">
                    {topSixGalleryPhotos.map((photo, idx) => (
                      <button
                        key={`${photo.url}-${idx}`}
                        type="button"
                        onClick={() => setSelectedTopPhotoIdx(idx)}
                        aria-label={
                          photo.caption
                            ? `View photo: ${photo.caption}`
                            : `View sanctuary highlight photo ${idx + 1}`
                        }
                        className="group relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-stone-200 text-left shadow-xs hover:shadow-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800/60"
                      >
                        <img
                          src={photo.url}
                          alt={
                            photo.caption ||
                            `Sanctuary highlight photo ${idx + 1}`
                          }
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        {photo.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent px-2.5 pt-5 pb-2">
                            <p className="text-[11px] font-semibold text-white truncate drop-shadow-xs">
                              {photo.caption}
                            </p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#F3EFE7] border border-stone-200/80 p-6 text-xs text-stone-500">
                    Sanctuary photo highlights will be shared here soon.
                  </div>
                )}
              </div>

              {/* Included With Every Stay (Moved directly below Top 6 images per Image 2) */}
              {amenities && amenityItems.length > 0 && (
                <div className="pt-6 border-t border-stone-200/80 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                    Included With Every Stay
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {amenityItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-stone-800"
                      >
                        <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column: Large Sanctuary Cover Photo */}
            {story?.images[0] && (
              <div className="lg:col-span-6">
                <div className="aspect-[4/5] w-full rounded-3xl overflow-hidden bg-stone-200 shadow-lg">
                  <img
                    src={story.images[0]}
                    alt={story.metadata.eyebrow || 'The Sanctuary'}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Rooms Section */}
      {roomsSection && (
        <section className="bg-[#F3EFE7] py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-8 lg:space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
              <div className="space-y-2.5 max-w-xl">
                {roomsSection.metadata.eyebrow && (
                  <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                    {roomsSection.metadata.eyebrow}
                  </p>
                )}
                <h2 className="text-3xl sm:text-4xl font-serif text-stone-900">
                  {roomsSection.title}
                </h2>
                {roomsSection.subtitle && (
                  <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                    {roomsSection.subtitle}
                  </p>
                )}
              </div>

              <Link
                to="/rooms"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-stone-900 hover:text-amber-900 transition self-start sm:self-auto"
              >
                View All Rooms
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {featuredRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {featuredRooms.map((room) => (
                  <Link
                    key={room.id}
                    to="/rooms/$id"
                    params={{ id: room.id }}
                    className="group bg-[#FAF8F4] rounded-3xl overflow-hidden border border-stone-200/70 hover:shadow-xl transition duration-300 flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-stone-200 overflow-hidden">
                      {room.images[0] ? (
                        <img
                          src={room.images[0]}
                          alt={room.name}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-stone-400">
                          Room {room.roomNumber}
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                          {room.type} · Up to {room.capacity} guests
                        </p>
                        <h3 className="text-xl font-serif text-stone-900 group-hover:text-amber-900 transition">
                          {room.name}
                        </h3>
                        {room.description && (
                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                            {room.description}
                          </p>
                        )}
                      </div>
                      <div className="pt-3 border-t border-stone-200/70 flex items-center justify-between">
                        <span className="text-sm font-semibold text-stone-900">
                          {formatPeso(room.pricePerNight)}
                          <span className="text-xs font-normal text-stone-500">
                            {' '}
                            / night
                          </span>
                        </span>
                        <span className="text-xs uppercase tracking-[0.16em] text-amber-900 font-semibold">
                          Reserve →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Rooms are currently being prepared. Please check back shortly.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Guest Reviews Highlight Section */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16 lg:py-20 space-y-8 lg:space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
          <div className="space-y-2.5 max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
              Guest Experiences
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-stone-900">
              Words From Our Guests
            </h2>
            {reviewsSummary.totalCount > 0 ? (
              <div className="flex items-center gap-2 pt-1 text-sm text-stone-600">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(reviewsSummary.averageRating)
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-stone-900">
                  {reviewsSummary.averageRating.toFixed(1)}
                </span>
                <span>
                  · {reviewsSummary.totalCount}{' '}
                  {reviewsSummary.totalCount === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            ) : (
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Reflections from travelers who have unwound with us on Camotes
                Island.
              </p>
            )}
          </div>

          <Link
            to={reviewsSummary.totalCount > 0 ? '/reviews' : '/booking-status'}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-stone-900 hover:text-amber-900 transition self-start sm:self-auto"
          >
            {reviewsSummary.totalCount > 0
              ? 'View All Reviews'
              : 'Review Your Stay'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {reviewsSummary.reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {reviewsSummary.reviews.slice(0, 3).map((review) => (
              <Link
                key={review.id}
                to="/reviews"
                className="group bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 flex flex-col justify-between space-y-5 hover:shadow-lg transition duration-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                    {review.isVerifiedStay && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h3 className="text-lg font-serif text-stone-900 group-hover:text-amber-900 transition">
                      {review.title}
                    </h3>
                  )}
                  <p className="text-sm text-stone-600 leading-relaxed line-clamp-4">
                    “{review.comment}”
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 text-xs text-stone-500">
                  <p className="font-semibold text-stone-900">
                    {review.guestName}
                  </p>
                  {(review.guestLocation || review.roomName) && (
                    <p className="mt-0.5">
                      {[review.guestLocation, review.roomName]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-[#F3EFE7] border border-stone-200/80 p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <p className="font-serif text-2xl text-stone-900">
                Stayed at Jenny&apos;s White Haven recently?
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">
                We would love to hear about your island stay. Share a short
                note about your room and experience for future guests.
              </p>
            </div>
            <Link
              to="/booking-status"
              className="px-6 py-3 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition self-start sm:self-auto shrink-0"
            >
              Review Your Stay
            </Link>
          </div>
        )}
      </section>

      {/* Contact / Reservation Reminder Band */}
      {contact && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-10 sm:py-14 lg:py-16">
          <div className="rounded-3xl bg-stone-900 text-[#FAF8F4] p-7 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">
            <div className="space-y-3 max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.26em] text-amber-200/90 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {contact.metadata.address ||
                  'Santiago Bay, Camotes Island, Cebu'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif">
                {contact.title}
              </h2>
              {contact.metadata.paymentInfo && (
                <p className="text-sm text-stone-300 leading-relaxed">
                  {contact.metadata.paymentInfo}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/rooms"
                className="px-6 py-3 rounded-full bg-[#FAF8F4] text-stone-900 text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-100 transition"
              >
                Book a Room
              </Link>
              <Link
                to="/booking-status"
                className="px-6 py-3 rounded-full border border-stone-600 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-stone-800 transition"
              >
                Check Status
              </Link>
            </div>
          </div>
        </section>
      )}

      <SectionPhotoGalleryModal
        isOpen={selectedTopPhotoIdx !== null}
        sectionTitle={story?.title || 'The Sanctuary'}
        sectionEyebrow={story?.metadata.eyebrow || 'The Sanctuary'}
        photos={topSixGalleryPhotos}
        initialMode="lightbox"
        initialIndex={selectedTopPhotoIdx ?? 0}
        onClose={() => setSelectedTopPhotoIdx(null)}
      />
    </PublicLayout>
  )
}
