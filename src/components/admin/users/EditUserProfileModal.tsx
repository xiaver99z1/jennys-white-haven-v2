import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { updateAdminUser } from '#/server/admin-actions'
import type { ResortRole } from '#/server/admin-actions'
import { ConfirmModal } from '#/components/common/ConfirmModal'

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
  const [adminPassword, setAdminPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Initial values for dirty check
  const initialName = user?.name || ''
  const initialRole =
    (user?.role?.toUpperCase() || 'RECEPTIONIST') as ResortRole

  const isPasswordEntered = password.trim() !== ''

  // Check if any changes were made
  const hasChanges =
    name !== initialName ||
    role !== initialRole ||
    isPasswordEntered ||
    confirmPassword.trim() !== ''

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setRole((user.role?.toUpperCase() || 'RECEPTIONIST') as ResortRole)
      setPassword('')
      setConfirmPassword('')
      setAdminPassword('')
      setMessage(null)
      setShowConfirm(false)
    }
  }, [user])

  if (!isOpen || !user) return null

  const validatePassword = (pwd: string) => {
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

    setAdminPassword('')
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
          adminPassword: password ? adminPassword : undefined,
          role,
        },
      })

      setMessage({ type: 'success', text: res.message })
      setAdminPassword('')
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
              <option value="SUPER_ADMIN">Super Admin</option>
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

        {showConfirm && isPasswordEntered ? (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Authenticate Password Change
                  </h3>
                  <p className="text-xs text-stone-500">
                    Security verification required
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Enter your current administrator password to authorize changing
                the password for <span className="font-semibold">{user.name}</span>.
              </p>

              <div>
                <label
                  htmlFor="admin-auth-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5"
                >
                  Your Administrator Password
                </label>
                <input
                  id="admin-auth-password"
                  type="password"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false)
                    setAdminPassword('')
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedSubmit}
                  disabled={!adminPassword.trim() || loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Verify &amp; Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ConfirmModal
            isOpen={showConfirm}
            variant="amber"
            title="Are you sure?"
            description={`You are about to update profile details for ${user.name}.`}
            confirmText="Yes, Save Changes"
            cancelText="Cancel"
            isLoading={loading}
            onConfirm={handleConfirmedSubmit}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </div>
    </div>
  )
}
