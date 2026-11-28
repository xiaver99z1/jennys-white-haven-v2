import { useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Images, MapPin, Menu, Phone, Star, X } from 'lucide-react'
import { resolveBrandLogos } from '#/lib/constants/cms'
import { CurrencyContext, CurrencyProvider } from '#/lib/currency'
import { I18nContext, I18nProvider, useI18n } from '#/lib/i18n'
import { AnalyticsTracker } from '#/components/public/AnalyticsTracker'
import { CookieConsentCenter } from '#/components/public/CookieConsentCenter'
import { CurrencySelector } from '#/components/public/CurrencySelector'
import { LanguageSelector } from '#/components/public/LanguageSelector'
import { PublicChatWidget } from '#/components/public/PublicChatWidget'
import type { CmsSectionData } from '#/types'

interface PublicLayoutProps {
  children: ReactNode
  contactSection?: CmsSectionData
  brandingSection?: CmsSectionData
  showExploreLink?: boolean
}

function PublicLayoutInner({
  children,
  contactSection,
  brandingSection,
  showExploreLink = true,
}: PublicLayoutProps) {
  const { t } = useI18n()
  const brandLogos = resolveBrandLogos(brandingSection)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [cookieModalOpen, setCookieModalOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const moreItemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const moreCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cookieTriggerRef = useRef<HTMLElement | null>(null)
  const footerCookieBtnRef = useRef<HTMLButtonElement>(null)
  const meta = contactSection?.metadata ?? {}

  function clearMoreCloseTimer() {
    if (moreCloseTimerRef.current !== null) {
      clearTimeout(moreCloseTimerRef.current)
      moreCloseTimerRef.current = null
    }
  }

  function handleMoreMouseEnter() {
    clearMoreCloseTimer()
    setMoreOpen(true)
  }

  function handleMoreMouseLeave() {
    clearMoreCloseTimer()
    moreCloseTimerRef.current = setTimeout(() => {
      moreCloseTimerRef.current = null
      const hasFocusedMenuItem = moreItemRefs.current.some(
        (item) => item !== null && item === document.activeElement,
      )
      if (!hasFocusedMenuItem) {
        setMoreOpen(false)
      }
    }, 140)
  }

  useEffect(() => {
    return () => {
      if (moreCloseTimerRef.current !== null) {
        clearTimeout(moreCloseTimerRef.current)
      }
    }
  }, [])

  function focusMoreItem(index: number) {
    const items = moreItemRefs.current.filter(
      (item): item is HTMLAnchorElement => item !== null,
    )
    if (items.length === 0) return
    const bounded = ((index % items.length) + items.length) % items.length
    items[bounded].focus()
  }

  function openMoreAndFocus(index: number) {
    clearMoreCloseTimer()
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
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (moreOpen) {
        clearMoreCloseTimer()
        setMoreOpen(false)
      } else {
        openMoreAndFocus(0)
      }
    } else if (event.key === 'Escape' && moreOpen) {
      event.preventDefault()
      clearMoreCloseTimer()
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
      clearMoreCloseTimer()
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
        clearMoreCloseTimer()
        setMoreOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const hadFocusInside = moreMenuRef.current?.contains(
          document.activeElement,
        )
        clearMoreCloseTimer()
        setMoreOpen(false)
        if (hadFocusInside) {
          moreTriggerRef.current?.focus()
        }
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

  useEffect(() => {
    const iconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (iconEl && brandLogos.adminIconLogo) {
      iconEl.href = brandLogos.adminIconLogo
    }
  }, [brandLogos.adminIconLogo])

  const layoutContent = (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-stone-900 selection:bg-amber-200/60">
      {/* Minimal Aman-inspired Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between">
          <Link
            to="/"
            aria-label="Jenny's White Haven"
            className="flex items-center shrink-0 py-1 group"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src={brandLogos.publicBrandLogo}
              alt="Jenny's White Haven"
              width={320}
              height={205}
              fetchPriority="high"
              decoding="async"
              className="h-11 sm:h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-7 text-xs uppercase tracking-[0.18em] text-stone-600">
            <Link
              to="/"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              {t.nav.sanctuary}
            </Link>
            <Link
              to="/rooms"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              {t.nav.rooms}
            </Link>
            {showExploreLink && (
              <Link
                to="/explore"
                className="hover:text-stone-900 transition"
                activeProps={{ className: 'text-stone-950 font-semibold' }}
              >
                {t.nav.exploreCamotes}
              </Link>
            )}
            <Link
              to="/booking-status"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              {t.nav.bookingStatus}
            </Link>

            {/* More Dropdown Menu (triggers on hover + click) */}
            <div
              ref={moreMenuRef}
              className="relative"
              onMouseEnter={handleMoreMouseEnter}
              onMouseLeave={handleMoreMouseLeave}
              onFocus={clearMoreCloseTimer}
              onBlur={(event) => {
                if (
                  moreMenuRef.current &&
                  (!event.relatedTarget ||
                    !(event.relatedTarget instanceof Node) ||
                    !moreMenuRef.current.contains(event.relatedTarget))
                ) {
                  clearMoreCloseTimer()
                  setMoreOpen(false)
                }
              }}
            >
              <button
                ref={moreTriggerRef}
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls={moreOpen ? 'more-nav-menu' : undefined}
                onClick={() => {
                  clearMoreCloseTimer()
                  setMoreOpen((prev) => !prev)
                }}
                onKeyDown={handleMoreTriggerKeyDown}
                className="inline-flex items-center gap-1.5 hover:text-stone-900 transition cursor-pointer uppercase tracking-[0.18em] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 rounded-md px-1 py-0.5"
              >
                <span>{t.nav.more}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full pt-3 z-50">
                  <div
                    id="more-nav-menu"
                    role="menu"
                    aria-label={t.nav.morePagesLabel}
                    onKeyDown={handleMoreMenuKeyDown}
                    className="w-64 rounded-2xl bg-[#FAF8F4] border border-stone-200/80 shadow-xl py-2 normal-case tracking-normal"
                  >
                    <Link
                      ref={(el) => {
                        moreItemRefs.current[0] = el
                      }}
                      to="/gallery"
                      role="menuitem"
                      onClick={() => {
                        clearMoreCloseTimer()
                        setMoreOpen(false)
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                    >
                      <Images className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                          {t.nav.photoGallery}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {t.nav.photoGalleryDesc}
                        </p>
                      </div>
                    </Link>
                    <Link
                      ref={(el) => {
                        moreItemRefs.current[1] = el
                      }}
                      to="/reviews"
                      role="menuitem"
                      onClick={() => {
                        clearMoreCloseTimer()
                        setMoreOpen(false)
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                    >
                      <Star className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                          {t.nav.guestReviews}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {t.nav.guestReviewsDesc}
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
                      onClick={() => {
                        clearMoreCloseTimer()
                        setMoreOpen(false)
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                    >
                      <MapPin className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                          {t.nav.googleMap}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {t.nav.googleMapDesc}
                        </p>
                      </div>
                    </Link>
                    <Link
                      ref={(el) => {
                        moreItemRefs.current[3] = el
                      }}
                      to="/contact"
                      role="menuitem"
                      onClick={() => {
                        clearMoreCloseTimer()
                        setMoreOpen(false)
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#F3EFE7] focus:bg-[#F3EFE7] focus:outline-none transition group"
                    >
                      <Phone className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-amber-900">
                          {t.nav.contactUs}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {t.nav.contactUsDesc}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <LanguageSelector variant="desktop" />
              <CurrencySelector variant="desktop" />
            </div>
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
              {t.nav.sanctuary}
            </Link>
            <Link
              to="/rooms"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.rooms}
            </Link>
            {showExploreLink && (
              <Link
                to="/explore"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.exploreCamotes}
              </Link>
            )}
            <Link
              to="/booking-status"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.bookingStatus}
            </Link>
            <div className="pt-2 border-t border-stone-200/70 space-y-3">
              <p className="text-[10px] tracking-[0.24em] text-stone-400">
                {t.nav.more}
              </p>
              <Link
                to="/gallery"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.photoGallery}
              </Link>
              <Link
                to="/reviews"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.guestReviews}
              </Link>
              <Link
                to="/contact"
                hash="map"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.googleMap}
              </Link>
              <Link
                to="/contact"
                className="block py-1 hover:text-stone-950"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.contactUs}
              </Link>
            </div>
            <LanguageSelector variant="mobile" />
            <CurrencySelector variant="mobile" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Calm Editorial Footer */}
      <footer className="border-t border-stone-200/80 bg-[#F3EFE7] text-stone-700">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 sm:py-12 lg:py-14 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          <div className="space-y-3">
            <img
              src={brandLogos.publicBrandLogo}
              alt="Jenny's White Haven"
              width={320}
              height={205}
              loading="lazy"
              decoding="async"
              className="h-14 w-auto object-contain"
            />
            <p className="text-sm text-stone-600 leading-relaxed max-w-sm">
              {contactSection?.body || t.footer.defaultTagline}
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              {t.footer.locationAndContact}
            </p>
            <p className="text-stone-800">
              {meta.address ||
                'Santiago Bay, San Francisco, Camotes Island, Cebu'}
            </p>
            {meta.phone && <p className="text-stone-600">{meta.phone}</p>}
            {meta.email && <p className="text-stone-600">{meta.email}</p>}
            {(meta.checkInTime || meta.checkOutTime) && (
              <p className="text-xs text-stone-500 pt-1">
                {t.footer.checkIn} {meta.checkInTime || '2:00 PM'} ·{' '}
                {t.footer.checkOut} {meta.checkOutTime || '12:00 PM'}
              </p>
            )}
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              {t.footer.guestServices}
            </p>
            <div className="flex flex-col space-y-2 text-stone-700">
              <Link to="/rooms" className="hover:text-stone-950 transition">
                {t.footer.browseRoomsAndRates}
              </Link>
              {showExploreLink && (
                <Link to="/explore" className="hover:text-stone-950 transition">
                  {t.footer.camotesIslandGuide}
                </Link>
              )}
              <Link
                to="/booking-status"
                className="hover:text-stone-950 transition"
              >
                {t.footer.checkBookingStatus}
              </Link>
              <Link to="/gallery" className="hover:text-stone-950 transition">
                {t.footer.photoGallery}
              </Link>
              <Link to="/reviews" className="hover:text-stone-950 transition">
                {t.footer.guestReviews}
              </Link>
              <Link
                to="/contact"
                hash="map"
                className="hover:text-stone-950 transition"
              >
                {t.footer.googleMapAndDirections}
              </Link>
              <Link to="/contact" className="hover:text-stone-950 transition">
                {t.footer.contactUs}
              </Link>
              <button
                ref={footerCookieBtnRef}
                type="button"
                onClick={(e) => handleOpenCookiePreferences(e.currentTarget)}
                className="text-left hover:text-stone-950 transition cursor-pointer"
              >
                {t.footer.cookiePreferences}
              </button>
              <Link
                to="/admin/login"
                className="text-xs text-stone-500 hover:text-stone-800 transition pt-2"
              >
                {t.footer.staffPortal}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200/70 py-5 px-6 lg:px-10 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Jenny&apos;s White Haven · Camotes
          Island, Cebu
        </div>
      </footer>

      <PublicChatWidget />
      <CookieConsentCenter
        isPreferencesOpen={cookieModalOpen}
        onOpenPreferences={handleOpenCookiePreferences}
        onClosePreferences={handleCloseCookiePreferences}
      />
      <AnalyticsTracker />
    </div>
  )

  return layoutContent
}

export function PublicLayout(props: PublicLayoutProps) {
  const existingI18n = useContext(I18nContext)
  const existingCurrency = useContext(CurrencyContext)

  let node = <PublicLayoutInner {...props} />
  if (!existingCurrency) {
    node = <CurrencyProvider>{node}</CurrencyProvider>
  }
  if (!existingI18n) {
    node = <I18nProvider>{node}</I18nProvider>
  }
  return node
}
