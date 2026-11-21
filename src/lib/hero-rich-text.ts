import type { CSSProperties } from 'react'

export interface HeroFontOption {
  label: string
  value: string
}

export const HERO_FONT_OPTIONS: readonly HeroFontOption[] = [
  { label: 'Editorial Serif', value: 'Georgia, Cambria, serif' },
  { label: 'Clean Sans', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Classic Display', value: '"Times New Roman", Times, serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, monospace' },
] as const

export const HERO_FONT_SIZE_OPTIONS: readonly string[] = [
  '14px',
  '16px',
  '18px',
  '22px',
  '28px',
  '36px',
  '48px',
  '56px',
  '64px',
] as const

export const HERO_TEXT_COLORS: readonly { label: string; value: string }[] = [
  { label: 'Warm Ivory', value: '#FAF8F4' },
  { label: 'Pure White', value: '#FFFFFF' },
  { label: 'Warm Gold', value: '#FDE68A' },
  { label: 'Soft Sand', value: '#E7E5E4' },
  { label: 'Charcoal', value: '#1C1917' },
] as const

const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'span',
])

const ALLOWED_FONT_FAMILIES = new Set(
  HERO_FONT_OPTIONS.map((opt) => opt.value.toLowerCase().replace(/\s+/g, ' ')),
)

const FONT_SIZE_RE = /^(\d{1,2}(?:\.\d+)?)(px|rem)$/i
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const RGB_COLOR_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
const ALLOWED_ALIGN = new Set(['left', 'center', 'right'])
const ALLOWED_WEIGHT = new Set([
  '400',
  '500',
  '600',
  '700',
  'normal',
  'bold',
])
const ALLOWED_FONT_STYLE = new Set(['normal', 'italic'])

function escapeHtmlText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function unescapeHtmlEntities(text: string): string {
  return text
    .replaceAll('&nbsp;', '\u00A0')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function sanitizeInlineStyle(rawStyle: string): Record<string, string> {
  const safe: Record<string, string> = {}
  const declarations = rawStyle.split(';')

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx === -1) continue
    const prop = decl.slice(0, colonIdx).trim().toLowerCase()
    const val = decl
      .slice(colonIdx + 1)
      .trim()
      .replace(/!important$/i, '')
      .trim()
    if (!val) continue

    if (prop === 'font-size') {
      const match = FONT_SIZE_RE.exec(val)
      if (match) {
        const num = Number(match[1])
        const unit = match[2].toLowerCase()
        if (
          (unit === 'px' && num >= 10 && num <= 84) ||
          (unit === 'rem' && num >= 0.75 && num <= 5.5)
        ) {
          safe['font-size'] = `${num}${unit}`
        }
      }
    } else if (prop === 'font-family') {
      const normalized = val.toLowerCase().replace(/\s+/g, ' ')
      if (ALLOWED_FONT_FAMILIES.has(normalized)) {
        safe['font-family'] = val
      } else if (normalized.includes('serif') && !normalized.includes('sans')) {
        safe['font-family'] = HERO_FONT_OPTIONS[0].value
      } else if (normalized.includes('mono')) {
        safe['font-family'] = HERO_FONT_OPTIONS[3].value
      } else if (normalized.includes('sans')) {
        safe['font-family'] = HERO_FONT_OPTIONS[1].value
      }
    } else if (prop === 'font-weight') {
      const lower = val.toLowerCase()
      if (ALLOWED_WEIGHT.has(lower)) {
        safe['font-weight'] = lower
      }
    } else if (prop === 'font-style') {
      const lower = val.toLowerCase()
      if (ALLOWED_FONT_STYLE.has(lower)) {
        safe['font-style'] = lower
      }
    } else if (prop === 'color') {
      if (HEX_COLOR_RE.test(val)) {
        safe.color = val
      } else {
        const rgb = RGB_COLOR_RE.exec(val)
        if (rgb) {
          const r = Number(rgb[1])
          const g = Number(rgb[2])
          const b = Number(rgb[3])
          if (r <= 255 && g <= 255 && b <= 255) {
            safe.color = `rgb(${r}, ${g}, ${b})`
          }
        }
      }
    } else if (prop === 'text-align') {
      const lower = val.toLowerCase()
      if (ALLOWED_ALIGN.has(lower)) {
        safe['text-align'] = lower
      }
    }
  }

  return safe
}

function serializeStyleMap(styleMap: Record<string, string>): string {
  return Object.entries(styleMap)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
}

export interface RichTextNode {
  type: 'text' | 'element'
  text?: string
  tag?: 'p' | 'div' | 'br' | 'b' | 'strong' | 'i' | 'em' | 'span'
  style?: CSSProperties
  children?: RichTextNode[]
}

function styleMapToCssProperties(
  styleMap: Record<string, string>,
): CSSProperties | undefined {
  const entries = Object.entries(styleMap)
  if (entries.length === 0) return undefined
  const css: CSSProperties = {}
  for (const [k, v] of entries) {
    if (k === 'font-size') css.fontSize = v
    else if (k === 'font-family') css.fontFamily = v
    else if (k === 'font-weight') css.fontWeight = v
    else if (k === 'font-style') css.fontStyle = v
    else if (k === 'color') css.color = v
    else if (k === 'text-align')
      css.textAlign = v as CSSProperties['textAlign']
  }
  return css
}

function extractStyleAttribute(attrString: string): string {
  const match =
    /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrString)
  return match ? (match[1] || match[2] || '') : ''
}

function serializeNodesToHtml(nodes: RichTextNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return escapeHtmlText(node.text ?? '')
      }
      const tag = node.tag!
      if (tag === 'br') return '<br />'
      const stylePairs: Record<string, string> = {}
      if (node.style?.fontSize) stylePairs['font-size'] = String(node.style.fontSize)
      if (node.style?.fontFamily)
        stylePairs['font-family'] = String(node.style.fontFamily)
      if (node.style?.fontWeight)
        stylePairs['font-weight'] = String(node.style.fontWeight)
      if (node.style?.fontStyle)
        stylePairs['font-style'] = String(node.style.fontStyle)
      if (node.style?.color) stylePairs.color = String(node.style.color)
      if (node.style?.textAlign)
        stylePairs['text-align'] = String(node.style.textAlign)
      const styleStr = serializeStyleMap(stylePairs)
      const styleAttr = styleStr ? ` style="${escapeHtmlText(styleStr)}"` : ''
      const inner = serializeNodesToHtml(node.children ?? [])
      return `<${tag}${styleAttr}>${inner}</${tag}>`
    })
    .join('')
}

/**
 * Parses arbitrary HTML into a strictly allowlisted RichTextNode tree.
 * Strips scripts, styles, unknown tags, and non-allowlisted CSS properties.
 * Runs identically in Node SSR and browser environments.
 */
export function parseHeroRichTextNodes(rawHtml?: string | null): RichTextNode[] {
  if (!rawHtml || !rawHtml.trim()) return []

  // Remove script/style/iframe blocks completely including inner content
  const withoutDangerous = rawHtml
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const root: RichTextNode = { type: 'element', tag: 'div', children: [] }
  const stack: RichTextNode[] = [root]

  const tokenRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(withoutDangerous)) !== null) {
    const closingSlash = match[1] as string | undefined
    const rawTagName = match[2] as string | undefined
    const attrs = (match[3] as string | undefined) ?? ''
    const textChunk = match[4] as string | undefined

    if (textChunk !== undefined) {
      const decoded = unescapeHtmlEntities(textChunk)
      if (decoded) {
        stack[stack.length - 1].children!.push({ type: 'text', text: decoded })
      }
      continue
    }

    if (!rawTagName) continue
    const tag = rawTagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) {
      continue
    }

    if (closingSlash) {
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === tag) {
          stack.length = i
          break
        }
      }
      continue
    }

    if (tag === 'br') {
      stack[stack.length - 1].children!.push({ type: 'element', tag: 'br' })
      continue
    }

    const rawStyle = extractStyleAttribute(attrs)
    const styleMap = rawStyle ? sanitizeInlineStyle(rawStyle) : {}
    const cssStyle = styleMapToCssProperties(styleMap)
    const elementNode: RichTextNode = {
      type: 'element',
      tag: tag as RichTextNode['tag'],
      ...(cssStyle ? { style: cssStyle } : {}),
      children: [],
    }
    stack[stack.length - 1].children!.push(elementNode)

    const isSelfClosing = /\/\s*$/.test(attrs)
    if (!isSelfClosing) {
      stack.push(elementNode)
    }
  }

  return root.children ?? []
}

export function sanitizeHeroRichText(rawHtml?: string | null): string {
  const nodes = parseHeroRichTextNodes(rawHtml)
  return serializeNodesToHtml(nodes)
}

export function hasVisibleRichText(rawHtml?: string | null): boolean {
  const nodes = parseHeroRichTextNodes(rawHtml)
  const walk = (list: RichTextNode[]): boolean =>
    list.some((node) => {
      if (node.type === 'text') return Boolean(node.text?.trim())
      return walk(node.children ?? [])
    })
  return walk(nodes)
}

export function buildDefaultHeroContentHtml(
  title?: string | null,
  subtitle?: string | null,
): string {
  const lines: string[] = []
  const cleanTitle = title?.trim()
  const cleanSubtitle = subtitle?.trim()
  if (cleanTitle) {
    lines.push(
      `<p><span style="font-family: ${HERO_FONT_OPTIONS[0].value}; font-size: 56px; font-weight: 600; color: #FAF8F4">${escapeHtmlText(cleanTitle)}</span></p>`,
    )
  }
  if (cleanSubtitle) {
    lines.push(
      `<p><span style="font-family: ${HERO_FONT_OPTIONS[1].value}; font-size: 18px; color: #E7E5E4">${escapeHtmlText(cleanSubtitle)}</span></p>`,
    )
  }
  return lines.join('')
}
