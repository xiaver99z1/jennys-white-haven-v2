import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { AnalyticsTracker } from './AnalyticsTracker'
import {
  ACCEPT_ALL_COOKIE_CATEGORIES,
  NECESSARY_ONLY_COOKIE_CATEGORIES,
  saveCookieConsent,
} from '#/lib/cookie-consent'

const { mockRecordPageView, mockPathname } = vi.hoisted(() => ({
  mockRecordPageView: vi.fn().mockResolvedValue({ recorded: true }),
  mockPathname: { current: '/rooms' },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string
  }) => select({ location: { pathname: mockPathname.current } }),
}))

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}))

vi.mock('#/server/analytics-actions', () => ({
  recordPageView: mockRecordPageView,
}))

describe('AnalyticsTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    mockPathname.current = '/rooms'
  })

  it('does not record page views or mount Vercel Analytics when performance consent is not granted', () => {
    const { queryByTestId } = render(<AnalyticsTracker />)
    expect(mockRecordPageView).not.toHaveBeenCalled()
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument()

    act(() => {
      saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    })
    expect(mockRecordPageView).not.toHaveBeenCalled()
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument()
  })

  it('records page views and mounts Vercel Analytics immediately once performance consent is granted', async () => {
    const { getByTestId } = render(<AnalyticsTracker />)

    act(() => {
      saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    })

    await waitFor(() => {
      expect(mockRecordPageView).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: '/rooms',
        }),
      })
      expect(getByTestId('vercel-analytics')).toBeInTheDocument()
    })
  })
})
