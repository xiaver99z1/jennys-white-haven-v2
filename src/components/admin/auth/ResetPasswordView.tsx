import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { getErrorMessage } from '#/lib/formatters'
import { resetPasswordWithToken } from '#/server/auth-actions'

interface ResetPasswordViewProps {
  initialToken: string
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8 || pwd.length > 128) {
    return 'Password must be between 8 and 128 characters long.'
  }
  if (
    !/[A-Z]/.test(pwd) ||
    !/[a-z]/.test(pwd) ||
    !/[0-9]/.test(pwd) ||
    !/[^A-Za-z0-9]/.test(pwd)
  ) {
    return 'Password must include uppercase, lowercase, a number, and a special character.'
  }
  return null
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 p-4 font-sans">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/admin-login-logo.png"
            alt="Jenny's White Haven"
            className="h-24 w-auto object-contain"
          />
        </div>
        <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl border border-stone-200/80 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            ✕
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            Invalid Reset Link
          </h1>
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
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pwdError = validatePassword(newPassword)
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 p-4 font-sans">
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/admin-login-logo.png"
          alt="Jenny's White Haven"
          className="h-24 w-auto object-contain"
        />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl border border-stone-200/80">
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
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden transition"
                  />
                  <button
                    type="button"
                    aria-label={
                      showNewPassword ? 'Hide password' : 'Show password'
                    }
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  8+ characters with uppercase, lowercase, number, and symbol.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden transition"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

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
      </div>
    </div>
  )
}
