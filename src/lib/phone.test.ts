import { describe, expect, it } from 'vitest'
import {
  composeStoredPhone,
  formatPhoneDisplay,
  getPhoneCountryOption,
  isSupportedPhoneCountry,
  normalizePhoneForStorage,
  parseStoredPhone,
  phonesMatch,
} from './phone'

describe('phone utilities', () => {
  it('composes and normalizes international phone numbers to digits-only format', () => {
    expect(composeStoredPhone('PH', '9568198715')).toBe('639568198715')
    expect(composeStoredPhone('PH', '0956 819 8715')).toBe('639568198715')
    expect(composeStoredPhone('PH', '')).toBe('')

    expect(normalizePhoneForStorage('+63 956 819 8715')).toBe('639568198715')
    expect(normalizePhoneForStorage('09568198715')).toBe('639568198715')
    expect(normalizePhoneForStorage('639568198715')).toBe('639568198715')
    expect(normalizePhoneForStorage('+82 010-1234-5678')).toBe('821012345678')
    expect(normalizePhoneForStorage('+81 090-1234-5678')).toBe('819012345678')
    expect(normalizePhoneForStorage('+44 07700 900123')).toBe('447700900123')
    expect(normalizePhoneForStorage('+1 (415) 555-0198')).toBe('14155550198')
    expect(normalizePhoneForStorage('')).toBe('')
  })

  it('parses stored digits-only and formatted numbers back to country ISO and subscriber digits', () => {
    expect(parseStoredPhone('639568198715')).toEqual({
      countryIso: 'PH',
      nationalNumber: '9568198715',
    })
    expect(parseStoredPhone('821012345678')).toEqual({
      countryIso: 'KR',
      nationalNumber: '1012345678',
    })
    expect(parseStoredPhone('00447700900123')).toEqual({
      countryIso: 'GB',
      nationalNumber: '7700900123',
    })
    expect(parseStoredPhone('')).toEqual({
      countryIso: 'PH',
      nationalNumber: '',
    })
    expect(isSupportedPhoneCountry('KR')).toBe(true)
    expect(isSupportedPhoneCountry('ZZ')).toBe(false)
    expect(getPhoneCountryOption('JP').dialCode).toBe('+81')
    expect(formatPhoneDisplay('639568198715')).toBe('+63 9568198715')
    expect(formatPhoneDisplay('')).toBe('')
  })

  it('matches stored phone numbers against local, international, and trunk-prefixed guest lookups', () => {
    expect(phonesMatch('639568198715', '639568198715')).toBe(true)
    expect(phonesMatch('639568198715', '+63 956 819 8715')).toBe(true)
    expect(phonesMatch('639568198715', '09568198715')).toBe(true)
    expect(phonesMatch('639568198715', '9568198715')).toBe(true)
    expect(phonesMatch('821012345678', '010-1234-5678')).toBe(true)
    expect(phonesMatch('639568198715', 'guest@email.com')).toBe(false)
    expect(phonesMatch('639568198715', '123')).toBe(false)
    expect(phonesMatch('639568198715', '639999999999')).toBe(false)
  })
})
