// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewsPageView } from './ReviewsPageView'
import type { PublicReviewsSummary } from '#/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
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
      isVerifiedStay: true,
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
  it('renders read-only showcase of verified reviews, aggregate rating, owner reply, and Booking Status CTA', () => {
    render(<ReviewsPageView summary={sampleSummary} />)

    expect(screen.getByText('4.5')).toBeTruthy()
    expect(screen.getByText('Peaceful coastal escape')).toBeTruthy()
    expect(screen.getAllByText('Verified Stay')).toHaveLength(2)
    expect(
      screen.getByText(
        'Thank you so much Elena! Hope to welcome you back soon.',
      ),
    ).toBeTruthy()

    // Ensure no open public submission form is rendered on /reviews
    expect(screen.queryByRole('button', { name: 'Submit Review' })).toBeNull()

    // Directs guests to /booking-status to verify their stay
    const reviewLinks = screen.getAllByRole('link', {
      name: /Review Your Stay/i,
    })
    expect(reviewLinks.length).toBeGreaterThan(0)
    expect(reviewLinks[0].getAttribute('href')).toBe('/booking-status')
  })

  it('filters reviews when clicking a star filter pill', () => {
    render(<ReviewsPageView summary={sampleSummary} />)

    fireEvent.click(screen.getByRole('button', { name: '4★ (1)' }))

    expect(screen.queryByText('Peaceful coastal escape')).toBeNull()
    expect(screen.getByText('Warm hospitality')).toBeTruthy()
  })
})
