import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, MessageSquareQuote, ShieldCheck, Star } from 'lucide-react'
import { formatDate } from '#/lib/formatters'
import type { PublicReviewsSummary } from '#/types'

interface ReviewsPageViewProps {
  summary: PublicReviewsSummary
}

export function ReviewsPageView({ summary }: ReviewsPageViewProps) {
  const [selectedStar, setSelectedStar] = useState<number | null>(null)

  const filteredReviews =
    selectedStar === null
      ? summary.reviews
      : summary.reviews.filter((review) => review.rating === selectedStar)
  const allReviewsVerified =
    summary.reviews.length > 0 &&
    summary.reviews.every((review) => review.isVerifiedStay)

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16 space-y-12">
      {/* Header & Aggregate Rating Band */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-5">
          <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
            Guest Experiences
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 leading-tight">
            Stories &amp; Reviews from the Haven
          </h1>
          <p className="text-base text-stone-600 leading-relaxed max-w-2xl">
            Authentic reflections from guests who have completed their stay with
            us on Camotes Island. To protect against spam, reviews can only be
            submitted by verified guests after checkout and full payment.
          </p>

          <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl bg-[#F3EFE7] border border-stone-200/80 px-5 py-3.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs text-stone-700">
              Stayed with us recently? Look up your completed reservation to
              leave a verified review.
            </span>
            <Link
              to="/booking-status"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] font-semibold text-amber-900 hover:text-stone-900 transition"
            >
              <span>Review Your Stay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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
                  : `Based on ${summary.totalCount} ${allReviewsVerified ? 'verified' : 'published'} ${summary.totalCount === 1 ? 'review' : 'reviews'}`}
              </p>
            </div>

            <Link
              to="/booking-status"
              className="px-4 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-[11px] uppercase tracking-[0.16em] font-semibold hover:bg-amber-900 transition shrink-0"
            >
              Review Your Stay
            </Link>
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
                    isActive
                      ? 'bg-amber-50 text-amber-950 font-semibold'
                      : 'hover:bg-stone-50 text-stone-600'
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

      {/* Filter Bar & Verified Reviews Feed */}
      <section className="space-y-6">
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
                summary.ratingBreakdown.find((b) => b.stars === stars)?.count ??
                0
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
                : 'No published guest reviews yet'}
            </p>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              {selectedStar !== null
                ? 'Try clearing the star filter to see all published guest stories.'
                : 'Completed a stay with us? Enter your booking reference on the Booking Status page to share your experience.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => (
              <article
                key={review.id}
                className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-4">
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
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 border-t border-stone-100 pt-3">
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
