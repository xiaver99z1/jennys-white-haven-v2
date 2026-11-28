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
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  TRANSLATIONS,
} from '#/lib/constants/locales'
import type {
  LocaleCode,
  LocaleOption,
  TranslationDictionary,
} from '#/lib/constants/locales'

export { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, TRANSLATIONS }
export type { LocaleCode, LocaleOption, TranslationDictionary }

const LOCALE_MAP = new Map<LocaleCode, LocaleOption>(
  SUPPORTED_LOCALES.map((item) => [item.code, item]),
)

const stayDateFormatterCache = new Map<LocaleCode, Intl.DateTimeFormat>()
const PH_RESORT_OFFSET_MS = 8 * 60 * 60 * 1000

function toUtcCalendarDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number)
      const utcDate = new Date(Date.UTC(y, m - 1, d))
      if (
        utcDate.getUTCFullYear() !== y ||
        utcDate.getUTCMonth() !== m - 1 ||
        utcDate.getUTCDate() !== d
      ) {
        return null
      }
      return utcDate
    }
  }

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  // Exact UTC midnight timestamps represent a calendar date directly; otherwise extract the Camotes (+08:00) calendar day
  if (
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0
  ) {
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    )
  }

  const phDate = new Date(parsed.getTime() + PH_RESORT_OFFSET_MS)
  return new Date(
    Date.UTC(
      phDate.getUTCFullYear(),
      phDate.getUTCMonth(),
      phDate.getUTCDate(),
    ),
  )
}

export function isSupportedLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && LOCALE_MAP.has(value as LocaleCode)
}

export function getLocaleOption(code: LocaleCode): LocaleOption {
  return LOCALE_MAP.get(code) ?? SUPPORTED_LOCALES[0]
}

export function detectBrowserLocale(languageHint?: string): LocaleCode {
  const raw =
    languageHint ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en')
  const normalized = raw.trim().toLowerCase()
  if (normalized.startsWith('ko')) return 'ko'
  if (normalized.startsWith('ja')) return 'ja'
  return 'en'
}

export function formatStayDateForLocale(
  value: string | Date | null | undefined,
  locale: LocaleCode,
): string {
  const utcCalendarDate = toUtcCalendarDate(value)
  if (!utcCalendarDate) return ''
  let formatter = stayDateFormatterCache.get(locale)
  if (!formatter) {
    const meta = getLocaleOption(locale)
    formatter = new Intl.DateTimeFormat(meta.dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    stayDateFormatterCache.set(locale, formatter)
  }
  return formatter.format(utcCalendarDate)
}

export interface I18nContextValue {
  locale: LocaleCode
  localeOption: LocaleOption
  t: TranslationDictionary
  setLocale: (next: LocaleCode) => void
  formatStayDate: (value?: string | Date | null) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isSupportedLocale(saved)) {
        setLocaleState(saved)
        return
      }
    } catch {
      // Ignore storage access errors in restricted privacy modes
    }

    if (import.meta.env.MODE !== 'test') {
      setLocaleState(detectBrowserLocale())
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Ignore storage quota/access errors
    }
  }, [])

  const formatStayDate = useCallback(
    (value?: string | Date | null) => formatStayDateForLocale(value, locale),
    [locale],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      localeOption: getLocaleOption(locale),
      t: TRANSLATIONS[locale],
      setLocale,
      formatStayDate,
    }),
    [locale, setLocale, formatStayDate],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

const DEFAULT_FALLBACK_I18N: I18nContextValue = {
  locale: 'en',
  localeOption: SUPPORTED_LOCALES[0],
  t: TRANSLATIONS.en,
  setLocale: () => {},
  formatStayDate: (iso) => formatStayDateForLocale(iso, 'en'),
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? DEFAULT_FALLBACK_I18N
}
