import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { GlobalSearchResults, NotificationsResponse } from '#/types'
import { globalAdminSearch } from '#/server/navbar-actions'
import {
  getNotifications,
  markNotificationRead,
} from '#/server/notification-actions'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GlobalSearchResults>({
    bookings: [],
    guests: [],
    rooms: [],
  })

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationsResponse>({
    unreadCount: 0,
    items: [],
  })
  const [notifError, setNotifError] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const notifSeqRef = useRef(0)
  const isMountedRef = useRef(true)

  const loadNotifications = () => {
    const seq = ++notifSeqRef.current
    setNotifLoading(true)
    setNotifError(false)
    getNotifications({ data: { limit: 8 } })
      .then((res) => {
        if (isMountedRef.current && seq === notifSeqRef.current) {
          setNotifications(res)
        }
      })
      .catch(() => {
        if (isMountedRef.current && seq === notifSeqRef.current) {
          setNotifError(true)
        }
      })
      .finally(() => {
        if (isMountedRef.current && seq === notifSeqRef.current) {
          setNotifLoading(false)
        }
      })
  }

  useEffect(() => {
    isMountedRef.current = true
    loadNotifications()
    window.addEventListener('admin-notifications-refresh', loadNotifications)
    return () => {
      isMountedRef.current = false
      window.removeEventListener(
        'admin-notifications-refresh',
        loadNotifications,
      )
    }
  }, [])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults({ bookings: [], guests: [], rooms: [] })
      setIsSearching(false)
      return
    }

    let active = true
    setIsSearching(true)
    const timer = setTimeout(() => {
      globalAdminSearch({ data: { query: trimmed } })
        .then((res) => {
          if (active) setSearchResults(res)
        })
        .catch(() => {
          if (active) {
            setSearchResults({ bookings: [], guests: [], rooms: [] })
          }
        })
        .finally(() => {
          if (active) setIsSearching(false)
        })
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasResults =
    searchResults.bookings.length > 0 ||
    searchResults.guests.length > 0 ||
    searchResults.rooms.length > 0

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

        <div className="relative flex-1 ml-2" ref={searchRef}>
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
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchOpen(false)
            }}
            placeholder="Search for anything..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white/80 backdrop-blur-xs border border-stone-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600/50 transition placeholder:text-stone-400 text-stone-800"
          />

          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 max-h-96 overflow-y-auto text-xs">
              {isSearching ? (
                <div className="px-4 py-3 text-stone-500">Searching...</div>
              ) : !hasResults ? (
                <div className="px-4 py-3 text-stone-500">
                  No results found for "{searchQuery.trim()}"
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {searchResults.bookings.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Bookings
                      </div>
                      {searchResults.bookings.map((b) => (
                        <Link
                          key={b.id}
                          to="/admin/bookings"
                          onClick={() => setSearchOpen(false)}
                          className="block px-3 py-2 hover:bg-stone-50 transition"
                        >
                          <div className="font-semibold text-stone-900">
                            {b.bookingReference} · {b.guestName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {b.roomLabel} · {b.status}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.guests.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Guests
                      </div>
                      {searchResults.guests.map((g) => (
                        <Link
                          key={g.id}
                          to="/admin/guests"
                          onClick={() => setSearchOpen(false)}
                          className="block px-3 py-2 hover:bg-stone-50 transition"
                        >
                          <div className="font-semibold text-stone-900">
                            {g.name}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {g.phone}
                            {g.email ? ` · ${g.email}` : ''}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.rooms.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Rooms
                      </div>
                      {searchResults.rooms.map((r) => (
                        <Link
                          key={r.id}
                          to="/admin/rooms"
                          onClick={() => setSearchOpen(false)}
                          className="block px-3 py-2 hover:bg-stone-50 transition"
                        >
                          <div className="font-semibold text-stone-900">
                            Room {r.roomNumber} · {r.name}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {r.type} · {r.status}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-full hover:bg-white/40 text-stone-700 transition cursor-pointer"
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifications.unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 pt-2 z-50 text-xs text-stone-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-stone-100 flex items-center justify-between">
                <span className="font-bold text-stone-900">Notifications</span>
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                  {notifications.unreadCount}
                </span>
              </div>
              {notifError ? (
                <div className="px-4 py-6 text-center space-y-2">
                  <p className="text-red-600 font-medium">
                    Failed to load notifications.
                  </p>
                  <button
                    type="button"
                    onClick={loadNotifications}
                    className="px-3 py-1 rounded-lg bg-stone-900 text-white text-[11px] font-semibold hover:bg-stone-800 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : notifLoading && notifications.items.length === 0 ? (
                <div className="px-4 py-6 text-center text-stone-500">
                  Loading notifications...
                </div>
              ) : notifications.items.length === 0 ? (
                <div className="px-4 py-6 text-center text-stone-500">
                  You&apos;re all caught up.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                  {notifications.items.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => {
                        setNotificationsOpen(false)
                        if (!item.isRead) {
                          markNotificationRead({ data: { id: item.id } })
                            .then(() => {
                              window.dispatchEvent(
                                new Event('admin-notifications-refresh'),
                              )
                            })
                            .catch(() => {
                              /* ignore read mark error */
                            })
                        }
                      }}
                      className={`block px-4 py-2.5 hover:bg-stone-50 transition ${
                        item.isRead ? 'opacity-70' : 'bg-amber-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-stone-900">
                        {!item.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-700 shrink-0" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {item.message}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-center">
                <Link
                  to="/admin/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="inline-block w-full text-xs font-semibold text-amber-800 hover:text-amber-900 transition"
                >
                  See all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

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
