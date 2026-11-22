import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  classifyDeviceType,
  formatCountryName,
  getAnalyticsReportHandler,
  isBotUserAgent,
  normalizeCountryCode,
  normalizePublicPath,
  normalizeReferrerHost,
  recordPageViewHandler,
} from './analytics-actions'

const { mockRequirePermission, mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('#/lib/prisma', () => ({
  prisma: {
    pageView: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  },
}))

describe('analytics-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'admin-1', role: 'owner' })
  })

  it('normalizes paths, referrers, device types, countries, and filters bots', () => {
    expect(normalizePublicPath('/rooms/?checkIn=2026-12-01')).toBe('/rooms')
    expect(normalizePublicPath('/')).toBe('/')
    expect(normalizePublicPath('/admin/settings')).toBeNull()
    expect(normalizePublicPath('/api/media/view')).toBeNull()

    expect(
      normalizeReferrerHost(
        'https://www.google.com/search?q=camotes',
        'jennys-white-haven-v2.vercel.app',
      ),
    ).toBe('google.com')
    expect(
      normalizeReferrerHost(
        'https://jennys-white-haven-v2.vercel.app/rooms',
        'jennys-white-haven-v2.vercel.app',
      ),
    ).toBe('Direct')
    expect(normalizeReferrerHost('', 'jennys-white-haven-v2.vercel.app')).toBe(
      'Direct',
    )

    expect(
      classifyDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 Mobile)'),
    ).toBe('mobile')
    expect(classifyDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet')
    expect(classifyDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64)')).toBe(
      'desktop',
    )

    expect(isBotUserAgent('Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0)')).toBe(false)

    expect(normalizeCountryCode('ph', null)).toBe('PH')
    expect(normalizeCountryCode(null, 'US')).toBe('US')
    expect(normalizeCountryCode('XX', null)).toBe('UNKNOWN')
    expect(formatCountryName('PH')).toBe('Philippines')
    expect(formatCountryName('UNKNOWN')).toBe('Unknown / Local')
  })

  it('records sanitized public page views with Vercel country headers and ignores bots/admin routes', async () => {
    mockCreate.mockResolvedValue({ id: 'pv-1' })

    const botRes = await recordPageViewHandler({
      data: { path: '/' },
      headersOverride: new Headers({ 'user-agent': 'Googlebot/2.1' }),
    })
    expect(botRes.recorded).toBe(false)
    expect(mockCreate).not.toHaveBeenCalled()

    const adminRes = await recordPageViewHandler({
      data: { path: '/admin/bookings' },
      headersOverride: new Headers({ 'user-agent': 'Mozilla/5.0' }),
    })
    expect(adminRes.recorded).toBe(false)

    const validRes = await recordPageViewHandler({
      data: {
        path: '/explore?tab=beach',
        referrer: 'https://m.facebook.com/share',
        visitorId: 'session-abc',
      },
      headersOverride: new Headers({
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 Mobile)',
        'x-vercel-ip-country': 'PH',
        'x-vercel-ip-city': 'Cebu%20City',
        host: 'jennys-white-haven-v2.vercel.app',
      }),
    })
    expect(validRes.recorded).toBe(true)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        path: '/explore',
        country: 'PH',
        city: 'Cebu City',
        deviceType: 'mobile',
        referrer: 'm.facebook.com',
      }),
    })
  })

  it('aggregates visitor analytics KPIs, countries, pages, devices, and referrers for admin', async () => {
    mockFindMany.mockResolvedValue([
      {
        path: '/',
        visitorHash: 'v1',
        country: 'PH',
        deviceType: 'mobile',
        referrer: 'facebook.com',
        createdAt: new Date('2026-11-21T02:00:00Z'),
      },
      {
        path: '/rooms',
        visitorHash: 'v1',
        country: 'PH',
        deviceType: 'mobile',
        referrer: 'Direct',
        createdAt: new Date('2026-11-21T02:05:00Z'),
      },
      {
        path: '/explore',
        visitorHash: 'v2',
        country: 'US',
        deviceType: 'desktop',
        referrer: 'google.com',
        createdAt: new Date('2026-11-22T03:00:00Z'),
      },
    ])

    const report = await getAnalyticsReportHandler({
      data: { preset: 'last7' },
    })

    expect(mockRequirePermission).toHaveBeenCalledWith('view:reports')
    expect(report.kpis.totalViews).toBe(3)
    expect(report.kpis.uniqueVisitors).toBe(2)
    expect(report.kpis.topCountryName).toBe('Philippines')
    expect(report.kpis.topCountryShare).toBe(67)
    expect(report.kpis.mobileShare).toBe(67)
    expect(report.kpis.avgViewsPerVisitor).toBe(1.5)
    expect(report.byCountry[0]).toEqual(
      expect.objectContaining({
        countryCode: 'PH',
        countryName: 'Philippines',
        views: 2,
        visitors: 1,
      }),
    )
    expect(report.byPage).toHaveLength(3)
    expect(report.byDevice[0]).toEqual(
      expect.objectContaining({ deviceType: 'mobile', count: 2 }),
    )
    expect(report.dailyTrend).toHaveLength(2)
  })
})
