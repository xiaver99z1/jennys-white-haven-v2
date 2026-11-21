import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Plus,
} from 'lucide-react'
import {
  HERO_FONT_OPTIONS,
  HERO_FONT_SIZE_OPTIONS,
  HERO_TEXT_COLORS,
  sanitizeHeroRichText,
} from '#/lib/hero-rich-text'

interface HeroRichTextEditorProps {
  value: string
  disabled?: boolean
  onChange: (nextHtml: string) => void
}

export function HeroRichTextEditor({
  value,
  disabled = false,
  onChange,
}: HeroRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastEmittedRef = useRef<string>(value)
  const [selectedFont, setSelectedFont] = useState<string>(
    HERO_FONT_OPTIONS[0].value,
  )
  const [selectedSize, setSelectedSize] = useState<string>('48px')

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastEmittedRef.current) {
      el.innerHTML = value
      lastEmittedRef.current = value
    } else if (el.innerHTML === '' && value !== '') {
      el.innerHTML = value
    }
  }, [value])

  function emitCurrentHtml() {
    const el = editorRef.current
    if (!el) return
    const clean = sanitizeHeroRichText(el.innerHTML)
    lastEmittedRef.current = clean
    onChange(clean)
  }

  function applyStyleToSelection(property: keyof CSSStyleDeclaration, cssValue: string) {
    const el = editorRef.current
    if (!el || disabled) return

    const selection = window.getSelection()
    const hasSelectionInEditor =
      selection &&
      selection.rangeCount > 0 &&
      el.contains(selection.anchorNode) &&
      el.contains(selection.focusNode)

    if (hasSelectionInEditor && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      ;(span.style as unknown as Record<string, string>)[String(property)] =
        cssValue
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)
      selection.removeAllRanges()
      const nextRange = document.createRange()
      nextRange.selectNodeContents(span)
      selection.addRange(nextRange)
      emitCurrentHtml()
      return
    }

    // Collapsed selection or unfocused editor: apply to current block or all top-level lines
    if (hasSelectionInEditor) {
      let node: Node | null = selection.anchorNode
      while (node && node.parentNode !== el) {
        node = node.parentNode
      }
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const blockEl = node as HTMLElement
        const styledDescendants = blockEl.querySelectorAll('span')
        if (styledDescendants.length > 0) {
          for (const child of styledDescendants) {
            ;(child.style as unknown as Record<string, string>)[
              String(property)
            ] = cssValue
          }
        } else {
          ;(blockEl.style as unknown as Record<string, string>)[
            String(property)
          ] = cssValue
        }
        emitCurrentHtml()
        return
      }
    }

    // Apply across all top-level blocks or wrap raw text in a span
    if (el.children.length > 0) {
      for (const child of Array.from(el.children)) {
        const htmlChild = child as HTMLElement
        const spans = htmlChild.querySelectorAll('span')
        if (spans.length > 0) {
          for (const s of spans) {
            ;(s.style as unknown as Record<string, string>)[String(property)] =
              cssValue
          }
        } else {
          ;(htmlChild.style as unknown as Record<string, string>)[
            String(property)
          ] = cssValue
        }
      }
    } else if (el.textContent.trim()) {
      const p = document.createElement('p')
      const span = document.createElement('span')
      ;(span.style as unknown as Record<string, string>)[String(property)] =
        cssValue
      span.textContent = el.textContent
      p.appendChild(span)
      el.innerHTML = ''
      el.appendChild(p)
    }
    emitCurrentHtml()
  }

  function toggleInlineTag(command: 'bold' | 'italic') {
    const el = editorRef.current
    if (!el || disabled) return
    el.focus()

    const selection = window.getSelection()
    if (
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      el.contains(selection.anchorNode)
    ) {
      if (typeof document.execCommand === 'function') {
        document.execCommand(command)
        emitCurrentHtml()
        return
      }
      applyStyleToSelection(
        command === 'bold' ? 'fontWeight' : 'fontStyle',
        command === 'bold' ? 'bold' : 'italic',
      )
      return
    }

    // No text selected: toggle on active/all blocks
    const prop = command === 'bold' ? 'fontWeight' : 'fontStyle'
    const activeVal = command === 'bold' ? 'bold' : 'italic'
    const currentIsSet = el.innerHTML.includes(
      command === 'bold' ? 'font-weight: bold' : 'font-style: italic',
    )
    applyStyleToSelection(prop, currentIsSet ? 'normal' : activeVal)
  }

  function applyAlignment(align: 'left' | 'center' | 'right') {
    const el = editorRef.current
    if (!el || disabled) return
    if (el.children.length > 0) {
      for (const child of Array.from(el.children)) {
        ;(child as HTMLElement).style.textAlign = align
      }
    } else {
      const p = document.createElement('p')
      p.style.textAlign = align
      p.textContent = el.textContent
      el.innerHTML = ''
      el.appendChild(p)
    }
    emitCurrentHtml()
  }

  function appendPresetLine(kind: 'title' | 'subtitle') {
    const el = editorRef.current
    if (!el || disabled) return
    const p = document.createElement('p')
    const span = document.createElement('span')
    if (kind === 'title') {
      span.style.fontFamily = HERO_FONT_OPTIONS[0].value
      span.style.fontSize = '56px'
      span.style.fontWeight = '600'
      span.style.color = '#FAF8F4'
      span.textContent = "Jenny's White Haven"
    } else {
      span.style.fontFamily = HERO_FONT_OPTIONS[1].value
      span.style.fontSize = '18px'
      span.style.color = '#E7E5E4'
      span.textContent = 'A cozy island sanctuary on Camotes Island, Cebu.'
    }
    p.appendChild(span)
    el.appendChild(p)
    emitCurrentHtml()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-stone-600">
          Slide Title &amp; Subtitle Editor (optional)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => appendPresetLine('title')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[10px] font-semibold text-stone-700 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Title Line
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => appendPresetLine('subtitle')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[10px] font-semibold text-stone-700 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Subtitle Line
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-t-xl border border-stone-200 bg-stone-50">
        <select
          aria-label="Font style"
          disabled={disabled}
          value={selectedFont}
          onChange={(e) => {
            const nextFont = e.target.value
            setSelectedFont(nextFont)
            applyStyleToSelection('fontFamily', nextFont)
          }}
          className="px-2 py-1 rounded-lg border border-stone-200 bg-white text-[11px] text-stone-800 focus:outline-none"
        >
          {HERO_FONT_OPTIONS.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Font size"
          disabled={disabled}
          value={selectedSize}
          onChange={(e) => {
            const nextSize = e.target.value
            setSelectedSize(nextSize)
            applyStyleToSelection('fontSize', nextSize)
          }}
          className="px-2 py-1 rounded-lg border border-stone-200 bg-white text-[11px] text-stone-800 focus:outline-none"
        >
          {HERO_FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-stone-200 mx-0.5" />

        <button
          type="button"
          disabled={disabled}
          aria-label="Toggle bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleInlineTag('bold')}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer disabled:opacity-50"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Toggle italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleInlineTag('italic')}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer disabled:opacity-50"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-stone-200 mx-0.5" />

        <button
          type="button"
          disabled={disabled}
          aria-label="Align left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyAlignment('left')}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer disabled:opacity-50"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Align center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyAlignment('center')}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer disabled:opacity-50"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Align right"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyAlignment('right')}
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 cursor-pointer disabled:opacity-50"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-stone-200 mx-0.5" />

        <div className="flex items-center gap-1" role="group" aria-label="Text color">
          {HERO_TEXT_COLORS.map((swatch) => (
            <button
              key={swatch.value}
              type="button"
              disabled={disabled}
              title={swatch.label}
              aria-label={`Set color ${swatch.label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyStyleToSelection('color', swatch.value)}
              style={{ backgroundColor: swatch.value }}
              className="w-5 h-5 rounded-full border border-stone-300 shadow-2xs cursor-pointer disabled:opacity-50"
            />
          ))}
        </div>
      </div>

      {/* Rich Text Editable Surface (dark canvas matches hero banner contrast) */}
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Hero slide text editor"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emitCurrentHtml}
        onBlur={emitCurrentHtml}
        className="min-h-[120px] rounded-b-xl border border-t-0 border-stone-200 bg-stone-900 text-[#FAF8F4] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/20 overflow-auto"
      />
      <p className="text-[11px] text-stone-400">
        Highlight any text to style individual words or lines (font style, size,
        bold, italic, color), or leave blank for a pure photo slide.
      </p>
    </div>
  )
}
