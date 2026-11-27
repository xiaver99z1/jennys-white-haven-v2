import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { authClient } from '#/lib/auth-client'
import { DEFAULT_ADMIN_ICON_LOGO } from '#/lib/constants/cms'
import { logUserLogout } from '#/server/auth-actions'
import { heartbeatAdminPresence } from '#/server/chat-actions'
import { getPublicBrandLogos } from '#/server/cms-actions'
import { checkInitialSetupRequiredHandler } from '#/server/setup-actions'
import { useEffect, useState, useRef } from 'react'
import { AdminSidebar } from '#/components/common/AdminSidebar'
import { AdminNavbar } from '#/components/common/AdminNavbar'
import { NotFoundPage } from '#/components/common/NotFoundPage'

// Get current session and initial-setup status
const getAdminAuthState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRequestHeaders, setResponseHeader } =
      await import('@tanstack/react-start/server')

    setResponseHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    )
    setResponseHeader('Pragma', 'no-cache')
    setResponseHeader('Expires', '0')

    const [{ needsSetup }, session] = await Promise.all([
      checkInitialSetupRequiredHandler(),
      auth.api.getSession({
        headers: getRequestHeaders(),
      }),
    ])

    return { session, needsSetup }
  },
)

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const { session, needsSetup } = await getAdminAuthState()
    const normalizedPath = location.pathname.replace(/\/+$/, '')
    const isSetupPage = normalizedPath === '/admin/setup'
    const isLoginPage = normalizedPath === '/admin/login'

    if (needsSetup) {
      if (!isSetupPage) {
        throw redirect({ to: '/admin/setup' })
      }
      return
    }

    if (isSetupPage) {
      throw redirect({ to: session ? '/admin' : '/admin/login' })
    }

    if (isLoginPage) {
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
  notFoundComponent: () => <NotFoundPage variant="admin" />,
  component: AdminLayout,
})

function AdminLayout() {
  const routerState = useRouterState()
  const normalizedPath = routerState.location.pathname.replace(/\/+$/, '')
  const isAuthPage =
    normalizedPath === '/admin/login' || normalizedPath === '/admin/setup'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [adminIconLogo, setAdminIconLogo] = useState(DEFAULT_ADMIN_ICON_LOGO)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const syncBrandLogos = () => {
      getPublicBrandLogos()
        .then((logos) => {
          setAdminIconLogo((prev) =>
            prev === logos.adminIconLogo ? prev : logos.adminIconLogo,
          )
          const iconEl = document.querySelector<HTMLLinkElement>(
            'link[rel="icon"]',
          )
          if (iconEl && logos.adminIconLogo) {
            iconEl.href = logos.adminIconLogo
          }
        })
        .catch(() => {
          /* fall back to bundled default logo */
        })
    }
    syncBrandLogos()
    window.addEventListener('brand-logos-updated', syncBrandLogos)
    return () =>
      window.removeEventListener('brand-logos-updated', syncBrandLogos)
  }, [])

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

    window.addEventListener('user-profile-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate)
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
    if (isAuthPage) return
    authClient.getSession().then(({ data }) => {
      if (!data) {
        window.location.replace('/admin/login')
      } else {
        setSessionData(data)
      }
    })
  }, [isAuthPage])

  // Live chat staff online presence heartbeat & unread count sync
  useEffect(() => {
    if (isAuthPage || !sessionData?.user) return
    let active = true

    const syncPresence = () => {
      if (document.visibilityState === 'hidden') return
      heartbeatAdminPresence({ data: {} })
        .then((res) => {
          if (active) {
            setUnreadChatCount(res.unreadThreadsCount)
          }
        })
        .catch(() => {
          /* ignore transient network errors */
        })
    }

    syncPresence()
    const interval = setInterval(syncPresence, 25000)
    window.addEventListener('admin-chat-refresh', syncPresence)
    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('admin-chat-refresh', syncPresence)
    }
  }, [isAuthPage, sessionData?.user])

  if (isAuthPage) {
    return <Outlet />
  }

  const handleLogout = async () => {
    try {
      // 👈 Record logout activity log on server before destroying session
      await logUserLogout()
      await authClient.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      window.location.replace('/admin/login')
    }
  }

  const user = sessionData?.user

  return (
    <div className="h-dvh w-screen flex flex-col bg-stone-100 overflow-hidden">
      {/* Top Navbar Header Component */}
      <AdminNavbar
        user={user}
        logoUrl={adminIconLogo}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        handleLogout={handleLogout}
        unreadChatCount={unreadChatCount}
      />

      {/* Main Container below navbar with strict height containment */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Sidebar Navigation Component */}
        <AdminSidebar
          currentUser={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          unreadChatCount={unreadChatCount}
        />

        {/* Isolated Scrollable Main Content Area */}
        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto h-full transition-all duration-300">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
