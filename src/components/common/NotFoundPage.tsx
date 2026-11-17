import { Link } from '@tanstack/react-router'
import { ArrowLeft, Compass, Home } from 'lucide-react'

interface NotFoundPageProps {
  variant?: 'public' | 'admin'
}

export function NotFoundPage({ variant = 'public' }: NotFoundPageProps) {
  if (variant === 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200/80 shadow-xs p-8 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
              Error 404
            </p>
            <h1 className="text-xl font-bold text-stone-900">Page Not Found</h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              The admin page you requested does not exist or may have been
              moved.
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAF8F4] text-stone-900 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-lg space-y-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-800 font-semibold">
          Jenny&apos;s White Haven · 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif text-stone-900">
          This shore could not be found.
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          The page you&apos;re looking for may have moved or no longer exists.
          Return to the sanctuary or browse our available island rooms.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold transition"
          >
            <Home className="w-3.5 h-3.5" />
            Return Home
          </Link>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:bg-stone-100 text-xs uppercase tracking-[0.18em] font-semibold transition"
          >
            Browse Rooms
          </Link>
        </div>
      </div>
    </main>
  )
}
