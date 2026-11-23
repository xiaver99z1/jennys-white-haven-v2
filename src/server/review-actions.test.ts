import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  deleteReviewHandler,
  getAdminReviewsHandler,
  getPublicReviewsHandler,
  moderateReviewHandler,
  submitPublicReviewHandler,
} from './review-actions'

const {
  mockRequirePermission,
  mockAuthSession,
  mockLogActivity,
  mockCreateNotification,
  mockReviewFindMany,
  mockReviewCreate,
  mockReviewUpdate,
  mockReviewDelete,
  mockBookingFindFirst,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockAuthSession: vi.fn(),
  mockLogActivity: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockReviewFindMany: vi.fn(),
  mockReviewCreate: vi.fn(),
  mockReviewUpdate: vi.fn(),
  mockReviewDelete: vi.fn(),
  mockBookingFindFirst: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/logger', () => ({
  logActivity: mockLogActivity,
}))

vi.mock('#/server/notification-actions', () => ({
  createNotification: mockCreateNotification,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: mockReviewFindMany,
      create: mockReviewCreate,
      update: mockReviewUpdate,
      delete: mockReviewDelete,
    },
    booking: {
      findFirst: mockBookingFindFirst,
    },
  },
}))

describe('review-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'admin-1', role: 'owner' })
    mockAuthSession.mockResolvedValue({
      session: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    })
  })

  it('computes average rating and star breakdown for public approved reviews and handles P2021 safely', async () => {
    mockReviewFindMany.mockResolvedValueOnce([
      {
        id: 'r1',
        guestName: 'Maria Santos',
        guestLocation: 'Cebu City',
        roomName: 'Ocean Suite',
        isVerifiedStay: true,
        rating: 5,
        title: 'So peaceful',
        comment: 'Loved every minute of our stay in Camotes.',
        isFeatured: true,
        adminReply: 'Thank you Maria!',
        adminRepliedAt: new Date('2026-11-20T00:00:00Z'),
        createdAt: new Date('2026-11-19T00:00:00Z'),
      },
      {
        id: 'r2',
        guestName: 'Juan Cruz',
        guestLocation: 'Manila',
        roomName: 'Deluxe Room',
        isVerifiedStay: false,
        rating: 4,
        title: null,
        comment: 'Great quiet rooms and warm staff.',
        isFeatured: false,
        adminReply: null,
        adminRepliedAt: null,
        createdAt: new Date('2026-11-18T00:00:00Z'),
      },
    ])

    const summary = await getPublicReviewsHandler()
    expect(summary.totalCount).toBe(2)
    expect(summary.averageRating).toBe(4.5)
    expect(summary.ratingBreakdown[0]).toEqual({
      stars: 5,
      count: 1,
      share: 50,
    })
    expect(summary.ratingBreakdown[1]).toEqual({
      stars: 4,
      count: 1,
      share: 50,
    })

    // Missing table fallback (P2021)
    mockReviewFindMany.mockRejectedValueOnce({ code: 'P2021' })
    const empty = await getPublicReviewsHandler()
    expect(empty.totalCount).toBe(0)
    expect(empty.reviews).toEqual([])
  })

  it('validates input, marks verified stay when booking reference matches, and creates pending review', async () => {
    await expect(
      submitPublicReviewHandler({
        data: { guestName: 'A', rating: 5, comment: 'Too short name' },
      }),
    ).rejects.toThrow('Please enter your name')

    await expect(
      submitPublicReviewHandler({
        data: { guestName: 'Maria', rating: 6, comment: 'Invalid star rating' },
      }),
    ).rejects.toThrow('Please choose a star rating')

    await expect(
      submitPublicReviewHandler({
        data: { guestName: 'Maria', rating: 5, comment: 'Short' },
      }),
    ).rejects.toThrow('Please write a review')

    mockBookingFindFirst.mockResolvedValueOnce({
      id: 'b1',
      room: { name: 'Garden Villa' },
    })
    mockReviewCreate.mockResolvedValueOnce({ id: 'rev-1' })

    const res = await submitPublicReviewHandler({
      data: {
        guestName: 'Maria Santos',
        guestLocation: 'Cebu',
        bookingReference: 'jwh-20261120-abcd',
        rating: 5,
        title: 'Best staycation',
        comment: 'Quiet rooms, friendly team, and very near Santiago Bay.',
      },
    })

    expect(res).toEqual({
      success: true,
      id: 'rev-1',
      isVerifiedStay: true,
    })
    expect(mockBookingFindFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        bookingReference: 'JWH-20261120-ABCD',
        deletedAt: null,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkIn: { lte: expect.any(Date) },
      }),
      include: {
        room: { select: { name: true } },
      },
    })
    expect(mockReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestName: 'Maria Santos',
        roomName: 'Garden Villa',
        bookingReference: 'JWH-20261120-ABCD',
        isVerifiedStay: true,
        status: 'PENDING',
      }),
    })
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REVIEW_SUBMITTED',
        href: '/admin/reviews',
      }),
    )
  })

  it('loads, moderates, replies to, and deletes reviews in admin', async () => {
    mockReviewFindMany.mockResolvedValueOnce([
      {
        id: 'rev-1',
        guestName: 'Maria',
        guestLocation: null,
        roomName: 'Suite',
        bookingReference: null,
        isVerifiedStay: false,
        rating: 5,
        title: 'Lovely',
        comment: 'Calm and relaxing resort stay.',
        status: 'PENDING',
        isFeatured: false,
        adminReply: null,
        adminRepliedAt: null,
        createdAt: new Date('2026-11-22T00:00:00Z'),
      },
    ])

    const adminList = await getAdminReviewsHandler()
    expect(mockRequirePermission).toHaveBeenCalledWith('manage:cms')
    expect(adminList).toHaveLength(1)

    mockReviewUpdate.mockResolvedValueOnce({
      id: 'rev-1',
      guestName: 'Maria',
      guestLocation: null,
      roomName: 'Suite',
      bookingReference: null,
      isVerifiedStay: false,
      rating: 5,
      title: 'Lovely',
      comment: 'Calm and relaxing resort stay.',
      status: 'APPROVED',
      isFeatured: true,
      adminReply: 'Thank you for staying with us!',
      adminRepliedAt: new Date('2026-11-23T00:00:00Z'),
      createdAt: new Date('2026-11-22T00:00:00Z'),
    })

    const moderated = await moderateReviewHandler({
      data: {
        id: 'rev-1',
        status: 'APPROVED',
        isFeatured: true,
        adminReply: 'Thank you for staying with us!',
      },
    })
    expect(moderated.review.status).toBe('APPROVED')
    expect(moderated.review.isFeatured).toBe(true)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REVIEW_MODERATED' }),
    )

    mockReviewDelete.mockResolvedValueOnce({ guestName: 'Maria' })
    const deleted = await deleteReviewHandler({ data: { id: 'rev-1' } })
    expect(deleted.success).toBe(true)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REVIEW_DELETED' }),
    )
  })
})
