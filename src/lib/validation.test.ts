import { describe, it, expect } from 'vitest'
import {
  hasFieldErrors,
  validateBookingReferenceField,
  validateEmailField,
  validateGovernmentIdFields,
  validateIntegerField,
  validateLocationField,
  validateLookupContactField,
  validateMoneyField,
  validateNationalityField,
  validatePersonName,
  validatePersonNameLive,
  validatePhoneField,
  validateRoomDisplayNameField,
  validateRoomNumberField,
  validateStayDatesRange,
  validateTextField,
} from './validation'

describe('form field validation helpers', () => {
  describe('validatePersonName & validatePersonNameLive', () => {
    it('rejects digits and HTML/symbol characters in person names', () => {
      expect(
        validatePersonName('Maria123', { label: 'First name' }),
      ).toBe('First name cannot contain numbers.')
      expect(
        validatePersonName('Juan 2nd', { label: 'Full name' }),
      ).toBe('Full name cannot contain numbers.')
      expect(
        validatePersonName('Maria@Santos', { label: 'Full name' }),
      ).toMatch(/letters, spaces, hyphens, and apostrophes/i)
      expect(validatePersonName('<script>', { label: 'Name' })).toMatch(
        /letters, spaces, hyphens, and apostrophes/i,
      )
      expect(validatePersonName('---', { label: 'Last name' })).toMatch(
        /letters, spaces, hyphens, and apostrophes/i,
      )
    })

    it('supports Unicode international names including single-character CJK/Hangul surnames', () => {
      expect(validatePersonName('José María', { label: 'First name' })).toBeNull()
      expect(validatePersonName("O'Connor", { label: 'Last name' })).toBeNull()
      expect(validatePersonName('Jean-Luc', { label: 'First name' })).toBeNull()
      expect(validatePersonName('김', { label: 'Last name' })).toBeNull()
      expect(validatePersonName('李', { label: 'Last name' })).toBeNull()
      expect(validatePersonName('김민준', { label: 'Full name' })).toBeNull()
      expect(validatePersonName('田中 太郎', { label: 'Full name' })).toBeNull()
    })

    it('enforces required and length limits', () => {
      expect(validatePersonName('   ', { label: 'First name' })).toBe(
        'First name is required.',
      )
      expect(
        validatePersonName('   ', { label: 'First name', required: false }),
      ).toBeNull()
      expect(
        validatePersonName('A', { label: 'Full name', minLength: 2, maxLength: 100 }),
      ).toBe('Full name must be between 2 and 100 characters.')
    })

    it('immediately surfaces number errors on change and clears when fixed', () => {
      expect(
        validatePersonNameLive('Maria', null, { label: 'First name' }),
      ).toBeNull()
      expect(
        validatePersonNameLive('M', null, { label: 'First name' }),
      ).toBeNull()
      expect(
        validatePersonNameLive('Maria1', null, { label: 'First name' }),
      ).toBe('First name cannot contain numbers.')
      expect(
        validatePersonNameLive(
          'Maria',
          'First name cannot contain numbers.',
          { label: 'First name' },
        ),
      ).toBeNull()
      expect(
        validatePersonNameLive('', 'First name cannot contain numbers.', {
          label: 'First name',
        }),
      ).toBeNull()
    })
  })

  describe('validateEmailField', () => {
    it('validates single-mailbox email addresses', () => {
      expect(validateEmailField('', { required: true })).toBe(
        'Email address is required.',
      )
      expect(validateEmailField('', { required: false })).toBeNull()
      expect(validateEmailField('not-an-email', { required: true })).toBe(
        'Please enter a valid email address.',
      )
      expect(
        validateEmailField('alice,bob@example.com', { required: true }),
      ).toBe('Please enter a valid email address.')
      expect(
        validateEmailField('guest@jennyswhitehaven.com', { required: true }),
      ).toBeNull()
    })
  })

  describe('validatePhoneField', () => {
    it('enforces country digit bounds and international rules', () => {
      expect(validatePhoneField('', { required: true })).toBe(
        'Phone number is required.',
      )
      expect(validatePhoneField('', { required: false })).toBeNull()
      expect(validatePhoneField('+639568198715')).toBeNull()
      expect(validatePhoneField('+6395681')).toMatch(/Philippines \(\+63\)/)
      expect(validatePhoneField('+821012345678')).toBeNull()
      expect(validatePhoneField('+99912345678')).toBeNull()
      expect(validatePhoneField('+99912')).toMatch(/international/i)
    })
  })

  describe('validateNationalityField & validateGovernmentIdFields', () => {
    it('rejects numbers in nationality', () => {
      expect(validateNationalityField('Filipino')).toBeNull()
      expect(validateNationalityField('South Korean')).toBeNull()
      expect(validateNationalityField('Filipino1')).toMatch(/without numbers/i)
    })

    it('requires ID type when ID number is supplied and validates characters', () => {
      expect(validateGovernmentIdFields('', '')).toEqual({
        idType: null,
        idNumber: null,
      })
      expect(validateGovernmentIdFields('', 'P123456')).toEqual({
        idType: 'Please select an ID type for the ID number.',
        idNumber: null,
      })
      expect(validateGovernmentIdFields('Passport', '<bad>')).toEqual({
        idType: null,
        idNumber: expect.stringMatching(/2–40 alphanumeric/i),
      })
      expect(validateGovernmentIdFields('Passport', 'P1234567')).toEqual({
        idType: null,
        idNumber: null,
      })
    })
  })

  describe('booking lookup, room, date, money, and text helpers', () => {
    it('validates booking reference and lookup contact', () => {
      expect(validateBookingReferenceField('')).toBe(
        'Booking Reference is required.',
      )
      expect(validateBookingReferenceField('JWH-20261128-ABCD')).toBeNull()
      expect(validateBookingReferenceField('bad ref!')).toMatch(/JWH-/i)

      expect(validateLookupContactField('')).toBe(
        'Phone Number or Email is required.',
      )
      expect(validateLookupContactField('guest@example.com')).toBeNull()
      expect(validateLookupContactField('639568198715')).toBeNull()
      expect(validateLookupContactField('bad@')).toBe(
        'Please enter a valid email address.',
      )
      expect(validateLookupContactField('123')).toMatch(/registered email/i)
    })

    it('validates room, numeric bounds, money decimals, and date ranges', () => {
      expect(validateRoomNumberField('')).toBe('Room number is required.')
      expect(validateRoomNumberField('101-A')).toBeNull()
      expect(validateRoomDisplayNameField('Ocean Suite')).toBeNull()
      expect(validateRoomDisplayNameField('123')).toMatch(/must include letters/i)

      expect(
        validateIntegerField(2.5, { label: 'Capacity', min: 1, max: 30 }),
      ).toBe('Capacity must be a whole number.')
      expect(
        validateIntegerField(0, { label: 'Capacity', min: 1, max: 30 }),
      ).toBe('Capacity must be between 1 and 30.')
      expect(
        validateMoneyField(100.123, { label: 'Amount' }),
      ).toBe('Amount cannot have more than 2 decimal places.')
      expect(validateMoneyField(0, { label: 'Payment', allowZero: false })).toBe(
        'Payment must be greater than 0.',
      )

      expect(validateStayDatesRange('2026-12-10', '2026-12-10')).toBe(
        'Check-out date must be after check-in date.',
      )
      expect(validateStayDatesRange('2026-12-10', '2026-12-12')).toBeNull()
      expect(validateLocationField('Cebu City, Philippines')).toBeNull()
      expect(validateLocationField('<img src=x>')).toMatch(/Location/i)
      expect(
        validateTextField('Hello\u0007', { label: 'Notes', maxLength: 100 }),
      ).toMatch(/control characters/i)

      expect(hasFieldErrors({ a: null, b: 'Err' })).toBe(true)
      expect(hasFieldErrors({ a: null, b: undefined })).toBe(false)
    })
  })
})
