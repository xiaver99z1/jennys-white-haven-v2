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
import { useEffect } from 'react'

// Get current session
const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders, setResponseHeader } =
    await import('@tanstack/react-start/server')

  // Prevent browser caching (BFCache) for admin route requests
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

    // Already logged in + trying to access login page → go to dashboard
    if (location.pathname === '/admin/login') {
      if (session) {
        throw redirect({ to: '/admin' })
      }
      return
    }

    // Not logged in + trying to access any admin page → go to login
    if (!session) {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/admin/login'

  // BFCache Buster: Force a reload/recheck if restored via browser Back button

  // 1. Client-side session check & BFCache Buster
  useEffect(() => {
    if (isLoginPage) return

    // Re-check session on client side
    authClient.getSession().then(({ data }) => {
      if (!data) {
        window.location.replace('/admin/login')
      }
    })

    // Force reload if restored from browser back-forward cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [isLoginPage])

  // If it's the login page → show only the form (no sidebar)
  if (isLoginPage) {
    return <Outlet />
  }

  // If it's the login page → show only the form (no sidebar)
  if (isLoginPage) {
    return <Outlet />
  }

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      // Clear TanStack Router cached route state
    } finally {
      window.location.replace('/admin/login')
    }
  }
  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-100 flex flex-col">
        <div className="px-6 py-5 border-b border-stone-700">
          <h1 className="text-lg font-semibold tracking-tight">White Haven</h1>
          <p className="text-xs text-stone-400 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem to="/admin" label="Dashboard" />
          <NavItem to="/admin/bookings" label="Bookings" />
          <NavItem to="/admin/rooms" label="Rooms" />
          <NavItem to="/admin/guests" label="Guests" />
        </nav>

        <div className="p-4 border-t border-stone-700">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-stone-300 hover:text-white transition px-3 py-2 rounded-md hover:bg-stone-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="block px-3 py-2 rounded-md text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition"
      activeProps={{
        className:
          'block px-3 py-2 rounded-md text-sm bg-stone-800 text-white font-medium',
      }}
    >
      {label}
    </Link>
  )
}
