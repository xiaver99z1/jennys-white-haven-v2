import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Images, MapPin, Menu, Phone, Star, X } from 'lucide-react'
import { AnalyticsTracker } from '#/components/public/AnalyticsTracker'
import { CookieConsentCenter } from '#/components/public/CookieConsentCenter'
import type { CmsSectionData } from '#/types'

interface PublicLayoutProps {
  children: ReactNode
  contactSection?: CmsSectionData
  showExploreLink?: boolean
}

export function PublicLayout({
  children,
  contactSection,
  showExploreLink = true,
}: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cookieModalOpen, setCookieModalOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const moreItemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const cookieTriggerRef = useRef<HTMLElement | null>(null)
  const footerCookieBtnRef = useRef<HTMLButtonElement>(null)
  const meta = contactSection?.metadata ?? {}

  function focusMoreItem(index: number) {
    const items = moreItemRefs.current.filter(
      (item): item is HTMLAnchorElement => item !== null,
    )
    if (items.length === 0) return
    const bounded = ((index % items.length) + items.length) % items.length
    items[bounded].focus()
  }

  function openMoreAndFocus(index: number) {
    setMoreOpen(true)
    requestAnimationFrame(() => {
      focusMoreItem(index)
    })
  }

  function handleMoreTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMoreAndFocus(0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMoreAndFocus(3)
    } else if (event.key === 'Escape' && moreOpen) {
      event.preventDefault()
      setMoreOpen(false)
    }
  }

  function handleMoreMenuKeyDown(event: React.KeyboardEvent) {
    const items = moreItemRefs.current.filter(
      (item): item is HTMLAnchorElement => item !== null,
    )
    const activeIndex = items.findIndex((item) => item === document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusMoreItem(activeIndex === -1 ? 0 : activeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusMoreItem(activeIndex === -1 ? items.length - 1 : activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusMoreItem(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusMoreItem(items.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setMoreOpen(false)
      moreTriggerRef.current?.focus()
    }
  }

  useEffect(() => {
    if (!moreOpen) return
    function handleOutsideClick(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        event.target instanceof Node &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setMoreOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreOpen(false)
        moreTriggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [moreOpen])

  function handleOpenCookiePreferences(trigger?: HTMLElement | null) {
    cookieTriggerRef.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    setCookieModalOpen(true)
  }

  function handleCloseCookiePreferences(options?: { saved?: boolean }) {
    setCookieModalOpen(false)
    const trigger = cookieTriggerRef.current
    cookieTriggerRef.current = null
    if (trigger?.isConnected) {
      trigger.focus()
    } else if (options?.saved) {
      footerCookieBtnRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-stone-900 selection:bg-amber-200/60">
      {/* Minimal Aman-inspired Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
          <Link
            to="/"
            className="flex flex-col leading-none group"
            onClick={() => setMenuOpen(false)}
          >
            <span className="text-lg sm:text-xl font-serif tracking-wide text-stone-900 group-hover:text-amber-900 transition">
              Jenny&apos;s White Haven
            </span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-stone-500 mt-1">
              Camotes Island · Cebu
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.18em] text-stone-600">
            <Link
              to="/"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              Sanctuary
            </Link>
            <Link
              to="/rooms"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              Rooms
            </Link>
            {showExploreLink && (
              <Link
                to="/explore"
                className="hover:text-stone-900 transition"
                activeProps={{ className: 'text-stone-950 font-semibold' }}
              >
                Explore Camotes
              </Link>
            )}
            <Link
              to="/booking-status"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              Booking Status
            </Link>

            {/* More Dropdown Menu */}
            <div
              ref={moreMenuRef}
              className="relative"
              onBlur={(event) => {
                if (
                  moreMenuRef.current &&
                  (!event.relatedTarget ||
                    !(event.relatedTarget instanceof Node) ||
                    !moreMenuRef.current.contains(event.relatedTarget))
                ) {
                  setMoreOpen(false)
                }
              }}
            >
              <button
                ref={moreTriggerRef}
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls="more-nav-menu"
                onClick={() => setMoreOpen((prev) => !prev)}
                onKeyDown={handleMoreTriggerKeyDown}
                className="inline-flex items-center gap-1.5 hover:text-stone-900 transition cursor-pointer uppercase tracking-[0.18em] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 rounded-md px-1 py-0.5"
              >
                <span>More</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {moreOpen && (
                <div
                  id="more-nav-menu"
                  role="menu"
                  aria-label="More pages"
                  onKeyDown={handleMoreMenuKeyDown}
                  className="absolute right-0 mt-4 w-64 rounded-2xl bg-[#FAF8F4] border border-stone-200/80 shadow-xl py-2 z-50 normal-case tracking-normal"
                >
                  <Link
                    ref={(el) => {
                      moreItemRefs.current[0] = el
                    }}
                    to="/gallery"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                  >
                    <Images className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                        Photo Gallery
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Spaces &amp; daily life at the haven
                      </p>
                    </div>
                  </Link>
                  <Link
                    ref={(el) => {
                      moreItemRefs.current[1] = el
                    }}
                    to="/reviews"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                  >
                    <Star className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                        Guest Reviews
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Ratings &amp; stories from past stays
                      </p>
                    </div>
                  </Link>
                  <Link
                    ref={(el) => {
                      moreItemRefs.current[2] = el
                    }}
                    to="/contact"
                    hash="map"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                  >
                    <MapPin className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                        Google Map
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Directions to Santiago Bay, Camotes
                      </p>
                    </div>
                  </Link>
                  <Link
                    ref={(el) => {
                      moreItemRefs.current[3] = el
                    }}
                    to="/contact"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                  >
                    <Phone className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                        Contact Us
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Phone, email, hours &amp; port guide
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link
              to="/rooms"
              className="px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] hover:bg-amber-900 transition tracking-[0.16em]"
            >
              Reserve
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-200/50 transition cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-stone-200/70 bg-[#FAF8F4] px-6 py-5 space-y-4 text-xs uppercase tracking-[0.18em] text-stone-700">
            <Link
              to="/"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              Sanctuary
            </Link>
            <Link
              to="/rooms"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              Rooms
            </Link>
            {showExploreLink && (
              <Link
                to="/explore"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                Explore Camotes
              </Link>
            )}
            <Link
              to="/booking-status"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              Booking Status
            </Link>
            <div className="pt-2 border-t border-stone-200/70 space-y-3">
              <p className="text-[10px] tracking-[0.24em] text-stone-400">
                More
              </p>
              <Link
                to="/gallery"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                Photo Gallery
              </Link>
              <Link
                to="/reviews"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                Guest Reviews
              </Link>
              <Link
                to="/contact"
                hash="map"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                Google Map
              </Link>
              <Link
                to="/contact"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                Contact Us
              </Link>
            </div>
            <Link
              to="/rooms"
              className="inline-block px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4]"
              onClick={() => setMenuOpen(false)}
            >
              Reserve a Stay
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Calm Editorial Footer */}
      <footer className="border-t border-stone-200/80 bg-[#F3EFE7] text-stone-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 sm:py-12 lg:py-14 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          <div className="space-y-3">
            <p className="font-serif text-xl text-stone-900">
              Jenny&apos;s White Haven
            </p>
            <p className="text-sm text-stone-600 leading-relaxed max-w-sm">
              {contactSection?.body ||
                'A quiet rooms-only coastal retreat on Camotes Island, Cebu, designed for unhurried island stays.'}
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Location &amp; Contact
            </p>
            <p className="text-stone-800">
              {meta.address ||
                'Santiago Bay, San Francisco, Camotes Island, Cebu'}
            </p>
            {meta.phone && <p className="text-stone-600">{meta.phone}</p>}
            {meta.email && <p className="text-stone-600">{meta.email}</p>}
            {(meta.checkInTime || meta.checkOutTime) && (
              <p className="text-xs text-stone-500 pt-1">
                Check-in {meta.checkInTime || '2:00 PM'} · Check-out{' '}
                {meta.checkOutTime || '12:00 PM'}
              </p>
            )}
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Guest Services
            </p>
            <div className="flex flex-col space-y-2 text-stone-700">
              <Link to="/rooms" className="hover:text-stone-950 transition">
                Browse Rooms &amp; Rates
              </Link>
              {showExploreLink && (
                <Link to="/explore" className="hover:text-stone-950 transition">
                  Camotes Island Guide
                </Link>
              )}
              <Link
                to="/booking-status"
                className="hover:text-stone-950 transition"
              >
                Check Booking Status
              </Link>
              <Link to="/gallery" className="hover:text-stone-950 transition">
                Photo Gallery
              </Link>
              <Link to="/reviews" className="hover:text-stone-950 transition">
                Guest Reviews
              </Link>
              <Link
                to="/contact"
                hash="map"
                className="hover:text-stone-950 transition"
              >
                Google Map &amp; Directions
              </Link>
              <Link to="/contact" className="hover:text-stone-950 transition">
                Contact Us
              </Link>
              <button
                ref={footerCookieBtnRef}
                type="button"
                onClick={(e) => handleOpenCookiePreferences(e.currentTarget)}
                className="text-left hover:text-stone-950 transition cursor-pointer"
              >
                Cookie Preferences
              </button>
              <Link
                to="/admin/login"
                className="text-xs text-stone-500 hover:text-stone-800 transition pt-2"
              >
                Staff Portal
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200/70 py-5 px-6 lg:px-10 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Jenny&apos;s White Haven · Camotes
          Island, Cebu
        </div>
      </footer>

      <CookieConsentCenter
        isPreferencesOpen={cookieModalOpen}
        onOpenPreferences={handleOpenCookiePreferences}
        onClosePreferences={handleCloseCookiePreferences}
      />
      <AnalyticsTracker />
    </div>
  )
}
