import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import {
  AuthPageShell,
  PasswordField,
} from '#/components/admin/auth/AuthPageShell'
import { validateStrongPassword } from '#/lib/constants/auth'
import { getErrorMessage } from '#/lib/formatters'
import { resetPasswordWithToken } from '#/server/auth-actions'

interface ResetPasswordViewProps {
  initialToken: string
}

export function ResetPasswordView({ initialToken }: ResetPasswordViewProps) {
  const [token] = useState(() => initialToken.trim())
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', '/reset-password')
    }
  }, [])

  if (!token) {
    return (
      <AuthPageShell cardClassName="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
          ✕
        </div>
        <h1 className="text-xl font-bold text-stone-900">Invalid Reset Link</h1>
        <p className="text-xs text-stone-500 leading-relaxed">
          Password reset token is missing. Please request a new password reset
          link from your account settings.
        </p>
        <button
          type="button"
          onClick={() => window.location.replace('/admin/login')}
          className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
        >
          Return to Login
        </button>
      </AuthPageShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pwdError = validateStrongPassword(newPassword)
    if (pwdError) {
      setError(pwdError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await resetPasswordWithToken({
        data: {
          token,
          newPassword,
          confirmPassword,
        },
      })
      setNewPassword('')
      setConfirmPassword('')
      setCompleted(true)
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'This password reset link is invalid or has already been used.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      {completed ? (
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            Password Reset Complete
          </h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            Your password has been updated and all active sessions have been
            signed out for your security.
          </p>
          <button
            type="button"
            onClick={() => window.location.replace('/admin/login')}
            className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">
              Set New Password
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Choose a strong new password for your administrator account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <PasswordField
              id="reset-new-password"
              label="New Password"
              value={newPassword}
              showPassword={showNewPassword}
              disabled={loading}
              hint="8+ characters with uppercase, lowercase, number, and symbol."
              onChange={setNewPassword}
              onToggleVisibility={() => setShowNewPassword((prev) => !prev)}
            />

            <PasswordField
              id="reset-confirm-password"
              label="Confirm New Password"
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
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-lg shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        </>
      )}
    </AuthPageShell>
  )
}
