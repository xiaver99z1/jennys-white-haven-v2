import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Calendar, MapPin, Sparkles, Users } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { getPublicRooms } from '#/server/public-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { formatPeso } from '#/lib/formatters'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [sections, rooms] = await Promise.all([
      getPublicCmsSections(),
      getPublicRooms({ data: {} }),
    ])
    return { sections, rooms }
  },
  component: LandingPage,
})

function LandingPage() {
  const { sections, rooms } = Route.useLoaderData()
  const navigate = useNavigate()

  const byKey = new Map(sections.map((s) => [s.key, s]))
  const hero = byKey.get('hero')
  const story = byKey.get('story')
  const roomsSection = byKey.get('rooms')
  const amenities = byKey.get('amenities')
  const gallery = byKey.get('gallery')
  const contact = byKey.get('contact')

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    void navigate({
      to: '/rooms',
      search: {
        ...(checkIn ? { checkIn } : {}),
        ...(checkOut ? { checkOut } : {}),
        guests,
      },
    })
  }

  const featuredRooms = rooms.slice(0, 3)
  const amenityItems = (amenities?.metadata.items ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <PublicLayout contactSection={contact}>
      {/* Hero Section */}
      {hero && (
        <section className="relative min-h-[78vh] flex items-end pb-14 pt-28 overflow-hidden bg-stone-900">
          {hero.images[0] && (
            <img
              src={hero.images[0]}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-stone-950/20" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full space-y-10">
            <div className="max-w-2xl space-y-4 text-[#FAF8F4]">
              {hero.metadata.eyebrow && (
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200/90">
                  {hero.metadata.eyebrow}
                </p>
              )}
              <h1 className="text-4xl sm:text-6xl font-serif leading-[1.08] tracking-tight">
                {hero.title}
              </h1>
              {hero.subtitle && (
                <p className="text-base sm:text-lg text-stone-200 leading-relaxed max-w-xl">
                  {hero.subtitle}
                </p>
              )}
              {hero.ctaLabel && (
                <div className="pt-2">
                  <Link
                    to={hero.ctaHref || '/rooms'}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#FAF8F4] text-stone-900 text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-100 transition"
                  >
                    {hero.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Availability Search Bar */}
            <form
              onSubmit={handleSearch}
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
        </section>
      )}

      {/* Story / Sanctuary Section */}
      {story && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 space-y-6">
              {story.metadata.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                  {story.metadata.eyebrow}
                </p>
              )}
              <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 leading-tight">
                {story.title}
              </h2>
              {story.subtitle && (
                <p className="text-lg text-stone-600 leading-relaxed">
                  {story.subtitle}
                </p>
              )}
              {story.body && (
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                  {story.body}
                </p>
              )}
              {story.metadata.highlight && (
                <blockquote className="border-l-2 border-amber-700/60 pl-5 py-1 font-serif italic text-lg text-stone-800">
                  “{story.metadata.highlight}”
                </blockquote>
              )}
            </div>

            {story.images[0] && (
              <div className="lg:col-span-6">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-stone-200 shadow-lg">
                  <img
                    src={story.images[0]}
                    alt={story.title}
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
        <section className="bg-[#F3EFE7] py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div className="space-y-3 max-w-xl">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Amenities Section */}
      {amenities && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {amenities.images[0] && (
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="aspect-[16/11] rounded-3xl overflow-hidden bg-stone-200 shadow-lg">
                  <img
                    src={amenities.images[0]}
                    alt={amenities.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                Included With Every Stay
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif text-stone-900">
                {amenities.title}
              </h2>
              {amenities.subtitle && (
                <p className="text-base text-stone-600 leading-relaxed">
                  {amenities.subtitle}
                </p>
              )}
              {amenities.body && (
                <p className="text-sm text-stone-600 leading-relaxed">
                  {amenities.body}
                </p>
              )}
              {amenityItems.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
              )}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {gallery && gallery.images.length > 0 && (
        <section className="bg-[#F3EFE7] py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-10">
            <div className="max-w-xl space-y-2">
              {gallery.metadata.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                  {gallery.metadata.eyebrow}
                </p>
              )}
              <h2 className="text-3xl sm:text-4xl font-serif text-stone-900">
                {gallery.title}
              </h2>
              {gallery.subtitle && (
                <p className="text-sm text-stone-600">{gallery.subtitle}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.images.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200"
                >
                  <img
                    src={src}
                    alt={`${gallery.title} ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact / Reservation Reminder Band */}
      {contact && (
        <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="rounded-3xl bg-stone-900 text-[#FAF8F4] p-10 sm:p-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
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
    </PublicLayout>
  )
}
