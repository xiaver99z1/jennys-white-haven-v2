import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Calendar, Search, Users } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { getPublicRooms } from '#/server/public-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { EmptyState } from '#/components/common/EmptyState'
import { formatPeso, isValidCalendarDate } from '#/lib/formatters'

interface RoomsSearch {
  checkIn?: string
  checkOut?: string
  guests?: number
  type?: string
}

export const Route = createFileRoute('/rooms/')({
  validateSearch: (search: Record<string, unknown>): RoomsSearch => ({
    checkIn:
      typeof search.checkIn === 'string' && isValidCalendarDate(search.checkIn)
        ? search.checkIn
        : undefined,
    checkOut:
      typeof search.checkOut === 'string' &&
      isValidCalendarDate(search.checkOut)
        ? search.checkOut
        : undefined,
    guests:
      typeof search.guests === 'number' && search.guests > 0
        ? search.guests
        : typeof search.guests === 'string' && Number(search.guests) > 0
          ? Number(search.guests)
          : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [rooms, sections] = await Promise.all([
      getPublicRooms({ data: deps }),
      getPublicCmsSections(),
    ])
    return { rooms, sections }
  },
  component: PublicRoomsPage,
})

const ROOM_TYPES = ['ALL', 'Standard', 'Deluxe', 'Suite', 'Villa'] as const

function PublicRoomsPage() {
  const { rooms, sections } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/rooms/' })

  const contact = sections.find((s) => s.key === 'contact')
  const roomsSection = sections.find((s) => s.key === 'rooms')

  const [checkIn, setCheckIn] = useState(search.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(search.checkOut ?? '')
  const [guests, setGuests] = useState<string>(
    search.guests ? String(search.guests) : '',
  )
  const [type, setType] = useState(search.type ?? 'ALL')

  useEffect(() => {
    setCheckIn(search.checkIn ?? '')
    setCheckOut(search.checkOut ?? '')
    setGuests(search.guests ? String(search.guests) : '')
    setType(search.type ?? 'ALL')
  }, [search.checkIn, search.checkOut, search.guests, search.type])

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault()
    void navigate({
      search: {
        ...(checkIn ? { checkIn } : {}),
        ...(checkOut ? { checkOut } : {}),
        ...(guests ? { guests: Number(guests) } : {}),
        ...(type && type !== 'ALL' ? { type } : {}),
      },
    })
  }

  function handleReset() {
    setCheckIn('')
    setCheckOut('')
    setGuests('')
    setType('ALL')
    void navigate({ search: {} })
  }

  return (
    <PublicLayout contactSection={contact}>
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16 space-y-10">
        {/* Heading */}
        <div className="max-w-2xl space-y-3">
          <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
            {roomsSection?.metadata.eyebrow || 'Accommodations'}
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900">
            {roomsSection?.title || 'Sanctuaries by the Shore'}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            {roomsSection?.subtitle ||
              'Select your preferred dates and room style to check live availability.'}
          </p>
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
        >
          <div>
            <label
              htmlFor="rooms-checkin"
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Check-in
            </label>
            <input
              id="rooms-checkin"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="rooms-checkout"
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Check-out
            </label>
            <input
              id="rooms-checkout"
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="rooms-guests"
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Guests
            </label>
            <select
              id="rooms-guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}+ {n === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rooms-type"
              className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              Room Type
            </label>
            <select
              id="rooms-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Room Types' : t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.16em] font-semibold transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Results */}
        {rooms.length === 0 ? (
          <EmptyState message="No rooms match your selected dates or filters. Try adjusting your search." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <Link
                key={room.id}
                to="/rooms/$id"
                params={{ id: room.id }}
                search={{
                  ...(search.checkIn ? { checkIn: search.checkIn } : {}),
                  ...(search.checkOut ? { checkOut: search.checkOut } : {}),
                  ...(search.guests ? { guests: search.guests } : {}),
                }}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-200/80 hover:shadow-xl transition duration-300 flex flex-col"
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-stone-500">
                      <span>{room.type}</span>
                      <span>Up to {room.capacity} guests</span>
                    </div>
                    <h2 className="text-xl font-serif text-stone-900 group-hover:text-amber-900 transition">
                      {room.name}
                    </h2>
                    {room.description && (
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                    {room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {room.amenities.slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="px-2.5 py-0.5 rounded-full bg-stone-100 text-[11px] text-stone-600"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-base font-semibold text-stone-900">
                      {formatPeso(room.pricePerNight)}
                      <span className="text-xs font-normal text-stone-500">
                        {' '}
                        / night
                      </span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-amber-900 font-semibold">
                      View &amp; Reserve →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
