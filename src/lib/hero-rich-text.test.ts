import { describe, it, expect } from 'vitest'
import {
  HERO_FONT_OPTIONS,
  buildDefaultHeroContentHtml,
  hasVisibleRichText,
  parseHeroRichTextNodes,
  sanitizeHeroRichText,
  sanitizeInlineStyle,
} from './hero-rich-text'

describe('hero-rich-text', () => {
  it('sanitizes allowed formatting tags and inline styles while stripping XSS payloads', () => {
    const dirty =
      '<script>alert(1)</script><p style="text-align: center; background: url(javascript:evil)"><span style="font-size: 48px; font-family: Georgia, Cambria, serif; font-weight: bold; font-style: italic; color: #FAF8F4; position: fixed">Welcome</span><img src="x" onerror="alert(2)" /><br /><strong>Haven</strong> &amp; <em>Sea</em></p>'

    const clean = sanitizeHeroRichText(dirty)
    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('alert')
    expect(clean).not.toContain('<img')
    expect(clean).not.toContain('position:')
    expect(clean).not.toContain('background:')
    expect(clean).toContain('font-size: 48px')
    expect(clean).toContain('font-weight: bold')
    expect(clean).toContain('font-style: italic')
    expect(clean).toContain('color: #FAF8F4')
    expect(clean).toContain('text-align: center')
    expect(clean).toContain('<strong>Haven</strong>')
    expect(clean).toContain('<em>Sea</em>')
    expect(clean).toContain('<br />')
  })

  it('validates inline style allowlists including rgb colors, font fallbacks, and bounds', () => {
    expect(
      sanitizeInlineStyle(
        'font-size: 2rem; font-family: monospace; color: rgb(250, 248, 244); font-weight: 600; font-style: normal; text-align: right',
      ),
    ).toEqual({
      'font-size': '2rem',
      'font-family': HERO_FONT_OPTIONS[5].value,
      color: 'rgb(250, 248, 244)',
      'font-weight': '600',
      'font-style': 'normal',
      'text-align': 'right',
    })

    // Out-of-range sizes, invalid rgb, unknown properties are dropped
    expect(
      sanitizeInlineStyle(
        'font-size: 999px; color: rgb(300, 0, 0); font-family: Arial, sans-serif; unknown: 1; broken',
      ),
    ).toEqual({
      'font-family': HERO_FONT_OPTIONS[3].value,
    })

    expect(sanitizeInlineStyle('font-family: Custom Serif')).toEqual({
      'font-family': HERO_FONT_OPTIONS[4].value,
    })
    expect(
      sanitizeInlineStyle('font-family: "Cormorant Garamond", Georgia, serif'),
    ).toEqual({
      'font-family': HERO_FONT_OPTIONS[0].value,
    })
  })

  it('builds default hero HTML and detects visible text', () => {
    const html = buildDefaultHeroContentHtml(
      "Jenny's White Haven",
      'Quiet coastal rooms.',
    )
    expect(html).toContain('Jenny&#39;s White Haven')
    expect(html).toContain('Quiet coastal rooms.')
    expect(hasVisibleRichText(html)).toBe(true)
    expect(hasVisibleRichText('<p><br /></p>')).toBe(false)
    expect(hasVisibleRichText('')).toBe(false)
    expect(parseHeroRichTextNodes('')).toEqual([])
  })
})
