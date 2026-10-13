import { Link } from '@tanstack/react-router'

interface AdminNavbarProps {
  user: any
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  profileMenuOpen: boolean
  setProfileMenuOpen: (open: boolean) => void
  profileMenuRef: React.RefObject<HTMLDivElement | null>
  handleLogout: () => void
}

export function AdminNavbar({
  user,
  sidebarOpen,
  setSidebarOpen,
  profileMenuOpen,
  setProfileMenuOpen,
  profileMenuRef,
  handleLogout,
}: AdminNavbarProps) {
  return (
    <header className="h-16 bg-gradient-to-r from-sky-200 via-amber-200/60 to-teal-100 border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left Side: Logo -> Hamburger Icon -> Search Input */}
      <div className="flex items-center gap-0 flex-1 max-w-2xl">
        <Link to="/admin" className="flex items-center shrink-0 cursor-pointer">
          <img
            src="/logo.png"
            alt="Jenny's White Haven"
            className="h-9 w-auto object-contain"
          />
        </Link>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/40 text-stone-700 focus:outline-none transition shrink-0 ml-1 cursor-pointer"
          title="Toggle Sidebar"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="relative flex-1 ml-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 z-10">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search for anything..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white/80 backdrop-blur-xs border border-stone-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600/50 transition placeholder:text-stone-400 text-stone-800"
          />
        </div>
      </div>

      {/* Right Side: Messages, Notifications & Profile Popover */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-4">
        <button className="p-2 rounded-full hover:bg-white/40 text-stone-700 transition cursor-pointer">
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </button>

        <button className="relative p-2 rounded-full hover:bg-white/40 text-stone-700 transition cursor-pointer">
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Profile Container with Popover Menu */}
        <div
          className="relative pl-2 ml-1 border-l border-stone-300/60"
          ref={profileMenuRef}
        >
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center focus:outline-none cursor-pointer"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user?.name || 'Admin'}
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-600/30 shadow-xs hover:ring-2 hover:ring-amber-600 transition"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/90 text-stone-700 font-bold flex items-center justify-center border border-stone-300 hover:ring-2 hover:ring-amber-600 transition text-sm shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
          </button>

          {/* Popover Menu Dropdown */}
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 text-stone-800">
              <div className="px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs text-stone-500">Signed in as</p>
                <p className="text-sm font-semibold text-stone-900 truncate">
                  {user?.email || 'admin@example.com'}
                </p>
                {user?.role && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md">
                    {user.role}
                  </span>
                )}
              </div>

              <div className="py-1">
                <Link
                  to="/admin/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-stone-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Profile</span>
                </Link>

                <Link
                  to="/admin/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-stone-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>

              <div className="border-t border-stone-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer text-left"
                >
                  <svg
                    className="w-4 h-4 text-red-500"
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
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
