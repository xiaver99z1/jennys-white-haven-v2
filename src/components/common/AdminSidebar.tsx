import { Link } from '@tanstack/react-router'
import { hasPermission } from '#/lib/permissions'

interface AdminSidebarProps {
  currentUser: any
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  handleLogout: () => void
}

export function AdminSidebar({
  currentUser,
  sidebarOpen,
  setSidebarOpen,
  handleLogout,
}: AdminSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-black/50 lg:hidden cursor-pointer transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Sidebar (Mobile Drawer & Desktop Sidebar) */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800
          transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          lg:relative lg:top-0 lg:h-full lg:z-20
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0'}
        `}
      >
        <div className="w-64 flex flex-col h-full">
          {/* Mobile Close Button Header */}
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-100">
              Navigation
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md hover:bg-stone-800 text-stone-100 transition cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-2">
            <NavItem
              to="/admin"
              label="Dashboard"
              exact={true}
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              }
            />
            <NavItem
              to="/admin/bookings"
              label="Bookings"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <NavItem
              to="/admin/rooms"
              label="Rooms"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              }
            />
            <NavItem
              to="/admin/guests"
              label="Guests"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              }
            />

            {/* Conditionally show Users based on RBAC permissions */}
            {hasPermission(currentUser, 'view:users') && (
              <NavItem
                to="/admin/users"
                label="Users"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
              />
            )}
          </nav>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-stone-800 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-sm text-stone-100 hover:text-white transition px-3 py-2 rounded-md hover:bg-stone-800 cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function NavItem({
  to,
  label,
  icon,
  exact = false,
}: {
  to: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      inactiveProps={{
        className:
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-stone-100 hover:bg-stone-800 hover:text-white transition cursor-pointer',
      }}
      activeProps={{
        className:
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm bg-stone-800 text-white font-medium cursor-pointer',
      }}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
