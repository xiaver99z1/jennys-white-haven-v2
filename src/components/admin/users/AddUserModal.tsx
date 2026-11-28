import { useState } from 'react'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import { FULL_NAME_MAX_LENGTH, STAFF_ROLE_OPTIONS } from '#/lib/constants/auth'
import {
  hasFieldErrors,
  validateEmailField,
  validatePersonName,
  validatePersonNameLive,
} from '#/lib/validation'
import { createAdminUser } from '#/server/admin-actions'
import type { ResortRole, StatusMessage } from '#/types'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const INPUT_BASE_CLASS =
  'w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition disabled:bg-stone-100 disabled:cursor-not-allowed'

export function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ResortRole>('RECEPTIONIST')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string | null
    email?: string | null
  }>({})

  if (!isOpen) return null

  const handleClose = () => {
    setMessage(null)
    setFieldErrors({})
    setName('')
    setEmail('')
    setRole('RECEPTIONIST')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const nextErrors = {
      name: validatePersonName(name, {
        label: 'Full name',
        maxLength: FULL_NAME_MAX_LENGTH,
      }),
      email: validateEmailField(email, { required: true }),
    }
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }

    setLoading(true)

    try {
      const res = await createAdminUser({
        data: {
          name,
          email,
          role,
        },
      })

      setMessage({
        type: 'success',
        text: res.message,
      })

      setName('')
      setEmail('')
      setRole('RECEPTIONIST')
      setFieldErrors({})

      if (onSuccess) {
        onSuccess()
      }

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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="add-user-name"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Full Name
            </label>
            <input
              id="add-user-name"
              type="text"
              required
              disabled={loading || message?.type === 'success'}
              value={name}
              onChange={(e) => {
                const next = e.target.value
                setName(next)
                setFieldErrors((prev) => ({
                  ...prev,
                  name: validatePersonNameLive(next, prev.name, {
                    label: 'Full name',
                    maxLength: FULL_NAME_MAX_LENGTH,
                  }),
                }))
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  name: validatePersonName(name, {
                    label: 'Full name',
                    maxLength: FULL_NAME_MAX_LENGTH,
                  }),
                }))
              }
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={
                fieldErrors.name ? 'add-user-name-error' : undefined
              }
              placeholder="e.g. Jap Ocifares"
              className={getFieldValidationClass(
                INPUT_BASE_CLASS,
                Boolean(fieldErrors.name),
              )}
            />
            <FieldError id="add-user-name-error" message={fieldErrors.name} />
          </div>

          <div>
            <label
              htmlFor="add-user-email"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="add-user-email"
              type="email"
              required
              disabled={loading || message?.type === 'success'}
              value={email}
              onChange={(e) => {
                const next = e.target.value
                setEmail(next)
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: validateEmailField(next, { required: true }),
                  }))
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateEmailField(email, { required: true }),
                }))
              }
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? 'add-user-email-error' : undefined
              }
              placeholder="e.g. staff@jennyswhitehaven.com"
              className={getFieldValidationClass(
                INPUT_BASE_CLASS,
                Boolean(fieldErrors.email),
              )}
            />
            <FieldError id="add-user-email-error" message={fieldErrors.email} />
          </div>

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
              {STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
