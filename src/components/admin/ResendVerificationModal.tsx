import { useState } from 'react'
import { resendVerificationEmail } from '#/server/admin-actions'

interface ResendVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void // Triggers loader refresh in parent
  user: {
    id: string
    name: string
    email: string
    activationEmailCount?: number | null
    lastActivationEmailSentAt?: string | Date | null
  } | null
}

export function ResendVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: ResendVerificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  if (!isOpen || !user) return null

  const MAX_PER_DAY = 3
  const now = new Date()
  const lastSent = user.lastActivationEmailSentAt
    ? new Date(user.lastActivationEmailSentAt)
    : null
  const isWithin24Hours =
    lastSent && now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000
  const currentCount = isWithin24Hours ? user.activationEmailCount || 0 : 0
  const isMaxReached = currentCount >= MAX_PER_DAY

  const handleResend = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const res = await resendVerificationEmail({
        data: { userId: user.id },
      })

      setMessage({ type: 'success', text: res.message })

      // 1. Invalidate route loader to refresh table data in real-time
      onSuccess()

      // 2. Automatically close modal after success message
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to send email.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 relative text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xl mx-auto mb-3 font-bold">
          ✉️
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-1">
          Resend Verification Email
        </h3>

        <p className="text-sm text-stone-500 mb-4">
          Send a new verification link to{' '}
          <span className="font-semibold text-stone-800">{user.email}</span>.
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 border text-left leading-relaxed ${
              message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {isMaxReached && !message && (
          <div className="p-3.5 rounded-xl text-xs mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-left leading-relaxed">
            ⚠️{' '}
            <strong>
              Maximum Daily Limit Reached ({currentCount}/{MAX_PER_DAY}):
            </strong>{' '}
            You have already resent {MAX_PER_DAY} verification emails to this
            address today. Please wait 24 hours before sending another request.
          </div>
        )}

        {!isMaxReached && currentCount > 0 && !message && (
          <div className="p-3 rounded-xl text-xs mb-5 bg-amber-50 border border-amber-200 text-amber-900 text-left">
            ℹ️ Daily usage:{' '}
            <strong>
              {currentCount}/{MAX_PER_DAY}
            </strong>{' '}
            emails sent in the last 24 hours.
          </div>
        )}

        <div className="flex space-x-3 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={isMaxReached || loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
