import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { authClient } from '#/lib/auth-client'
import { useEffect, useState, useRef } from 'react'
import { AdminSidebar } from '#/components/AdminSidebar'
import { AdminNavbar } from '#/components/AdminNavbar'

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

  // Listen for real-time profile/avatar updates from any admin sub-page
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && sessionData) {
        setSessionData({
          ...sessionData,
          user: {
            ...sessionData.user,
            name: customEvent.detail.name,
            image: customEvent.detail.image,
          },
        })
      }
    }

    window.addEventListener(
      'user-profile-updated',
      handleProfileUpdate as EventListener,
    )
    return () => {
      window.removeEventListener(
        'user-profile-updated',
        handleProfileUpdate as EventListener,
      )
    }
  }, [sessionData])

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
    <div className="h-screen w-screen flex flex-col bg-stone-100 overflow-hidden">
      {/* Top Navbar Header Component */}
      <AdminNavbar
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        handleLogout={handleLogout}
      />

      {/* Main Container below navbar with strict height containment */}
      <div className="flex flex-1 overflow-hidden relative h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation Component */}
        <AdminSidebar
          currentUser={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        {/* Isolated Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto h-full transition-all duration-300">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
