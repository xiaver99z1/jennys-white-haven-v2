import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Loader2, Search, ShieldCheck, Star } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { lookupPublicBooking } from '#/server/public-actions'
import { submitPublicReview } from '#/server/review-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import {
  FieldError,
  getFieldValidationClass,
} from '#/components/common/FormFieldError'
import { StatusBadge } from '#/components/common/StatusBadge'
import { useCurrency } from '#/lib/currency'
import { useI18n } from '#/lib/i18n'
import {
  hasFieldErrors,
  validateBookingReferenceField,
  validateLocationField,
  validateLookupContactField,
  validateTextField,
} from '#/lib/validation'
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
  const [lookupErrors, setLookupErrors] = useState<{
    bookingReference?: string | null
    contact?: string | null
  }>({})
  const [reviewFieldErrors, setReviewFieldErrors] = useState<{
    guestLocation?: string | null
    title?: string | null
    comment?: string | null
  }>({})

  async function handleLookup(e: FormEvent) {
    e.preventDefault()
    const nextLookupErrors = {
      bookingReference: validateBookingReferenceField(
        bookingReference,
        t.validation,
      ),
      contact: validateLookupContactField(contact, t.validation),
    }
    setLookupErrors(nextLookupErrors)
    if (hasFieldErrors(nextLookupErrors)) return

    setIsSearching(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    activeBookingRef.current = null
    setReviewError(null)
    setReviewJustSubmitted(false)
    try {
      const found = await lookupPublicBooking({
        data: {
          bookingReference: bookingReference.trim(),
          contact: contact.trim(),
        },
      })
      if (!found) {
        setNotFound(true)
      } else {
        activeBookingRef.current = found.bookingReference
        setResult(found)
        setVerifiedContact(contact.trim())
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

    const nextReviewErrors = {
      guestLocation: validateLocationField(guestLocation, t.validation),
      title: validateTextField(title, {
        label: t.validation.headlineLabel,
        minLength: 2,
        maxLength: 120,
        messages: t.validation,
      }),
      comment: validateTextField(comment, {
        label: t.validation.reviewCommentLabel,
        required: true,
        minLength: 10,
        maxLength: 1500,
        messages: t.validation,
      }),
    }
    setReviewFieldErrors(nextReviewErrors)
    if (hasFieldErrors(nextReviewErrors)) return

    const targetBookingRef = result.bookingReference
    const targetContact = verifiedContact || contact
    setReviewError(null)
    setIsSubmittingReview(true)
    try {
      const res = await submitPublicReview({
        data: {
          bookingReference: targetBookingRef,
          contact: targetContact,
          guestLocation: guestLocation.trim() || undefined,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
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
      setReviewFieldErrors({})
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
          noValidate
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
              maxLength={30}
              aria-invalid={Boolean(lookupErrors.bookingReference)}
              aria-describedby={
                lookupErrors.bookingReference
                  ? 'lookup-reference-error'
                  : undefined
              }
              value={bookingReference}
              onChange={(e) => {
                const next = e.target.value
                setBookingReference(next)
                if (lookupErrors.bookingReference) {
                  setLookupErrors((prev) => ({
                    ...prev,
                    bookingReference: validateBookingReferenceField(
                      next,
                      t.validation,
                    ),
                  }))
                }
              }}
              onBlur={() =>
                setLookupErrors((prev) => ({
                  ...prev,
                  bookingReference: validateBookingReferenceField(
                    bookingReference,
                    t.validation,
                  ),
                }))
              }
              placeholder="JWH-XXXXXX"
              className={getFieldValidationClass(
                'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                Boolean(lookupErrors.bookingReference),
              )}
            />
            <FieldError
              id="lookup-reference-error"
              message={lookupErrors.bookingReference}
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
              maxLength={254}
              aria-invalid={Boolean(lookupErrors.contact)}
              aria-describedby={
                lookupErrors.contact ? 'lookup-contact-error' : undefined
              }
              value={contact}
              onChange={(e) => {
                const next = e.target.value
                setContact(next)
                if (lookupErrors.contact) {
                  setLookupErrors((prev) => ({
                    ...prev,
                    contact: validateLookupContactField(next, t.validation),
                  }))
                }
              }}
              onBlur={() =>
                setLookupErrors((prev) => ({
                  ...prev,
                  contact: validateLookupContactField(contact, t.validation),
                }))
              }
              placeholder={t.bookingLookup.phoneOrEmailPlaceholder}
              className={getFieldValidationClass(
                'w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                Boolean(lookupErrors.contact),
              )}
            />
            <FieldError
              id="lookup-contact-error"
              message={lookupErrors.contact}
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
                noValidate
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
                        aria-label={t.bookingLookup.rateStarAria(star)}
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
                      aria-invalid={Boolean(reviewFieldErrors.guestLocation)}
                      aria-describedby={
                        reviewFieldErrors.guestLocation
                          ? 'booking-review-location-error'
                          : undefined
                      }
                      value={guestLocation}
                      onChange={(e) => {
                        const next = e.target.value
                        setGuestLocation(next)
                        if (reviewFieldErrors.guestLocation) {
                          setReviewFieldErrors((prev) => ({
                            ...prev,
                            guestLocation: validateLocationField(
                              next,
                              t.validation,
                            ),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setReviewFieldErrors((prev) => ({
                          ...prev,
                          guestLocation: validateLocationField(
                            guestLocation,
                            t.validation,
                          ),
                        }))
                      }
                      placeholder={t.bookingLookup.fromPlaceholder}
                      className={getFieldValidationClass(
                        'w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                        Boolean(reviewFieldErrors.guestLocation),
                      )}
                    />
                    <FieldError
                      id="booking-review-location-error"
                      message={reviewFieldErrors.guestLocation}
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
                      aria-invalid={Boolean(reviewFieldErrors.title)}
                      aria-describedby={
                        reviewFieldErrors.title
                          ? 'booking-review-title-error'
                          : undefined
                      }
                      value={title}
                      onChange={(e) => {
                        const next = e.target.value
                        setTitle(next)
                        if (reviewFieldErrors.title) {
                          setReviewFieldErrors((prev) => ({
                            ...prev,
                            title: validateTextField(next, {
                              label: t.validation.headlineLabel,
                              minLength: 2,
                              maxLength: 120,
                              messages: t.validation,
                            }),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setReviewFieldErrors((prev) => ({
                          ...prev,
                          title: validateTextField(title, {
                            label: t.validation.headlineLabel,
                            minLength: 2,
                            maxLength: 120,
                            messages: t.validation,
                          }),
                        }))
                      }
                      placeholder={t.bookingLookup.headlinePlaceholder}
                      className={getFieldValidationClass(
                        'w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                        Boolean(reviewFieldErrors.title),
                      )}
                    />
                    <FieldError
                      id="booking-review-title-error"
                      message={reviewFieldErrors.title}
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
                    aria-invalid={Boolean(reviewFieldErrors.comment)}
                    aria-describedby={
                      reviewFieldErrors.comment
                        ? 'booking-review-comment-error'
                        : undefined
                    }
                    value={comment}
                    onChange={(e) => {
                      const next = e.target.value
                      setComment(next)
                      if (reviewFieldErrors.comment) {
                        setReviewFieldErrors((prev) => ({
                          ...prev,
                          comment: validateTextField(next, {
                            label: t.validation.reviewCommentLabel,
                            required: true,
                            minLength: 10,
                            maxLength: 1500,
                            messages: t.validation,
                          }),
                        }))
                      }
                    }}
                    onBlur={() =>
                      setReviewFieldErrors((prev) => ({
                        ...prev,
                        comment: validateTextField(comment, {
                          label: t.validation.reviewCommentLabel,
                          required: true,
                          minLength: 10,
                          maxLength: 1500,
                          messages: t.validation,
                        }),
                      }))
                    }
                    placeholder={t.bookingLookup.yourReviewPlaceholder}
                    className={getFieldValidationClass(
                      'w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 resize-y focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                      Boolean(reviewFieldErrors.comment),
                    )}
                  />
                  <FieldError
                    id="booking-review-comment-error"
                    message={reviewFieldErrors.comment}
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
