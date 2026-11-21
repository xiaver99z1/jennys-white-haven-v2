import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPublicCmsSectionsHandler,
  getAdminCmsSectionsHandler,
  upsertCmsSectionHandler,
  resetCmsSectionHandler,
  validateUpsertCmsSection,
  validateResetCmsSection,
} from './cms-actions'
import {
  DEFAULT_CMS_SECTIONS,
  DEFAULT_HERO_CONFIG,
  serializeHeroConfig,
  serializeTouristSpots,
} from '#/lib/constants/cms'

const {
  mockRequirePermission,
  mockAuthSession,
  mockLogActivity,
  mockFindMany,
  mockUpsert,
  mockDeleteMany,
} = vi.hoisted(() => ({
  mockRequirePermission: vi.fn(),
  mockAuthSession: vi.fn(),
  mockLogActivity: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpsert: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('#/server/room-actions', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/logger', () => ({
  logActivity: mockLogActivity,
}))

vi.mock('#/lib/prisma', () => {
  const client = {
    siteSection: {
      findMany: mockFindMany,
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: mockUpsert,
      deleteMany: mockDeleteMany,
    },
    media: {
      upsert: vi.fn().mockResolvedValue({ id: 'm1' }),
    },
    businessMedia: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'bm1' }),
    },
  }
  return {
    prisma: {
      ...client,
      $transaction: vi.fn((cb: (tx: typeof client) => unknown) => cb(client)),
    },
  }
})

describe('cms-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'admin-1', role: 'owner' })
    mockAuthSession.mockResolvedValue({
      session: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    })
  })

  it('merges DB overrides with defaults and hides unpublished sections on public site', async () => {
    mockFindMany.mockResolvedValue([
      {
        key: 'hero',
        title: 'Custom Hero Title',
        subtitle: 'Custom Sub',
        body: null,
        ctaLabel: 'Book Now',
        ctaHref: '/rooms',
        images: ['https://example.com/hero.jpg'],
        metadata: { eyebrow: 'Custom Island' },
        isPublished: true,
        sortOrder: 0,
        updatedAt: new Date('2026-03-01T00:00:00Z'),
      },
      {
        key: 'gallery',
        title: 'Hidden Gallery',
        subtitle: null,
        body: null,
        ctaLabel: null,
        ctaHref: null,
        images: [],
        metadata: {},
        isPublished: false,
        sortOrder: 4,
        updatedAt: new Date('2026-03-01T00:00:00Z'),
      },
    ])

    const sections = await getPublicCmsSectionsHandler()

    expect(sections.find((s) => s.key === 'hero')?.title).toBe(
      'Custom Hero Title',
    )
    expect(sections.find((s) => s.key === 'gallery')).toBeUndefined()
    expect(sections).toHaveLength(DEFAULT_CMS_SECTIONS.length - 1)
  })

  it('returns all sections including hidden ones for admin', async () => {
    mockFindMany.mockResolvedValue([
      {
        key: 'gallery',
        title: 'Hidden Gallery',
        subtitle: null,
        body: null,
        ctaLabel: null,
        ctaHref: null,
        images: [],
        metadata: {},
        isPublished: false,
        sortOrder: 4,
        updatedAt: new Date('2026-03-01T00:00:00Z'),
        updatedBy: { name: 'Jenny Owner' },
      },
    ])

    const sections = await getAdminCmsSectionsHandler()

    expect(mockRequirePermission).toHaveBeenCalledWith('manage:cms')
    expect(sections).toHaveLength(DEFAULT_CMS_SECTIONS.length)
    const gallery = sections.find((s) => s.key === 'gallery')
    expect(gallery?.isPublished).toBe(false)
    expect(gallery?.updatedByName).toBe('Jenny Owner')
  })

  it('validates and upserts a CMS section', async () => {
    const input = validateUpsertCmsSection({
      key: 'hero',
      title: '  Island Calm  ',
      subtitle: '  By the sea  ',
      body: '',
      ctaLabel: 'Explore',
      ctaHref: '/rooms',
      images: [' https://example.com/1.jpg ', ''],
      metadata: { eyebrow: ' Camotes ' },
      isPublished: true,
    })

    mockUpsert.mockResolvedValue({
      key: 'hero',
      title: 'Island Calm',
      subtitle: 'By the sea',
      body: null,
      ctaLabel: 'Explore',
      ctaHref: '/rooms',
      images: ['https://example.com/1.jpg'],
      metadata: { eyebrow: 'Camotes' },
      isPublished: true,
      sortOrder: 0,
      updatedAt: new Date('2026-03-02T00:00:00Z'),
      updatedBy: { name: 'Jenny Owner' },
    })

    const res = await upsertCmsSectionHandler({ data: input })

    expect(res.success).toBe(true)
    expect(res.section.title).toBe('Island Calm')
    expect(res.section.images).toEqual(['https://example.com/1.jpg'])
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CMS_SECTION_UPDATED' }),
    )
  })

  it('rejects invalid key and allows blank section title on upsert', async () => {
    await expect(
      upsertCmsSectionHandler({
        data: {
          key: 'invalid' as 'hero',
          title: 'Test',
          images: [],
          metadata: {},
          isPublished: true,
        },
      }),
    ).rejects.toThrow('Invalid CMS section key.')

    mockUpsert.mockResolvedValueOnce({
      id: 'sec-hero',
      key: 'hero',
      title: '',
      subtitle: null,
      body: null,
      ctaLabel: null,
      ctaHref: null,
      images: [],
      metadata: {
        heroConfigJson: serializeHeroConfig({
          ...DEFAULT_HERO_CONFIG,
          slides: [
            {
              ...DEFAULT_HERO_CONFIG.slides[0],
              image: 'cms/hero-slide.webp',
            },
          ],
        }),
      },
      isPublished: true,
      sortOrder: 0,
      updatedAt: new Date('2026-03-04T00:00:00Z'),
      updatedBy: { name: 'Jenny Owner' },
    })

    const saved = await upsertCmsSectionHandler({
      data: {
        key: 'hero',
        title: '   ',
        images: [],
        metadata: {
          eyebrow: 'Should be stripped',
          heroConfigJson: serializeHeroConfig({
            ...DEFAULT_HERO_CONFIG,
            slides: [
              {
                ...DEFAULT_HERO_CONFIG.slides[0],
                image: '/api/media/view?key=cms/hero-slide.webp',
              },
            ],
          }),
        },
        isPublished: true,
      },
    })

    expect(saved.success).toBe(true)
    expect(saved.section.title).toBe('')
    expect(saved.section.metadata.eyebrow).toBeUndefined()
    expect(saved.section.metadata.heroConfigJson).toContain(
      'cms/hero-slide.webp',
    )

    // Rejects base64 images inside hero carousel slides
    await expect(
      upsertCmsSectionHandler({
        data: {
          key: 'hero',
          title: '',
          images: [],
          metadata: {
            heroConfigJson: serializeHeroConfig({
              ...DEFAULT_HERO_CONFIG,
              slides: [
                {
                  ...DEFAULT_HERO_CONFIG.slides[0],
                  image: 'data:image/png;base64,abc123',
                },
              ],
            }),
          },
          isPublished: true,
        },
      }),
    ).rejects.toThrow(
      'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
    )
  })

  it('resets a CMS section to defaults', async () => {
    const input = validateResetCmsSection({ key: 'story' })
    mockDeleteMany.mockResolvedValue({ count: 1 })

    const res = await resetCmsSectionHandler({ data: input })

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { key: 'story' } })
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CMS_SECTION_RESET' }),
    )
    expect(res.section.key).toBe('story')
  })

  it('normalizes explore tourist spot images, rejects base64 spot images, and resolves URLs on read', async () => {
    const spotsWithBase64 = serializeTouristSpots([
      {
        id: 'spot-1',
        name: 'Santiago Bay',
        category: 'Beach',
        location: 'San Francisco',
        travelTime: '10 mins',
        bestTime: 'Sunset',
        entranceFee: 'Free',
        description: 'White sand.',
        tips: 'Go late afternoon.',
        image: 'data:image/png;base64,iVBORw0KGgo=',
      },
    ])

    await expect(
      upsertCmsSectionHandler({
        data: {
          key: 'explore',
          title: 'Explore Camotes Island',
          images: [],
          metadata: { spotsJson: spotsWithBase64 },
          isPublished: true,
        },
      }),
    ).rejects.toThrow(
      'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
    )

    const validSpots = serializeTouristSpots([
      {
        id: 'spot-1',
        name: 'Santiago Bay',
        category: 'Beach',
        location: 'San Francisco',
        travelTime: '10 mins',
        bestTime: 'Sunset',
        entranceFee: 'Free',
        description: 'White sand.',
        tips: 'Go late afternoon.',
        image: '/api/media/view?key=cms/santiago.webp',
        images: [
          '/api/media/view?key=cms/santiago.webp',
          '/api/media/view?key=cms/santiago-2.webp',
        ],
      },
    ])

    mockUpsert.mockResolvedValueOnce({
      id: 'sec-explore',
      key: 'explore',
      title: 'Explore Camotes Island',
      subtitle: null,
      body: null,
      ctaLabel: null,
      ctaHref: null,
      images: [],
      metadata: {
        spotsJson: serializeTouristSpots([
          {
            id: 'spot-1',
            name: 'Santiago Bay',
            category: 'Beach',
            location: 'San Francisco',
            travelTime: '10 mins',
            bestTime: 'Sunset',
            entranceFee: 'Free',
            description: 'White sand.',
            tips: 'Go late afternoon.',
            image: 'cms/santiago.webp',
            images: ['cms/santiago.webp', 'cms/santiago-2.webp'],
          },
        ]),
      },
      isPublished: true,
      sortOrder: 5,
      updatedAt: new Date('2026-03-03T00:00:00Z'),
      updatedBy: { name: 'Jenny Owner' },
    })

    const saved = await upsertCmsSectionHandler({
      data: {
        key: 'explore',
        title: 'Explore Camotes Island',
        images: [],
        metadata: { spotsJson: validSpots },
        isPublished: true,
      },
    })

    expect(saved.success).toBe(true)
    expect(saved.section.metadata.spotsJson).toContain('cms/santiago.webp')
    expect(saved.section.metadata.spotsJson).toContain('cms/santiago-2.webp')
  })
})
