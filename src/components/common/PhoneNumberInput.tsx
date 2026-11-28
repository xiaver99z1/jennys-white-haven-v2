import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  composeStoredPhone,
  getPhoneCountryOption,
  parseStoredPhone,
  sanitizeNationalDigits,
} from '#/lib/phone'
import type { PhoneCountryIso } from '#/lib/phone'

export interface PhoneNumberInputProps {
  id?: string
  value: string
  onChange: (nextStoredPhone: string) => void
  defaultCountry?: PhoneCountryIso
  required?: boolean
  disabled?: boolean
  placeholder?: string
  size?: 'sm' | 'md'
  variant?: 'public' | 'admin'
  countrySelectLabel?: string
}

export function PhoneNumberInput({
  id,
  value,
  onChange,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  required = false,
  disabled = false,
  placeholder,
  size = 'md',
  variant = 'public',
  countrySelectLabel = 'Select country calling code',
}: PhoneNumberInputProps) {
  const generatedId = useId()
  const inputId = id ?? `phone-input-${generatedId}`
  const listboxId = `${inputId}-country-listbox`

  const initialParsed = parseStoredPhone(value, defaultCountry)
  const [countryIso, setCountryIso] = useState<PhoneCountryIso>(
    initialParsed.countryIso,
  )
  const [nationalNumber, setNationalNumber] = useState<string>(
    initialParsed.nationalNumber,
  )
  const [open, setOpen] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastEmittedRef = useRef<string>(value)

  // Synchronize internal state when parent resets or loads an external guest phone
  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    if (!value.trim()) {
      setNationalNumber('')
      return
    }
    const parsed = parseStoredPhone(value, countryIso)
    setCountryIso(parsed.countryIso)
    setNationalNumber(parsed.nationalNumber)
  }, [value, countryIso])

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const activeCountry = getPhoneCountryOption(countryIso)

  function emitChange(nextIso: PhoneCountryIso, nextNational: string) {
    const composed = composeStoredPhone(nextIso, nextNational)
    lastEmittedRef.current = composed
    onChange(composed)
  }

  function handleSelectCountry(nextIso: PhoneCountryIso) {
    const nextOption = getPhoneCountryOption(nextIso)
    const cleanedNational = sanitizeNationalDigits(nationalNumber, nextOption)
    setCountryIso(nextIso)
    setNationalNumber(cleanedNational)
    setOpen(false)
    emitChange(nextIso, cleanedNational)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  function handleInputChange(rawInput: string) {
    const trimmed = rawInput.trim()
    if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
      const detected = parseStoredPhone(trimmed, countryIso)
      setCountryIso(detected.countryIso)
      setNationalNumber(detected.nationalNumber)
      emitChange(detected.countryIso, detected.nationalNumber)
      return
    }
    const cleaned = sanitizeNationalDigits(rawInput, activeCountry)
    setNationalNumber(cleaned)
    emitChange(countryIso, cleaned)
  }

  const paddingClass =
    size === 'sm' ? 'py-2 text-xs' : 'py-2.5 text-sm'
  const ringClass =
    variant === 'admin'
      ? 'focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-600'
      : 'focus-within:ring-2 focus-within:ring-amber-700/20 focus-within:border-amber-700'

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`flex items-stretch rounded-xl border border-stone-200 bg-white transition ${ringClass} ${
          disabled ? 'opacity-60 bg-stone-100' : ''
        }`}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={`${countrySelectLabel} (${activeCountry.name} ${activeCountry.dialCode})`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          onClick={() => setOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 pl-3 pr-2.5 ${paddingClass} rounded-l-xl border-r border-stone-200 bg-stone-50/90 hover:bg-stone-100 text-stone-800 font-semibold shrink-0 transition cursor-pointer disabled:cursor-not-allowed`}
        >
          <span className="px-1.5 py-0.5 rounded bg-stone-200/80 text-[10px] font-bold tracking-wider text-stone-700">
            {activeCountry.iso}
          </span>
          <span>{activeCountry.dialCode}</span>
          <ChevronDown
            className={`size-3.5 text-stone-500 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete={
            activeCountry.iso === 'INTL' ? 'tel' : 'tel-national'
          }
          required={required}
          disabled={disabled}
          value={nationalNumber}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder ?? activeCountry.placeholder}
          className={`w-full min-w-0 px-3 ${paddingClass} rounded-r-xl bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none`}
        />
      </div>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={countrySelectLabel}
          className="absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2.5rem)] max-h-60 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl py-1.5 z-50"
        >
          {PHONE_COUNTRIES.map((option) => {
            const isSelected = option.iso === countryIso
            return (
              <button
                key={option.iso}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectCountry(option.iso)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 text-stone-950 font-semibold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 py-0.5 rounded bg-stone-200/80 text-[10px] font-bold text-stone-700 text-center shrink-0">
                    {option.iso}
                  </span>
                  <span className="truncate">{option.name}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0 text-stone-600 font-medium">
                  <span>{option.dialCode}</span>
                  {isSelected && <Check className="size-3.5 text-amber-800" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
