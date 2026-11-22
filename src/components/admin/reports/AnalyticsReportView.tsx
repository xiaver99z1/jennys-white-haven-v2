import {
  CheckCircle2,
  Eye,
  Globe,
  Link2,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react'
import { StatCard } from '#/components/common/StatCard'
import { Panel } from '#/components/common/Panel'
import { EmptyState } from '#/components/common/EmptyState'
import { ReportToolbar } from '#/components/admin/reports/ReportToolbar'
import { downloadCsv } from '#/lib/csv'
import type { AnalyticsReportData, ReportPreset } from '#/types'

interface AnalyticsReportViewProps {
  data: AnalyticsReportData
  onRangeChange: (next: {
    preset: ReportPreset
    from?: string
    to?: string
  }) => void
}

function formatPageLabel(path: string): string {
  if (path === '/') return 'Home Page (/)'
  if (path === '/rooms') return 'Rooms & Rates (/rooms)'
  if (path === '/explore') return 'Explore Camotes (/explore)'
  if (path === '/booking-status') return 'Booking Status (/booking-status)'
  if (path.startsWith('/rooms/')) return `Room Details (${path})`
  return path
}

function DeviceIcon({ deviceType }: { deviceType: string }) {
  if (deviceType === 'mobile') {
    return <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
  }
  if (deviceType === 'tablet') {
    return <Tablet className="w-4 h-4 text-sky-700 shrink-0" />
  }
  return <Monitor className="w-4 h-4 text-stone-600 shrink-0" />
}

export function AnalyticsReportView({
  data,
  onRangeChange,
}: AnalyticsReportViewProps) {
  const {
    range,
    kpis,
    dailyTrend,
    byCountry,
    byPage,
    byDevice,
    byReferrer,
    integrations,
  } = data

  const maxDailyViews = Math.max(1, ...dailyTrend.map((d) => d.views))

  const handleExportCsv = () => {
    downloadCsv(
      `website-analytics-${range.from}-to-${range.to}`,
      ['Country', 'Country Code', 'Page Views', 'Unique Visitors', 'Share (%)'],
      byCountry.map((c) => [
        c.countryName,
        c.countryCode,
        c.views,
        c.visitors,
        c.share,
      ]),
    )
  }

  return (
    <div className="space-y-6">
      <ReportToolbar
        title="Website Visitor Analytics"
        subtitle="Consent-gated traffic overview: visitors by country, popular pages, devices, and referral sources"
        range={range}
        onRangeChange={onRangeChange}
        onExportCsv={handleExportCsv}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Page Views"
          value={String(kpis.totalViews)}
          hint={`${kpis.avgViewsPerVisitor} avg pages / visitor`}
          icon={<Eye className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="Unique Visitors"
          value={String(kpis.uniqueVisitors)}
          hint="Anonymous daily visitors"
          icon={<Users className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Top Country"
          value={kpis.topCountryName || 'No data yet'}
          hint={
            kpis.topCountryName
              ? `${kpis.topCountryShare}% of visits`
              : 'Detected automatically via Vercel'
          }
          icon={<Globe className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="Mobile & Tablet"
          value={`${kpis.mobileShare}%`}
          hint="Share of visits on phones & tablets"
          icon={<Smartphone className="w-5 h-5" />}
          accent="bg-stone-100 text-stone-700 border-stone-200"
        />
      </div>

      {/* Daily Traffic Trend Chart */}
      <section className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Daily Visits Trend
            </h2>
            <p className="text-[11px] text-stone-500">
              Page views and unique visitors per day ({range.from} to {range.to})
            </p>
          </div>
          <span className="text-[11px] font-medium text-stone-500">
            {dailyTrend.length} active {dailyTrend.length === 1 ? 'day' : 'days'}
          </span>
        </div>

        {dailyTrend.length === 0 ? (
          <div className="py-6">
            <EmptyState message="No visitor traffic recorded in this date range yet. Visits are recorded automatically when guests accept Performance Cookies." />
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[420px] flex items-end gap-2 h-40 pt-4">
              {dailyTrend.map((day) => {
                const heightPct = Math.max(
                  8,
                  Math.round((day.views / maxDailyViews) * 100),
                )
                return (
                  <div
                    key={day.date}
                    className="flex-1 min-w-[28px] flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[10px] font-semibold text-stone-600">
                      {day.views}
                    </span>
                    <div
                      title={`${day.date}: ${day.views} views, ${day.visitors} visitors`}
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[36px] rounded-t-lg bg-stone-900 hover:bg-amber-800 transition-colors"
                    />
                    <span className="text-[10px] text-stone-400 whitespace-nowrap">
                      {day.date.slice(5)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Visitors by Country & Most Viewed Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Visitors by Country" count={byCountry.length}>
          {byCountry.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No country data yet. Countries are automatically detected on your live Vercel deployment." />
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {byCountry.map((item) => (
                <div key={item.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800">
                      {item.countryName}
                      {item.countryCode !== 'UNKNOWN' && (
                        <span className="ml-1.5 text-[10px] font-medium text-stone-400 uppercase">
                          {item.countryCode}
                        </span>
                      )}
                    </span>
                    <span className="text-stone-600 font-medium">
                      {item.visitors}{' '}
                      {item.visitors === 1 ? 'visitor' : 'visitors'} ·{' '}
                      <strong>{item.views}</strong> views ({item.share}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, item.share)}%` }}
                      className="h-full rounded-full bg-amber-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Most Viewed Pages" count={byPage.length}>
          {byPage.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No page view records yet." />
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {byPage.map((page) => (
                <div key={page.path} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-stone-800 truncate">
                      {formatPageLabel(page.path)}
                    </span>
                    <span className="text-stone-600 shrink-0 font-medium">
                      <strong>{page.views}</strong> views ({page.share}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, page.share)}%` }}
                      className="h-full rounded-full bg-stone-800"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Devices & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Devices" count={byDevice.length}>
          {byDevice.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No device breakdown recorded yet." />
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {byDevice.map((item) => (
                <div
                  key={item.deviceType}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-2 font-medium text-stone-800 capitalize">
                    <DeviceIcon deviceType={item.deviceType} />
                    {item.deviceType}
                  </span>
                  <span className="font-semibold text-stone-600">
                    {item.count} ({item.share}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Traffic Sources / Referrers" count={byReferrer.length}>
          {byReferrer.length === 0 ? (
            <div className="py-6">
              <EmptyState message="No referrer data recorded yet." />
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {byReferrer.map((item) => (
                <div
                  key={item.referrer}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-2 font-medium text-stone-800 truncate">
                    <Link2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    {item.referrer}
                  </span>
                  <span className="font-semibold text-stone-600 shrink-0">
                    {item.count} ({item.share}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Connected Analytics Integrations Status */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-bold text-stone-900">
          Connected Analytics Integrations (Consent-Gated)
        </h2>
        <p className="text-xs text-stone-500">
          All analytics trackers automatically obey your public Cookie
          Preferences Center and only run when guests allow{' '}
          <strong>Performance Cookies</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Built-in Admin Analytics
            </div>
            <p className="text-[11px] text-emerald-800/90">
              Active — stores privacy-safe anonymous page views &amp; Vercel
              country headers in your database.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Vercel Web Analytics
            </div>
            <p className="text-[11px] text-emerald-800/90">
              {integrations.vercelAnalyticsReady
                ? 'Wired & consent-gated — toggle Analytics ON in your Vercel project dashboard to view there too.'
                : 'Not installed.'}
            </p>
          </div>

          <div
            className={`rounded-xl border p-3.5 space-y-1 ${
              integrations.gaConfigured
                ? 'border-emerald-200 bg-emerald-50/50'
                : 'border-stone-200 bg-stone-50'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                integrations.gaConfigured
                  ? 'text-emerald-900'
                  : 'text-stone-700'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 ${
                  integrations.gaConfigured
                    ? 'text-emerald-700'
                    : 'text-stone-400'
                }`}
              />
              Google Analytics 4 (GA4)
            </div>
            <p className="text-[11px] text-stone-600">
              {integrations.gaConfigured
                ? 'Connected via VITE_GA_MEASUREMENT_ID.'
                : 'Optional — add VITE_GA_MEASUREMENT_ID (G-XXXX) in Vercel Environment Variables to enable.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
