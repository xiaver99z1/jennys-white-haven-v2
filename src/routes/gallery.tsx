import { createFileRoute } from '@tanstack/react-router'
import { GalleryPageView } from '#/components/public/GalleryPageView'
import { PublicLayout } from '#/components/public/PublicLayout'
import { getPublicCmsSections } from '#/server/cms-actions'

export const Route = createFileRoute('/gallery')({
  loader: async () => {
    const sections = await getPublicCmsSections()
    return { sections }
  },
  head: () => ({
    meta: [
      { title: "Photo Gallery | Jenny's White Haven" },
      {
        name: 'description',
        content:
          "Explore photos of Jenny's White Haven on Camotes Island, Cebu—our suites, living spaces, and coastal sanctuary.",
      },
    ],
  }),
  component: PublicGalleryPage,
})

function PublicGalleryPage() {
  const { sections } = Route.useLoaderData()
  const gallerySection = sections.find((s) => s.key === 'gallery')
  const contactSection = sections.find((s) => s.key === 'contact')
  const showExploreLink = sections.some((s) => s.key === 'explore')

  return (
    <PublicLayout
      contactSection={contactSection}
      showExploreLink={showExploreLink}
    >
      <GalleryPageView gallerySection={gallerySection} />
    </PublicLayout>
  )
}
