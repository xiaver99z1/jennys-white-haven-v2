import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Search } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { lookupPublicBooking } from '#/server/public-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { StatusBadge } from '#/components/common/StatusBadge'
import {
  formatPeso,
  formatShortDate,
  getBookingStatusMeta,
  getErrorMessage,
  getPaymentStatusMeta,
} from '#/lib/formatters'
import type { PublicBookingLookupResult } from '#/types'

export const Route = createFileRoute('/booking-status')({
  loader: async () => {
    const sections = await getPublicCmsSections()
    return { sections }
  },
  component: BookingStatusPage,
})

function BookingStatusPage() {
  const { sections } = Route.useLoaderData()
  const contactSection = sections.find((s) => s.key === 'contact')

  const [bookingReference, setBookingReference] = useState('')
  const [contact, setContact] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [result, setResult] = useState<PublicBookingLookupResult | null>(null)

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    setIsSearching(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    try {
      const found = await lookupPublicBooking({
        data: { bookingReference, contact },
      })
      if (!found) {
        setNotFound(true)
      } else {
        setResult(found)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to look up reservation.'))
    } finally {
      setIsSearching(false)
    }
  }

  const bookingMeta = result ? getBookingStatusMeta(result.status) : null
  const paymentMeta = result
    ? getPaymentStatusMeta(result.paymentStatus)
    : null
  const balance = result
    ? Math.max(0, result.totalAmount - result.amountPaid)
    : 0

  return (
    <PublicLayout contactSection={contactSection}>
      <section className="max-w-2xl mx-auto px-6 py-16 sm:py-24 space-y-10">
        <div className="text-center space-y-3">
          <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
            Guest Lookup
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-900">
            Check Booking Status
          </h1>
          <p className="text-sm text-stone-600">
            Enter your booking reference and the phone number or email used
            when reserving.
          </p>
        </div>

        <form
          onSubmit={handleLookup}
          className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-4"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="lookup-reference"
              className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              Booking Reference
            </label>
            <input
              id="lookup-reference"
              type="text"
              required
              value={bookingReference}
              onChange={(e) => setBookingReference(e.target.value)}
              placeholder="JWH-XXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 uppercase"
            />
          </div>

          <div>
            <label
              htmlFor="lookup-contact"
              className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1.5"
            >
              Phone Number or Email
            </label>
            <input
              id="lookup-contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+63 9XX XXX XXXX or guest@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isSearching ? 'Searching...' : 'Find Reservation'}
          </button>
        </form>

        {notFound && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">
            No matching reservation was found. Please verify your booking
            reference and contact details.
          </div>
        )}

        {result && bookingMeta && paymentMeta && (
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  Reference
                </p>
                <p className="text-xl font-mono font-bold text-stone-900">
                  {result.bookingReference}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={bookingMeta.label}
                  className={bookingMeta.className}
                />
                <StatusBadge
                  label={paymentMeta.label}
                  className={paymentMeta.className}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-stone-500">Guest</p>
                <p className="font-semibold text-stone-900">
                  {result.guestName}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Room</p>
                <p className="font-semibold text-stone-900">
                  {result.roomName} (Room {result.roomNumber})
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Check-in</p>
                <p className="font-semibold text-stone-900">
                  {formatShortDate(result.checkIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Check-out</p>
                <p className="font-semibold text-stone-900">
                  {formatShortDate(result.checkOut)} ({result.nights}{' '}
                  {result.nights === 1 ? 'night' : 'nights'})
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Total Amount</span>
                <span>{formatPeso(result.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Amount Paid</span>
                <span>{formatPeso(result.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-900 pt-2 border-t border-stone-200/70">
                <span>Remaining Balance</span>
                <span>{formatPeso(balance)}</span>
              </div>
            </div>

            {balance > 0 && contactSection?.metadata.paymentInfo && (
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-950 leading-relaxed">
                <p className="font-semibold mb-1">Payment Instructions</p>
                <p>{contactSection.metadata.paymentInfo}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
