import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Search, ShieldCheck, Star } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { lookupPublicBooking } from '#/server/public-actions'
import { submitPublicReview } from '#/server/review-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { StatusBadge } from '#/components/common/StatusBadge'
import { useCurrency } from '#/lib/currency'
import { useI18n } from '#/lib/i18n'
import {
  formatDate,
  formatPeso,
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
  head: () => ({
    meta: [{ title: "Booking Status | Jenny's White Haven" }],
  }),
  component: BookingStatusPage,
})

function BookingStatusPage() {
  const { sections } = Route.useLoaderData()
  const { currency, isConverted, formatPrice } = useCurrency()
  const { t, formatStayDate } = useI18n()
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
            {t.bookingLookup.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-stone-900">
            {t.bookingLookup.title}
          </h1>
          <p className="text-sm text-stone-600">
            {t.bookingLookup.subtitle}
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
              {t.bookingLookup.bookingReference}
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
              {t.bookingLookup.phoneOrEmail}
            </label>
            <input
              id="lookup-contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t.bookingLookup.phoneOrEmailPlaceholder}
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
            {isSearching
              ? t.bookingLookup.searching
              : t.bookingLookup.findReservation}
          </button>
        </form>

        {notFound && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">
            {t.bookingLookup.notFoundMessage}
          </div>
        )}

        {result && bookingMeta && paymentMeta && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    {t.bookingLookup.reference}
                  </p>
                  <p className="text-xl font-mono font-bold text-stone-900">
                    {result.bookingReference}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={t.common.bookingStatuses[result.status]}
                    className={bookingMeta.className}
                  />
                  <StatusBadge
                    label={t.common.paymentStatuses[result.paymentStatus]}
                    className={paymentMeta.className}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-stone-500">
                    {t.bookingLookup.guest}
                  </p>
                  <p className="font-semibold text-stone-900">
                    {result.guestName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">
                    {t.bookingLookup.room}
                  </p>
                  <p className="font-semibold text-stone-900">
                    {result.roomName} ({t.common.roomNumber(result.roomNumber)})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">
                    {t.bookingLookup.checkIn}
                  </p>
                  <p className="font-semibold text-stone-900">
                    {formatStayDate(result.checkIn)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500">
                    {t.bookingLookup.checkOut}
                  </p>
                  <p className="font-semibold text-stone-900">
                    {formatStayDate(result.checkOut)} (
                    {t.common.nightCount(result.nights)})
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-2 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>{t.bookingLookup.totalAmount}</span>
                  <span>{formatPrice(result.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t.bookingLookup.amountPaid}</span>
                  <span>{formatPrice(result.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-stone-900 pt-2 border-t border-stone-200/70">
                  <span>{t.bookingLookup.remainingBalance}</span>
                  <span>{formatPrice(balance)}</span>
                </div>
                {isConverted && (
                  <p className="text-[11px] text-stone-500 pt-1">
                    {t.bookingLookup.officialBillingNote(
                      currency,
                      formatPeso(result.totalAmount),
                    )}
                  </p>
                )}
              </div>

              {balance > 0 && contactSection?.metadata.paymentInfo && (
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-950 leading-relaxed">
                  <p className="font-semibold mb-1">
                    {t.bookingLookup.paymentInstructions}
                  </p>
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
                        ? t.bookingLookup.thankYouReview
                        : t.bookingLookup.yourStayReview}
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
                      ? t.bookingLookup.published
                      : result.existingReview.status === 'HIDDEN'
                        ? t.bookingLookup.archived
                        : t.bookingLookup.pendingApproval}
                  </span>
                </div>

                {reviewJustSubmitted && (
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {t.bookingLookup.reviewReceivedNote}
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
                      {t.bookingLookup.verifiedGuestReview}
                    </p>
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900">
                    {t.bookingLookup.howWasYourStay}
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {t.bookingLookup.reviewingAs(
                      result.guestName,
                      result.roomName,
                      result.bookingReference,
                    )}
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
                    {t.bookingLookup.yourRating}
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
                      {t.common.reviewRatings[activeRatingDisplay]}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="booking-review-location"
                      className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                    >
                      {t.bookingLookup.fromOptional}
                    </label>
                    <input
                      id="booking-review-location"
                      type="text"
                      maxLength={80}
                      value={guestLocation}
                      onChange={(e) => setGuestLocation(e.target.value)}
                      placeholder={t.bookingLookup.fromPlaceholder}
                      className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="booking-review-title"
                      className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                    >
                      {t.bookingLookup.headlineOptional}
                    </label>
                    <input
                      id="booking-review-title"
                      type="text"
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t.bookingLookup.headlinePlaceholder}
                      className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-review-comment"
                    className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                  >
                    {t.bookingLookup.yourReview}
                  </label>
                  <textarea
                    id="booking-review-comment"
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t.bookingLookup.yourReviewPlaceholder}
                    className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-3 px-5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview
                    ? t.bookingLookup.submittingReview
                    : t.bookingLookup.submitVerifiedReview}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl bg-[#F3EFE7] border border-stone-200/80 p-4 text-xs text-stone-600 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>{t.bookingLookup.postStayEligibilityNote}</span>
              </div>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
