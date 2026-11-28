import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PhoneNumberInput } from './PhoneNumberInput'

describe('PhoneNumberInput', () => {
  function Harness({ initial = '' }: { initial?: string }) {
    const [phone, setPhone] = useState(initial)
    return (
      <div>
        <PhoneNumberInput id="guest-phone" value={phone} onChange={setPhone} />
        <div data-testid="stored-phone">{phone}</div>
      </div>
    )
  }

  it('defaults to Philippines (+63) and emits digits-only stored phone (e.g. 639568198715)', () => {
    render(<Harness />)

    const input = document.getElementById('guest-phone') as HTMLInputElement
    fireEvent.change(input, { target: { value: '9568198715' } })

    expect(input.value).toBe('9568198715')
    expect(screen.getByTestId('stored-phone')).toHaveTextContent('639568198715')

    // Strips leading trunk zero automatically
    fireEvent.change(input, { target: { value: '09568198715' } })
    expect(input.value).toBe('9568198715')
    expect(screen.getByTestId('stored-phone')).toHaveTextContent('639568198715')
  })

  it('switches country calling code and auto-detects pasted +country numbers', () => {
    render(<Harness initial="821012345678" />)

    const input = document.getElementById('guest-phone') as HTMLInputElement
    expect(input.value).toBe('1012345678')
    expect(
      screen.getByRole('button', { name: /South Korea \+82/i }),
    ).toBeInTheDocument()

    // Switch to Japan (+81)
    fireEvent.click(screen.getByRole('button', { name: /South Korea \+82/i }))
    fireEvent.click(screen.getByRole('option', { name: /Japan.*\+81/i }))
    expect(screen.getByTestId('stored-phone')).toHaveTextContent('811012345678')

    // Paste a UK +44 number
    fireEvent.change(input, { target: { value: '+44 07700 900123' } })
    expect(input.value).toBe('7700900123')
    expect(screen.getByTestId('stored-phone')).toHaveTextContent('447700900123')

    // Clearing input emits empty string
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByTestId('stored-phone')).toHaveTextContent('')
  })
})
