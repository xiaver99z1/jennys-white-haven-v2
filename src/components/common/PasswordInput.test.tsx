import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('toggles visibility in uncontrolled mode and forwards refs', () => {
    const ref = createRef<HTMLInputElement>()
    const onVisibleChange = vi.fn()

    render(
      <PasswordInput
        ref={ref}
        id="secret-field"
        defaultValue="Sup3r$ecret!"
        onVisibleChange={onVisibleChange}
      />,
    )

    const input = document.getElementById('secret-field') as HTMLInputElement
    expect(ref.current).toBe(input)
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.type).toBe('text')
    expect(onVisibleChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
    expect(onVisibleChange).toHaveBeenCalledWith(false)
  })

  it('respects controlled visibility and custom accessible toggle labels', () => {
    function ControlledHarness() {
      const [visible, setVisible] = useState(false)
      return (
        <div>
          <PasswordInput
            id="controlled-secret"
            value="abc12345"
            onChange={() => {}}
            visible={visible}
            onVisibleChange={setVisible}
            showLabel="Show admin secret"
            hideLabel="Hide admin secret"
          />
          <button type="button" onClick={() => setVisible(false)}>
            Reset
          </button>
        </div>
      )
    }

    render(<ControlledHarness />)

    const input = document.getElementById(
      'controlled-secret',
    ) as HTMLInputElement
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Show admin secret' }))
    expect(input.type).toBe('text')
    expect(
      screen.getByRole('button', { name: 'Hide admin secret' }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(input.type).toBe('password')
  })
})
