import { useState } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieConsentCenter } from './CookieConsentCenter'
import { readCookieConsent } from '#/lib/cookie-consent'

function ConsentHarness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Footer Cookie Settings
      </button>
      <CookieConsentCenter
        isPreferencesOpen={open}
        onOpenPreferences={() => setOpen(true)}
        onClosePreferences={() => setOpen(false)}
      />
    </div>
  )
}

describe('CookieConsentCenter', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows bottom cookie banner on first visit and saves all cookies when clicking Agree', () => {
    render(<ConsentHarness />)

    expect(
      screen.getByLabelText('Cookie consent banner'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Agree' }))

    expect(
      screen.queryByLabelText('Cookie consent banner'),
    ).not.toBeInTheDocument()
    expect(readCookieConsent()).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: true,
        performance: true,
        targeting: true,
      }),
    )
  })

  it('opens Privacy Preferences Center modal, toggles categories and accordions, and saves custom choices', () => {
    render(<ConsentHarness />)

    // Click Cookie Preferences in the bottom banner
    fireEvent.click(
      screen.getByRole('button', { name: 'Cookie Preferences' }),
    )

    expect(
      screen.getByRole('dialog', { name: 'Privacy Preferences Center' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Always Active')).toBeInTheDocument()

    // Expand category description and Privacy & Cookie Notice
    fireEvent.click(
      screen.getByRole('button', { name: /Strictly Necessary Cookies/i }),
    )
    expect(
      screen.getByText(/Essential for the website to function properly/i),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Read Privacy & Cookie Notice/i }),
    )
    expect(
      screen.getByText(/Jenny's White Haven Data & Cookie Notice/i),
    ).toBeInTheDocument()

    // Toggle Functional off and Targeting on
    const functionalSwitch = screen.getByRole('switch', {
      name: 'Toggle Functional Cookies',
    })
    const targetingSwitch = screen.getByRole('switch', {
      name: 'Toggle Targeting Cookies',
    })
    expect(functionalSwitch).toHaveAttribute('aria-checked', 'true')
    expect(targetingSwitch).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(functionalSwitch)
    fireEvent.click(targetingSwitch)

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm My Choices' }),
    )

    expect(
      screen.queryByRole('dialog', { name: 'Privacy Preferences Center' }),
    ).not.toBeInTheDocument()
    expect(readCookieConsent()).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: false,
        performance: true,
        targeting: true,
      }),
    )

    // Reopen from footer button and click Essential Only
    fireEvent.click(
      screen.getByRole('button', { name: 'Footer Cookie Settings' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Essential Only' }))
    expect(readCookieConsent()).toEqual(
      expect.objectContaining({
        necessary: true,
        functional: false,
        performance: false,
        targeting: false,
      }),
    )
  })
})
