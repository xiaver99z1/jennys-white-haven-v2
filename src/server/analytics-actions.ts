import { createHash } from 'node:crypto'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { requirePermission } from '#/server/room-actions'
import {
  resolveReportDateRange,
  validateReportInput,
} from '#/server/report-actions'
import type { AnalyticsReportData, ReportDateRangeInput } from '#/types'

const PH_OFFSET_MS = 8 * 60 * 60 * 1000
const BOT_UA_RE =
  /bot|crawl|spider|slurp|mediapartners|headless|lighthouse|pingdom|uptime|facebookexternalhit|whatsapp|preview|curl|wget|python-requests/i
const TABLET_UA_RE = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i
const MOBILE_UA_RE =
  /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|wpdesktop/i

function toPhDateString(date: Date): string {
  return new Date(date.getTime() + PH_OFFSET_MS).toISOString().slice(0, 10)
}

export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false
  return BOT_UA_RE.test(userAgent)
}

export function classifyDeviceType(
  userAgent?: string | null,
): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop'
  if (TABLET_UA_RE.test(userAgent)) return 'tablet'
  if (MOBILE_UA_RE.test(userAgent)) return 'mobile'
  return 'desktop'
}

export function normalizePublicPath(rawPath?: string | null): string | null {
  if (typeof rawPath !== 'string') return null
  const withoutQuery = rawPath.split(/[?#]/)[0]?.trim() ?? ''
  if (!withoutQuery.startsWith('/')) return null
  if (
    withoutQuery.startsWith('/admin') ||
    withoutQuery.startsWith('/api') ||
    withoutQuery.startsWith('/_')
  ) {
    return null
  }
  const normalized =
    withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : '/'
  return normalized.slice(0, 200)
}

export function normalizeReferrerHost(
  rawReferrer?: string | null,
  currentHost?: string | null,
): string {
  if (!rawReferrer || typeof rawReferrer !== 'string') return 'Direct'
  try {
    const parsed = new URL(rawReferrer)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Direct'
    }
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    const ownHost = (currentHost ?? '')
      .split(':')[0]
      .replace(/^www\./i, '')
      .toLowerCase()
    if (!host || (ownHost && host === ownHost)) return 'Direct'
    return host.slice(0, 120)
  } catch {
    return 'Direct'
  }
}

export function normalizeCountryCode(
  vercelCountry?: string | null,
  cfCountry?: string | null,
): string {
  const raw = (vercelCountry || cfCountry || '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(raw) && raw !== 'XX' && raw !== 'T1') {
    return raw
  }
  return 'UNKNOWN'
}

export function formatCountryName(countryCode: string): string {
  if (!countryCode || countryCode === 'UNKNOWN') return 'Unknown / Local'
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return displayNames.of(countryCode) || countryCode
  } catch {
    return countryCode
  }
}

export function hashDailyVisitor(seed: string, phDate: string): string {
  return createHash('sha256')
    .update(`${phDate}:${seed}`)
    .digest('hex')
    .slice(0, 16)
}

export interface RecordPageViewInput {
  path: string
  referrer?: string
  visitorId?: string
}

export function validateRecordPageView(
  data: RecordPageViewInput,
): RecordPageViewInput {
  return {
    path: typeof data.path === 'string' ? data.path.slice(0, 240) : '',
    referrer:
      typeof data.referrer === 'string' ? data.referrer.slice(0, 500) : '',
    visitorId:
      typeof data.visitorId === 'string' ? data.visitorId.slice(0, 80) : '',
  }
}

export const recordPageViewHandler = createServerOnlyFn(
  async ({
    data,
    headersOverride,
  }: {
    data: RecordPageViewInput
    headersOverride?: Headers
  }): Promise<{ recorded: boolean }> => {
    const path = normalizePublicPath(data.path)
    if (!path) return { recorded: false }

    let headers: Headers
    if (headersOverride) {
      headers = headersOverride
    } else {
      const { getRequestHeaders } =
        await import('@tanstack/react-start/server')
      headers = getRequestHeaders()
    }

    const userAgent = headers.get('user-agent')
    if (isBotUserAgent(userAgent)) {
      return { recorded: false }
    }

    const country = normalizeCountryCode(
      headers.get('x-vercel-ip-country'),
      headers.get('cf-ipcountry'),
    )
    const rawCity = headers.get('x-vercel-ip-city')
    let city: string | null = null
    if (rawCity) {
      try {
        city = decodeURIComponent(rawCity).trim().slice(0, 80) || null
      } catch {
        city = rawCity.trim().slice(0, 80) || null
      }
    }

    const deviceType = classifyDeviceType(userAgent)
    const currentHost =
      headers.get('x-forwarded-host') || headers.get('host') || ''
    const referrer = normalizeReferrerHost(
      data.referrer || headers.get('referer'),
      currentHost,
    )

    const todayPh = toPhDateString(new Date())
    const forwardedFor =
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const seed =
      data.visitorId?.trim() ||
      `${forwardedFor}:${userAgent ?? 'anon'}` ||
      'anonymous'
    const visitorHash = hashDailyVisitor(seed, todayPh)

    try {
      await prisma.pageView.create({
        data: {
          path,
          visitorHash,
          country,
          city,
          deviceType,
          referrer,
        },
      })
      return { recorded: true }
    } catch (err) {
      console.warn('Failed to record analytics page view:', err)
      return { recorded: false }
    }
  },
)

export const recordPageView = createServerFn({ method: 'POST' })
  .validator(validateRecordPageView)
  .handler(async ({ data }) => recordPageViewHandler({ data }))

export const getAnalyticsReportHandler = createServerOnlyFn(
  async ({
    data,
  }: {
    data?: ReportDateRangeInput
  }): Promise<AnalyticsReportData> => {
    await requirePermission('view:reports')
    const range = resolveReportDateRange(data)

    let views: Array<{
      path: string
      visitorHash: string
      country: string
      deviceType: string
      referrer: string
      createdAt: Date
    }> = []

    try {
      views = await prisma.pageView.findMany({
        where: {
          createdAt: { gte: range.startDate, lte: range.endDate },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          path: true,
          visitorHash: true,
          country: true,
          deviceType: true,
          referrer: true,
          createdAt: true,
        },
      })
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code?: unknown }).code
          : undefined
      if (code === 'P2021') {
        console.warn(
          'Analytics page_view table not yet synced (run `pnpm db:push`).',
        )
      } else {
        throw err
      }
    }

    const totalViews = views.length
    const allVisitors = new Set<string>()
    const dailyMap = new Map<
      string,
      { views: number; visitors: Set<string> }
    >()
    const countryMap = new Map<
      string,
      { views: number; visitors: Set<string> }
    >()
    const pageMap = new Map<string, { views: number; visitors: Set<string> }>()
    const deviceMap = new Map<string, number>()
    const referrerMap = new Map<string, number>()

    for (const v of views) {
      allVisitors.add(v.visitorHash)

      const dayKey = toPhDateString(new Date(v.createdAt))
      const dayEntry = dailyMap.get(dayKey) ?? {
        views: 0,
        visitors: new Set<string>(),
      }
      dayEntry.views += 1
      dayEntry.visitors.add(v.visitorHash)
      dailyMap.set(dayKey, dayEntry)

      const countryCode = v.country || 'UNKNOWN'
      const countryEntry = countryMap.get(countryCode) ?? {
        views: 0,
        visitors: new Set<string>(),
      }
      countryEntry.views += 1
      countryEntry.visitors.add(v.visitorHash)
      countryMap.set(countryCode, countryEntry)

      const pageEntry = pageMap.get(v.path) ?? {
        views: 0,
        visitors: new Set<string>(),
      }
      pageEntry.views += 1
      pageEntry.visitors.add(v.visitorHash)
      pageMap.set(v.path, pageEntry)

      const device = v.deviceType || 'desktop'
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1)

      const ref = v.referrer || 'Direct'
      referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1)
    }

    const uniqueVisitors = allVisitors.size
    const avgViewsPerVisitor =
      uniqueVisitors > 0
        ? Math.round((totalViews / uniqueVisitors) * 10) / 10
        : 0

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        views: stats.views,
        visitors: stats.visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const byCountry = Array.from(countryMap.entries())
      .map(([countryCode, stats]) => ({
        countryCode,
        countryName: formatCountryName(countryCode),
        views: stats.views,
        visitors: stats.visitors.size,
        share:
          totalViews > 0 ? Math.round((stats.views / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15)

    const byPage = Array.from(pageMap.entries())
      .map(([path, stats]) => ({
        path,
        views: stats.views,
        visitors: stats.visitors.size,
        share:
          totalViews > 0 ? Math.round((stats.views / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15)

    const byDevice = Array.from(deviceMap.entries())
      .map(([deviceType, count]) => ({
        deviceType,
        count,
        share: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const byReferrer = Array.from(referrerMap.entries())
      .map(([referrer, count]) => ({
        referrer,
        count,
        share: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const mobileCount =
      (deviceMap.get('mobile') ?? 0) + (deviceMap.get('tablet') ?? 0)
    const mobileShare =
      totalViews > 0 ? Math.round((mobileCount / totalViews) * 100) : 0

    const topCountry = byCountry.length > 0 ? byCountry[0] : null
    const gaId = (
      (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ||
      process.env.VITE_GA_MEASUREMENT_ID ||
      ''
    ).trim()
    const gaConfigured = /^G-[A-Z0-9]+$/i.test(gaId)

    return {
      range: {
        from: range.from,
        to: range.to,
        preset: range.preset,
        dayCount: range.dayCount,
      },
      kpis: {
        totalViews,
        uniqueVisitors,
        topCountryName: topCountry ? topCountry.countryName : null,
        topCountryShare: topCountry ? topCountry.share : 0,
        mobileShare,
        avgViewsPerVisitor,
      },
      dailyTrend,
      byCountry,
      byPage,
      byDevice,
      byReferrer,
      integrations: {
        gaConfigured,
        vercelAnalyticsReady: true,
      },
    }
  },
)

export const getAnalyticsReport = createServerFn({ method: 'GET' })
  .validator(validateReportInput)
  .handler(getAnalyticsReportHandler)
