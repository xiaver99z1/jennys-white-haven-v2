import { useState } from 'react'
import { createGuest } from '#/server/guest-actions'
import { X, UserPlus } from 'lucide-react'
import { GUEST_ID_TYPES, DEFAULT_NATIONALITY } from '#/lib/constants/rooms'
import type { GuestIdType } from '#/lib/constants/rooms'

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

export function AddGuestModal({
  isOpen,
  onClose,
  onSuccess,
}: AddGuestModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(getInitialFormState)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
                <label className="block font-semibold text-stone-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Santos"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +63 917 123 4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. maria@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  placeholder="e.g. Filipino"
                  value={formData.nationality}
                  onChange={(e) =>
                    setFormData({ ...formData, nationality: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ID Type
                </label>
                <select
                  value={formData.idType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      idType: e.target.value as GuestIdType | '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  <option value="">None</option>
                  {GUEST_ID_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. N01-23-456789"
                  value={formData.idNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, idNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Special Notes / VIP Preferences (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Allergies, dietary restrictions, special requests, VIP status..."
                value={formData.specialNotes}
                onChange={(e) =>
                  setFormData({ ...formData, specialNotes: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none"
              />
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
