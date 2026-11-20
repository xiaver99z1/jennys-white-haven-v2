import type { ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface AuthPageShellProps {
  children: ReactNode
  cardClassName?: string
  logoAlt?: string
}

export function AuthPageShell({
  children,
  cardClassName = '',
  logoAlt = "Jenny's White Haven",
}: AuthPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 px-4 py-8 font-sans">
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/admin-login-logo.png"
          alt={logoAlt}
          className="h-24 w-auto object-contain"
        />
      </div>

      <div
        className={`w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl border border-stone-200/80 ${cardClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  showPassword: boolean
  disabled?: boolean
  autoComplete?: string
  hint?: string
  showLabel?: string
  hideLabel?: string
  onChange: (value: string) => void
  onToggleVisibility: () => void
}

export function PasswordField({
  id,
  label,
  value,
  showPassword,
  disabled = false,
  autoComplete = 'new-password',
  hint,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-stone-700 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden transition disabled:bg-stone-100"
        />
        <button
          type="button"
          aria-label={showPassword ? hideLabel : showLabel}
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {hint && <p className="text-[11px] text-stone-500 mt-1">{hint}</p>}
    </div>
  )
}
