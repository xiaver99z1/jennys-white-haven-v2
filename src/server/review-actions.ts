import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { createNotification } from '#/server/notification-actions'
import { requirePermission } from '#/server/room-actions'
import type {
  AdminReviewItem,
  PublicReviewItem,
  PublicReviewsSummary,
  ReviewStatus,
} from '#/types'

const VALID_REVIEW_STATUSES = new Set<string>(['PENDING', 'APPROVED', 'HIDDEN'])

function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2021'
  )
}

function toPublicReview(row: {
  id: string
  guestName: string
  guestLocation: string | null
  roomName: string | null
  isVerifiedStay: boolean
  rating: number
  title: string | null
  comment: string
  isFeatured: boolean
  adminReply: string | null
  adminRepliedAt: Date | null
  createdAt: Date
}): PublicReviewItem {
  return {
    id: row.id,
    guestName: row.guestName,
    guestLocation: row.guestLocation,
    roomName: row.roomName,
    isVerifiedStay: row.isVerifiedStay,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    isFeatured: row.isFeatured,
    adminReply: row.adminReply,
    adminRepliedAt: row.adminRepliedAt,
    createdAt: row.createdAt,
  }
}

export const getPublicReviewsHandler = createServerOnlyFn(
  async (): Promise<PublicReviewsSummary> => {
    let rows: Array<{
      id: string
      guestName: string
      guestLocation: string | null
      roomName: string | null
      isVerifiedStay: boolean
      rating: number
      title: string | null
      comment: string
      isFeatured: boolean
      adminReply: string | null
      adminRepliedAt: Date | null
      createdAt: Date
    }> = []

    try {
      rows = await prisma.review.findMany({
        where: { status: 'APPROVED' },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      })
    } catch (err) {
      if (isMissingTableError(err)) {
        console.warn(
          'Review table not yet synced (run `pnpm db:push` to create review table).',
        )
      } else {
        throw err
      }
    }

    const totalCount = rows.length
    const ratingSum = rows.reduce((sum, r) => sum + r.rating, 0)
    const averageRating =
      totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : 0

    const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
      const count = rows.filter((r) => r.rating === stars).length
      return {
        stars,
        count,
        share: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      }
    })

    return {
      totalCount,
      averageRating,
      ratingBreakdown,
      reviews: rows.map(toPublicReview),
    }
  },
)

export const getPublicReviews = createServerFn({ method: 'GET' }).handler(
  getPublicReviewsHandler,
)

export interface SubmitPublicReviewInput {
  guestName: string
  guestLocation?: string
  roomName?: string
  bookingReference?: string
  rating: number
  title?: string
  comment: string
}

export function validateSubmitPublicReview(data: SubmitPublicReviewInput) {
  return data
}

export const submitPublicReviewHandler = createServerOnlyFn(
  async ({
    data,
  }: {
    data: SubmitPublicReviewInput
  }): Promise<{ success: true; id: string; isVerifiedStay: boolean }> => {
    const guestName = data.guestName.trim()
    const comment = data.comment.trim()
    const title = data.title?.trim() || null
    const guestLocation = data.guestLocation?.trim() || null
    let roomName = data.roomName?.trim() || null
    const bookingReference =
      data.bookingReference?.trim().toUpperCase() || null
    const rating = Number(data.rating)

    if (guestName.length < 2 || guestName.length > 80) {
      throw new Error('Please enter your name (2 to 80 characters).')
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Please choose a star rating between 1 and 5.')
    }
    if (comment.length < 10 || comment.length > 1500) {
      throw new Error('Please write a review between 10 and 1,500 characters.')
    }

    let isVerifiedStay = false
    if (bookingReference) {
      const booking = await prisma.booking.findFirst({
        where: {
          bookingReference,
          deletedAt: null,
          status: { not: 'CANCELLED' },
        },
        include: {
          room: { select: { name: true } },
        },
      })
      if (booking) {
        isVerifiedStay = true
        if (!roomName) {
          roomName = booking.room.name
        }
      }
    }

    const created = await prisma.review.create({
      data: {
        guestName,
        guestLocation: guestLocation?.slice(0, 80) ?? null,
        roomName: roomName?.slice(0, 80) ?? null,
        bookingReference: bookingReference?.slice(0, 40) ?? null,
        isVerifiedStay,
        rating,
        title: title?.slice(0, 120) ?? null,
        comment,
        status: 'PENDING',
        isFeatured: false,
      },
    })

    await createNotification({
      type: 'REVIEW_SUBMITTED',
      title: `New ${rating}★ Guest Review from ${guestName}`,
      message: title || comment.slice(0, 110),
      href: '/admin/reviews',
    })

    return {
      success: true,
      id: created.id,
      isVerifiedStay,
    }
  },
)

export const submitPublicReview = createServerFn({ method: 'POST' })
  .validator(validateSubmitPublicReview)
  .handler(submitPublicReviewHandler)

export const getAdminReviewsHandler = createServerOnlyFn(
  async (): Promise<AdminReviewItem[]> => {
    await requirePermission('manage:cms')

    try {
      const rows = await prisma.review.findMany({
        orderBy: [{ createdAt: 'desc' }],
      })
      return rows.map((row) => ({
        ...toPublicReview(row),
        bookingReference: row.bookingReference,
        status: row.status,
      }))
    } catch (err) {
      if (isMissingTableError(err)) {
        console.warn(
          'Review table not yet synced (run `pnpm db:push` to create review table).',
        )
        return []
      }
      throw err
    }
  },
)

export const getAdminReviews = createServerFn({ method: 'GET' }).handler(
  getAdminReviewsHandler,
)

export interface ModerateReviewInput {
  id: string
  status?: ReviewStatus
  isFeatured?: boolean
  adminReply?: string | null
}

export function validateModerateReview(data: ModerateReviewInput) {
  return data
}

export const moderateReviewHandler = createServerOnlyFn(
  async ({
    data,
  }: {
    data: ModerateReviewInput
  }): Promise<{ success: true; review: AdminReviewItem }> => {
    const admin = await requirePermission('manage:cms')

    if (!data.id.trim()) {
      throw new Error('Review ID is required.')
    }
    if (data.status !== undefined && !VALID_REVIEW_STATUSES.has(data.status)) {
      throw new Error('Invalid review status.')
    }

    const updateData: {
      status?: ReviewStatus
      isFeatured?: boolean
      adminReply?: string | null
      adminRepliedAt?: Date | null
    } = {}

    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status !== 'APPROVED') {
        updateData.isFeatured = false
      }
    }
    if (data.isFeatured !== undefined) {
      updateData.isFeatured = data.isFeatured
    }
    if (data.adminReply !== undefined) {
      const trimmed = (data.adminReply ?? '').trim()
      updateData.adminReply = trimmed ? trimmed.slice(0, 1200) : null
      updateData.adminRepliedAt = trimmed ? new Date() : null
    }

    const updated = await prisma.review.update({
      where: { id: data.id },
      data: updateData,
    })

    const session = await authSession()
    await logActivity({
      userId: admin.id,
      action: 'REVIEW_MODERATED',
      description: `Updated guest review by ${updated.guestName} (status: ${updated.status}, featured: ${updated.isFeatured ? 'yes' : 'no'})`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return {
      success: true,
      review: {
        ...toPublicReview(updated),
        bookingReference: updated.bookingReference,
        status: updated.status,
      },
    }
  },
)

export const moderateReview = createServerFn({ method: 'POST' })
  .validator(validateModerateReview)
  .handler(moderateReviewHandler)

export function validateDeleteReview(data: { id: string }) {
  return data
}

export const deleteReviewHandler = createServerOnlyFn(
  async ({ data }: { data: { id: string } }): Promise<{ success: true }> => {
    const admin = await requirePermission('manage:cms')
    if (!data.id.trim()) {
      throw new Error('Review ID is required.')
    }

    const deleted = await prisma.review.delete({
      where: { id: data.id },
      select: { guestName: true },
    })

    const session = await authSession()
    await logActivity({
      userId: admin.id,
      action: 'REVIEW_DELETED',
      description: `Deleted guest review by ${deleted.guestName}`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    return { success: true }
  },
)

export const deleteReview = createServerFn({ method: 'POST' })
  .validator(validateDeleteReview)
  .handler(deleteReviewHandler)
