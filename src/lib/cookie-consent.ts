export const COOKIE_CONSENT_STORAGE_KEY = 'jwh_cookie_consent_v1'
export const COOKIE_CONSENT_EVENT = 'jwh:cookie-consent-updated'

export interface CookieConsentPreferences {
  necessary: true
  functional: boolean
  performance: boolean
  targeting: boolean
  updatedAt: string
}

export type EditableCookieCategories = Pick<
  CookieConsentPreferences,
  'functional' | 'performance' | 'targeting'
>

export const DEFAULT_EDITABLE_COOKIE_CATEGORIES: EditableCookieCategories = {
  functional: true,
  performance: true,
  targeting: false,
}

export const ACCEPT_ALL_COOKIE_CATEGORIES: EditableCookieCategories = {
  functional: true,
  performance: true,
  targeting: true,
}

export const NECESSARY_ONLY_COOKIE_CATEGORIES: EditableCookieCategories = {
  functional: false,
  performance: false,
  targeting: false,
}

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    const obj = parsed as Record<string, unknown>
    if (
      typeof obj.functional !== 'boolean' ||
      typeof obj.performance !== 'boolean' ||
      typeof obj.targeting !== 'boolean'
    ) {
      return null
    }
    return {
      necessary: true,
      functional: obj.functional,
      performance: obj.performance,
      targeting: obj.targeting,
      updatedAt:
        typeof obj.updatedAt === 'string' && obj.updatedAt
          ? obj.updatedAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveCookieConsent(
  categories: EditableCookieCategories,
): CookieConsentPreferences {
  const saved: CookieConsentPreferences = {
    necessary: true,
    functional: Boolean(categories.functional),
    performance: Boolean(categories.performance),
    targeting: Boolean(categories.targeting),
    updatedAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify(saved),
      )
      if (typeof document !== 'undefined') {
        const mode =
          saved.functional && saved.performance && saved.targeting
            ? 'all'
            : !saved.functional && !saved.performance && !saved.targeting
              ? 'necessary'
              : 'custom'
        document.cookie = `jwh_consent=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`
      }
      window.dispatchEvent(
        new CustomEvent<CookieConsentPreferences>(COOKIE_CONSENT_EVENT, {
          detail: saved,
        }),
      )
    } catch {
      // Ignore storage quota / private browsing errors
    }
  }

  return saved
}
