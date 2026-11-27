import { createFileRoute } from '@tanstack/react-router'
import { ExploreGuideView } from '#/components/public/ExploreGuideView'
import { PublicLayout } from '#/components/public/PublicLayout'
import { getPublicCmsSections } from '#/server/cms-actions'

export const Route = createFileRoute('/explore')({
  loader: async () => {
    const sections = await getPublicCmsSections()
    return { sections }
  },
  head: () => ({
    meta: [
      {
        title: "Explore Camotes | Jenny's White Haven",
      },
      {
        name: 'description',
        content:
          "Discover the best beaches, caves, lakes, and viewpoints on Camotes Island, Cebu during your stay at Jenny's White Haven.",
      },
    ],
  }),
  component: ExploreCamotesPage,
})

function ExploreCamotesPage() {
  const { sections } = Route.useLoaderData()
  const exploreSection = sections.find((s) => s.key === 'explore')
  const contactSection = sections.find((s) => s.key === 'contact')
  const brandingSection = sections.find((s) => s.key === 'branding')

  return (
    <PublicLayout
      contactSection={contactSection}
      brandingSection={brandingSection}
      showExploreLink={Boolean(exploreSection)}
    >
      <ExploreGuideView exploreSection={exploreSection} />
    </PublicLayout>
  )
}
