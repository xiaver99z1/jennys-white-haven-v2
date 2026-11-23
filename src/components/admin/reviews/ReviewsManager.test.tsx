// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewsManager } from './ReviewsManager'
import type { AdminReviewItem } from '#/types'

const moderateReviewMock = vi.fn()
const deleteReviewMock = vi.fn()
const invalidateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    invalidate: invalidateMock,
  }),
}))

vi.mock('#/server/review-actions', () => ({
  moderateReview: (...args: unknown[]) => moderateReviewMock(...args),
  deleteReview: (...args: unknown[]) => deleteReviewMock(...args),
}))

const sampleReviews: AdminReviewItem[] = [
  {
    id: 'rev-pending',
    guestName: 'Ana Lopez',
    guestLocation: 'Cebu',
    roomName: 'Deluxe Room',
    bookingReference: 'JWH-123456',
    isVerifiedStay: true,
    rating: 5,
    title: 'Wonderful sanctuary',
    comment: 'Super quiet and welcoming stay by Santiago Bay.',
    status: 'PENDING',
    isFeatured: false,
    adminReply: null,
    adminRepliedAt: null,
    createdAt: new Date('2026-11-22T08:00:00Z'),
  },
  {
    id: 'rev-approved',
    guestName: 'Carlo Tan',
    guestLocation: 'Davao',
    roomName: 'Garden Suite',
    bookingReference: null,
    isVerifiedStay: false,
    rating: 4,
    title: 'Great island stay',
    comment: 'Clean rooms and easy port transfer.',
    status: 'APPROVED',
    isFeatured: false,
    adminReply: null,
    adminRepliedAt: null,
    createdAt: new Date('2026-11-21T08:00:00Z'),
  },
]

describe('ReviewsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters reviews by status tab and approves a pending review', async () => {
    moderateReviewMock.mockResolvedValue({
      success: true,
      review: { ...sampleReviews[0], status: 'APPROVED' },
    })

    render(<ReviewsManager initialReviews={sampleReviews} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pending (1)' }))
    expect(screen.getByText('Ana Lopez')).toBeTruthy()
    expect(screen.queryByText('Carlo Tan')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(moderateReviewMock).toHaveBeenCalledWith({
        data: { id: 'rev-pending', status: 'APPROVED' },
      })
    })
    expect(invalidateMock).toHaveBeenCalled()
  })

  it('pins an approved review and saves an owner reply', async () => {
    moderateReviewMock
      .mockResolvedValueOnce({
        success: true,
        review: { ...sampleReviews[1], isFeatured: true },
      })
      .mockResolvedValueOnce({
        success: true,
        review: {
          ...sampleReviews[1],
          isFeatured: true,
          adminReply: 'Thank you Carlo!',
          adminRepliedAt: new Date('2026-11-23T08:00:00Z'),
        },
      })

    render(<ReviewsManager initialReviews={[sampleReviews[1]]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pin to Home' }))
    await waitFor(() => {
      expect(moderateReviewMock).toHaveBeenCalledWith({
        data: { id: 'rev-approved', isFeatured: true },
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    fireEvent.change(screen.getByLabelText('Public Host Response'), {
      target: { value: 'Thank you Carlo!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Reply' }))

    await waitFor(() => {
      expect(moderateReviewMock).toHaveBeenCalledWith({
        data: { id: 'rev-approved', adminReply: 'Thank you Carlo!' },
      })
    })
    expect(await screen.findByText('Thank you Carlo!')).toBeTruthy()
  })

  it('deletes a review after confirmation in ConfirmModal', async () => {
    deleteReviewMock.mockResolvedValue({ success: true })

    render(<ReviewsManager initialReviews={[sampleReviews[0]]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete guest review?')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Review' }))

    await waitFor(() => {
      expect(deleteReviewMock).toHaveBeenCalledWith({
        data: { id: 'rev-pending' },
      })
    })
    expect(screen.queryByText('Ana Lopez')).toBeNull()
  })

  it('keeps the reply draft intact when saving an owner reply fails', async () => {
    moderateReviewMock.mockRejectedValueOnce(new Error('Network error'))

    render(<ReviewsManager initialReviews={[sampleReviews[1]]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }))
    const textarea = screen.getByLabelText<HTMLTextAreaElement>(
      'Public Host Response',
    )
    fireEvent.change(textarea, {
      target: { value: 'Draft reply that should stay on error.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Reply' }))

    expect(await screen.findByText('Network error')).toBeTruthy()
    expect(
      screen.getByLabelText<HTMLTextAreaElement>('Public Host Response').value,
    ).toBe('Draft reply that should stay on error.')
  })
})
