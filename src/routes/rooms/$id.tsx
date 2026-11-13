import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { createPublicBooking, getPublicRoomById } from '#/server/public-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import {
  formatPeso,
  getErrorMessage,
  isValidCalendarDate,
} from '#/lib/formatters'

interface RoomDetailSearch {
  checkIn?: string
  checkOut?: string
  guests?: number
}

export const Route = createFileRoute('/rooms/$id')({
  validateSearch: (search: Record<string, unknown>): RoomDetailSearch => ({
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
  }),
  loader: async ({ params }) => {
    const [room, sections] = await Promise.all([
      getPublicRoomById({ data: { id: params.id } }),
      getPublicCmsSections(),
    ])
    return { room, sections }
  },
  component: PublicRoomDetailPage,
})

function computeNightCount(checkIn: string, checkOut: string): number {
  if (!isValidCalendarDate(checkIn) || !isValidCalendarDate(checkOut)) return 0
  const start = new Date(`${checkIn}T14:00:00+08:00`)
  const end = new Date(`${checkOut}T12:00:00+08:00`)
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return 0
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function PublicRoomDetailPage() {
  const { room, sections } = Route.useLoaderData()
  const search = Route.useSearch()

  const contact = sections.find((s) => s.key === 'contact')
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  const [checkIn, setCheckIn] = useState(search.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(search.checkOut ?? '')
  const [guestsCount, setGuestsCount] = useState(
    Math.min(search.guests ?? 2, room?.capacity ?? 2),
  )
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    bookingReference: string
    totalAmount: number
    nights: number
  } | null>(null)

  if (!room) {
    return (
      <PublicLayout contactSection={contact}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
          <h1 className="text-3xl font-serif text-stone-900">
            Room Not Found
          </h1>
          <p className="text-sm text-stone-600">
            This accommodation is no longer available.
          </p>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rooms
          </Link>
        </div>
      </PublicLayout>
    )
  }

  const nights = computeNightCount(checkIn, checkOut)
  const estimatedTotal = nights * room.pricePerNight
  const activeImage = room.images[selectedImageIdx] ?? room.images[0]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!room) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await createPublicBooking({
        data: {
          roomId: room.id,
          checkIn,
          checkOut,
          guestsCount,
          firstName,
          lastName,
          phone,
          email: email || undefined,
          specialRequests: specialRequests || undefined,
        },
      })
      setConfirmation({
        bookingReference: res.bookingReference,
        totalAmount: res.totalAmount,
        nights: res.nights,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit reservation request.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicLayout contactSection={contact}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 space-y-10">
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          All Rooms
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Gallery & Details */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-stone-200">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-stone-400">
                    Room {room.roomNumber}
                  </div>
                )}
              </div>

              {room.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {room.images.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        idx === selectedImageIdx
                          ? 'border-stone-900'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`${room.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-amber-800 font-semibold">
                <span>{room.type}</span>
                <span>·</span>
                <span>Room {room.roomNumber}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Up to {room.capacity} guests
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif text-stone-900">
                {room.name}
              </h1>

              {room.description && (
                <p className="text-base text-stone-600 leading-relaxed">
                  {room.description}
                </p>
              )}
            </div>

            {room.amenities.length > 0 && (
              <div className="pt-6 border-t border-stone-200/80 space-y-4">
                <h2 className="text-xs uppercase tracking-[0.22em] text-stone-500 font-semibold">
                  Room Amenities
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.amenities.map((item) => (
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

          {/* Right: Reservation Form or Confirmation */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-baseline justify-between pb-4 border-b border-stone-100">
                <div>
                  <span className="text-2xl font-serif text-stone-900">
                    {formatPeso(room.pricePerNight)}
                  </span>
                  <span className="text-xs text-stone-500"> / night</span>
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  Max {room.capacity} guests
                </span>
              </div>

              {confirmation ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      Reservation Request Received
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Save your booking reference below to check your status at
                      any time.
                    </p>
                    <div className="pt-2">
                      <div className="text-[11px] uppercase tracking-wider text-emerald-700">
                        Booking Reference
                      </div>
                      <div className="text-2xl font-mono font-bold text-emerald-950 tracking-wider">
                        {confirmation.bookingReference}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-2 text-xs text-stone-700">
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span className="font-semibold">
                        {confirmation.nights}{' '}
                        {confirmation.nights === 1 ? 'night' : 'nights'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Total</span>
                      <span className="font-semibold">
                        {formatPeso(confirmation.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {contact?.metadata.paymentInfo && (
                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-950 leading-relaxed">
                      <p className="font-semibold mb-1">Payment Instructions</p>
                      <p>{contact.metadata.paymentInfo}</p>
                    </div>
                  )}

                  <Link
                    to="/booking-status"
                    className="block w-full text-center py-3 px-4 rounded-xl bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition"
                  >
                    Track Booking Status
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
                    >
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="book-checkin"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        Check-in
                      </label>
                      <input
                        id="book-checkin"
                        type="date"
                        required
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="book-checkout"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        Check-out
                      </label>
                      <input
                        id="book-checkout"
                        type="date"
                        required
                        value={checkOut}
                        min={checkIn || undefined}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="book-guests"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      Guests
                    </label>
                    <select
                      id="book-guests"
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                    >
                      {Array.from(
                        { length: room.capacity },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="book-first-name"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        First Name *
                      </label>
                      <input
                        id="book-first-name"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="book-last-name"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        Last Name *
                      </label>
                      <input
                        id="book-last-name"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="book-phone"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      Mobile / Phone Number *
                    </label>
                    <input
                      id="book-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-email"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      Email (Optional)
                    </label>
                    <input
                      id="book-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-requests"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      Special Requests
                    </label>
                    <textarea
                      id="book-requests"
                      rows={2}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Port pickup, early check-in, etc."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                    />
                  </div>

                  {nights > 0 && (
                    <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-1.5 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>
                          {formatPeso(room.pricePerNight)} × {nights}{' '}
                          {nights === 1 ? 'night' : 'nights'}
                        </span>
                        <span>{formatPeso(estimatedTotal)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-stone-900 pt-1.5 border-t border-stone-200/70">
                        <span>Total Stay</span>
                        <span>{formatPeso(estimatedTotal)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isSubmitting
                      ? 'Submitting Request...'
                      : 'Request Reservation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
