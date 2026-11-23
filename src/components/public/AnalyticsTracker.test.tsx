import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import type { BeforeSend } from '@vercel/analytics/react'
import {
  AnalyticsTracker,
  filterVercelAnalyticsEvent,
} from './AnalyticsTracker'
import {
  ACCEPT_ALL_COOKIE_CATEGORIES,
  NECESSARY_ONLY_COOKIE_CATEGORIES,
  saveCookieConsent,
} from '#/lib/cookie-consent'

const { mockRecordPageView, mockPathname, mockCapturedBeforeSend } = vi.hoisted(
  () => ({
    mockRecordPageView: vi.fn().mockResolvedValue({ recorded: true }),
    mockPathname: { current: '/rooms' },
    mockCapturedBeforeSend: { current: undefined as BeforeSend | undefined },
  }),
)

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string
  }) => select({ location: { pathname: mockPathname.current } }),
}))

vi.mock('@vercel/analytics/react', () => ({
  Analytics: ({ beforeSend }: { beforeSend?: BeforeSend }) => {
    mockCapturedBeforeSend.current = beforeSend
    return <div data-testid="vercel-analytics" />
  },
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
    mockCapturedBeforeSend.current = undefined
    delete window.dataLayer
    delete window.gtag
    delete window.va
    document.head
      .querySelectorAll('script[data-jwh-ga]')
      .forEach((el) => el.remove())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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

  it('records page views once consented, blocks Vercel events after withdrawal, and avoids duplicating landing referrer', async () => {
    const mockVa = vi.fn()
    window.va = mockVa
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://www.google.com/search?q=camotes',
    })

    const { getByTestId, queryByTestId, rerender } = render(
      <AnalyticsTracker />,
    )

    act(() => {
      saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    })

    await waitFor(() => {
      expect(mockRecordPageView).toHaveBeenCalledWith({
        data: expect.objectContaining({
          path: '/rooms',
          referrer: 'https://www.google.com/search?q=camotes',
        }),
      })
      expect(getByTestId('vercel-analytics')).toBeInTheDocument()
    })

    // While consented, Vercel beforeSend allows public URLs and blocks /admin URLs
    expect(
      filterVercelAnalyticsEvent({
        type: 'pageview',
        url: 'https://jennys-white-haven-v2.vercel.app/rooms',
      }),
    ).not.toBeNull()
    expect(
      filterVercelAnalyticsEvent({
        type: 'pageview',
        url: 'https://jennys-white-haven-v2.vercel.app/admin/reports/analytics',
      }),
    ).toBeNull()

    // Subsequent SPA navigation does not re-attribute the external landing referrer
    mockPathname.current = '/explore'
    rerender(<AnalyticsTracker />)
    await waitFor(() => {
      expect(mockRecordPageView).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          path: '/explore',
          referrer: '',
        }),
      })
    })

    // Withdrawing consent unmounts VercelAnalytics, drops events in beforeSend, and disables window.va
    act(() => {
      saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    })
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument()
    expect(
      filterVercelAnalyticsEvent({
        type: 'pageview',
        url: 'https://jennys-white-haven-v2.vercel.app/explore',
      }),
    ).toBeNull()
    expect(mockVa).toHaveBeenCalledWith('beforeSend', expect.any(Function))
  })

  it('pushes native Arguments objects to window.dataLayer for GA4 delivery and denies storage on withdrawal', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST12345')

    render(<AnalyticsTracker />)
    act(() => {
      saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    })

    await waitFor(() => {
      expect(window.dataLayer?.length).toBeGreaterThanOrEqual(4)
    })

    // Verify gtag.js receives native Arguments objects (not plain Arrays)
    for (const entry of window.dataLayer ?? []) {
      expect(Array.isArray(entry)).toBe(false)
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]')
    }
    const pageViewEntry = (window.dataLayer ?? []).find(
      (entry) =>
        (entry as IArguments)[0] === 'event' &&
        (entry as IArguments)[1] === 'page_view',
    ) as IArguments | undefined
    expect(pageViewEntry).toBeDefined()
    expect(pageViewEntry?.[2]).toEqual(
      expect.objectContaining({ page_path: '/rooms' }),
    )

    // Withdrawing consent disables GA4 and updates consent mode to denied
    act(() => {
      saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    })
    expect(window['ga-disable-G-TEST12345']).toBe(true)
    const deniedEntry = (window.dataLayer ?? []).find(
      (entry) =>
        (entry as IArguments)[0] === 'consent' &&
        (entry as IArguments)[1] === 'update' &&
        ((entry as IArguments)[2] as { analytics_storage?: string })
          .analytics_storage === 'denied',
    )
    expect(deniedEntry).toBeDefined()
  })
})
