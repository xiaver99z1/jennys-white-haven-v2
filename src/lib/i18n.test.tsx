import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  I18nProvider,
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  formatStayDateForLocale,
  isSupportedLocale,
  useI18n,
} from './i18n'

describe('i18n utilities and I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('detects browser locales and formats calendar dates with Intl.DateTimeFormat', () => {
    expect(isSupportedLocale('en')).toBe(true)
    expect(isSupportedLocale('ko')).toBe(true)
    expect(isSupportedLocale('ja')).toBe(true)
    expect(isSupportedLocale('fr')).toBe(false)

    expect(detectBrowserLocale('ko-KR')).toBe('ko')
    expect(detectBrowserLocale('ja-JP')).toBe('ja')
    expect(detectBrowserLocale('en-GB')).toBe('en')

    expect(formatStayDateForLocale('2026-12-05', 'en')).toBe('Dec 5, 2026')
    expect(
      formatStayDateForLocale(new Date('2026-12-05T00:00:00.000Z'), 'en'),
    ).toBe('Dec 5, 2026')
    expect(
      formatStayDateForLocale(new Date('2026-12-05T14:00:00+08:00'), 'en'),
    ).toBe('Dec 5, 2026')
    expect(
      formatStayDateForLocale(new Date('2026-12-05T00:00:00+08:00'), 'en'),
    ).toBe('Dec 5, 2026')
    expect(formatStayDateForLocale('2026-12-05', 'ko')).toContain('2026')
    expect(formatStayDateForLocale('2026-12-05', 'ja')).toContain('2026')
    expect(formatStayDateForLocale('', 'en')).toBe('')
  })

  it('switches between English, Korean, and Japanese, persists selection, and updates html lang', () => {
    function SampleConsumer() {
      const { locale, t, setLocale } = useI18n()
      return (
        <div>
          <span data-testid="active-locale">{locale}</span>
          <span data-testid="rooms-nav">{t.nav.rooms}</span>
          <span data-testid="room-type-wh">
            {t.common.roomTypes['Whole House']}
          </span>
          <button type="button" onClick={() => setLocale('ko')}>
            Switch KO
          </button>
          <button type="button" onClick={() => setLocale('ja')}>
            Switch JA
          </button>
        </div>
      )
    }

    render(
      <I18nProvider>
        <SampleConsumer />
      </I18nProvider>,
    )

    expect(screen.getByTestId('active-locale')).toHaveTextContent('en')
    expect(screen.getByTestId('rooms-nav')).toHaveTextContent('Rooms')

    fireEvent.click(screen.getByRole('button', { name: 'Switch KO' }))
    expect(screen.getByTestId('active-locale')).toHaveTextContent('ko')
    expect(screen.getByTestId('rooms-nav')).toHaveTextContent('객실 안내')
    expect(screen.getByTestId('room-type-wh')).toHaveTextContent(
      '독채 전체 대관',
    )
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ko')
    expect(document.documentElement.lang).toBe('ko')

    fireEvent.click(screen.getByRole('button', { name: 'Switch JA' }))
    expect(screen.getByTestId('active-locale')).toHaveTextContent('ja')
    expect(screen.getByTestId('rooms-nav')).toHaveTextContent('客室案内')
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
  })
})
