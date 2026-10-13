import { useState } from 'react'

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

  const handleToggle = () => {
    const nextState = !isOpen
    setIsOpen(nextState)

    // Trigger data refresh as soon as the menu opens
    if (nextState && onOpen) {
      onOpen()
    }
  }

  return (
    <div className="text-right relative">
      <button
        onClick={handleToggle}
        className="p-1.5 hover:bg-stone-100 text-stone-600 hover:text-stone-900 rounded-lg transition cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
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
                ✏️ Edit Profile
              </button>

              {!user.emailVerified && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onResendVerification(user)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-amber-50 hover:text-amber-900 text-amber-800 flex items-center gap-2 transition cursor-pointer"
                >
                  ✉️ Resend Email Verification
                </button>
              )}
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  console.log('Sessions:', user.id)
                }}
                className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
              >
                💻 Sessions
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  console.log('Activity Log:', user.id)
                }}
                className="w-full px-4 py-2 text-left hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition cursor-pointer"
              >
                📋 Activity Log
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
                🚫 Block User
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
