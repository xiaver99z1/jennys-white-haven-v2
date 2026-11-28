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
import { parseLocalIsoDate } from '#/lib/formatters'

export { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, TRANSLATIONS }
export type { LocaleCode, LocaleOption, TranslationDictionary }

const LOCALE_MAP = new Map<LocaleCode, LocaleOption>(
  SUPPORTED_LOCALES.map((item) => [item.code, item]),
)

const stayDateFormatterCache = new Map<LocaleCode, Intl.DateTimeFormat>()

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
  if (!value) return ''
  let dt: Date | null
  if (value instanceof Date) {
    dt = Number.isNaN(value.getTime()) ? null : value
  } else {
    dt = parseLocalIsoDate(value) ?? new Date(value)
    if (Number.isNaN(dt.getTime())) dt = null
  }
  if (!dt) return ''
  let formatter = stayDateFormatterCache.get(locale)
  if (!formatter) {
    const meta = getLocaleOption(locale)
    formatter = new Intl.DateTimeFormat(meta.dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    stayDateFormatterCache.set(locale, formatter)
  }
  return formatter.format(dt)
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
