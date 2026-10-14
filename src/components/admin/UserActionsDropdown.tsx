import { useState } from 'react'
import {
  MoreVertical,
  Pencil,
  Mail,
  Monitor,
  FileText,
  Ban,
} from 'lucide-react'
import { UserSessionsModal } from './UserSessionsModal'

interface UserActionsDropdownProps {
  user: any
  onEdit: (user: any) => void
  onResendVerification: (user: any) => void
  onOpen?: () => void // Triggered when ellipsis is clicked
}

export function UserActionsDropdown({
  user,
  onEdit,
  onResendVerification,
  onOpen,
}: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)

  const handleToggle = () => {
    const nextState = !isOpen
    setIsOpen(nextState)

    // Trigger data refresh as soon as the menu opens
    if (nextState && onOpen) {
      onOpen()
    }
  }

  const handleOpenSessions = () => {
    setIsOpen(false)
    setIsSessionsModalOpen(true)
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
                  onClick={handleOpenSessions}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <Monitor className="w-4 h-4 text-stone-500" />
                  Sessions
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    console.log('Activity Log:', user.id)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-stone-500" />
                  Activity Log
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    console.log('Block User:', user.id)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-rose-50 hover:text-rose-700 text-rose-600 flex items-center gap-2 transition cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-rose-500" />
                  Block User
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Sessions Modal */}
      <UserSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        userId={user.id}
        userName={user.name}
      />
    </>
  )
}
