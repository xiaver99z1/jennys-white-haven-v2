import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '#/lib/cookie-consent'
import type { CookieConsentPreferences } from '#/lib/cookie-consent'
import { recordPageView } from '#/server/analytics-actions'

const VISITOR_SESSION_KEY = 'jwh_analytics_visitor_id'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    [key: `ga-disable-${string}`]: boolean | undefined
  }
}

function getOrCreateSessionVisitorId(): string {
  if (typeof window === 'undefined') return 'anon'
  try {
    const existing = window.sessionStorage.getItem(VISITOR_SESSION_KEY)
    if (existing) return existing
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.sessionStorage.setItem(VISITOR_SESSION_KEY, created)
    return created
  } catch {
    return 'anon'
  }
}

function getGaMeasurementId(): string {
  const id = (
    import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  )?.trim()
  return id && /^G-[A-Z0-9]+$/i.test(id) ? id : ''
}

function ensureGaScriptLoaded(measurementId: string) {
  if (typeof document === 'undefined' || !measurementId) return
  window[`ga-disable-${measurementId}`] = false
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-jwh-ga="${measurementId}"]`,
  )
  if (!existing) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    script.dataset.jwhGa = measurementId
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    })
  }
}

export function AnalyticsTracker() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [hasPerformanceConsent, setHasPerformanceConsent] = useState(false)
  const lastTrackedPathRef = useRef<string | null>(null)
  const gaMeasurementId = getGaMeasurementId()

  useEffect(() => {
    const syncConsent = (prefs: CookieConsentPreferences | null) => {
      const allowed = Boolean(prefs?.performance)
      setHasPerformanceConsent(allowed)
      if (!allowed && gaMeasurementId && typeof window !== 'undefined') {
        window[`ga-disable-${gaMeasurementId}`] = true
      }
    }

    syncConsent(readCookieConsent())

    const handleConsentUpdate = (event: Event) => {
      const detail = (
        event as CustomEvent<CookieConsentPreferences | undefined>
      ).detail
      syncConsent(detail ?? readCookieConsent())
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentUpdate)
    return () =>
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentUpdate)
  }, [gaMeasurementId])

  useEffect(() => {
    if (!hasPerformanceConsent) {
      lastTrackedPathRef.current = null
      return
    }
    if (!pathname || pathname.startsWith('/admin')) return
    if (lastTrackedPathRef.current === pathname) return
    lastTrackedPathRef.current = pathname

    const visitorId = getOrCreateSessionVisitorId()
    void recordPageView({
      data: {
        path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        visitorId,
      },
    }).catch(() => {
      // Never surface analytics network errors to guests
    })

    if (gaMeasurementId) {
      ensureGaScriptLoaded(gaMeasurementId)
      window.gtag?.('event', 'page_view', {
        page_path: pathname,
        page_title: typeof document !== 'undefined' ? document.title : '',
      })
    }
  }, [hasPerformanceConsent, pathname, gaMeasurementId])

  // Render Vercel Web Analytics only when the guest has granted Performance Cookies consent
  if (!hasPerformanceConsent) return null
  return <VercelAnalytics />
}
