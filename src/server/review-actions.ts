import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { phonesMatch } from '#/lib/phone'
import { createNotification } from '#/server/notification-actions'
import { requirePermission } from '#/lib/require-permission'
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

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
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
  bookingReference: string
  contact: string
  guestLocation?: string
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
  }): Promise<{
    success: true
    id: string
    isVerifiedStay: true
    review: {
      id: string
      rating: number
      title: string | null
      comment: string
      status: ReviewStatus
      createdAt: Date
    }
  }> => {
    const bookingReference = data.bookingReference.trim().toUpperCase()
    const contact = data.contact.trim().toLowerCase()
    const comment = data.comment.trim()
    const title = data.title?.trim() || null
    const guestLocation = data.guestLocation?.trim() || null
    const rating = Number(data.rating)

    if (!bookingReference || !contact) {
      throw new Error(
        'Booking reference and your registered phone or email are required.',
      )
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Please choose a star rating between 1 and 5.')
    }
    if (comment.length < 10 || comment.length > 1500) {
      throw new Error('Please write a review between 10 and 1,500 characters.')
    }

    const booking = await prisma.booking.findFirst({
      where: {
        bookingReference,
        deletedAt: null,
      },
      include: {
        room: { select: { name: true } },
        guest: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    if (!booking) {
      throw new Error(
        'Could not verify your reservation. Please check your booking reference and contact details.',
      )
    }

    const matchesPhone = phonesMatch(booking.guest.phone, contact)
    const matchesEmail =
      (booking.guest.email?.trim().toLowerCase() ?? '') === contact

    if (!matchesPhone && !matchesEmail) {
      throw new Error(
        'Could not verify your reservation. Please check your booking reference and contact details.',
      )
    }

    if (booking.status !== 'CHECKED_OUT' || booking.paymentStatus !== 'PAID') {
      throw new Error(
        'Reviews can only be submitted after your stay is completed (checked out) and fully paid.',
      )
    }

    const existingReview = await prisma.review.findFirst({
      where: { bookingReference },
      select: { id: true },
    })
    if (existingReview) {
      throw new Error(
        'A review has already been submitted for this booking reference.',
      )
    }

    const guestName =
      `${booking.guest.firstName} ${booking.guest.lastName}`.trim()
    const roomName = booking.room.name

    let created: {
      id: string
      rating: number
      title: string | null
      comment: string
      status: ReviewStatus
      createdAt: Date
    }
    try {
      created = await prisma.review.create({
        data: {
          guestName: guestName.slice(0, 80),
          guestLocation: guestLocation?.slice(0, 80) ?? null,
          roomName: roomName.slice(0, 80),
          bookingReference: bookingReference.slice(0, 40),
          isVerifiedStay: true,
          rating,
          title: title?.slice(0, 120) ?? null,
          comment,
          status: 'PENDING',
          isFeatured: false,
        },
      })
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new Error(
          'A review has already been submitted for this booking reference.',
        )
      }
      throw err
    }

    await createNotification({
      type: 'REVIEW_SUBMITTED',
      title: `New ${rating}★ Verified Review (${bookingReference})`,
      message: `${guestName}: ${title || comment.slice(0, 90)}`,
      href: '/admin/reviews',
    })

    return {
      success: true,
      id: created.id,
      isVerifiedStay: true,
      review: {
        id: created.id,
        rating: created.rating,
        title: created.title,
        comment: created.comment,
        status: created.status,
        createdAt: created.createdAt,
      },
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
