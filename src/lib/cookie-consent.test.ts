import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

  afterEach(() => {
    vi.restoreAllMocks()
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

    const result = saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    expect(result.persisted).toBe(true)
    expect(result.preferences).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: true,
        performance: true,
        targeting: true,
      }),
    )
    expect(readCookieConsent()).toEqual(result.preferences)
    expect(listener).toHaveBeenCalledTimes(1)

    const essential = saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    expect(essential.persisted).toBe(true)
    expect(essential.preferences.functional).toBe(false)
    expect(essential.preferences.performance).toBe(false)
    expect(essential.preferences.targeting).toBe(false)
    expect(readCookieConsent()).toEqual(essential.preferences)

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })

  it('fails closed and clears prior broader consent when browser storage throws', () => {
    saveCookieConsent(ACCEPT_ALL_COOKIE_CATEGORIES)
    expect(readCookieConsent()?.targeting).toBe(true)

    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })

    const failed = saveCookieConsent(NECESSARY_ONLY_COOKIE_CATEGORIES)
    expect(failed.persisted).toBe(false)
    expect(failed.preferences).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: false,
        performance: false,
        targeting: false,
      }),
    )
    // Prior broader consent was cleared instead of remaining active
    expect(readCookieConsent()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })
})
