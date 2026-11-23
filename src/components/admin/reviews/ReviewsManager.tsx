import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  CheckCircle2,
  ExternalLink,
  EyeOff,
  MessageSquare,
  Pin,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { formatDate, getErrorMessage } from '#/lib/formatters'
import { deleteReview, moderateReview } from '#/server/review-actions'
import type { AdminReviewItem, ReviewStatus } from '#/types'

interface ReviewsManagerProps {
  initialReviews: AdminReviewItem[]
}

type FilterTab = 'ALL' | ReviewStatus

const STATUS_BADGE_CLASSES: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  HIDDEN: 'bg-stone-100 text-stone-600 border-stone-200',
}

export function ReviewsManager({ initialReviews }: ReviewsManagerProps) {
  const router = useRouter()
  const [reviews, setReviews] = useState<AdminReviewItem[]>(initialReviews)
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminReviewItem | null>(null)
  const [notice, setNotice] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    setReviews(initialReviews)
  }, [initialReviews])

  const pendingCount = reviews.filter((r) => r.status === 'PENDING').length
  const approvedReviews = reviews.filter((r) => r.status === 'APPROVED')
  const hiddenCount = reviews.filter((r) => r.status === 'HIDDEN').length
  const avgApprovedRating =
    approvedReviews.length > 0
      ? Math.round(
          (approvedReviews.reduce((sum, r) => sum + r.rating, 0) /
            approvedReviews.length) *
            10,
        ) / 10
      : 0

  const filteredReviews =
    activeTab === 'ALL'
      ? reviews
      : reviews.filter((review) => review.status === activeTab)

  async function handleModerate(
    id: string,
    payload: {
      status?: ReviewStatus
      isFeatured?: boolean
      adminReply?: string | null
    },
    successMessage: string,
  ) {
    setBusyId(id)
    setNotice(null)
    try {
      const result = await moderateReview({ data: { id, ...payload } })
      setReviews((prev) =>
        prev.map((item) => (item.id === id ? result.review : item)),
      )
      setNotice({ type: 'success', text: successMessage })
      void router.invalidate()
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Failed to update review.'),
      })
    } finally {
      setBusyId(null)
    }
  }

  function openReplyEditor(review: AdminReviewItem) {
    setReplyingId(review.id)
    setReplyDraft(review.adminReply ?? '')
  }

  async function handleSaveReply(review: AdminReviewItem) {
    await handleModerate(
      review.id,
      { adminReply: replyDraft },
      replyDraft.trim()
        ? `Saved reply to ${review.guestName}'s review.`
        : `Removed reply from ${review.guestName}'s review.`,
    )
    setReplyingId(null)
    setReplyDraft('')
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setBusyId(target.id)
    setNotice(null)
    try {
      await deleteReview({ data: { id: target.id } })
      setReviews((prev) => prev.filter((item) => item.id !== target.id))
      setDeleteTarget(null)
      setNotice({
        type: 'success',
        text: `Deleted review by ${target.guestName}.`,
      })
      void router.invalidate()
    } catch (err) {
      setNotice({
        type: 'error',
        text: getErrorMessage(err, 'Failed to delete review.'),
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Guest Reviews
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Approve guest submissions, reply as the host, and pin top reviews to
            the Home page.
          </p>
        </div>

        <Link
          to="/reviews"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition self-start sm:self-auto"
        >
          <span>View Public Reviews Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs font-medium text-stone-500">Total Reviews</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">
            {reviews.length}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            pendingCount > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-stone-200'
          }`}
        >
          <p className="text-xs font-medium text-stone-500">Pending Approval</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              pendingCount > 0 ? 'text-amber-900' : 'text-stone-900'
            }`}
          >
            {pendingCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs font-medium text-stone-500">Published</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {approvedReviews.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs font-medium text-stone-500">
            Published Avg. Rating
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-2xl font-bold text-stone-900">
              {approvedReviews.length > 0 ? avgApprovedRating.toFixed(1) : '—'}
            </p>
            {approvedReviews.length > 0 && (
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            )}
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'ALL', label: `All (${reviews.length})` },
            { key: 'PENDING', label: `Pending (${pendingCount})` },
            {
              key: 'APPROVED',
              label: `Approved (${approvedReviews.length})`,
            },
            { key: 'HIDDEN', label: `Hidden (${hiddenCount})` },
          ] as Array<{ key: FilterTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-stone-800">
            No reviews in this view
          </p>
          <p className="text-xs text-stone-500">
            Guest reviews submitted from the public website will appear here for
            moderation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const isBusy = busyId === review.id
            const isEditingReply = replyingId === review.id
            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-xs"
              >
                {/* Top Metadata Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_BADGE_CLASSES[review.status]}`}
                      >
                        {review.status}
                      </span>
                      {review.isFeatured && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                          <Pin className="w-3 h-3" />
                          Featured on Home
                        </span>
                      )}
                      {review.isVerifiedStay && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Stay
                        </span>
                      )}
                      {review.bookingReference && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                          {review.bookingReference}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      <span className="text-sm font-semibold text-stone-900">
                        {review.guestName}
                      </span>
                      {review.guestLocation && (
                        <span className="text-xs text-stone-500">
                          · {review.guestLocation}
                        </span>
                      )}
                      {review.roomName && (
                        <span className="text-xs text-stone-500">
                          · {review.roomName}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-stone-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                {/* Review Content */}
                <div className="space-y-1.5">
                  {review.title && (
                    <h2 className="text-base font-semibold text-stone-900">
                      {review.title}
                    </h2>
                  )}
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>
                </div>

                {/* Existing Owner Reply Display */}
                {review.adminReply && !isEditingReply && (
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-900">
                        Owner Reply
                      </span>
                      {review.adminRepliedAt && (
                        <span className="text-[11px] text-stone-400">
                          {formatDate(review.adminRepliedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                      {review.adminReply}
                    </p>
                  </div>
                )}

                {/* Inline Reply Editor */}
                {isEditingReply && (
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-3">
                    <label
                      htmlFor={`reply-${review.id}`}
                      className="block text-xs font-semibold text-stone-700"
                    >
                      Public Host Response
                    </label>
                    <textarea
                      id={`reply-${review.id}`}
                      rows={3}
                      maxLength={1200}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Write a warm thank-you note or helpful response shown beneath this review..."
                      className="w-full rounded-xl bg-white border border-stone-200 px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleSaveReply(review)}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? 'Saving...' : 'Save Reply'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setReplyingId(null)
                          setReplyDraft('')
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {review.status !== 'APPROVED' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleModerate(
                            review.id,
                            { status: 'APPROVED' },
                            `Approved review by ${review.guestName}.`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {review.status !== 'HIDDEN' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleModerate(
                            review.id,
                            { status: 'HIDDEN' },
                            `Hid review by ${review.guestName}.`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition cursor-pointer disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide
                      </button>
                    )}

                    {review.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleModerate(
                            review.id,
                            { isFeatured: !review.isFeatured },
                            review.isFeatured
                              ? `Unpinned ${review.guestName}'s review from Home page.`
                              : `Pinned ${review.guestName}'s review to Home page.`,
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                          review.isFeatured
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {review.isFeatured ? 'Unpin from Home' : 'Pin to Home'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openReplyEditor(review)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {review.adminReply ? 'Edit Reply' : 'Reply'}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setDeleteTarget(review)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete guest review?"
        description={
          deleteTarget
            ? `This permanently deletes the review submitted by ${deleteTarget.guestName}. You can hide a review instead if you want to keep a record.`
            : ''
        }
        confirmText="Delete Review"
        variant="danger"
        isLoading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
