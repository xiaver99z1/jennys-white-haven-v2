// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewsPageView } from './ReviewsPageView'
import type { PublicReviewsSummary } from '#/types'

const submitPublicReviewMock = vi.fn()

vi.mock('#/server/review-actions', () => ({
  submitPublicReview: (...args: unknown[]) => submitPublicReviewMock(...args),
}))

const sampleSummary: PublicReviewsSummary = {
  totalCount: 2,
  averageRating: 4.5,
  ratingBreakdown: [
    { stars: 5, count: 1, share: 50 },
    { stars: 4, count: 1, share: 50 },
    { stars: 3, count: 0, share: 0 },
    { stars: 2, count: 0, share: 0 },
    { stars: 1, count: 0, share: 0 },
  ],
  reviews: [
    {
      id: 'rev-1',
      guestName: 'Elena Cruz',
      guestLocation: 'Cebu City',
      roomName: 'Ocean View Suite',
      isVerifiedStay: true,
      rating: 5,
      title: 'Peaceful coastal escape',
      comment: 'Loved waking up to the sea breeze and spotless rooms.',
      isFeatured: true,
      adminReply: 'Thank you so much Elena! Hope to welcome you back soon.',
      adminRepliedAt: new Date('2026-11-21T08:00:00Z'),
      createdAt: new Date('2026-11-20T08:00:00Z'),
    },
    {
      id: 'rev-2',
      guestName: 'Marco Reyes',
      guestLocation: 'Manila',
      roomName: 'Deluxe Room',
      isVerifiedStay: false,
      rating: 4,
      title: 'Warm hospitality',
      comment: 'Very helpful front desk for our port transfer.',
      isFeatured: false,
      adminReply: null,
      adminRepliedAt: null,
      createdAt: new Date('2026-11-19T08:00:00Z'),
    },
  ],
}

describe('ReviewsPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders aggregate rating, approved reviews, verified badge, and owner reply', () => {
    render(<ReviewsPageView summary={sampleSummary} />)

    expect(screen.getByText('4.5')).toBeTruthy()
    expect(screen.getByText('Peaceful coastal escape')).toBeTruthy()
    expect(screen.getByText('Verified Stay')).toBeTruthy()
    expect(
      screen.getByText(
        'Thank you so much Elena! Hope to welcome you back soon.',
      ),
    ).toBeTruthy()
  })

  it('filters reviews when clicking a star filter pill', () => {
    render(<ReviewsPageView summary={sampleSummary} />)

    fireEvent.click(screen.getByRole('button', { name: '4★ (1)' }))

    expect(screen.queryByText('Peaceful coastal escape')).toBeNull()
    expect(screen.getByText('Warm hospitality')).toBeTruthy()
  })

  it('submits a guest review and shows pending-approval confirmation', async () => {
    submitPublicReviewMock.mockResolvedValue({
      success: true,
      id: 'rev-new',
      isVerifiedStay: true,
    })

    render(<ReviewsPageView summary={sampleSummary} />)

    fireEvent.change(screen.getByLabelText('Your Name *'), {
      target: { value: 'Sofia Lim' },
    })
    fireEvent.change(screen.getByLabelText('Booking Reference (Optional)'), {
      target: { value: 'JWH-990011' },
    })
    fireEvent.change(screen.getByLabelText('Your Experience *'), {
      target: { value: 'Calm mornings, clean linens, and friendly hosts.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))

    await waitFor(() => {
      expect(submitPublicReviewMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guestName: 'Sofia Lim',
          bookingReference: 'JWH-990011',
          rating: 5,
          comment: 'Calm mornings, clean linens, and friendly hosts.',
        }),
      })
    })

    expect(
      await screen.findByText('Thank you for sharing your stay!'),
    ).toBeTruthy()
    expect(screen.getByText(/Your booking reference was matched/i)).toBeTruthy()
  })
})
