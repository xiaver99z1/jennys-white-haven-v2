import { useState } from 'react'
import { CheckCircle2, MessageSquareQuote, ShieldCheck, Star } from 'lucide-react'
import { formatDate, getErrorMessage } from '#/lib/formatters'
import { submitPublicReview } from '#/server/review-actions'
import type { PublicReviewsSummary } from '#/types'

interface ReviewsPageViewProps {
  summary: PublicReviewsSummary
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement',
  2: 'Fair stay',
  3: 'Good stay',
  4: 'Very good stay',
  5: 'Wonderful sanctuary',
}

export function ReviewsPageView({ summary }: ReviewsPageViewProps) {
  const [selectedStar, setSelectedStar] = useState<number | null>(null)

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestLocation, setGuestLocation] = useState('')
  const [roomName, setRoomName] = useState('')
  const [bookingReference, setBookingReference] = useState('')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedInfo, setSubmittedInfo] = useState<{
    isVerifiedStay: boolean
  } | null>(null)

  const filteredReviews =
    selectedStar === null
      ? summary.reviews
      : summary.reviews.filter((review) => review.rating === selectedStar)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await submitPublicReview({
        data: {
          guestName,
          guestLocation: guestLocation || undefined,
          roomName: roomName || undefined,
          bookingReference: bookingReference || undefined,
          rating,
          title: title || undefined,
          comment,
        },
      })
      setSubmittedInfo({ isVerifiedStay: result.isVerifiedStay })
      setGuestName('')
      setGuestLocation('')
      setRoomName('')
      setBookingReference('')
      setTitle('')
      setComment('')
      setRating(5)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your review.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeRatingDisplay = hoverRating ?? rating

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16 space-y-12">
      {/* Header & Aggregate Rating Band */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
            Guest Experiences
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 leading-tight">
            Stories &amp; Reviews from the Haven
          </h1>
          <p className="text-base text-stone-600 leading-relaxed max-w-2xl">
            Honest reflections from guests who have stayed with us on Camotes
            Island. Every review is read by our team and published after a quick
            authenticity check.
          </p>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <p className="text-4xl font-serif text-stone-900 leading-none">
                {summary.totalCount > 0
                  ? summary.averageRating.toFixed(1)
                  : '—'}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      summary.totalCount > 0 &&
                      star <= Math.round(summary.averageRating)
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-stone-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-stone-500 mt-1.5">
                {summary.totalCount === 0
                  ? 'No published reviews yet'
                  : `Based on ${summary.totalCount} published ${summary.totalCount === 1 ? 'review' : 'reviews'}`}
              </p>
            </div>

            <a
              href="#write-review"
              className="px-4 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-[11px] uppercase tracking-[0.16em] font-semibold hover:bg-amber-900 transition shrink-0"
            >
              Write a Review
            </a>
          </div>

          <div className="space-y-2">
            {summary.ratingBreakdown.map((item) => {
              const isActive = selectedStar === item.stars
              return (
                <button
                  key={item.stars}
                  type="button"
                  onClick={() =>
                    setSelectedStar((prev) =>
                      prev === item.stars ? null : item.stars,
                    )
                  }
                  className={`w-full flex items-center gap-3 text-xs rounded-lg px-2 py-1 transition cursor-pointer ${
                    isActive ? 'bg-amber-50 text-amber-950 font-semibold' : 'hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <span className="w-8 text-left shrink-0">{item.stars}★</span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-stone-500 shrink-0">
                    {item.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main Content Grid: Reviews List + Submission Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left: Approved Guest Reviews */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedStar(null)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                  selectedStar === null
                    ? 'bg-stone-900 text-[#FAF8F4]'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
                }`}
              >
                All ({summary.totalCount})
              </button>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count =
                  summary.ratingBreakdown.find((b) => b.stars === stars)
                    ?.count ?? 0
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() =>
                      setSelectedStar((prev) => (prev === stars ? null : stars))
                    }
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                      selectedStar === stars
                        ? 'bg-stone-900 text-[#FAF8F4]'
                        : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {stars}★ ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200/80 p-10 text-center space-y-3">
              <MessageSquareQuote className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-serif text-xl text-stone-800">
                {selectedStar !== null
                  ? `No ${selectedStar}-star reviews yet`
                  : 'Be the first to share your island stay'}
              </p>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                {selectedStar !== null
                  ? 'Try clearing the star filter to see all guest stories.'
                  : 'Stayed with us recently? Share what stood out during your time at Jenny’s White Haven.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredReviews.map((review) => (
                <article
                  key={review.id}
                  className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 space-y-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
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
                      <span className="sr-only">
                        {review.rating} out of 5 stars
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {review.isVerifiedStay && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified Stay
                        </span>
                      )}
                      <span className="text-xs text-stone-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {review.title && (
                    <h2 className="text-xl font-serif text-stone-900">
                      {review.title}
                    </h2>
                  )}

                  <p className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span className="font-semibold text-stone-900">
                      {review.guestName}
                    </span>
                    {review.guestLocation && (
                      <>
                        <span>·</span>
                        <span>{review.guestLocation}</span>
                      </>
                    )}
                    {review.roomName && (
                      <>
                        <span>·</span>
                        <span>Stayed in {review.roomName}</span>
                      </>
                    )}
                  </div>

                  {review.adminReply && (
                    <div className="rounded-2xl bg-[#F3EFE7] border border-stone-200/70 p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-900 font-semibold">
                          Response from Jenny&apos;s White Haven
                        </p>
                        {review.adminRepliedAt && (
                          <span className="text-[11px] text-stone-500">
                            {formatDate(review.adminRepliedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                        {review.adminReply}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right: Share Your Stay Form */}
        <aside
          id="write-review"
          className="scroll-mt-24 lg:col-span-5 xl:col-span-4 bg-[#F3EFE7] rounded-3xl border border-stone-200/80 p-6 sm:p-7 space-y-5 lg:sticky lg:top-28"
        >
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800 font-semibold">
              Share Your Stay
            </p>
            <h2 className="text-2xl font-serif text-stone-900">
              Leave a Guest Review
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your feedback helps fellow travelers and guides our island team.
            </p>
          </div>

          {submittedInfo ? (
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Thank you for sharing your stay!</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Your review has been submitted and is waiting for approval by
                our team before appearing publicly.
              </p>
              {submittedInfo.isVerifiedStay && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  Your booking reference was matched — your review will carry a{' '}
                  <strong>Verified Stay</strong> badge once published.
                </p>
              )}
              <button
                type="button"
                onClick={() => setSubmittedInfo(null)}
                className="text-xs font-semibold text-amber-900 hover:underline cursor-pointer"
              >
                Write another review
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {/* Star Selector */}
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

              <div>
                <label
                  htmlFor="review-guest-name"
                  className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                >
                  Your Name *
                </label>
                <input
                  id="review-guest-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g., Maria Santos"
                  className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="review-location"
                    className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                  >
                    From (Optional)
                  </label>
                  <input
                    id="review-location"
                    type="text"
                    maxLength={80}
                    value={guestLocation}
                    onChange={(e) => setGuestLocation(e.target.value)}
                    placeholder="Cebu City"
                    className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="review-room"
                    className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                  >
                    Room (Optional)
                  </label>
                  <input
                    id="review-room"
                    type="text"
                    maxLength={80}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Deluxe Room"
                    className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-booking-ref"
                  className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                >
                  Booking Reference (Optional)
                </label>
                <input
                  id="review-booking-ref"
                  type="text"
                  maxLength={40}
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  placeholder="JWH-XXXXXX (adds Verified Stay badge)"
                  className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                />
              </div>

              <div>
                <label
                  htmlFor="review-title"
                  className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                >
                  Headline (Optional)
                </label>
                <input
                  id="review-title"
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Peaceful mornings by Santiago Bay"
                  className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                />
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-[11px] uppercase tracking-[0.18em] text-stone-600 font-semibold mb-1.5"
                >
                  Your Experience *
                </label>
                <textarea
                  id="review-comment"
                  required
                  minLength={10}
                  maxLength={1500}
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell future guests about your room, the atmosphere, and our island hospitality..."
                  className="w-full rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700 resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </aside>
      </section>
    </div>
  )
}
