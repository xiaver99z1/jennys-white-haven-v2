import { useState } from 'react'
import {
  AuthPageShell,
  PasswordField,
  useCooldown,
} from '#/components/admin/auth/AuthPageShell'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import { authClient } from '#/lib/auth-client'
import {
  RESEND_COOLDOWN_SECONDS,
  formatCooldownDuration,
} from '#/lib/constants/auth'
import { getErrorMessage } from '#/lib/formatters'
import { hasFieldErrors, validateEmailField } from '#/lib/validation'
import { logUserLogin, resendVerificationByEmail } from '#/server/auth-actions'
import type { StatusMessage } from '#/types'

const LOGIN_INPUT_CLASS =
  'w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition'

export function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string | null
    password?: string | null
  }>({})
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<StatusMessage | null>(null)
  const normalizedEmail = email.trim().toLowerCase()
  const { cooldown, isCoolingDown, startCooldown } =
    useCooldown(normalizedEmail)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setResendStatus(null)

    const nextErrors = {
      email: validateEmailField(email, { required: true }),
      password: !password ? 'Password is required.' : null,
    }
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (
          signInError.code === 'EMAIL_NOT_VERIFIED' ||
          signInError.message?.toLowerCase().includes('verify')
        ) {
          setNeedsVerification(true)
          setError(
            'Please check your email and activate your account before logging in.',
          )
        } else {
          setError(signInError.message || 'Invalid email or password')
        }
        return
      }

      await logUserLogin()
      window.location.replace('/admin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const requestedEmail = email.trim()
    const requestedKey = requestedEmail.toLowerCase()
    setResending(true)
    setResendStatus(null)

    try {
      const res = await resendVerificationByEmail({
        data: { email: requestedEmail },
      })
      setResendStatus({ type: 'success', text: res.message })
      startCooldown(RESEND_COOLDOWN_SECONDS, requestedKey)
    } catch (err: unknown) {
      setResendStatus({
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

  return (
    <AuthPageShell>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-stone-700 mb-1.5"
          >
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              const next = e.target.value
              setEmail(next)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateEmailField(next, { required: true }),
                }))
              }
            }}
            onBlur={() =>
              setFieldErrors((prev) => ({
                ...prev,
                email: validateEmailField(email, { required: true }),
              }))
            }
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
            className={getFieldValidationClass(
              LOGIN_INPUT_CLASS,
              Boolean(fieldErrors.email),
            )}
            placeholder="admin@example.com"
          />
          <FieldError id="admin-email-error" message={fieldErrors.email} />
        </div>

        <div>
          <PasswordField
            id="admin-password"
            label="Password"
            value={password}
            showPassword={showPassword}
            autoComplete="current-password"
            onChange={(val) => {
              setPassword(val)
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({
                  ...prev,
                  password: !val ? 'Password is required.' : null,
                }))
              }
            }}
            onToggleVisibility={() => setShowPassword((prev) => !prev)}
          />
          <FieldError
            id="admin-password-error"
            message={fieldErrors.password}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 space-y-2"
          >
            <p>{error}</p>
            {needsVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || isCoolingDown || !email.trim()}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
              >
                {resending
                  ? 'Sending verification email...'
                  : isCoolingDown
                    ? `Wait ${formatCooldownDuration(cooldown)} to resend`
                    : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        {resendStatus && (
          <p
            role={resendStatus.type === 'error' ? 'alert' : 'status'}
            className={`text-xs px-3 py-2 rounded-lg border ${
              resendStatus.type === 'success'
                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}
          >
            {resendStatus.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-lg shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthPageShell>
  )
}
