import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'

const verifyActivationToken = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    if (!data.token) {
      throw new Error('Verification token is missing.')
    }

    const user = await prisma.user.findFirst({
      where: {
        activationToken: data.token,
        activationTokenExpires: { gte: new Date() },
      },
    })

    if (!user) {
      throw new Error(
        'This activation link is invalid or has already been consumed.',
      )
    }

    // 1. Activate the user account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        activationToken: null,
        activationTokenExpires: null,
      },
    })

    // 2. Capture headers for IP and User-Agent logging
    const headers = getRequestHeaders()
    const ipAddress =
      headers.get('x-forwarded-for') || headers.get('x-real-ip') || '127.0.0.1'
    const userAgent = headers.get('user-agent') || 'Unknown User-Agent'

    // 3. Log the account activation activity under the user's ID
    await logActivity({
      userId: user.id,
      action: 'ACCOUNT_ACTIVATED',
      description: `Successfully activated account via email verification (${user.email})`,
      ipAddress,
      userAgent,
    })

    return {
      success: true,
      message: 'Email verified successfully!',
    }
  })

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
      {/* Resort Branding Logo */}
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

      {/* Main Verification Card */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-stone-200 text-center">
        {/* State: Verifying / Loading */}
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

        {/* State: Success */}
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

        {/* State: Invalid / Error */}
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
