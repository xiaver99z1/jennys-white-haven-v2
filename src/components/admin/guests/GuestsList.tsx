import { useState, useEffect } from 'react'
import { AddGuestModal } from '#/components/admin/guests/AddGuestModal'
import { EditGuestModal } from '#/components/admin/guests/EditGuestModal'
import type { AdminRouter, GuestItem } from '#/types'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { EmptyState } from '#/components/common/EmptyState'
import { StatusBadge } from '#/components/common/StatusBadge'
import { GUEST_ID_TYPES } from '#/lib/constants/rooms'
import { ADMIN_LABELS } from '#/lib/constants/labels'
import { formatFullName } from '#/lib/formatters'
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Archive,
  RotateCcw,
  Edit,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Globe,
} from 'lucide-react'

interface GuestsListProps {
  initialGuests: GuestItem[]
  router: AdminRouter
}

export function GuestsList({ initialGuests, router }: GuestsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedIdTypeFilter, setSelectedIdTypeFilter] =
    useState<string>('ALL')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null)

  const [confirmRestoreGuest, setConfirmRestoreGuest] = useState<{
    id: string
    name: string
  } | null>(null)

  const [isRestoring, setIsRestoring] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (restoringId) {
      const guest = initialGuests.find((g) => g.id === restoringId)
      if (!guest || !guest.deletedAt) {
        setRestoringId(null)
      }
    }
  }, [initialGuests, restoringId])

  useEffect(() => {
    if (deletingId) {
      const guest = initialGuests.find((g) => g.id === deletingId)
      if (!guest || guest.deletedAt) {
        setDeletingId(null)
      }
    }
  }, [initialGuests, deletingId])

  useEffect(() => {
    if (savingId) {
      setSavingId(null)
    }
  }, [initialGuests])

  const filteredGuests = initialGuests.filter((guest) => {
    const isArchived = Boolean(guest.deletedAt)
    const matchesArchived = showArchived ? isArchived : !isArchived

    const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase()
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      fullName.includes(query) ||
      guest.phone.toLowerCase().includes(query) ||
      (guest.email || '').toLowerCase().includes(query) ||
      (guest.idNumber || '').toLowerCase().includes(query)

    const matchesIdType =
      selectedIdTypeFilter === 'ALL' || guest.idType === selectedIdTypeFilter

    return matchesArchived && matchesSearch && matchesIdType
  })

  const handleExecuteRestore = async () => {
    const guestId = confirmRestoreGuest!.id

    setRestoringId(guestId)
    setConfirmRestoreGuest(null)

    try {
      setIsRestoring(true)
      const { restoreGuest } = await import('#/server/guest-actions')
      const res = await restoreGuest({ data: { id: guestId } })

      if (res.success) {
        await router.invalidate()
      }
    } catch (err: any) {
      console.error('Failed to restore guest:', err)
      setRestoringId(null)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Guests Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage guest profiles, contact details, ID verification records, and
            VIP preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              showArchived
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'View Guests' : 'View Archived Guests'}
          </button>
          {!showArchived && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Guest
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by guest name, phone, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', ...GUEST_ID_TYPES].map((idType) => (
            <button
              key={idType}
              onClick={() => setSelectedIdTypeFilter(idType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedIdTypeFilter === idType
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {idType}
            </button>
          ))}
        </div>
      </div>

      {/* Guests Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredGuests.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={ADMIN_LABELS.guests.emptyActiveTitle}
            description={
              showArchived
                ? 'No archived or soft-deleted guests match your filters.'
                : 'Get started by adding your first guest profile.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Guest Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Identification</th>
                  <th className="py-3 px-4">Nationality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Special Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className="hover:bg-stone-50/50 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs border border-amber-200 shrink-0">
                          {guest.firstName.charAt(0).toUpperCase()}
                          {guest.lastName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">
                            {formatFullName(guest.firstName, guest.lastName)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-stone-800">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{guest.phone}</span>
                        </div>
                        {guest.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                            <Mail className="w-3 h-3 text-stone-400" />
                            <span>{guest.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {guest.idType ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-semibold">
                            <CreditCard className="w-3 h-3 text-stone-500" />
                            {guest.idType}
                          </span>
                          {guest.idNumber && (
                            <div className="text-[11px] text-stone-500 font-mono">
                              {guest.idNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">No ID</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-1 text-stone-600">
                        <Globe className="w-3.5 h-3.5 text-stone-400" />
                        <span>{guest.nationality || 'Filipino'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {showArchived ? (
                        <StatusBadge
                          label="Archived"
                          size="xs"
                          icon={<AlertCircle className="w-3 h-3" />}
                          className="bg-rose-50 text-rose-700 border-rose-200 font-bold"
                        />
                      ) : (
                        <StatusBadge
                          label="Active"
                          size="xs"
                          icon={<CheckCircle2 className="w-3 h-3" />}
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                        />
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-48 truncate">
                      {guest.specialNotes ? (
                        <span className="text-stone-600">
                          {guest.specialNotes}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 ml-auto">
                        {showArchived ? (
                          <button
                            onClick={() =>
                              setConfirmRestoreGuest({
                                id: guest.id,
                                name: `${guest.firstName} ${guest.lastName}`,
                              })
                            }
                            disabled={restoringId === guest.id}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {restoringId === guest.id
                              ? 'Restoring...'
                              : 'Restore Guest'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingGuest(guest)}
                            disabled={
                              savingId === guest.id || deletingId === guest.id
                            }
                            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {savingId === guest.id
                              ? 'Saving...'
                              : deletingId === guest.id
                                ? 'Deleting...'
                                : 'Edit Guest'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      <AddGuestModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />

      {/* Edit Guest Modal */}
      <EditGuestModal
        isOpen={Boolean(editingGuest)}
        onClose={() => setEditingGuest(null)}
        onSaveStart={(guestId) => setSavingId(guestId)}
        onDeleteStart={(guestId) => setDeletingId(guestId)}
        onSuccess={() => router.invalidate()}
        guest={editingGuest}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmRestoreGuest)}
        variant="success"
        title={`Restore Guest ${confirmRestoreGuest?.name || ''}?`}
        description={`Are you sure you want to restore "${confirmRestoreGuest?.name || ''}" back to active guests?`}
        confirmText="Yes, Restore"
        cancelText="Cancel"
        isLoading={isRestoring}
        onConfirm={handleExecuteRestore}
        onClose={() => setConfirmRestoreGuest(null)}
      />
    </div>
  )
}
