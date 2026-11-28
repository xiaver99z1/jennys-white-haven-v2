import { EMAIL_REGEX, FULL_NAME_MAX_LENGTH, FULL_NAME_MIN_LENGTH } from '#/lib/constants/auth'
import { isValidCalendarDate } from '#/lib/formatters'
import {
  getPhoneCountryOption,
  parseStoredPhone,
  sanitizeNationalDigits,
} from '#/lib/phone'

export interface FieldValidationMessages {
  required: (field: string) => string
  nameNoNumbers: (field: string) => string
  nameInvalidChars: (field: string) => string
  nameLength: (field: string, min: number, max: number) => string
  invalidEmail: string
  phoneRequired: string
  phoneInvalidLength: (countryName: string, dialCode: string, min: number, max: number) => string
  phoneIntlInvalidLength: string
  maxLengthExceeded: (field: string, max: number) => string
  minLengthRequired: (field: string, min: number) => string
  invalidBookingReference: string
  invalidLookupContact: string
  invalidNationality: string
  idTypeRequiredForNumber: string
  invalidIdNumber: string
  invalidLocation: string
}

export const DEFAULT_VALIDATION_MESSAGES: FieldValidationMessages = {
  required: (field) => `${field} is required.`,
  nameNoNumbers: (field) => `${field} cannot contain numbers.`,
  nameInvalidChars: (field) =>
    `${field} can only contain letters, spaces, hyphens, and apostrophes.`,
  nameLength: (field, min, max) =>
    `${field} must be between ${min} and ${max} characters.`,
  invalidEmail: 'Please enter a valid email address.',
  phoneRequired: 'Phone number is required.',
  phoneInvalidLength: (countryName, dialCode, min, max) =>
    min === max
      ? `Please enter a valid ${countryName} (${dialCode}) phone number (${min} digits).`
      : `Please enter a valid ${countryName} (${dialCode}) phone number (${min}–${max} digits).`,
  phoneIntlInvalidLength:
    'Please enter a valid international phone number (7–15 digits including country code).',
  maxLengthExceeded: (field, max) =>
    `${field} must be ${max} characters or fewer.`,
  minLengthRequired: (field, min) =>
    `${field} must be at least ${min} characters.`,
  invalidBookingReference:
    'Booking reference should look like JWH-20261128-XXXX (letters, numbers, and hyphens only).',
  invalidLookupContact:
    'Enter the registered email address or phone number used when booking.',
  invalidNationality:
    'Nationality must be 2–60 letters without numbers or special symbols.',
  idTypeRequiredForNumber: 'Please select an ID type for the ID number.',
  invalidIdNumber:
    'ID number must be 2–40 alphanumeric characters (letters, numbers, spaces, hyphens, or slashes).',
  invalidLocation:
    'Location must be 2–80 characters and cannot include HTML or special symbols.',
}

const DIGIT_REGEX = /\p{N}/u
const NAME_ALLOWED_REGEX = /^[\p{L}\p{M}\s.'’-]+$/u
const NAME_LETTER_REGEX = /[\p{L}]/u
const CONSECUTIVE_PUNCT_REGEX = /[.'’-]{2,}/u
const CJK_OR_HANGUL_REGEX = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u
const NATIONALITY_ALLOWED_REGEX = /^[\p{L}\p{M}\s./'-]+$/u
const BOOKING_REF_REGEX = /^[A-Za-z0-9][A-Za-z0-9-]{3,29}$/
const ID_NUMBER_ALLOWED_REGEX = /^[A-Za-z0-9\s./-]{2,40}$/
const ROOM_NUMBER_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]{0,19}$/
const DISALLOWED_ANGLE_REGEX = /[<>]/

function isSingleMailboxValue(value: string): boolean {
  return !value.includes(',') && !value.includes(';')
}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      return true
    }
  }
  return false
}

export interface ValidatePersonNameOptions {
  label?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  messages?: FieldValidationMessages
}

/**
 * Validates a human name (Full Name, First Name, Last Name) with Unicode support.
 * Rejects numbers/digits, HTML/special symbols, and delimiter-only values.
 */
export function validatePersonName(
  rawValue: string | undefined | null,
  options: ValidatePersonNameOptions = {},
): string | null {
  const {
    label = 'Name',
    required = true,
    minLength = FULL_NAME_MIN_LENGTH,
    maxLength = FULL_NAME_MAX_LENGTH,
    messages = DEFAULT_VALIDATION_MESSAGES,
  } = options

  const trimmed = (rawValue ?? '').replace(/\s+/g, ' ').trim()
  if (!trimmed) {
    return required ? messages.required(label) : null
  }

  if (DIGIT_REGEX.test(trimmed)) {
    return messages.nameNoNumbers(label)
  }

  if (
    !NAME_ALLOWED_REGEX.test(trimmed) ||
    !NAME_LETTER_REGEX.test(trimmed) ||
    CONSECUTIVE_PUNCT_REGEX.test(trimmed)
  ) {
    return messages.nameInvalidChars(label)
  }

  // Allow 1-character Korean/Japanese/Chinese family or given names (e.g. 김, 李),
  // while keeping minLength (default 2) for Latin script names.
  const effectiveMin = CJK_OR_HANGUL_REGEX.test(trimmed)
    ? Math.min(1, minLength)
    : minLength

  if (trimmed.length < effectiveMin || trimmed.length > maxLength) {
    return messages.nameLength(label, minLength, maxLength)
  }

  return null
}

/**
 * Validates a human name during typing: shows errors immediately when digits or
 * invalid symbols are typed, and clears/refreshes any existing error live.
 */
export function validatePersonNameLive(
  rawValue: string,
  existingError: string | null | undefined,
  options: ValidatePersonNameOptions = {},
): string | null {
  const hasBadChars =
    DIGIT_REGEX.test(rawValue) ||
    (rawValue.trim().length > 0 && !NAME_ALLOWED_REGEX.test(rawValue))
  if (hasBadChars) {
    return validatePersonName(rawValue, options)
  }
  if (!existingError) {
    return null
  }
  if (!rawValue.trim()) {
    return null
  }
  return validatePersonName(rawValue, options)
}

/**
 * Validates an email address (required or optional, single mailbox only, RFC length capped at 254).
 */
export function validateEmailField(
  rawValue: string | undefined | null,
  options: {
    label?: string
    required?: boolean
    messages?: FieldValidationMessages
  } = {},
): string | null {
  const {
    label = 'Email address',
    required = false,
    messages = DEFAULT_VALIDATION_MESSAGES,
  } = options

  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) {
    return required ? messages.required(label) : null
  }

  if (
    trimmed.length > 254 ||
    !EMAIL_REGEX.test(trimmed) ||
    !isSingleMailboxValue(trimmed)
  ) {
    return messages.invalidEmail
  }

  return null
}

/**
 * Validates a country-composed or raw phone number against country subscriber digit bounds.
 */
export function validatePhoneField(
  rawValue: string | undefined | null,
  options: {
    required?: boolean
    messages?: FieldValidationMessages
  } = {},
): string | null {
  const { required = true, messages = DEFAULT_VALIDATION_MESSAGES } = options
  const trimmed = (rawValue ?? '').trim()

  if (!trimmed) {
    return required ? messages.phoneRequired : null
  }

  const parsed = parseStoredPhone(trimmed)
  const country = getPhoneCountryOption(parsed.countryIso)
  const nationalDigits = sanitizeNationalDigits(parsed.nationalNumber, country)

  if (!nationalDigits) {
    return messages.phoneRequired
  }

  if (country.iso === 'INTL') {
    if (
      nationalDigits.length < country.minNationalDigits ||
      nationalDigits.length > country.maxNationalDigits
    ) {
      return messages.phoneIntlInvalidLength
    }
    return null
  }

  if (
    nationalDigits.length < country.minNationalDigits ||
    nationalDigits.length > country.maxNationalDigits
  ) {
    return messages.phoneInvalidLength(
      country.name,
      country.dialCode,
      country.minNationalDigits,
      country.maxNationalDigits,
    )
  }

  return null
}

/**
 * Validates guest nationality (optional; letters, spaces, hyphens, periods, slashes only).
 */
export function validateNationalityField(
  rawValue: string | undefined | null,
  messages: FieldValidationMessages = DEFAULT_VALIDATION_MESSAGES,
): string | null {
  const trimmed = (rawValue ?? '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  if (
    DIGIT_REGEX.test(trimmed) ||
    !NATIONALITY_ALLOWED_REGEX.test(trimmed) ||
    !NAME_LETTER_REGEX.test(trimmed) ||
    trimmed.length < 2 ||
    trimmed.length > 60
  ) {
    return messages.invalidNationality
  }
  return null
}

/**
 * Validates optional government ID Type + ID Number pairing and format.
 */
export function validateGovernmentIdFields(
  idType: string | undefined | null,
  idNumber: string | undefined | null,
  messages: FieldValidationMessages = DEFAULT_VALIDATION_MESSAGES,
): { idType: string | null; idNumber: string | null } {
  const cleanType = (idType ?? '').trim()
  const cleanNumber = (idNumber ?? '').trim()
  if (!cleanNumber) {
    return { idType: null, idNumber: null }
  }
  const typeError = !cleanType ? messages.idTypeRequiredForNumber : null
  const validChars =
    ID_NUMBER_ALLOWED_REGEX.test(cleanNumber) && /[A-Za-z0-9]/.test(cleanNumber)
  return {
    idType: typeError,
    idNumber: validChars ? null : messages.invalidIdNumber,
  }
}

/**
 * Validates booking status lookup reference code.
 */
export function validateBookingReferenceField(
  rawValue: string | undefined | null,
  messages: FieldValidationMessages = DEFAULT_VALIDATION_MESSAGES,
): string | null {
  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) return messages.required('Booking Reference')
  if (!BOOKING_REF_REGEX.test(trimmed)) {
    return messages.invalidBookingReference
  }
  return null
}

/**
 * Validates phone or email used in the public booking lookup form.
 */
export function validateLookupContactField(
  rawValue: string | undefined | null,
  messages: FieldValidationMessages = DEFAULT_VALIDATION_MESSAGES,
): string | null {
  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) return messages.required('Phone Number or Email')

  if (trimmed.includes('@')) {
    return validateEmailField(trimmed, { required: true, messages })
  }

  const digits = trimmed.replace(/\D/g, '')
  const validPhoneChars = /^[+\d\s().-]+$/.test(trimmed)
  if (!validPhoneChars || digits.length < 7 || digits.length > 15) {
    return messages.invalidLookupContact
  }
  return null
}

/**
 * Validates optional free-text field bounds & prevents control chars / raw HTML tags where inappropriate.
 */
export function validateTextField(
  rawValue: string | undefined | null,
  options: {
    label: string
    required?: boolean
    minLength?: number
    maxLength: number
    messages?: FieldValidationMessages
  },
): string | null {
  const {
    label,
    required = false,
    minLength = 1,
    maxLength,
    messages = DEFAULT_VALIDATION_MESSAGES,
  } = options
  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) {
    return required ? messages.required(label) : null
  }
  if (hasControlChars(trimmed)) {
    return `${label} contains unsupported control characters.`
  }
  if (trimmed.length < minLength) {
    return messages.minLengthRequired(label, minLength)
  }
  if (trimmed.length > maxLength) {
    return messages.maxLengthExceeded(label, maxLength)
  }
  return null
}

export function validateLocationField(
  rawValue: string | undefined | null,
  messages: FieldValidationMessages = DEFAULT_VALIDATION_MESSAGES,
): string | null {
  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) return null
  if (
    trimmed.length < 2 ||
    trimmed.length > 80 ||
    DISALLOWED_ANGLE_REGEX.test(trimmed) ||
    !NAME_LETTER_REGEX.test(trimmed)
  ) {
    return messages.invalidLocation
  }
  return null
}

export function validateRoomNumberField(
  rawValue: string | undefined | null,
): string | null {
  const trimmed = (rawValue ?? '').trim()
  if (!trimmed) return 'Room number is required.'
  if (!ROOM_NUMBER_REGEX.test(trimmed)) {
    return 'Room number must be 1–20 characters (letters, numbers, spaces, or hyphens).'
  }
  return null
}

export function validateRoomDisplayNameField(
  rawValue: string | undefined | null,
): string | null {
  const trimmed = (rawValue ?? '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'Room display name is required.'
  if (trimmed.length < 2 || trimmed.length > 80) {
    return 'Room display name must be between 2 and 80 characters.'
  }
  if (!NAME_LETTER_REGEX.test(trimmed) || DISALLOWED_ANGLE_REGEX.test(trimmed)) {
    return 'Room display name must include letters and cannot contain angle brackets.'
  }
  return null
}

export function validateIntegerField(
  value: number,
  options: { label: string; min: number; max: number },
): string | null {
  if (!Number.isInteger(value)) {
    return `${options.label} must be a whole number.`
  }
  if (value < options.min || value > options.max) {
    return `${options.label} must be between ${options.min} and ${options.max}.`
  }
  return null
}

export function validateMoneyField(
  value: number,
  options: {
    label: string
    min?: number
    max?: number
    allowZero?: boolean
  },
): string | null {
  const { label, min = 0, max = 10_000_000, allowZero = true } = options
  if (!Number.isFinite(value)) {
    return `${label} must be a valid number.`
  }
  if (!allowZero && value <= 0) {
    return `${label} must be greater than 0.`
  }
  if (value < min || value > max) {
    return `${label} must be between ${min} and ${max.toLocaleString('en-US')}.`
  }
  const roundedCents = Math.round(value * 100)
  if (Math.abs(value * 100 - roundedCents) > 1e-6) {
    return `${label} cannot have more than 2 decimal places.`
  }
  return null
}

export function validateStayDatesRange(
  checkIn: string | undefined | null,
  checkOut: string | undefined | null,
  missingMessage = 'Please select both check-in and check-out dates.',
): string | null {
  if (!isValidCalendarDate(checkIn) || !isValidCalendarDate(checkOut)) {
    return missingMessage
  }
  if (checkOut <= checkIn) {
    return 'Check-out date must be after check-in date.'
  }
  return null
}

export function hasFieldErrors(
  errors: Record<string, string | null | undefined>,
): boolean {
  return Object.values(errors).some((msg) => Boolean(msg))
}
