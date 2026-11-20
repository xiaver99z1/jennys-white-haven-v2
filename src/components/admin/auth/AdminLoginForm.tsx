import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { getErrorMessage } from '#/lib/formatters'
import { logUserLogin, resendVerificationByEmail } from '#/server/auth-actions'
import { Eye, EyeOff } from 'lucide-react'

export function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setResendStatus(null)
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

      // Record login activity on the server now that session cookie is active
      await logUserLogin()

      window.location.replace('/admin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    setResendStatus(null)

    try {
      const res = await resendVerificationByEmail({
        data: { email: email.trim() },
      })
      setResendStatus({ type: 'success', text: res.message })
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 px-4">
      {/* Pure Logo Outside the Card */}
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/admin-login-logo.png"
          alt="Jenny's White Haven"
          className="h-25 w-auto object-contain"
        />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-stone-200/80 p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
                  disabled={resending || !email.trim()}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline disabled:opacity-60 cursor-pointer"
                >
                  {resending
                    ? 'Sending verification email...'
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
      </div>
    </div>
  )
}
