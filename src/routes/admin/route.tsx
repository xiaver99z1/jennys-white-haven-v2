import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { authClient } from '#/lib/auth-client'
import { useEffect, useState, useRef } from 'react'

// Get current session
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders, setResponseHeader } =
    await import('@tanstack/react-start/server')

  setResponseHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  setResponseHeader('Pragma', 'no-cache')
  setResponseHeader('Expires', '0')

  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })
  return session
})

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()

    if (location.pathname === '/admin/login') {
      if (session) {
        throw redirect({ to: '/admin' })
      }
      return
    }

    if (!session) {
      throw redirect({ to: '/admin/login' })
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard | Jenny's White Haven" },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: AdminLayout,
})

function AdminLayout() {
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/admin/login'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close sidebar on route change for small screens
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [routerState.location.pathname])

  // Close profile menu on route change or outside click
  useEffect(() => {
    setProfileMenuOpen(false)
  }, [routerState.location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // BFCache protection
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // Client-side session check
  useEffect(() => {
    if (isLoginPage) return
    authClient.getSession().then(({ data }) => {
      if (!data) {
        window.location.replace('/admin/login')
      } else {
        setSessionData(data)
      }
    })
  }, [isLoginPage])

  if (isLoginPage) {
    return <Outlet />
  }

  const handleLogout = async () => {
    try {
      await authClient.signOut()
    } finally {
      window.location.replace('/admin/login')
    }
  }

  const user = sessionData?.user

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Top Navbar with Beach Gradient Background */}
      <header className="h-16 bg-gradient-to-r from-sky-200 via-amber-200/60 to-teal-100 border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
        {/* Left Side: Logo -> Hamburger Icon -> Search Input */}
        <div className="flex items-center gap-0 flex-1 max-w-2xl">
          {/* Logo */}
          <Link
            to="/admin"
            className="flex items-center shrink-0 cursor-pointer"
          >
            <img
              src="/logo.png"
              alt="Jenny's White Haven"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Hamburger Icon */}
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

          {/* Search Bar */}
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
              className="w-full pl-10 pr-4 py-2 text-sm bg-white/80 backdrop-blur-xs border border-stone-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600/50 transition placeholder:text-stone-400 text-stone-800 relative"
            />
          </div>
        </div>

        {/* Right Side: Message, Notification & Profile Popover Menu */}
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
                  className="w-9 h-9 rounded-full object-cover border border-stone-300 hover:ring-2 hover:ring-amber-600 transition"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/80 text-stone-700 flex items-center justify-center border border-stone-300 hover:ring-2 hover:ring-amber-600 transition">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </button>

            {/* Popover Menu Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 text-stone-800 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-2.5 border-b border-stone-100">
                  <p className="text-xs text-stone-500">Signed in as</p>
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {user?.email || 'admin@example.com'}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition"
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
                    to="/admin"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition"
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

      {/* Main Container below navbar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden cursor-pointer transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation with Smooth Slide Transition */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800
            transition-all duration-300 ease-in-out shrink-0 overflow-hidden
            lg:relative
            ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0'}
          `}
        >
          {/* Inner wrapper with fixed width so contents don't squish during slide */}
          <div className="w-64 flex flex-col h-full">
            {/* Mobile close button header */}
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between lg:hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Navigation
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-stone-800 text-stone-400 transition cursor-pointer"
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

            {/* Navigation Items with Icons */}
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
            </nav>

            {/* Sign Out Button */}
            <div className="p-4 border-t border-stone-800 shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 text-sm text-stone-300 hover:text-white transition px-3 py-2 rounded-md hover:bg-stone-800 cursor-pointer"
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
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto transition-all duration-300">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
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
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
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
