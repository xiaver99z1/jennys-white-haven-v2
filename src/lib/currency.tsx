import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

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
const EXCHANGE_RATES_TTL_MS = 6 * 60 * 60 * 1000
const LIVE_RATES_ENDPOINT = 'https://open.er-api.com/v6/latest/PHP'

const CURRENCY_MAP = new Map<CurrencyCode, CurrencyOption>(
  SUPPORTED_CURRENCIES.map((item) => [item.code, item]),
)

const formatterCache = new Map<string, Intl.NumberFormat>()

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCY_MAP.has(value as CurrencyCode)
}

export function getCurrencyOption(code: CurrencyCode): CurrencyOption {
  return CURRENCY_MAP.get(code) ?? SUPPORTED_CURRENCIES[0]
}

export function getDefaultRatesMap(): Record<CurrencyCode, number> {
  return {
    PHP: 1,
    USD: 0.0172,
    EUR: 0.016,
    GBP: 0.0136,
    AUD: 0.0266,
    CAD: 0.0242,
    SGD: 0.0232,
    JPY: 2.62,
    KRW: 24.2,
  }
}

function getNumberFormatter(
  code: CurrencyCode,
  decimalsOverride?: number,
): Intl.NumberFormat {
  const meta = getCurrencyOption(code)
  const decimals = decimalsOverride ?? meta.decimals
  const cacheKey = `${code}:${decimals}`
  const cached = formatterCache.get(cacheKey)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    currencyDisplay: 'symbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  formatterCache.set(cacheKey, formatter)
  return formatter
}

export function convertPhpAmount(
  phpAmount: number | string,
  currency: CurrencyCode,
  rates: Partial<Record<CurrencyCode, number>> = {},
): number {
  const numeric = Number(phpAmount)
  if (!Number.isFinite(numeric)) return 0
  if (currency === 'PHP') return numeric
  const meta = getCurrencyOption(currency)
  const rate = rates[currency]
  const validRate =
    typeof rate === 'number' && Number.isFinite(rate) && rate > 0
      ? rate
      : meta.fallbackRateFromPhp
  return numeric * validRate
}

export function formatConvertedPhp(
  phpAmount: number | string,
  currency: CurrencyCode,
  rates: Partial<Record<CurrencyCode, number>> = {},
): string {
  const converted = convertPhpAmount(phpAmount, currency, rates)
  const meta = getCurrencyOption(currency)

  // Preserve centavos in PHP when fractional amounts exist (e.g. ₱0.25 or ₱1,250.50),
  // while keeping whole-peso rates clean (e.g. ₱3,500).
  const hasFractionalCentavos =
    currency === 'PHP' && Math.abs(converted - Math.trunc(converted)) > 1e-6
  const effectiveDecimals = hasFractionalCentavos ? 2 : meta.decimals

  // Prevent small non-zero balances (e.g. ₱0.25) from rounding down to 0
  const minUnit = 10 ** -effectiveDecimals
  const safeAmount =
    converted > 0 && converted < minUnit
      ? minUnit
      : converted < 0 && converted > -minUnit
        ? -minUnit
        : converted

  if (currency === 'SGD') {
    const formatted = getNumberFormatter('SGD', effectiveDecimals).format(
      safeAmount,
    )
    return formatted.startsWith('$') ? `S${formatted}` : formatted
  }
  return getNumberFormatter(currency, effectiveDecimals).format(safeAmount)
}

interface CachedRatesPayload {
  timestamp: number
  rates: Partial<Record<CurrencyCode, number>>
}

function readCachedRates(): CachedRatesPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(EXCHANGE_RATES_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedRatesPayload>
    if (
      typeof parsed.timestamp !== 'number' ||
      !parsed.rates ||
      typeof parsed.rates !== 'object'
    ) {
      return null
    }
    return { timestamp: parsed.timestamp, rates: parsed.rates }
  } catch {
    return null
  }
}

export interface CurrencyContextValue {
  currency: CurrencyCode
  currencyOption: CurrencyOption
  isConverted: boolean
  rates: Record<CurrencyCode, number>
  setCurrency: (next: CurrencyCode) => void
  convertFromPhp: (phpAmount: number | string) => number
  formatPrice: (phpAmount: number | string) => string
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('PHP')
  const [rates, setRates] =
    useState<Record<CurrencyCode, number>>(getDefaultRatesMap)

  useEffect(() => {
    try {
      const savedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY)
      if (isSupportedCurrency(savedCurrency)) {
        setCurrencyState(savedCurrency)
      }
    } catch {
      // Ignore storage access errors in restricted privacy modes
    }

    const cached = readCachedRates()
    if (cached) {
      setRates((prev) => {
        const merged = { ...prev }
        for (const option of SUPPORTED_CURRENCIES) {
          const candidate = cached.rates[option.code]
          if (
            option.code !== 'PHP' &&
            typeof candidate === 'number' &&
            Number.isFinite(candidate) &&
            candidate > 0
          ) {
            merged[option.code] = candidate
          }
        }
        return merged
      })
    }
  }, [])

  useEffect(() => {
    if (currency === 'PHP' || import.meta.env.MODE === 'test') return

    const cached = readCachedRates()
    if (cached && Date.now() - cached.timestamp < EXCHANGE_RATES_TTL_MS) {
      return
    }

    const controller = new AbortController()

    void fetch(LIVE_RATES_ENDPOINT, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as {
          rates?: Partial<Record<string, unknown>>
        }
      })
      .then((payload) => {
        const fetchedRates = payload?.rates
        if (!fetchedRates) return
        const nextRates = getDefaultRatesMap()
        for (const option of SUPPORTED_CURRENCIES) {
          if (option.code === 'PHP') continue
          const liveValue = fetchedRates[option.code]
          if (
            typeof liveValue === 'number' &&
            Number.isFinite(liveValue) &&
            liveValue > 0
          ) {
            nextRates[option.code] = liveValue
          }
        }
        setRates(nextRates)
        try {
          window.localStorage.setItem(
            EXCHANGE_RATES_CACHE_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              rates: nextRates,
            } satisfies CachedRatesPayload),
          )
        } catch {
          // Ignore quota/storage errors
        }
      })
      .catch(() => {
        // Gracefully keep fallback/cached PHP conversion rates when offline
      })

    return () => {
      controller.abort()
    }
  }, [currency])

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next)
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next)
    } catch {
      // Ignore storage write errors
    }
  }, [])

  const convertFromPhp = useCallback(
    (phpAmount: number | string) => convertPhpAmount(phpAmount, currency, rates),
    [currency, rates],
  )

  const formatPrice = useCallback(
    (phpAmount: number | string) =>
      formatConvertedPhp(phpAmount, currency, rates),
    [currency, rates],
  )

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencyOption: getCurrencyOption(currency),
      isConverted: currency !== 'PHP',
      rates,
      setCurrency,
      convertFromPhp,
      formatPrice,
    }),
    [currency, rates, setCurrency, convertFromPhp, formatPrice],
  )

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

const DEFAULT_FALLBACK_CONTEXT: CurrencyContextValue = {
  currency: 'PHP',
  currencyOption: SUPPORTED_CURRENCIES[0],
  isConverted: false,
  rates: getDefaultRatesMap(),
  setCurrency: () => {},
  convertFromPhp: (phpAmount) => Number(phpAmount) || 0,
  formatPrice: (phpAmount) => formatConvertedPhp(phpAmount, 'PHP'),
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext) ?? DEFAULT_FALLBACK_CONTEXT
}
