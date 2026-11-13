import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import type { CmsSectionData } from '#/types'

interface PublicLayoutProps {
  children: ReactNode
  contactSection?: CmsSectionData
}

export function PublicLayout({ children, contactSection }: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = contactSection?.metadata ?? {}

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-stone-900 selection:bg-amber-200/60">
      {/* Minimal Aman-inspired Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F4]/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
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
            <Link
              to="/booking-status"
              className="hover:text-stone-900 transition"
              activeProps={{ className: 'text-stone-950 font-semibold' }}
            >
              Booking Status
            </Link>
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
            <Link
              to="/booking-status"
              className="block py-1 hover:text-stone-950"
              onClick={() => setMenuOpen(false)}
            >
              Booking Status
            </Link>
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
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
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
              <Link
                to="/booking-status"
                className="hover:text-stone-950 transition"
              >
                Check Booking Status
              </Link>
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
    </div>
  )
}
