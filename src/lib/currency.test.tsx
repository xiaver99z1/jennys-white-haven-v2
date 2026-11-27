import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CURRENCY_STORAGE_KEY,
  CurrencyProvider,
  EXCHANGE_RATES_CACHE_KEY,
  convertPhpAmount,
  formatConvertedPhp,
  useCurrency,
} from './currency'
import { ExtraGuestsCounterField } from '#/components/common/ExtraGuestsCounterField'
import { PasswordChallengeModal } from '#/components/common/PasswordChallengeModal'

function PriceProbe() {
  const { currency, isConverted, setCurrency, formatPrice } = useCurrency()
  return (
    <div>
      <span data-testid="active-currency">{currency}</span>
      <span data-testid="is-converted">{String(isConverted)}</span>
      <span data-testid="room-rate">{formatPrice(3500)}</span>
      <button type="button" onClick={() => setCurrency('USD')}>
        Switch to USD
      </button>
      <button type="button" onClick={() => setCurrency('JPY')}>
        Switch to JPY
      </button>
    </div>
  )
}

describe('currency converter & Intl formatting', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('formats PHP and converted international currencies via Intl.NumberFormat', () => {
    expect(formatConvertedPhp(3500, 'PHP')).toBe('₱3,500')
    expect(formatConvertedPhp(3500, 'USD', { USD: 0.02 })).toBe('$70.00')
    expect(formatConvertedPhp(3500, 'EUR', { EUR: 0.016 })).toBe('€56.00')
    expect(formatConvertedPhp(3500, 'JPY', { JPY: 2.5 })).toMatch(/[¥￥]8,750/)
    expect(convertPhpAmount(1000, 'USD', { USD: 0.018 })).toBeCloseTo(18)
  })

  it('updates prices across consumers and persists selected currency in localStorage', () => {
    render(
      <CurrencyProvider>
        <PriceProbe />
      </CurrencyProvider>,
    )

    expect(screen.getByTestId('active-currency')).toHaveTextContent('PHP')
    expect(screen.getByTestId('is-converted')).toHaveTextContent('false')
    expect(screen.getByTestId('room-rate')).toHaveTextContent('₱3,500')

    fireEvent.click(screen.getByRole('button', { name: 'Switch to USD' }))

    expect(screen.getByTestId('active-currency')).toHaveTextContent('USD')
    expect(screen.getByTestId('is-converted')).toHaveTextContent('true')
    expect(screen.getByTestId('room-rate')).toHaveTextContent('$60.20')
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('USD')
  })

  it('hydrates saved currency and cached exchange rates from localStorage', () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'USD')
    window.localStorage.setItem(
      EXCHANGE_RATES_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        rates: { USD: 0.02 },
      }),
    )

    render(
      <CurrencyProvider>
        <PriceProbe />
      </CurrencyProvider>,
    )

    expect(screen.getByTestId('active-currency')).toHaveTextContent('USD')
    expect(screen.getByTestId('room-rate')).toHaveTextContent('$70.00')
  })

  it('converts ExtraGuestsCounterField rates in public variant while keeping PHP in admin variant', () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'USD')
    window.localStorage.setItem(
      EXCHANGE_RATES_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        rates: { USD: 0.02 },
      }),
    )

    render(
      <CurrencyProvider>
        <ExtraGuestsCounterField
          idPrefix="public-test"
          variant="public"
          extraAdults={1}
          extraChildren={0}
          extraAdultFee={500}
          extraChildFee={300}
          extraTotalFee={500}
          onChangeAdults={vi.fn()}
          onChangeChildren={vi.fn()}
        />
        <ExtraGuestsCounterField
          idPrefix="admin-test"
          variant="admin"
          extraAdults={1}
          extraChildren={0}
          extraAdultFee={500}
          extraChildFee={300}
          extraTotalFee={500}
          onChangeAdults={vi.fn()}
          onChangeChildren={vi.fn()}
        />
      </CurrencyProvider>,
    )

    // Public counter displays USD ($10.00 / night & $6.00 / night)
    expect(screen.getByText('+$10.00 / night')).toBeInTheDocument()
    expect(screen.getByText('+$6.00 / night')).toBeInTheDocument()

    // Admin counter stays strictly in PHP (₱500 / night & ₱300 / night)
    expect(screen.getByText('+₱500 / night')).toBeInTheDocument()
    expect(screen.getByText('+₱300 / night')).toBeInTheDocument()
  })

  it('toggles password visibility via the eye icon in PasswordChallengeModal', () => {
    render(
      <PasswordChallengeModal
        isOpen={true}
        targetName="Staff Member"
        password="SecretPassword1!"
        onPasswordChange={vi.fn()}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/Your Administrator Password/i)
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(
      screen.getByRole('button', { name: /Show administrator password/i }),
    )
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(
      screen.getByRole('button', { name: /Hide administrator password/i }),
    )
    expect(input).toHaveAttribute('type', 'password')
  })
})
