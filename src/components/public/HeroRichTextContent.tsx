import { Fragment } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { parseHeroRichTextNodes } from '#/lib/hero-rich-text'
import type { RichTextNode } from '#/lib/hero-rich-text'

function scaleFontStyle(style?: CSSProperties): CSSProperties | undefined {
  if (!style?.fontSize) return style
  return {
    ...style,
    fontSize: `max(12px, calc(${String(style.fontSize)} * var(--hero-font-scale, 1)))`,
  }
}

function renderRichNodes(nodes: RichTextNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`
    if (node.type === 'text') {
      return <Fragment key={key}>{node.text}</Fragment>
    }

    const children = renderRichNodes(node.children ?? [], key)
    const style = scaleFontStyle(node.style)
    switch (node.tag) {
      case 'br':
        return <br key={key} />
      case 'p':
        return (
          <p key={key} style={style} className="leading-tight mb-2 last:mb-0">
            {children}
          </p>
        )
      case 'div':
        return (
          <div key={key} style={style} className="leading-tight mb-2 last:mb-0">
            {children}
          </div>
        )
      case 'b':
      case 'strong':
        return (
          <strong key={key} style={style} className="font-bold">
            {children}
          </strong>
        )
      case 'i':
      case 'em':
        return (
          <em key={key} style={style} className="italic">
            {children}
          </em>
        )
      default:
        return (
          <span key={key} style={style}>
            {children}
          </span>
        )
    }
  })
}

interface HeroRichTextContentProps {
  html: string
  className?: string
}

export function HeroRichTextContent({
  html,
  className,
}: HeroRichTextContentProps) {
  const nodes = parseHeroRichTextNodes(html)
  if (nodes.length === 0) return null
  return <div className={className}>{renderRichNodes(nodes, 'hero-rt')}</div>
}
