import { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { PasswordInput } from '#/components/common/PasswordInput'

interface PasswordChallengeModalProps {
  isOpen: boolean
  targetName: string
  password: string
  isLoading?: boolean
  onPasswordChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function PasswordChallengeModal({
  isOpen,
  targetName,
  password,
  isLoading = false,
  onPasswordChange,
  onConfirm,
  onClose,
}: PasswordChallengeModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setShowPassword(false)
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key !== 'Tab') return

    const focusable = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([disabled]), button:not([disabled])',
      ),
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-dialog-title"
        aria-describedby="admin-auth-dialog-desc"
        onKeyDown={handleKeyDown}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="admin-auth-dialog-title"
              className="text-base font-bold text-stone-900"
            >
              Authenticate Password Change
            </h3>
            <p className="text-xs text-stone-500">
              Security verification required
            </p>
          </div>
        </div>

        <p
          id="admin-auth-dialog-desc"
          className="text-xs text-stone-600 leading-relaxed"
        >
          Enter your current administrator password to authorize changing the
          password for <span className="font-semibold">{targetName}</span>.
        </p>

        <div>
          <label
            htmlFor="admin-auth-password"
            className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5"
          >
            Your Administrator Password
          </label>
          <PasswordInput
            ref={inputRef}
            id="admin-auth-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter your password"
            visible={showPassword}
            onVisibleChange={setShowPassword}
            showLabel="Show administrator password"
            hideLabel="Hide administrator password"
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!password.trim() || isLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Verify &amp; Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
