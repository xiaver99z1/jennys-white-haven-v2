import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Ship,
} from 'lucide-react'
import { PublicLayout } from '#/components/public/PublicLayout'
import { getPublicCmsSections } from '#/server/cms-actions'

const DEFAULT_MAP_EMBED_URL =
  'https://maps.google.com/maps?q=Santiago+Bay+San+Francisco+Camotes+Island+Cebu&t=&z=14&ie=UTF8&iwloc=&output=embed'
const DEFAULT_MAP_DIRECTIONS_URL =
  'https://www.google.com/maps/search/?api=1&query=Santiago+Bay+San+Francisco+Camotes+Island+Cebu'

function resolveSafeGoogleMapsEmbedUrl(raw?: string): string {
  const candidate = raw?.trim()
  if (!candidate) return DEFAULT_MAP_EMBED_URL
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:') return DEFAULT_MAP_EMBED_URL
    const host = parsed.hostname.toLowerCase()
    const isTrustedHost =
      host === 'maps.google.com' ||
      (host === 'www.google.com' && parsed.pathname.startsWith('/maps'))
    return isTrustedHost ? parsed.toString() : DEFAULT_MAP_EMBED_URL
  } catch {
    return DEFAULT_MAP_EMBED_URL
  }
}

function resolveSafeGoogleMapsDirectionsUrl(raw?: string): string {
  const candidate = raw?.trim()
  if (!candidate) return DEFAULT_MAP_DIRECTIONS_URL
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:') return DEFAULT_MAP_DIRECTIONS_URL
    const host = parsed.hostname.toLowerCase()
    const isTrustedHost =
      host === 'maps.google.com' ||
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      (host === 'www.google.com' && parsed.pathname.startsWith('/maps'))
    return isTrustedHost ? parsed.toString() : DEFAULT_MAP_DIRECTIONS_URL
  } catch {
    return DEFAULT_MAP_DIRECTIONS_URL
  }
}

export const Route = createFileRoute('/contact')({
  loader: async () => {
    const sections = await getPublicCmsSections()
    return { sections }
  },
  head: () => ({
    meta: [
      { title: "Contact & Map | Jenny's White Haven" },
      {
        name: 'description',
        content:
          "Find Jenny's White Haven on Camotes Island, Cebu. View our Google Map location, phone, email, check-in hours, and ferry arrival tips.",
      },
    ],
  }),
  component: ContactAndMapPage,
})

function ContactAndMapPage() {
  const { sections } = Route.useLoaderData()
  const contactSection = sections.find((s) => s.key === 'contact')
  const showExploreLink = sections.some((s) => s.key === 'explore')
  const meta = contactSection?.metadata ?? {}

  const address =
    meta.address || 'Santiago Bay, San Francisco, Camotes Island, Cebu'
  const phone = meta.phone || '+63 917 000 0000'
  const email = meta.email || 'stay@jennyswhitehaven.com'
  const checkInTime = meta.checkInTime || '2:00 PM'
  const checkOutTime = meta.checkOutTime || '12:00 PM'
  const paymentInfo =
    meta.paymentInfo ||
    'GCash / Bank Transfer accepted. A 50% deposit confirms your reservation.'
  const mapEmbedUrl = resolveSafeGoogleMapsEmbedUrl(meta.mapEmbedUrl)
  const mapDirectionsUrl = resolveSafeGoogleMapsDirectionsUrl(
    meta.mapDirectionsUrl,
  )

  return (
    <PublicLayout
      contactSection={contactSection}
      showExploreLink={showExploreLink}
    >
      {/* Editorial Header */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="max-w-2xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
            Contact &amp; Location
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 leading-tight">
            {contactSection?.title || 'Plan your visit to Camotes Island.'}
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
            {contactSection?.subtitle ||
              'Have questions about ferry schedules, room requests, or group stays? Reach out anytime.'}
          </p>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EFE7] text-amber-900 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Address
            </p>
            <p className="text-sm text-stone-800 leading-relaxed">{address}</p>
            <a
              href="#map"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:underline pt-1"
            >
              View on map ↓
            </a>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EFE7] text-amber-900 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Phone / Mobile
            </p>
            <a
              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
              className="block text-sm font-medium text-stone-900 hover:text-amber-900 transition"
            >
              {phone}
            </a>
            <p className="text-xs text-stone-500">
              Daily front-desk &amp; transfer assistance
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EFE7] text-amber-900 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Email
            </p>
            <a
              href={`mailto:${email}`}
              className="block text-sm font-medium text-stone-900 hover:text-amber-900 transition break-all"
            >
              {email}
            </a>
            <p className="text-xs text-stone-500">
              We respond promptly to stay inquiries
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#F3EFE7] text-amber-900 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-semibold">
              Stay Hours
            </p>
            <div className="text-sm text-stone-800 space-y-1">
              <p>
                <span className="text-stone-500">Check-in:</span> {checkInTime}
              </p>
              <p>
                <span className="text-stone-500">Check-out:</span>{' '}
                {checkOutTime}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Google Map Section */}
      <section
        id="map"
        className="scroll-mt-24 bg-[#F3EFE7] border-y border-stone-200/80 py-12 sm:py-16"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
                Google Map
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900">
                Find Us on Camotes Island
              </h2>
              <p className="text-sm text-stone-600">{address}</p>
            </div>

            <a
              href={mapDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.16em] font-semibold hover:bg-amber-900 transition self-start sm:self-auto"
            >
              <Navigation className="w-3.5 h-3.5" />
              Open in Google Maps
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="rounded-3xl overflow-hidden border border-stone-200 bg-white shadow-sm aspect-[16/10] sm:aspect-[16/8]">
            <iframe
              title="Jenny's White Haven Google Map"
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Arrival & Payment Notes */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-stone-200/80 p-7 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F3EFE7] text-amber-900 flex items-center justify-center">
                <Ship className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif text-stone-900">
                Port &amp; Ferry Arrival Notes
              </h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              {contactSection?.body ||
                'We welcome guests daily with flexible check-in coordination based on Consuelo or Poro port arrivals.'}
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Arriving via Danao Port (Jomalia Shipping) or Cebu Pier 1
              (OceanJet)? Share your ferry time when booking so we can help
              arrange a local multicab or motorbike transfer directly to the
              haven.
            </p>
          </div>

          <div className="bg-stone-900 text-[#FAF8F4] rounded-3xl p-7 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-800 text-amber-200 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif">
                  Reservation &amp; Payment Details
                </h2>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">
                {paymentInfo}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/rooms"
                className="px-5 py-2.5 rounded-full bg-[#FAF8F4] text-stone-900 text-xs uppercase tracking-[0.16em] font-semibold hover:bg-amber-100 transition"
              >
                Browse Rooms
              </Link>
              <Link
                to="/booking-status"
                className="px-5 py-2.5 rounded-full border border-stone-600 text-[#FAF8F4] text-xs uppercase tracking-[0.16em] font-semibold hover:bg-stone-800 transition"
              >
                Check Booking Status
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
