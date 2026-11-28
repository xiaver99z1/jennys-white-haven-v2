import { useState } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  ref?: Ref<HTMLInputElement>
  visible?: boolean
  onVisibleChange?: (nextVisible: boolean) => void
  showLabel?: string
  hideLabel?: string
}

export function PasswordInput({
  ref,
  visible,
  onVisibleChange,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  className = '',
  ...inputProps
}: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = useState(false)
  const isControlled = visible !== undefined
  const isVisible = isControlled ? visible : internalVisible

  function handleToggle() {
    const next = !isVisible
    if (!isControlled) {
      setInternalVisible(next)
    }
    onVisibleChange?.(next)
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        className={`${className} pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`.trim()}
      />
      <button
        type="button"
        aria-label={isVisible ? hideLabel : showLabel}
        onClick={handleToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
