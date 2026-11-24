import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Images } from 'lucide-react'
import { getSectionPhotoItems } from '#/lib/constants/cms'
import { SectionPhotoGalleryModal } from '#/components/public/SectionPhotoGalleryModal'
import type { CmsSectionData } from '#/types'

interface GalleryPageViewProps {
  gallerySection?: CmsSectionData
}

export function GalleryPageView({ gallerySection }: GalleryPageViewProps) {
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean
    initialMode: 'grid' | 'lightbox'
    initialIndex: number
  }>({
    isOpen: false,
    initialMode: 'lightbox',
    initialIndex: 0,
  })

  if (!gallerySection || !gallerySection.isPublished) {
    return (
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-24 lg:py-32 text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F3EFE7] border border-stone-200/80 flex items-center justify-center">
          <Images className="w-5 h-5 text-amber-800" />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-900/80 font-semibold">
            Atmosphere · Photo Gallery
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">
            Photo Gallery Unavailable
          </h1>
          <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl mx-auto">
            Our photo gallery is currently hidden while we refresh our island
            photography. Browse our rooms or return to the sanctuary overview.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 text-[#FAF8F4] hover:bg-amber-900 text-xs uppercase tracking-[0.16em] font-medium transition"
          >
            <span>Browse Rooms &amp; Rates</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs uppercase tracking-[0.16em] font-medium transition"
          >
            Return to Sanctuary
          </Link>
        </div>
      </section>
    )
  }

  const photos = getSectionPhotoItems(
    gallerySection.images,
    gallerySection.metadata.imageCaptionsJson,
  )

  const eyebrow = gallerySection.metadata.eyebrow || 'Atmosphere'
  const title = gallerySection.title || 'Spaces bathed in tropical light.'
  const subtitle =
    gallerySection.subtitle || 'A glimpse into daily life at the haven.'

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12 sm:py-16 space-y-10">
      {/* Editorial Header */}
      <header className="space-y-3 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.26em] text-amber-800 font-semibold">
          {eyebrow}
        </p>
        <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-stone-600 leading-relaxed">{subtitle}</p>
        )}
        {gallerySection.body && (
          <p className="text-sm text-stone-600 leading-relaxed">
            {gallerySection.body}
          </p>
        )}
      </header>

      {/* Pictures Grid Section (matching 2nd reference image) */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Pictures
          </h2>
          {photos.length > 0 && (
            <span className="text-xs text-stone-500">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </span>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="rounded-3xl bg-white border border-stone-200/80 p-12 text-center space-y-4">
            <Images className="w-8 h-8 text-stone-300 mx-auto" />
            <div className="space-y-1.5">
              <p className="font-serif text-xl text-stone-800">
                Gallery photos are being curated
              </p>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                We are updating our island photography. Browse our suites and
                rooms in the meantime.
              </p>
            </div>
            <Link
              to="/rooms"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.16em] font-semibold hover:bg-amber-900 transition"
            >
              <span>Browse Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {photos.map((photo, idx) => {
                const isAboveFold = idx < 3
                return (
                  <button
                    key={`${photo.url}-${idx}`}
                    type="button"
                    onClick={() =>
                      setLightboxState({
                        isOpen: true,
                        initialMode: 'lightbox',
                        initialIndex: idx,
                      })
                    }
                    aria-label={
                      photo.caption
                        ? `Open photo ${idx + 1}: ${photo.caption}`
                        : `Open photo ${idx + 1}`
                    }
                    className="group relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-200 text-left shadow-xs hover:shadow-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800/60"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || `${title} photo ${idx + 1}`}
                      loading={isAboveFold ? 'eager' : 'lazy'}
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      decoding="async"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-transparent px-4 pt-8 pb-3">
                        <p className="text-sm font-semibold text-white drop-shadow-xs">
                          {photo.caption}
                        </p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() =>
                  setLightboxState({
                    isOpen: true,
                    initialMode: 'lightbox',
                    initialIndex: 0,
                  })
                }
                className="text-sm font-medium text-stone-700 hover:text-stone-950 underline underline-offset-4 transition cursor-pointer"
              >
                Explore all pictures
              </button>
            </div>
          </>
        )}
      </section>

      <SectionPhotoGalleryModal
        isOpen={lightboxState.isOpen}
        sectionTitle={title}
        sectionEyebrow={eyebrow}
        photos={photos}
        initialMode={lightboxState.initialMode}
        initialIndex={lightboxState.initialIndex}
        onClose={() =>
          setLightboxState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  )
}
