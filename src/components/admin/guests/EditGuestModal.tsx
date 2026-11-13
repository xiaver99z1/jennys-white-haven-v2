import { useState, useEffect, useMemo } from 'react'
import { updateGuest, deleteGuest } from '#/server/guest-actions'
import { X, UserCheck, Trash2 } from 'lucide-react'
import { GUEST_ID_TYPES, DEFAULT_NATIONALITY } from '#/lib/constants/rooms'
import type { GuestIdType, GuestItem } from '#/types'
import { ConfirmModal } from '#/components/common/ConfirmModal'

export type { GuestItem }

interface EditGuestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  onSaveStart: (guestId: string) => void
  onDeleteStart: (guestId: string) => void
  guest: GuestItem | null
}

const getInitialFormData = (guest: EditGuestModalProps['guest']) => ({
  firstName: guest?.firstName ?? '',
  lastName: guest?.lastName ?? '',
  email: guest?.email ?? '',
  phone: guest?.phone ?? '',
  idType: (guest?.idType ?? '') as GuestIdType | '',
  idNumber: guest?.idNumber ?? '',
  nationality: guest?.nationality ?? DEFAULT_NATIONALITY,
  specialNotes: guest?.specialNotes ?? '',
})

export function EditGuestModal({
  isOpen,
  onClose,
  onSuccess,
  onSaveStart,
  onDeleteStart,
  guest,
}: EditGuestModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState(() => getInitialFormData(guest))

  useEffect(() => {
    if (guest) {
      setFormData(getInitialFormData(guest))
      setError(null)
      setShowSaveConfirm(false)
      setShowDeleteConfirm(false)
    }
  }, [guest])

  const hasChanges = useMemo(() => {
    if (!guest) return false

    const initial = getInitialFormData(guest)

    if (formData.firstName !== initial.firstName) return true
    if (formData.lastName !== initial.lastName) return true
    if (formData.email !== initial.email) return true
    if (formData.phone !== initial.phone) return true
    if (formData.idType !== initial.idType) return true
    if (formData.idNumber !== initial.idNumber) return true
    if (formData.nationality !== initial.nationality) return true
    if (formData.specialNotes !== initial.specialNotes) return true

    return false
  }, [formData, guest])

  if (!isOpen || !guest) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges) return
    setShowSaveConfirm(true)
  }

  const handleSaveConfirm = async () => {
    setLoading(true)
    setError(null)

    onSaveStart(guest.id)
    setShowSaveConfirm(false)
    onClose()

    try {
      await updateGuest({
        data: {
          id: guest.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          idType: formData.idType,
          idNumber: formData.idNumber,
          nationality: formData.nationality,
          specialNotes: formData.specialNotes,
        },
      })
      await onSuccess()
    } catch (err: any) {
      console.error('Failed to update guest:', err)
      setError(err.message || 'Failed to update guest.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setError(null)

    onDeleteStart(guest.id)
    setShowDeleteConfirm(false)
    onClose()

    try {
      await deleteGuest({ data: { id: guest.id } })
      await onSuccess()
    } catch (err: any) {
      console.error('Failed to delete guest:', err)
      setError(err.message || 'Failed to delete guest.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Guest {guest.firstName} {guest.lastName}
                </h3>
                <p className="text-xs text-stone-500">
                  Update guest contact info, identification, or special notes
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
                  Special Notes / VIP Preferences
                </label>
                <textarea
                  rows={3}
                  value={formData.specialNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, specialNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
              <button
                type="button"
                disabled={deleting || loading}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition text-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete Guest
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || deleting}
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || deleting || !hasChanges}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showSaveConfirm}
        variant="amber"
        title={`Update Guest ${guest.firstName} ${guest.lastName}?`}
        description={`Are you sure you want to save changes to "${formData.firstName} ${formData.lastName}"?`}
        confirmText="Yes, Save Changes"
        cancelText="Cancel"
        isLoading={loading}
        onConfirm={handleSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        variant="danger"
        title={`Archive Guest ${guest.firstName} ${guest.lastName}?`}
        description={`Are you sure you want to archive "${guest.firstName} ${guest.lastName}"? You can restore this guest later from the archived guests list.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
