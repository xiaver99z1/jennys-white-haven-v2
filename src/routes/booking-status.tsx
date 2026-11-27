import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Search, ShieldCheck, Star } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { lookupPublicBooking } from '#/server/public-actions'
import { submitPublicReview } from '#/server/review-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { StatusBadge } from '#/components/common/StatusBadge'
import {
  formatDate,
  formatPeso,
  formatShortDate,
  getBookingStatusMeta,
  getErrorMessage,
  getPaymentStatusMeta,
} from '#/lib/formatters'
import type { PublicBookingLookupResult } from '#/types'

const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement',
  2: 'Fair stay',
  3: 'Good stay',
  4: 'Very good stay',
  5: 'Wonderful sanctuary',
}

export const Route = createFileRoute('/booking-status')({
  loader: async () => {
    const sections = await getPublicCmsSections()
    return { sections }
  },
  head: () => ({
    meta: [{ title: "Booking Status | Jenny's White Haven" }],
  }),
  component: BookingStatusPage,
})

function BookingStatusPage() {
  const { sections } = Route.useLoaderData()
  const contactSection = sections.find((s) => s.key === 'contact')
  const brandingSection = sections.find((s) => s.key === 'branding')

  const [bookingReference, setBookingReference] = useState('')
  const [contact, setContact] = useState('')
  const [verifiedContact, setVerifiedContact] = useState('')
  const activeBookingRef = useRef<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [result, setResult] = useState<PublicBookingLookupResult | null>(null)

  // Post-stay review form state
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [guestLocation, setGuestLocation] = useState('')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewJustSubmitted, setReviewJustSubmitted] = useState(false)

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    setIsSearching(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    activeBookingRef.current = null
    setReviewError(null)
    setReviewJustSubmitted(false)
    try {
      const found = await lookupPublicBooking({
        data: { bookingReference, contact },
      })
      if (!found) {
        setNotFound(true)
      } else {
        activeBookingRef.current = found.bookingReference
        setResult(found)
        setVerifiedContact(contact)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to look up reservation.'))
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault()
    if (!result) return
    const targetBookingRef = result.bookingReference
    const targetContact = verifiedContact || contact
    setReviewError(null)
    setIsSubmittingReview(true)
    try {
      const res = await submitPublicReview({
        data: {
          bookingReference: targetBookingRef,
          contact: targetContact,
          guestLocation: guestLocation || undefined,
          rating,
          title: title || undefined,
          comment,
        },
      })
      if (activeBookingRef.current !== targetBookingRef) {
        return
      }
      setResult((prev) =>
        prev && prev.bookingReference === targetBookingRef
          ? {
              ...prev,
              canSubmitReview: false,
              existingReview: res.review,
            }
          : prev,
      )
      setReviewJustSubmitted(true)
      setGuestLocation('')
      setTitle('')
      setComment('')
      setRating(5)
    } catch (err) {
      if (activeBookingRef.current === targetBookingRef) {
        setReviewError(getErrorMessage(err, 'Could not submit your review.'))
      }
    } finally {
      if (activeBookingRef.current === targetBookingRef) {
        setIsSubmittingReview(false)
      }
    }
  }

  const bookingMeta = result ? getBookingStatusMeta(result.status) : null
  const paymentMeta = result
    ? getPaymentStatusMeta(result.paymentStatus)
    : null
  const balance = result
    ? Math.max(0, result.totalAmount - result.amountPaid)
    : 0
  const isCompletedAndPaid =
    result?.status === 'CHECKED_OUT' && result.paymentStatus === 'PAID'
  const activeRatingDisplay = hoverRating ?? rating

  return (
    <PublicLayout
      contactSection={contactSection}
      brandingSection={brandingSection}
    >
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
          <div className="space-y-6">
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

            {/* Post-Stay Verified Review Section */}
            {result.existingReview ? (
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <h2 className="text-xl font-serif text-stone-900">
                      {reviewJustSubmitted
                        ? 'Thank you for reviewing your stay!'
                        : 'Your Stay Review'}
                    </h2>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      result.existingReview.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : result.existingReview.status === 'HIDDEN'
                          ? 'bg-stone-100 text-stone-600 border-stone-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {result.existingReview.status === 'APPROVED'
                      ? 'Published'
                      : result.existingReview.status === 'HIDDEN'
                        ? 'Archived'
                        : 'Pending Approval'}
                  </span>
                </div>

                {reviewJustSubmitted && (
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Your verified review has been received and will appear on our
                    Guest Reviews page once approved by our team.
                  </p>
                )}

                <div className="rounded-2xl bg-[#F3EFE7] border border-stone-200/80 p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (result.existingReview?.rating ?? 0)
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500">
                      {formatDate(result.existingReview.createdAt)}
                    </span>
                  </div>
                  {result.existingReview.title && (
                    <p className="font-serif text-lg text-stone-900">
                      {result.existingReview.title}
                    </p>
                  )}
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {result.existingReview.comment}
                  </p>
                </div>
              </div>
            ) : isCompletedAndPaid ? (
              <form
                onSubmit={handleSubmitReview}
                className="bg-[#F3EFE7] rounded-3xl border border-stone-200/80 p-6 sm:p-8 space-y-5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800 font-semibold">
                      Verified Guest Review
                    </p>
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900">
                    How Was Your Stay at Jenny&apos;s White Haven?
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Reviewing as <strong>{result.guestName}</strong> for{' '}
                    <strong>{result.roomName}</strong> (
                    {result.bookingReference}).
                  </p>
                </div>

                {reviewError && (
                  <div
                    role="alert"
                    className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700"
                  >
                    {reviewError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} out of 5 stars`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(star)}
                        className="p-1 rounded-lg hover:bg-white/70 transition cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition ${
                            star <= activeRatingDisplay
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-stone-600 ml-2">
                      {RATING_LABELS[activeRatingDisplay]}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="booking-review-location"
                      className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                    >
                      From (Optional)
                    </label>
                    <input
                      id="booking-review-location"
                      type="text"
                      maxLength={80}
                      value={guestLocation}
                      onChange={(e) => setGuestLocation(e.target.value)}
                      placeholder="e.g., Cebu City"
                      className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="booking-review-title"
                      className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                    >
                      Headline (Optional)
                    </label>
                    <input
                      id="booking-review-title"
                      type="text"
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Peaceful mornings by Santiago Bay"
                      className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-review-comment"
                    className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                  >
                    Your Experience *
                  </label>
                  <textarea
                    id="booking-review-comment"
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share what you enjoyed most about your room, the atmosphere, and our island hospitality..."
                    className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-3 px-5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview
                    ? 'Submitting Review...'
                    : 'Submit Verified Review'}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-[#F3EFE7] border border-stone-200/80 p-4 text-xs text-stone-600 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>
                  Once your stay is completed (<strong>Checked Out</strong>) and
                  fully paid (<strong>Paid</strong>), you can return to this
                  page to submit a verified review for your stay.
                </span>
              </div>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
