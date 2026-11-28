export type CurrencyCode =
  | 'PHP'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'JPY'
  | 'KRW'

export interface CurrencyOption {
  code: CurrencyCode
  countryCode: string
  country: string
  label: string
  symbol: string
  locale: string
  decimals: number
  /** Fallback rate from 1 PHP -> target currency when offline or before live refresh */
  fallbackRateFromPhp: number
}

export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [
  {
    code: 'PHP',
    countryCode: 'PH',
    country: 'Philippines',
    label: 'Philippine Peso',
    symbol: '₱',
    locale: 'en-PH',
    decimals: 0,
    fallbackRateFromPhp: 1,
  },
  {
    code: 'USD',
    countryCode: 'US',
    country: 'United States',
    label: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    decimals: 2,
    fallbackRateFromPhp: 0.0172,
  },
  {
    code: 'EUR',
    countryCode: 'EU',
    country: 'Eurozone',
    label: 'Euro',
    symbol: '€',
    locale: 'en-IE',
    decimals: 2,
    fallbackRateFromPhp: 0.016,
  },
  {
    code: 'GBP',
    countryCode: 'UK',
    country: 'United Kingdom',
    label: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    decimals: 2,
    fallbackRateFromPhp: 0.0136,
  },
  {
    code: 'AUD',
    countryCode: 'AU',
    country: 'Australia',
    label: 'Australian Dollar',
    symbol: 'A$',
    locale: 'en-US',
    decimals: 2,
    fallbackRateFromPhp: 0.0266,
  },
  {
    code: 'CAD',
    countryCode: 'CA',
    country: 'Canada',
    label: 'Canadian Dollar',
    symbol: 'CA$',
    locale: 'en-US',
    decimals: 2,
    fallbackRateFromPhp: 0.0242,
  },
  {
    code: 'SGD',
    countryCode: 'SG',
    country: 'Singapore',
    label: 'Singapore Dollar',
    symbol: 'S$',
    locale: 'en-SG',
    decimals: 2,
    fallbackRateFromPhp: 0.0232,
  },
  {
    code: 'JPY',
    countryCode: 'JP',
    country: 'Japan',
    label: 'Japanese Yen',
    symbol: '¥',
    locale: 'ja-JP',
    decimals: 0,
    fallbackRateFromPhp: 2.62,
  },
  {
    code: 'KRW',
    countryCode: 'KR',
    country: 'South Korea',
    label: 'South Korean Won',
    symbol: '₩',
    locale: 'ko-KR',
    decimals: 0,
    fallbackRateFromPhp: 24.2,
  },
] as const

export const CURRENCY_STORAGE_KEY = 'jwh_currency'
export const EXCHANGE_RATES_CACHE_KEY = 'jwh_exchange_rates_v1'
export const EXCHANGE_RATES_TTL_MS = 6 * 60 * 60 * 1000
export const LIVE_RATES_ENDPOINT = 'https://open.er-api.com/v6/latest/PHP'
