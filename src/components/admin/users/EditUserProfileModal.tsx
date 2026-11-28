import { useState, useEffect } from 'react'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import { PasswordChallengeModal } from '#/components/common/PasswordChallengeModal'
import { PasswordInput } from '#/components/common/PasswordInput'
import {
  FULL_NAME_MAX_LENGTH,
  STAFF_ROLE_OPTIONS,
  validateStaffPassword,
} from '#/lib/constants/auth'
import { validatePersonName, validatePersonNameLive } from '#/lib/validation'
import { updateAdminUser } from '#/server/admin-actions'
import type { EditableStaffUser, ResortRole, StatusMessage } from '#/types'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: EditableStaffUser | null
}

const INPUT_CLASS =
  'w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50'

export function EditUserProfileModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: EditUserModalProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [role, setRole] = useState<ResortRole>('RECEPTIONIST')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>(null)

  const initialName = user?.name || ''
  const initialRole =
    (user?.role?.toUpperCase() || 'RECEPTIONIST') as ResortRole

  const isPasswordEntered = password.trim() !== ''

  const hasChanges =
    name !== initialName ||
    role !== initialRole ||
    isPasswordEntered ||
    confirmPassword.trim() !== ''

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setNameError(null)
      setRole((user.role?.toUpperCase() || 'RECEPTIONIST') as ResortRole)
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setAdminPassword('')
      setMessage(null)
      setShowConfirm(false)
    }
  }, [user])

  if (!isOpen || !user) return null

  const closeAuthChallenge = () => {
    setShowConfirm(false)
    setAdminPassword('')
  }

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const nextNameError = validatePersonName(name, {
      label: 'Full name',
      maxLength: FULL_NAME_MAX_LENGTH,
    })
    setNameError(nextNameError)
    if (nextNameError) {
      return
    }

    if (password) {
      const passwordError = validateStaffPassword(password)
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

        <form onSubmit={handlePreSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="edit-staff-name"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Full Name
            </label>
            <input
              id="edit-staff-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value
                setName(next)
                setNameError((prev) =>
                  validatePersonNameLive(next, prev, {
                    label: 'Full name',
                    maxLength: FULL_NAME_MAX_LENGTH,
                  }),
                )
              }}
              onBlur={() =>
                setNameError(
                  validatePersonName(name, {
                    label: 'Full name',
                    maxLength: FULL_NAME_MAX_LENGTH,
                  }),
                )
              }
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'edit-staff-name-error' : undefined}
              className={getFieldValidationClass(INPUT_CLASS, Boolean(nameError))}
            />
            <FieldError id="edit-staff-name-error" message={nameError} />
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
              {STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label
              htmlFor="edit-staff-new-password"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              New Password{' '}
              <span className="text-xs text-stone-400 font-normal">
                (Leave blank to keep current)
              </span>
            </label>
            <PasswordInput
              id="edit-staff-new-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8-16 chars, upper, lower, number, special"
              visible={showPassword}
              onVisibleChange={setShowPassword}
              showLabel="Show new password"
              hideLabel="Hide new password"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="edit-staff-confirm-password"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Confirm New Password
            </label>
            <PasswordInput
              id="edit-staff-confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              visible={showConfirmPassword}
              onVisibleChange={setShowConfirmPassword}
              showLabel="Show password confirmation"
              hideLabel="Hide password confirmation"
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

        {isPasswordEntered ? (
          <PasswordChallengeModal
            isOpen={showConfirm}
            targetName={user.name}
            password={adminPassword}
            isLoading={loading}
            onPasswordChange={setAdminPassword}
            onConfirm={handleConfirmedSubmit}
            onClose={closeAuthChallenge}
          />
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
