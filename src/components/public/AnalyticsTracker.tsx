import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import type { BeforeSendEvent } from '@vercel/analytics/react'
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

function pushToDataLayer() {
  // gtag.js requires the native Arguments object rather than a plain Array
  window.dataLayer?.push(arguments)
}

function ensureGaScriptLoaded(measurementId: string) {
  if (typeof document === 'undefined' || !measurementId) return
  window[`ga-disable-${measurementId}`] = false
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-jwh-ga="${measurementId}"]`,
  )
  if (!existing) {
    window.dataLayer = window.dataLayer || []
    window.gtag = pushToDataLayer
    window.gtag('js', new Date())
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
    })
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    script.dataset.jwhGa = measurementId
    document.head.appendChild(script)
  } else {
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted',
    })
  }
}

export function filterVercelAnalyticsEvent(
  event: BeforeSendEvent,
): BeforeSendEvent | null {
  if (!readCookieConsent()?.performance) return null
  try {
    const parsed = new URL(event.url)
    if (parsed.pathname.startsWith('/admin')) return null
  } catch {
    // Allow non-URL paths if consent is active
  }
  return event
}

export function AnalyticsTracker() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [hasPerformanceConsent, setHasPerformanceConsent] = useState(false)
  const lastTrackedPathRef = useRef<string | null>(null)
  const hasSentInitialReferrerRef = useRef(false)
  const gaMeasurementId = getGaMeasurementId()

  useEffect(() => {
    const syncConsent = (prefs: CookieConsentPreferences | null) => {
      const allowed = Boolean(prefs?.performance)
      setHasPerformanceConsent(allowed)
      if (typeof window !== 'undefined') {
        if (!allowed) {
          // Immediately block any already-loaded Vercel Analytics script
          window.va?.('beforeSend', () => null)
          if (gaMeasurementId) {
            window[`ga-disable-${gaMeasurementId}`] = true
            window.gtag?.('consent', 'update', {
              analytics_storage: 'denied',
            })
          }
        } else {
          window.va?.('beforeSend', filterVercelAnalyticsEvent)
          if (gaMeasurementId) {
            window[`ga-disable-${gaMeasurementId}`] = false
          }
        }
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

    const referrer =
      !hasSentInitialReferrerRef.current && typeof document !== 'undefined'
        ? document.referrer
        : ''
    hasSentInitialReferrerRef.current = true

    const visitorId = getOrCreateSessionVisitorId()
    void recordPageView({
      data: {
        path: pathname,
        referrer,
        visitorId,
      },
    }).catch(() => {
      // Never surface analytics network errors to guests
    })

    if (gaMeasurementId) {
      ensureGaScriptLoaded(gaMeasurementId)
      window.gtag?.('event', 'page_view', {
        page_path: pathname,
        page_location:
          typeof window !== 'undefined' ? window.location.href : undefined,
        page_title: typeof document !== 'undefined' ? document.title : '',
      })
    }
  }, [hasPerformanceConsent, pathname, gaMeasurementId])

  // Render Vercel Web Analytics only when the guest has granted Performance Cookies consent
  if (!hasPerformanceConsent) return null
  return <VercelAnalytics beforeSend={filterVercelAnalyticsEvent} />
}
