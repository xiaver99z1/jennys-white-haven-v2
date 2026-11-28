import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PublicLayout } from './PublicLayout'
import { DEFAULT_CMS_SECTIONS } from '#/lib/constants/cms'
import { useCurrency } from '#/lib/currency'

vi.mock('@tanstack/react-router', () => ({
  useRouterState: (opts?: { select?: (s: { location: { pathname: string } }) => unknown }) =>
    opts?.select
      ? opts.select({ location: { pathname: '/' } })
      : { location: { pathname: '/' } },
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string
    children: ReactNode
    className?: string
    onClick?: () => void
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}))

describe('PublicLayout', () => {
  const contactSection = DEFAULT_CMS_SECTIONS.find((s) => s.key === 'contact')

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders header navigation, main content, and CMS contact footer', () => {
    render(
      <PublicLayout contactSection={contactSection}>
        <div>Hero Content</div>
      </PublicLayout>,
    )

    expect(screen.getByText('Hero Content')).toBeInTheDocument()
    expect(
      screen.getAllByAltText("Jenny's White Haven")[0],
    ).toHaveAttribute('src', '/brand-logo.png')
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('Explore Camotes')).toBeInTheDocument()
    expect(screen.getByText('Camotes Island Guide')).toBeInTheDocument()
    expect(screen.getByText('Booking Status')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /^Reserve$/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Santiago Bay, San Francisco, Camotes Island, Cebu/i),
    ).toBeInTheDocument()
  })

  it('toggles mobile navigation drawer without Reserve CTA', () => {
    render(
      <PublicLayout contactSection={contactSection}>
        <div>Body</div>
      </PublicLayout>,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Open navigation menu/i }),
    )
    expect(screen.getByLabelText('Select language')).toBeInTheDocument()
    expect(screen.getByLabelText('Select currency')).toBeInTheDocument()
    expect(screen.queryByText(/Reserve a Stay/i)).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Close navigation menu/i }),
    )
    expect(screen.queryByLabelText('Select language')).not.toBeInTheDocument()
  })

  it('hides Explore links when showExploreLink is false', () => {
    render(
      <PublicLayout contactSection={contactSection} showExploreLink={false}>
        <div>Body</div>
      </PublicLayout>,
    )

    expect(screen.queryByText('Explore Camotes')).not.toBeInTheDocument()
    expect(screen.queryByText('Camotes Island Guide')).not.toBeInTheDocument()
  })

  it('opens More dropdown on mouse hover and closes after mouse leave', () => {
    vi.useFakeTimers()
    try {
      render(
        <PublicLayout contactSection={contactSection}>
          <div>Body</div>
        </PublicLayout>,
      )

      const moreTrigger = screen.getByRole('button', { name: /More/i })
      expect(
        screen.queryByRole('menu', { name: /More pages/i }),
      ).not.toBeInTheDocument()

      fireEvent.mouseEnter(moreTrigger.parentElement!)
      const moreMenu = screen.getByRole('menu', { name: /More pages/i })
      expect(moreMenu).toBeInTheDocument()
      expect(within(moreMenu).getByText('Photo Gallery')).toBeInTheDocument()

      fireEvent.mouseLeave(moreTrigger.parentElement!)
      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(
        screen.queryByRole('menu', { name: /More pages/i }),
      ).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('switches displayed rates across public content via header CurrencySelector', () => {
    function SampleRoomCard() {
      const { formatPrice } = useCurrency()
      return <div data-testid="sample-price">{formatPrice(3500)}</div>
    }

    render(
      <PublicLayout contactSection={contactSection}>
        <SampleRoomCard />
      </PublicLayout>,
    )

    expect(screen.getByTestId('sample-price')).toHaveTextContent('₱3,500')

    const currencyTrigger = screen.getByRole('button', {
      name: /Select currency \(current: PHP\)/i,
    })
    fireEvent.keyDown(currencyTrigger, { key: 'ArrowDown' })
    const listbox = screen.getByRole('listbox', { name: /Display Rates In/i })
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: /United States/i }))

    expect(screen.getByTestId('sample-price')).toHaveTextContent('$60.20')
  })

  it('switches guest translations across English, Korean, and Japanese via LanguageSelector', () => {
    render(
      <PublicLayout contactSection={contactSection}>
        <div>Body</div>
      </PublicLayout>,
    )

    const langTrigger = screen.getByRole('button', {
      name: /Select language \(current: English\)/i,
    })
    fireEvent.click(langTrigger)
    fireEvent.click(screen.getByRole('option', { name: /Korean/i }))

    expect(screen.getByText('객실 안내')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ko')

    fireEvent.click(
      screen.getByRole('button', {
        name: /Select language \(current: 한국어\)/i,
      }),
    )
    fireEvent.click(screen.getByRole('option', { name: /Japanese/i }))

    expect(screen.getByText('客室案内')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ja')
  })
})
