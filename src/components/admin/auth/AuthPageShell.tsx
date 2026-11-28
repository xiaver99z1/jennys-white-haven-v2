import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PasswordInput } from '#/components/common/PasswordInput'
import { DEFAULT_ADMIN_AUTH_LOGO } from '#/lib/constants/cms'
import { getPublicBrandLogos } from '#/server/cms-actions'

export function useCooldown(activeKey = 'default') {
  const [expiries, setExpiries] = useState<Record<string, number>>({})
  const [nowMs, setNowMs] = useState(() => Date.now())

  const normalizedActiveKey = activeKey.trim().toLowerCase() || 'default'
  const activeExpiry = expiries[normalizedActiveKey] ?? 0
  const cooldown =
    activeExpiry > nowMs ? Math.ceil((activeExpiry - nowMs) / 1000) : 0
  const isCoolingDown = cooldown > 0

  useEffect(() => {
    if (!isCoolingDown) return

    const syncNow = () => setNowMs(Date.now())
    const timer = setInterval(syncNow, 1000)
    window.addEventListener('focus', syncNow)
    document.addEventListener('visibilitychange', syncNow)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', syncNow)
      document.removeEventListener('visibilitychange', syncNow)
    }
  }, [isCoolingDown])

  const startCooldown = (
    durationSeconds: number,
    key: string = normalizedActiveKey,
  ) => {
    const targetKey = key.trim().toLowerCase()
    const currentNow = Date.now()
    setNowMs(currentNow)
    setExpiries((prev) => ({
      ...prev,
      [targetKey]: currentNow + durationSeconds * 1000,
    }))
  }

  return {
    cooldown,
    isCoolingDown,
    startCooldown,
  }
}

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
  const [logoSrc, setLogoSrc] = useState(DEFAULT_ADMIN_AUTH_LOGO)

  useEffect(() => {
    let active = true
    getPublicBrandLogos()
      .then((logos) => {
        if (
          active &&
          logos.adminAuthLogo &&
          logos.adminAuthLogo !== DEFAULT_ADMIN_AUTH_LOGO
        ) {
          setLogoSrc(logos.adminAuthLogo)
        }
      })
      .catch(() => {
        /* fall back to bundled default logo */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 px-4 py-8 font-sans">
      <div className="mb-6 flex flex-col items-center">
        <img
          src={logoSrc}
          alt={logoAlt}
          width={420}
          height={269}
          fetchPriority="high"
          decoding="async"
          className="h-28 sm:h-32 w-auto object-contain drop-shadow-2xs"
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
      <PasswordInput
        id={id}
        required
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        visible={showPassword}
        onVisibleChange={() => onToggleVisibility()}
        showLabel={showLabel}
        hideLabel={hideLabel}
        className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100"
      />
      {hint && <p className="text-[11px] text-stone-500 mt-1">{hint}</p>}
    </div>
  )
}
