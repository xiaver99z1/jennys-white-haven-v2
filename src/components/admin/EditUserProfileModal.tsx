import { useState, useEffect } from 'react'
import { updateAdminUser, type ResortRole } from '#/server/admin-actions'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: {
    id: string
    name: string
    role: string | null
  } | null
}

export function EditUserProfileModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: EditUserModalProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<ResortRole>('RECEPTIONIST')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Initial values for dirty check
  const initialName = user?.name || ''
  const initialRole =
    (user?.role?.toUpperCase() as ResortRole) || 'RECEPTIONIST'

  // Check if any changes were made
  const hasChanges =
    name !== initialName ||
    role !== initialRole ||
    password.trim() !== '' ||
    confirmPassword.trim() !== ''

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setRole((user.role?.toUpperCase() as ResortRole) || 'RECEPTIONIST')
      setPassword('')
      setConfirmPassword('')
      setMessage(null)
      setShowConfirm(false)
    }
  }, [user])

  if (!isOpen || !user) return null

  const validatePassword = (pwd: string) => {
    if (!pwd) return null
    if (pwd.length < 8 || pwd.length > 16) {
      return 'Password must be between 8 and 16 characters long.'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter.'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter.'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number.'
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character.'
    }
    return null
  }

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        setMessage({ type: 'error', text: passwordError })
        return
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match.' })
        return
      }
    }

    // Trigger confirmation popup
    setShowConfirm(true)
  }

  const handleConfirmedSubmit = async () => {
    setLoading(true)
    setMessage(null)
    setShowConfirm(false)

    try {
      const res = await updateAdminUser({
        data: {
          userId: user.id,
          name,
          password: password ? password : undefined,
          role,
        },
      })

      setMessage({ type: 'success', text: res.message })
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200 relative">
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          Edit Staff Profile
        </h2>

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

        <form onSubmit={handlePreSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ResortRole)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 bg-white"
            >
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              New Password{' '}
              <span className="text-xs text-stone-400 font-normal">
                (Leave blank to keep current)
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8-16 chars, upper, lower, number, special"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 text-sm"
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges || loading}
              className="rounded-lg bg-amber-800 hover:bg-amber-900 px-5 py-2 text-sm font-medium text-white shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed min-w-[100px] flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Confirmation Modal Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xl mb-3 font-bold">
              ?
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">
              Are you sure?
            </h3>
            <p className="text-sm text-stone-500 mb-6 max-w-xs">
              You are about to update profile details for{' '}
              <span className="font-semibold text-stone-800">{user.name}</span>.
            </p>
            <div className="flex space-x-3 w-full">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedSubmit}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow transition"
              >
                Yes, Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
