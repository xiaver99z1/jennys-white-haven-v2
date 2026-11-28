import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
} from '#/lib/constants/phone-countries'
import type {
  PhoneCountryIso,
  PhoneCountryOption,
} from '#/lib/constants/phone-countries'

export { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES }
export type { PhoneCountryIso, PhoneCountryOption }

const COUNTRY_BY_ISO = new Map<PhoneCountryIso, PhoneCountryOption>(
  PHONE_COUNTRIES.map((item) => [item.iso, item]),
)

// Sort by dialDigits length descending so 3-digit codes (e.g. 852, 886, 971) match before 1- or 2-digit codes.
const COUNTRIES_BY_DIAL_LENGTH: readonly PhoneCountryOption[] = [
  ...PHONE_COUNTRIES,
].sort((a, b) => b.dialDigits.length - a.dialDigits.length)

export function isSupportedPhoneCountry(
  value: unknown,
): value is PhoneCountryIso {
  return (
    typeof value === 'string' && COUNTRY_BY_ISO.has(value as PhoneCountryIso)
  )
}

export function getPhoneCountryOption(
  iso: PhoneCountryIso = DEFAULT_PHONE_COUNTRY,
): PhoneCountryOption {
  return COUNTRY_BY_ISO.get(iso) ?? PHONE_COUNTRIES[0]
}

export function sanitizeNationalDigits(
  raw: string,
  country: PhoneCountryOption,
): string {
  let digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (country.stripLeadingZero) {
    digits = digits.replace(/^0+/, '')
  }
  const maxAllowed = Math.max(country.maxNationalDigits, 12)
  return digits.slice(0, maxAllowed)
}

/**
 * Combines a selected country's dial digits and subscriber number into digits-only E.164 storage format
 * (e.g. PH + "9568198715" -> "639568198715"). Returns "" when no subscriber digits are present.
 */
export function composeStoredPhone(
  countryIso: PhoneCountryIso,
  nationalInput: string,
): string {
  const country = getPhoneCountryOption(countryIso)
  const nationalDigits = sanitizeNationalDigits(nationalInput, country)
  if (!nationalDigits) return ''
  return `${country.dialDigits}${nationalDigits}`
}

/**
 * Parses a stored or typed phone string (e.g. "639568198715", "+63 956 819 8715", "09568198715", "+82 10-1234-5678")
 * into its country ISO code and national subscriber digits.
 */
export function parseStoredPhone(
  rawPhone?: string | null,
  fallbackIso: PhoneCountryIso = DEFAULT_PHONE_COUNTRY,
): { countryIso: PhoneCountryIso; nationalNumber: string } {
  const trimmed = (rawPhone ?? '').trim()
  if (!trimmed) {
    return { countryIso: fallbackIso, nationalNumber: '' }
  }

  const hasExplicitIntlPrefix =
    trimmed.startsWith('+') || trimmed.startsWith('00')
  let digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    return { countryIso: fallbackIso, nationalNumber: '' }
  }

  if (trimmed.startsWith('00') && digits.length > 2) {
    digits = digits.slice(2)
  }

  // Local trunk-prefixed input without '+' (e.g. "09568198715") belongs to fallbackIso
  if (!hasExplicitIntlPrefix && digits.startsWith('0')) {
    const fallbackCountry = getPhoneCountryOption(fallbackIso)
    return {
      countryIso: fallbackIso,
      nationalNumber: sanitizeNationalDigits(digits, fallbackCountry),
    }
  }

  for (const option of COUNTRIES_BY_DIAL_LENGTH) {
    if (!digits.startsWith(option.dialDigits)) continue
    const rawRest = digits.slice(option.dialDigits.length)
    const normalizedRest = option.stripLeadingZero
      ? rawRest.replace(/^0+/, '')
      : rawRest

    if (hasExplicitIntlPrefix) {
      return {
        countryIso: option.iso,
        nationalNumber: sanitizeNationalDigits(normalizedRest, option),
      }
    }

    if (
      normalizedRest.length >= option.minNationalDigits &&
      normalizedRest.length <= option.maxNationalDigits + 2
    ) {
      return {
        countryIso: option.iso,
        nationalNumber: sanitizeNationalDigits(normalizedRest, option),
      }
    }
  }

  const fallbackCountry = getPhoneCountryOption(fallbackIso)
  return {
    countryIso: fallbackIso,
    nationalNumber: sanitizeNationalDigits(digits, fallbackCountry),
  }
}

/**
 * Normalizes any raw phone string into digits-only international storage format (e.g. "639568198715").
 */
export function normalizePhoneForStorage(
  rawPhone?: string | null,
  fallbackIso: PhoneCountryIso = DEFAULT_PHONE_COUNTRY,
): string {
  const parsed = parseStoredPhone(rawPhone, fallbackIso)
  return composeStoredPhone(parsed.countryIso, parsed.nationalNumber)
}

/**
 * Formats a stored digits-only phone string into a readable international display string (e.g. "+63 9568198715").
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  const trimmed = (rawPhone ?? '').trim()
  if (!trimmed) return ''
  const parsed = parseStoredPhone(trimmed)
  if (!parsed.nationalNumber) return trimmed
  const country = getPhoneCountryOption(parsed.countryIso)
  return `${country.dialCode} ${parsed.nationalNumber}`
}

/**
 * Compares a stored guest phone number with a lookup input regardless of whether the guest entered
 * "+63 956 819 8715", "639568198715", "09568198715", or "9568198715".
 */
export function phonesMatch(
  storedPhone?: string | null,
  candidateInput?: string | null,
): boolean {
  const leftRaw = (storedPhone ?? '').trim()
  const rightRaw = (candidateInput ?? '').trim()
  if (!leftRaw || !rightRaw || rightRaw.includes('@')) return false
  if (leftRaw.toLowerCase() === rightRaw.toLowerCase()) return true

  const candidateDigits = rightRaw.replace(/\D/g, '')
  if (candidateDigits.length < 7) return false

  const storedParsed = parseStoredPhone(leftRaw)
  const storedNormalized = composeStoredPhone(
    storedParsed.countryIso,
    storedParsed.nationalNumber,
  )
  if (!storedNormalized) return false

  // Compare using the stored phone's country as default so local subscriber/trunk inputs match international guests too
  const candidateNormalizedForStoredCountry = normalizePhoneForStorage(
    rightRaw,
    storedParsed.countryIso,
  )
  const candidateNormalizedDefault = normalizePhoneForStorage(rightRaw)

  return (
    storedNormalized === candidateNormalizedForStoredCountry ||
    storedNormalized === candidateNormalizedDefault
  )
}
