import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  useCurrency,
} from '#/lib/currency'
import { useI18n } from '#/lib/i18n'

interface CurrencySelectorProps {
  variant?: 'desktop' | 'mobile'
}

export function CurrencySelector({
  variant = 'desktop',
}: CurrencySelectorProps) {
  const { currency, currencyOption, setCurrency } = useCurrency()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  function focusOption(index: number) {
    const items = optionRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null,
    )
    if (items.length === 0) return
    const bounded = ((index % items.length) + items.length) % items.length
    items[bounded].focus()
  }

  function openAndFocusSelected(fallbackIndex: number) {
    const selectedIdx = SUPPORTED_CURRENCIES.findIndex(
      (opt) => opt.code === currency,
    )
    setOpen(true)
    requestAnimationFrame(() => {
      focusOption(selectedIdx >= 0 ? selectedIdx : fallbackIndex)
    })
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openAndFocusSelected(0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openAndFocusSelected(SUPPORTED_CURRENCIES.length - 1)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  function handleListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = optionRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null,
    )
    const activeIndex = items.findIndex((item) => item === document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOption(activeIndex === -1 ? 0 : activeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(activeIndex === -1 ? items.length - 1 : activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOption(items.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const hadFocusInside = containerRef.current?.contains(
          document.activeElement,
        )
        setOpen(false)
        if (hadFocusInside) {
          triggerRef.current?.focus()
        }
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (variant === 'mobile') {
    return (
      <div className="pt-3 border-t border-stone-200/70 space-y-2 normal-case tracking-normal">
        <label
          htmlFor="mobile-currency-select"
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-stone-400 font-semibold"
        >
          <Globe className="w-3.5 h-3.5 text-amber-800" />
          {t.currency.mobileLabel}
        </label>
        <select
          id="mobile-currency-select"
          aria-label="Select currency"
          value={currency}
          onChange={(e) => {
            if (isSupportedCurrency(e.target.value)) {
              setCurrency(e.target.value)
            }
          }}
          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        >
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.country} — {option.code} ({option.symbol})
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative normal-case tracking-normal"
      onBlur={(event) => {
        if (
          containerRef.current &&
          (!event.relatedTarget ||
            !(event.relatedTarget instanceof Node) ||
            !containerRef.current.contains(event.relatedTarget))
        ) {
          setOpen(false)
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Select currency (current: ${currencyOption.code})`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? 'public-currency-listbox' : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-stone-200/90 bg-white/80 hover:bg-white hover:border-stone-300 text-xs font-semibold text-stone-700 hover:text-stone-950 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40"
      >
        <Globe className="w-3.5 h-3.5 text-amber-800 shrink-0" />
        <span>{currencyOption.code}</span>
        <span className="text-stone-400 font-normal">
          {currencyOption.symbol}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-stone-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl bg-[#FAF8F4] border border-stone-200/85 shadow-xl py-2 z-50">
          <div
            id="public-currency-heading"
            className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-stone-400 font-semibold"
          >
            {t.currency.displayRatesIn}
          </div>
          <div
            id="public-currency-listbox"
            role="listbox"
            aria-labelledby="public-currency-heading"
            onKeyDown={handleListboxKeyDown}
            className="max-h-72 overflow-y-auto py-0.5"
          >
            {SUPPORTED_CURRENCIES.map((option, index) => {
              const isSelected = option.code === currency
              return (
                <button
                  key={option.code}
                  ref={(el) => {
                    optionRefs.current[index] = el
                  }}
                  type="button"
                  role="option"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  onClick={() => {
                    setCurrency(option.code)
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                  className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 transition cursor-pointer focus:outline-none focus:bg-[#F3EFE7] ${
                    isSelected
                      ? 'bg-amber-100/60 text-stone-950'
                      : 'hover:bg-[#F3EFE7] text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-5 rounded bg-stone-200/80 text-[10px] font-bold text-stone-700 inline-flex items-center justify-center shrink-0">
                      {option.countryCode}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-900 truncate">
                        {option.country}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {option.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-stone-800">
                      {option.code}{' '}
                      <span className="text-stone-500 font-normal">
                        ({option.symbol})
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-800" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="px-3.5 pt-2 pb-1 mt-1 border-t border-stone-200/70 text-[10px] text-stone-500 leading-snug">
            {t.currency.billingHint}
          </div>
        </div>
      )}
    </div>
  )
}
