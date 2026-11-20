import { useState } from 'react'
import { MailCheck, ShieldCheck } from 'lucide-react'
import {
  AuthPageShell,
  PasswordField,
  useCooldown,
} from '#/components/admin/auth/AuthPageShell'
import {
  EMAIL_REGEX,
  FULL_NAME_MAX_LENGTH,
  FULL_NAME_MIN_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  formatCooldownDuration,
  validateStrongPassword,
} from '#/lib/constants/auth'
import { getErrorMessage } from '#/lib/formatters'
import { resendVerificationByEmail } from '#/server/auth-actions'
import { createInitialSuperAdmin } from '#/server/setup-actions'
import type { StatusMessage } from '#/types'

export function AdminSetupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const { cooldown, isCoolingDown, startCooldown } = useCooldown()
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<StatusMessage | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (
      trimmedName.length < FULL_NAME_MIN_LENGTH ||
      trimmedName.length > FULL_NAME_MAX_LENGTH
    ) {
      setError(
        `Full name must be between ${FULL_NAME_MIN_LENGTH} and ${FULL_NAME_MAX_LENGTH} characters.`,
      )
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    const passwordError = validateStrongPassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await createInitialSuperAdmin({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          password,
          confirmPassword,
        },
      })

      setPassword('')
      setConfirmPassword('')
      setRegisteredEmail(trimmedEmail)
      startCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Failed to complete initial setup. Please try again.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendMessage(null)

    try {
      const res = await resendVerificationByEmail({
        data: { email: registeredEmail! },
      })
      setResendMessage({ type: 'success', text: res.message })
      startCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: unknown) {
      setResendMessage({
        type: 'error',
        text: getErrorMessage(
          err,
          'Failed to resend verification email. Please try again.',
        ),
      })
    } finally {
      setResending(false)
    }
  }

  if (registeredEmail) {
    return (
      <AuthPageShell cardClassName="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-stone-900">Verify Your Email</h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Your Super Admin account has been created. We sent a one-time
          verification link to{' '}
          <span className="font-semibold text-stone-900">
            {registeredEmail}
          </span>
          .
        </p>
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
          Open the link in your inbox within 1 hour to activate your account
          before signing in.
        </p>

        {resendMessage && (
          <p
            role={resendMessage.type === 'error' ? 'alert' : 'status'}
            className={`mt-4 text-xs px-3 py-2 rounded-lg border ${
              resendMessage.type === 'success'
                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}
          >
            {resendMessage.text}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => window.location.replace('/admin/login')}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-lg shadow-md transition cursor-pointer"
          >
            Go to Sign In
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || isCoolingDown}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {resending
              ? 'Sending verification email...'
              : isCoolingDown
                ? `Resend email in ${formatCooldownDuration(cooldown)}`
                : 'Resend Verification Email'}
          </button>
        </div>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell>
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Initial Setup
        </span>
        <h1 className="text-xl font-bold text-stone-900">
          Create Super Admin Account
        </h1>
        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
          No users have been added yet. Set up your primary administrator
          account and verify your email to unlock the portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="setup-name"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Full Name
          </label>
          <input
            id="setup-name"
            type="text"
            required
            autoComplete="name"
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100"
            placeholder="e.g. Jenny Admin"
          />
        </div>

        <div>
          <label
            htmlFor="setup-email"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="setup-email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100"
            placeholder="admin@jennyswhitehaven.com"
          />
        </div>

        <PasswordField
          id="setup-password"
          label="Password"
          value={password}
          showPassword={showPassword}
          disabled={loading}
          hint="8+ characters with uppercase, lowercase, number, and symbol."
          onChange={setPassword}
          onToggleVisibility={() => setShowPassword((prev) => !prev)}
        />

        <PasswordField
          id="setup-confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          showPassword={showConfirmPassword}
          disabled={loading}
          showLabel="Show confirm password"
          hideLabel="Hide confirm password"
          onChange={setConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
        />

        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-lg shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Creating Super Admin...' : 'Create Super Admin'}
        </button>
      </form>
    </AuthPageShell>
  )
}
