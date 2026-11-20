import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthPageShell } from '#/components/admin/auth/AuthPageShell'
import { getErrorMessage } from '#/lib/formatters'
import { verifyActivationToken } from '#/server/auth-actions'

interface VerifyActivationViewProps {
  initialToken: string
}

export function VerifyActivationView({
  initialToken,
}: VerifyActivationViewProps) {
  const [token] = useState(() => initialToken.trim())
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>(
    () => (initialToken.trim() ? 'ready' : 'error'),
  )
  const [errorMessage, setErrorMessage] = useState(() =>
    initialToken.trim() ? '' : 'Verification token is missing.',
  )

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', '/verify-activation')
    }
  }, [])

  const handleVerify = async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      await verifyActivationToken({ data: { token } })
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMessage(
        getErrorMessage(
          err,
          'This activation link is invalid or has already been consumed.',
        ),
      )
    }
  }

  return (
    <AuthPageShell
      cardClassName="text-center"
      logoAlt="Jenny's White Haven Resort"
    >
      {status === 'ready' && (
        <div className="space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            Activate Your Account
          </h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            Click below to confirm your email address and activate your
            administrator account.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleVerify}
              className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              Verify &amp; Activate Account
            </button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="space-y-4 py-4">
          <div className="w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-lg font-bold text-stone-800">
            Verifying your account...
          </h1>
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
          <h1 className="text-xl font-bold text-stone-900">Email Verified!</h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            Your account has been successfully activated. You can now sign in to
            access the portal.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => window.location.replace('/admin/login')}
              className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
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
          <h1 className="text-xl font-bold text-stone-900">Invalid Link</h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => window.location.replace('/admin/login')}
              className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white font-semibold text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </AuthPageShell>
  )
}
