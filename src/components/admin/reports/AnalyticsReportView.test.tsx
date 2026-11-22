import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnalyticsReportView } from './AnalyticsReportView'
import type { AnalyticsReportData } from '#/types'

const { mockDownloadCsv } = vi.hoisted(() => ({
  mockDownloadCsv: vi.fn(),
}))

vi.mock('#/lib/csv', () => ({
  downloadCsv: mockDownloadCsv,
}))

describe('AnalyticsReportView', () => {
  const sampleData: AnalyticsReportData = {
    range: {
      from: '2026-11-16',
      to: '2026-11-22',
      preset: 'last7',
      dayCount: 7,
    },
    kpis: {
      totalViews: 120,
      uniqueVisitors: 48,
      topCountryName: 'Philippines',
      topCountryShare: 75,
      mobileShare: 68,
      avgViewsPerVisitor: 2.5,
    },
    dailyTrend: [
      { date: '2026-11-21', views: 50, visitors: 20 },
      { date: '2026-11-22', views: 70, visitors: 28 },
    ],
    byCountry: [
      {
        countryCode: 'PH',
        countryName: 'Philippines',
        views: 90,
        visitors: 36,
        share: 75,
      },
      {
        countryCode: 'US',
        countryName: 'United States',
        views: 30,
        visitors: 12,
        share: 25,
      },
    ],
    byPage: [
      { path: '/', views: 60, visitors: 30, share: 50 },
      { path: '/explore', views: 40, visitors: 15, share: 33 },
    ],
    byDevice: [
      { deviceType: 'mobile', count: 82, share: 68 },
      { deviceType: 'desktop', count: 38, share: 32 },
    ],
    byReferrer: [
      { referrer: 'Direct', count: 70, share: 58 },
      { referrer: 'facebook.com', count: 50, share: 42 },
    ],
    integrations: {
      gaConfigured: false,
      vercelAnalyticsReady: true,
    },
  }

  it('renders KPIs, country breakdown, popular pages, devices, referrers, and exports CSV', () => {
    const onRangeChange = vi.fn()
    render(
      <AnalyticsReportView data={sampleData} onRangeChange={onRangeChange} />,
    )

    expect(screen.getByText('Website Visitor Analytics')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getAllByText('Philippines').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('Home Page (/)')).toBeInTheDocument()
    expect(screen.getByText('Explore Camotes (/explore)')).toBeInTheDocument()
    expect(screen.getByText('facebook.com')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }))
    expect(mockDownloadCsv).toHaveBeenCalledWith(
      'website-analytics-2026-11-16-to-2026-11-22',
      expect.any(Array),
      expect.arrayContaining([['Philippines', 'PH', 90, 36, 75]]),
    )
  })
})
