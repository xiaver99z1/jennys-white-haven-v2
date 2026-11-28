export type PhoneCountryIso =
  | 'PH'
  | 'KR'
  | 'JP'
  | 'GB'
  | 'US'
  | 'CA'
  | 'AU'
  | 'SG'
  | 'HK'
  | 'TW'
  | 'CN'
  | 'DE'
  | 'FR'
  | 'AE'
  | 'NZ'
  | 'MY'
  | 'TH'
  | 'INTL'

export interface PhoneCountryOption {
  iso: PhoneCountryIso
  name: string
  dialCode: string
  dialDigits: string
  stripLeadingZero: boolean
  placeholder: string
  minNationalDigits: number
  maxNationalDigits: number
}

export const DEFAULT_PHONE_COUNTRY: PhoneCountryIso = 'PH'

export const PHONE_COUNTRIES: readonly PhoneCountryOption[] = [
  {
    iso: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    dialDigits: '63',
    stripLeadingZero: true,
    placeholder: '956 819 8715',
    minNationalDigits: 9,
    maxNationalDigits: 10,
  },
  {
    iso: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    dialDigits: '82',
    stripLeadingZero: true,
    placeholder: '10 1234 5678',
    minNationalDigits: 8,
    maxNationalDigits: 10,
  },
  {
    iso: 'JP',
    name: 'Japan',
    dialCode: '+81',
    dialDigits: '81',
    stripLeadingZero: true,
    placeholder: '90 1234 5678',
    minNationalDigits: 9,
    maxNationalDigits: 10,
  },
  {
    iso: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    dialDigits: '44',
    stripLeadingZero: true,
    placeholder: '7700 900123',
    minNationalDigits: 9,
    maxNationalDigits: 10,
  },
  {
    iso: 'US',
    name: 'United States',
    dialCode: '+1',
    dialDigits: '1',
    stripLeadingZero: false,
    placeholder: '415 555 0198',
    minNationalDigits: 10,
    maxNationalDigits: 10,
  },
  {
    iso: 'CA',
    name: 'Canada',
    dialCode: '+1',
    dialDigits: '1',
    stripLeadingZero: false,
    placeholder: '604 555 0199',
    minNationalDigits: 10,
    maxNationalDigits: 10,
  },
  {
    iso: 'AU',
    name: 'Australia',
    dialCode: '+61',
    dialDigits: '61',
    stripLeadingZero: true,
    placeholder: '412 345 678',
    minNationalDigits: 9,
    maxNationalDigits: 9,
  },
  {
    iso: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    dialDigits: '65',
    stripLeadingZero: false,
    placeholder: '8123 4567',
    minNationalDigits: 8,
    maxNationalDigits: 8,
  },
  {
    iso: 'HK',
    name: 'Hong Kong',
    dialCode: '+852',
    dialDigits: '852',
    stripLeadingZero: false,
    placeholder: '9123 4567',
    minNationalDigits: 8,
    maxNationalDigits: 8,
  },
  {
    iso: 'TW',
    name: 'Taiwan',
    dialCode: '+886',
    dialDigits: '886',
    stripLeadingZero: true,
    placeholder: '912 345 678',
    minNationalDigits: 9,
    maxNationalDigits: 9,
  },
  {
    iso: 'CN',
    name: 'China',
    dialCode: '+86',
    dialDigits: '86',
    stripLeadingZero: false,
    placeholder: '138 0013 8000',
    minNationalDigits: 11,
    maxNationalDigits: 11,
  },
  {
    iso: 'DE',
    name: 'Germany',
    dialCode: '+49',
    dialDigits: '49',
    stripLeadingZero: true,
    placeholder: '151 23456789',
    minNationalDigits: 9,
    maxNationalDigits: 12,
  },
  {
    iso: 'FR',
    name: 'France',
    dialCode: '+33',
    dialDigits: '33',
    stripLeadingZero: true,
    placeholder: '6 12 34 56 78',
    minNationalDigits: 9,
    maxNationalDigits: 9,
  },
  {
    iso: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    dialDigits: '971',
    stripLeadingZero: true,
    placeholder: '50 123 4567',
    minNationalDigits: 8,
    maxNationalDigits: 9,
  },
  {
    iso: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    dialDigits: '64',
    stripLeadingZero: true,
    placeholder: '21 123 4567',
    minNationalDigits: 8,
    maxNationalDigits: 10,
  },
  {
    iso: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    dialDigits: '60',
    stripLeadingZero: true,
    placeholder: '12 345 6789',
    minNationalDigits: 8,
    maxNationalDigits: 10,
  },
  {
    iso: 'TH',
    name: 'Thailand',
    dialCode: '+66',
    dialDigits: '66',
    stripLeadingZero: true,
    placeholder: '81 234 5678',
    minNationalDigits: 8,
    maxNationalDigits: 9,
  },
  {
    iso: 'INTL',
    name: 'Other / International',
    dialCode: '+',
    dialDigits: '',
    stripLeadingZero: false,
    placeholder: '91 98765 43210',
    minNationalDigits: 7,
    maxNationalDigits: 15,
  },
] as const
