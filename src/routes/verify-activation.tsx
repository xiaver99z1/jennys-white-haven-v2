import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { verifyActivationToken } from '#/server/auth-actions' // 👈 Import server function

export const Route = createFileRoute('/verify-activation')({
  head: () => ({
    meta: [
      {
        title: "Account Activation | Jenny's White Haven Resort",
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
  component: VerifyActivationPage,
})

function VerifyActivationPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')

  const hasExecutedRef = useRef(false)

  useEffect(() => {
    if (hasExecutedRef.current || status === 'success') return

    if (!token) {
      setStatus('error')
      setErrorMessage('Verification token is missing.')
      return
    }

    hasExecutedRef.current = true

    verifyActivationToken({ data: { token } })
      .then(() => {
        setStatus('success')
      })
      .catch((err: any) => {
        setStatus('error')
        setErrorMessage(
          err.message ||
            'This activation link is invalid or has already been consumed.',
        )
      })
  }, [token, status])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-4 font-sans">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <img
          src="/admin-login-logo.png"
          alt="Jenny's White Haven Resort"
          className="h-20 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-stone-200 text-center">
        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-lg font-bold text-stone-800">
              Verifying your account...
            </h2>
            <p className="text-xs text-stone-500">
              Please wait while we activate your email.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-stone-900">
              Email Verified!
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Your staff account has been successfully activated. You can now
              sign in to access the resort portal.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate({ to: '/admin/login' })}
                className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
              ✕
            </div>
            <h2 className="text-xl font-bold text-stone-900">Invalid Link</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              {errorMessage ||
                'This activation link is invalid or has already been consumed.'}
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate({ to: '/admin/login' })}
                className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
