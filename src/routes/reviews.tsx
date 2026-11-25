import { createFileRoute } from '@tanstack/react-router'
import { PublicLayout } from '#/components/public/PublicLayout'
import { ReviewsPageView } from '#/components/public/ReviewsPageView'
import { getPublicCmsSections } from '#/server/cms-actions'
import { getPublicReviews } from '#/server/review-actions'

export const Route = createFileRoute('/reviews')({
  loader: async () => {
    const [sections, summary] = await Promise.all([
      getPublicCmsSections(),
      getPublicReviews(),
    ])
    return { sections, summary }
  },
  head: () => ({
    meta: [
      { title: "Guest Reviews | Jenny's White Haven" },
      {
        name: 'description',
        content:
          "Read verified guest reviews and ratings from stays at Jenny's White Haven on Camotes Island, Cebu, or share your own experience.",
      },
    ],
  }),
  component: PublicReviewsPage,
})

function PublicReviewsPage() {
  const { sections, summary } = Route.useLoaderData()
  const contactSection = sections.find((s) => s.key === 'contact')
  const brandingSection = sections.find((s) => s.key === 'branding')
  const showExploreLink = sections.some((s) => s.key === 'explore')

  return (
    <PublicLayout
      contactSection={contactSection}
      brandingSection={brandingSection}
      showExploreLink={showExploreLink}
    >
      <ReviewsPageView summary={summary} />
    </PublicLayout>
  )
}
