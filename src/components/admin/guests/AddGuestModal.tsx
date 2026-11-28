import { useState } from 'react'
import { createGuest } from '#/server/guest-actions'
import { X, UserPlus } from 'lucide-react'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import { PhoneNumberInput } from '#/components/common/PhoneNumberInput'
import { GUEST_ID_TYPES, DEFAULT_NATIONALITY } from '#/lib/constants/rooms'
import type { GuestIdType } from '#/lib/constants/rooms'
import {
  hasFieldErrors,
  validateEmailField,
  validateGovernmentIdFields,
  validateNationalityField,
  validatePersonName,
  validatePersonNameLive,
  validatePhoneField,
  validateTextField,
} from '#/lib/validation'

interface AddGuestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const getInitialFormState = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  idType: 'National ID' as GuestIdType | '',
  idNumber: '',
  nationality: DEFAULT_NATIONALITY,
  specialNotes: '',
})

type GuestFieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'phone'
    | 'email'
    | 'nationality'
    | 'idType'
    | 'idNumber'
    | 'specialNotes',
    string | null
  >
>

const GUEST_INPUT_CLASS =
  'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800'

export function AddGuestModal({
  isOpen,
  onClose,
  onSuccess,
}: AddGuestModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(getInitialFormState)
  const [fieldErrors, setFieldErrors] = useState<GuestFieldErrors>({})

  if (!isOpen) return null

  const validateAllFields = (): GuestFieldErrors => {
    const idErrs = validateGovernmentIdFields(formData.idType, formData.idNumber)
    return {
      firstName: validatePersonName(formData.firstName, { label: 'First name' }),
      lastName: validatePersonName(formData.lastName, { label: 'Last name' }),
      phone: validatePhoneField(formData.phone, { required: true }),
      email: validateEmailField(formData.email, { required: false }),
      nationality: validateNationalityField(formData.nationality),
      idType: idErrs.idType,
      idNumber: idErrs.idNumber,
      specialNotes: validateTextField(formData.specialNotes, {
        label: 'Special notes',
        required: false,
        maxLength: 1000,
      }),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const nextErrors = validateAllFields()
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }
    setLoading(true)

    try {
      await createGuest({
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined,
          phone: formData.phone,
          idType: formData.idType || undefined,
          idNumber: formData.idNumber || undefined,
          nationality: formData.nationality || undefined,
          specialNotes: formData.specialNotes || undefined,
        },
      })

      setFormData(getInitialFormState())
      setFieldErrors({})
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create guest.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Add New Guest
              </h3>
              <p className="text-xs text-stone-500">
                Register guest contact details, ID verification, and notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-guest-first-name"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  First Name
                </label>
                <input
                  id="add-guest-first-name"
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={formData.firstName}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, firstName: next })
                    setFieldErrors((prev) => ({
                      ...prev,
                      firstName: validatePersonNameLive(next, prev.firstName, {
                        label: 'First name',
                      }),
                    }))
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      firstName: validatePersonName(formData.firstName, {
                        label: 'First name',
                      }),
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={
                    fieldErrors.firstName ? 'add-guest-first-name-error' : undefined
                  }
                  className={getFieldValidationClass(
                    GUEST_INPUT_CLASS,
                    Boolean(fieldErrors.firstName),
                  )}
                />
                <FieldError
                  id="add-guest-first-name-error"
                  message={fieldErrors.firstName}
                />
              </div>
              <div>
                <label
                  htmlFor="add-guest-last-name"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="add-guest-last-name"
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={formData.lastName}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, lastName: next })
                    setFieldErrors((prev) => ({
                      ...prev,
                      lastName: validatePersonNameLive(next, prev.lastName, {
                        label: 'Last name',
                      }),
                    }))
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      lastName: validatePersonName(formData.lastName, {
                        label: 'Last name',
                      }),
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={
                    fieldErrors.lastName ? 'add-guest-last-name-error' : undefined
                  }
                  className={getFieldValidationClass(
                    GUEST_INPUT_CLASS,
                    Boolean(fieldErrors.lastName),
                  )}
                />
                <FieldError
                  id="add-guest-last-name-error"
                  message={fieldErrors.lastName}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-guest-phone"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Phone Number
                </label>
                <PhoneNumberInput
                  id="add-guest-phone"
                  required
                  size="sm"
                  variant="admin"
                  invalid={Boolean(fieldErrors.phone)}
                  ariaDescribedBy={
                    fieldErrors.phone ? 'add-guest-phone-error' : undefined
                  }
                  value={formData.phone}
                  onChange={(phone) => {
                    setFormData({ ...formData, phone })
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        phone: validatePhoneField(phone, { required: true }),
                      }))
                    }
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: validatePhoneField(formData.phone, { required: true }),
                    }))
                  }
                />
                <FieldError
                  id="add-guest-phone-error"
                  message={fieldErrors.phone}
                />
              </div>
              <div>
                <label
                  htmlFor="add-guest-email"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Email Address (Optional)
                </label>
                <input
                  id="add-guest-email"
                  type="email"
                  placeholder="e.g. maria@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, email: next })
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: validateEmailField(next, { required: false }),
                      }))
                    }
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: validateEmailField(formData.email, {
                        required: false,
                      }),
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'add-guest-email-error' : undefined
                  }
                  className={getFieldValidationClass(
                    GUEST_INPUT_CLASS,
                    Boolean(fieldErrors.email),
                  )}
                />
                <FieldError
                  id="add-guest-email-error"
                  message={fieldErrors.email}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="add-guest-nationality"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Nationality
                </label>
                <input
                  id="add-guest-nationality"
                  type="text"
                  placeholder="e.g. Filipino"
                  value={formData.nationality}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, nationality: next })
                    if (fieldErrors.nationality || /\p{N}/u.test(next)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        nationality: validateNationalityField(next),
                      }))
                    }
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      nationality: validateNationalityField(
                        formData.nationality,
                      ),
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.nationality)}
                  className={getFieldValidationClass(
                    GUEST_INPUT_CLASS,
                    Boolean(fieldErrors.nationality),
                  )}
                />
                <FieldError message={fieldErrors.nationality} />
              </div>
              <div>
                <label
                  htmlFor="add-guest-id-type"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  ID Type
                </label>
                <select
                  id="add-guest-id-type"
                  value={formData.idType}
                  onChange={(e) => {
                    const nextType = e.target.value as GuestIdType | ''
                    setFormData({
                      ...formData,
                      idType: nextType,
                    })
                    if (fieldErrors.idType || fieldErrors.idNumber) {
                      const idErrs = validateGovernmentIdFields(
                        nextType,
                        formData.idNumber,
                      )
                      setFieldErrors((prev) => ({
                        ...prev,
                        idType: idErrs.idType,
                        idNumber: idErrs.idNumber,
                      }))
                    }
                  }}
                  className={getFieldValidationClass(
                    `${GUEST_INPUT_CLASS} bg-white`,
                    Boolean(fieldErrors.idType),
                  )}
                >
                  <option value="">None</option>
                  {GUEST_ID_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.idType} />
              </div>
              <div>
                <label
                  htmlFor="add-guest-id-number"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  ID Number
                </label>
                <input
                  id="add-guest-id-number"
                  type="text"
                  placeholder="e.g. N01-23-456789"
                  value={formData.idNumber}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, idNumber: next })
                    if (fieldErrors.idNumber || fieldErrors.idType) {
                      const idErrs = validateGovernmentIdFields(
                        formData.idType,
                        next,
                      )
                      setFieldErrors((prev) => ({
                        ...prev,
                        idType: idErrs.idType,
                        idNumber: idErrs.idNumber,
                      }))
                    }
                  }}
                  onBlur={() => {
                    const idErrs = validateGovernmentIdFields(
                      formData.idType,
                      formData.idNumber,
                    )
                    setFieldErrors((prev) => ({
                      ...prev,
                      idType: idErrs.idType,
                      idNumber: idErrs.idNumber,
                    }))
                  }}
                  aria-invalid={Boolean(fieldErrors.idNumber)}
                  className={getFieldValidationClass(
                    GUEST_INPUT_CLASS,
                    Boolean(fieldErrors.idNumber),
                  )}
                />
                <FieldError message={fieldErrors.idNumber} />
              </div>
            </div>

            <div>
              <label
                htmlFor="add-guest-notes"
                className="block font-semibold text-stone-700 mb-1"
              >
                Special Notes / VIP Preferences (Optional)
              </label>
              <textarea
                id="add-guest-notes"
                rows={3}
                maxLength={1000}
                placeholder="Allergies, dietary restrictions, special requests, VIP status..."
                value={formData.specialNotes}
                onChange={(e) => {
                  const next = e.target.value
                  setFormData({ ...formData, specialNotes: next })
                  if (fieldErrors.specialNotes) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      specialNotes: validateTextField(next, {
                        label: 'Special notes',
                        required: false,
                        maxLength: 1000,
                      }),
                    }))
                  }
                }}
                aria-invalid={Boolean(fieldErrors.specialNotes)}
                className={getFieldValidationClass(
                  `${GUEST_INPUT_CLASS} resize-none`,
                  Boolean(fieldErrors.specialNotes),
                )}
              />
              <FieldError message={fieldErrors.specialNotes} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 text-xs"
            >
              {loading ? 'Creating...' : 'Create Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
