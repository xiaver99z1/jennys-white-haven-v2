import { describe, it, expect, vi } from 'vitest'
import { buildCsvContent, downloadCsv } from './csv'

describe('csv utilities', () => {
  it('builds RFC 4180 CSV with formula-injection protection and escaping', () => {
    const csv = buildCsvContent(
      ['Name', 'Formula', 'Notes', 'Empty'],
      [
        ['Maria, Santos', '=SUM(A1:A2)', 'Said "Hello"', null],
        ['John', '+1234', undefined, 500],
      ],
    )

    expect(csv).toContain('"Maria, Santos"')
    expect(csv).toContain("'=SUM(A1:A2)")
    expect(csv).toContain('"Said ""Hello"""')
    expect(csv).toContain("'+1234")
    expect(csv).toContain('500')
  })

  it('triggers browser CSV download and cleans up object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    })

    downloadCsv('my-report', ['A'], [['1']])
    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    downloadCsv('already.csv', ['A'], [['2']])
    expect(clickSpy).toHaveBeenCalledTimes(2)

    clickSpy.mockRestore()
  })
})
