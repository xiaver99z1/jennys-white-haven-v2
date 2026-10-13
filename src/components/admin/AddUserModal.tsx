import { useState } from 'react'
import { createAdminUser, type ResortRole } from '#/server/admin-actions'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ResortRole>('RECEPTIONIST')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setMessage(null)
    setName('')
    setEmail('')
    setRole('RECEPTIONIST')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await createAdminUser({
        data: {
          name,
          email,
          role,
        },
      })

      // Show success message
      setMessage({
        type: 'success',
        text: res.message,
      })

      // Reset form fields immediately
      setName('')
      setEmail('')
      setRole('RECEPTIONIST')

      // Trigger table refresh/refetch immediately
      if (onSuccess) {
        onSuccess()
      }

      // Auto-close modal after 1.5 seconds so admin reads the confirmation
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to process request.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200">
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          Add New Resort Staff
        </h2>

        {/* Dynamic Alert Banner */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-sm mb-5 border leading-relaxed ${
              message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Input */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              disabled={loading || message?.type === 'success'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jap Ocifares"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email Address Input */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={loading || message?.type === 'success'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@jennyswhitehaven.com"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Resort Role Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Role
            </label>
            <select
              value={role}
              disabled={loading || message?.type === 'success'}
              onChange={(e) => setRole(e.target.value as ResortRole)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
            >
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          {/* Modal Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || message?.type === 'success'}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || message?.type === 'success'}
              className="rounded-lg bg-amber-800 hover:bg-amber-900 px-5 py-2 text-sm font-medium text-white shadow-md transition disabled:opacity-60 flex items-center justify-center min-w-[110px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
