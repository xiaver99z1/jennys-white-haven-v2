import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ACCEPT_ALL_COOKIE_CATEGORIES,
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  NECESSARY_ONLY_COOKIE_CATEGORIES,
  readCookieConsent,
  saveCookieConsent,
} from './cookie-consent'

describe('cookie-consent helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when no consent is stored or when stored JSON is malformed', () => {
    expect(readCookieConsent()).toBeNull()

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'not-json')
    expect(readCookieConsent()).toBeNull()

    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ functional: 'yes' }),
    )
    expect(readCookieConsent()).toBeNull()
  })

  it('saves, reads, and dispatches consent preferences', () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)

    const saved = saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    expect(saved).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: true,
        performance: true,
        targeting: true,
      }),
    )
    expect(readCookieConsent()).toEqual(saved)
    expect(listener).toHaveBeenCalledTimes(1)

    const essential = saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    expect(essential.functional).toBe(false)
    expect(essential.performance).toBe(false)
    expect(essential.targeting).toBe(false)
    expect(readCookieConsent()).toEqual(essential)

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })
})
