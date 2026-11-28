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

  it('preserves unsupported country codes and avoids re-prefixing over-long international numbers', () => {
    // Unsupported country codes (+91 India, +55 Brazil, 0034 Spain) keep exact international digits
    expect(normalizePhoneForStorage('+91 98765 43210')).toBe('919876543210')
    expect(normalizePhoneForStorage('919876543210')).toBe('919876543210')
    expect(normalizePhoneForStorage('+55 11 98765-4321')).toBe('5511987654321')
    expect(normalizePhoneForStorage('0034 612 345 678')).toBe('34612345678')
    expect(formatPhoneDisplay('919876543210')).toBe('+919876543210')

    // Over-long Singapore input caps subscriber input at 8 digits and never re-prefixes with 63
    expect(composeStoredPhone('SG', '8123456799')).toBe('6581234567')
    expect(normalizePhoneForStorage(composeStoredPhone('SG', '8123456799'))).toBe(
      '6581234567',
    )
    expect(normalizePhoneForStorage('+65 8123 4567 99')).toBe('658123456799')
    expect(normalizePhoneForStorage('658123456799')).toBe('658123456799')
    expect(phonesMatch('+91 98765 43210', '919876543210')).toBe(true)
  })
})
