import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  CURRENCY_STORAGE_KEY,
  EXCHANGE_RATES_CACHE_KEY,
  EXCHANGE_RATES_TTL_MS,
  LIVE_RATES_ENDPOINT,
  SUPPORTED_CURRENCIES,
} from '#/lib/constants/currencies'
import type { CurrencyCode, CurrencyOption } from '#/lib/constants/currencies'

export {
  CURRENCY_STORAGE_KEY,
  EXCHANGE_RATES_CACHE_KEY,
  SUPPORTED_CURRENCIES,
}
export type { CurrencyCode, CurrencyOption }

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
  const defaults = {} as Record<CurrencyCode, number>
  for (const option of SUPPORTED_CURRENCIES) {
    defaults[option.code] = option.fallbackRateFromPhp
  }
  return defaults
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
