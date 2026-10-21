import { useState } from 'react'
import {
  MoreVertical,
  Pencil,
  Mail,
  Monitor,
  FileText,
  Ban,
  ShieldCheck,
} from 'lucide-react'
import { UserSessionsModal } from './UserSessionsModal'
import { UserActivityLogsModal } from './UserActivityLogsModal'
import { blockAdminUser, unblockAdminUser } from '#/server/admin-actions'

interface UserActionsDropdownProps {
  user: any
  onEdit: (user: any) => void
  onResendVerification: (user: any) => void
  onOpen?: () => void
  onSuccess: () => void // 👈 Callback to refresh table data after block/unblock
}

export function UserActionsDropdown({
  user,
  onEdit,
  onResendVerification,
  onOpen,
  onSuccess,
}: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<'block' | 'unblock' | null>(
    null,
  )
  const [loading, setLoading] = useState(false)

  const handleToggle = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (nextState && onOpen) {
      onOpen()
    }
  }

  const handleBlockUnblockAction = async () => {
    if (!confirmModal) return
    setLoading(true)

    try {
      if (confirmModal === 'block') {
        await blockAdminUser({ data: { userId: user.id } })
      } else {
        await unblockAdminUser({ data: { userId: user.id } })
      }
      setConfirmModal(null)
      onSuccess() // Refresh table loader data
    } catch (err: any) {
      console.error('Action failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="text-right relative">
        <button
          onClick={handleToggle}
          className="p-1.5 hover:bg-stone-100 text-stone-600 hover:text-stone-900 rounded-lg transition cursor-pointer"
          aria-label="User actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-stone-200 py-1.5 z-20 text-left text-xs font-medium text-stone-700 divide-y divide-stone-100">
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onEdit(user)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-stone-500" />
                  Edit Profile
                </button>

                {!user.emailVerified && (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      onResendVerification(user)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-amber-50 hover:text-amber-900 text-amber-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-amber-600" />
                    Resend Email Verification
                  </button>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setIsSessionsModalOpen(true)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <Monitor className="w-4 h-4 text-stone-500" />
                  Sessions
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    setIsActivityModalOpen(true)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-stone-500" />
                  Activity Log
                </button>
              </div>

              <div className="py-1">
                {user.banned ? (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setConfirmModal('unblock')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600 flex items-center gap-2 transition cursor-pointer font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Unblock User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      setConfirmModal('block')
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-rose-50 hover:text-rose-700 text-rose-600 flex items-center gap-2 transition cursor-pointer font-medium"
                  >
                    <Ban className="w-4 h-4 text-rose-500" />
                    Block User
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">
              {confirmModal === 'block'
                ? 'Block User Account'
                : 'Unblock User Account'}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to {confirmModal}{' '}
              <span className="font-semibold text-stone-800">{user.email}</span>
              ?
              {confirmModal === 'block' &&
                ' This will immediately terminate all active sessions for this user and prevent them from signing in.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleBlockUnblockAction}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer ${
                  confirmModal === 'block'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading
                  ? 'Processing...'
                  : confirmModal === 'block'
                    ? 'Yes, Block User'
                    : 'Yes, Unblock User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        userId={user.id}
        userName={user.name}
      />
      <UserActivityLogsModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        userId={user.id}
        userName={user.name}
      />
    </>
  )
}
