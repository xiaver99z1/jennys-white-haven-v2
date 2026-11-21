import { describe, it, expect } from 'vitest'
import {
  CMS_SECTION_META,
  DEFAULT_CMS_SECTIONS,
  DEFAULT_HERO_CONFIG,
  DEFAULT_TOURIST_SPOTS,
  TOURIST_SPOT_CATEGORIES,
  getSpotImages,
  parseHeroConfig,
  parseTouristSpots,
  serializeHeroConfig,
  serializeTouristSpots,
} from './cms'

describe('CMS constants and tourist spot helpers', () => {
  it('defines explore section metadata and default Camotes tourist spots', () => {
    expect(CMS_SECTION_META.explore.label).toBe(
      'Explore Camotes (Tourist Spots)',
    )
    expect(DEFAULT_CMS_SECTIONS.some((s) => s.key === 'explore')).toBe(true)
    expect(DEFAULT_TOURIST_SPOTS.length).toBeGreaterThanOrEqual(6)
    expect(TOURIST_SPOT_CATEGORIES).toContain('Beach')
    expect(TOURIST_SPOT_CATEGORIES).toContain('Cave & Lagoon')
  })

  it('parses valid spots JSON, normalizes unknown categories, and falls back safely on invalid input', () => {
    expect(parseTouristSpots(undefined)).toEqual(DEFAULT_TOURIST_SPOTS)
    expect(parseTouristSpots('   ')).toEqual(DEFAULT_TOURIST_SPOTS)
    expect(parseTouristSpots('not-json')).toEqual(DEFAULT_TOURIST_SPOTS)
    expect(parseTouristSpots('{"not":"array"}')).toEqual(DEFAULT_TOURIST_SPOTS)

    const serialized = serializeTouristSpots([
      {
        id: 'spot-a',
        name: '  Tulang Diot  ',
        category: 'Beach',
        location: 'San Francisco',
        travelTime: '25 mins',
        bestTime: 'Morning',
        entranceFee: '₱30 boat',
        description: 'Sandbar islet.',
        tips: 'Bring sunblock.',
        image: 'https://cdn.example.com/tulang.webp',
      },
    ])

    expect(parseTouristSpots(serialized)).toEqual([
      {
        id: 'spot-a',
        name: 'Tulang Diot',
        category: 'Beach',
        location: 'San Francisco',
        travelTime: '25 mins',
        bestTime: 'Morning',
        entranceFee: '₱30 boat',
        description: 'Sandbar islet.',
        tips: 'Bring sunblock.',
        image: 'https://cdn.example.com/tulang.webp',
        images: ['https://cdn.example.com/tulang.webp'],
      },
    ])

    // Multi-image deduplication & primary image syncing
    expect(
      getSpotImages({
        image: 'https://cdn.example.com/1.webp',
        images: [
          'https://cdn.example.com/1.webp',
          'https://cdn.example.com/2.webp',
        ],
      }),
    ).toEqual([
      'https://cdn.example.com/1.webp',
      'https://cdn.example.com/2.webp',
    ])

    // Handles malformed items, invalid categories, missing optional fields, and blank names
    const mixed = JSON.stringify([
      null,
      'bad-entry',
      { name: '   ' },
      { name: 'Custom Spot', category: 'UnknownCategory' },
    ])
    expect(parseTouristSpots(mixed)).toEqual([
      {
        id: 'spot-2',
        name: 'Custom Spot',
        category: 'Beach',
        location: '',
        travelTime: '',
        bestTime: '',
        entranceFee: '',
        description: '',
        tips: '',
        image: '',
        images: [],
      },
    ])

    // preserveDrafts keeps trailing spaces and temporarily empty names during editing
    const draftJson = JSON.stringify([
      { id: 'draft-1', name: 'Santiago ', location: 'Brgy. ' },
      { id: 'draft-2', name: '' },
    ])
    expect(parseTouristSpots(draftJson, { preserveDrafts: true })).toEqual([
      expect.objectContaining({
        id: 'draft-1',
        name: 'Santiago ',
        location: 'Brgy. ',
      }),
      expect.objectContaining({
        id: 'draft-2',
        name: '',
      }),
    ])
  })

  it('removes hero eyebrow metadata and parses/clamps hero carousel config with legacy fallback', () => {
    expect(CMS_SECTION_META.hero.metadataFields).toEqual([])

    const fallbackConfig = parseHeroConfig(undefined, {
      title: 'Legacy Title',
      subtitle: 'Legacy Sub',
      images: ['https://cdn.example.com/old.webp'],
    })
    expect(fallbackConfig.slides).toHaveLength(1)
    expect(fallbackConfig.slides[0].image).toBe(
      'https://cdn.example.com/old.webp',
    )
    expect(fallbackConfig.slides[0].contentHtml).toContain('Legacy Title')

    const clamped = parseHeroConfig(
      serializeHeroConfig({
        ...DEFAULT_HERO_CONFIG,
        intervalMs: 500,
        ctaPosition: { x: -20, y: 150 },
        slides: [
          {
            id: 's1',
            image: '  cms/slide.webp  ',
            contentHtml: '<p>Hello</p><script>bad()</script>',
            showText: false,
            textPosition: { x: 200, y: -5 },
            textWidth: 150,
          },
        ],
      }),
    )
    expect(clamped.intervalMs).toBe(2000)
    expect(clamped.ctaPosition).toEqual({ x: 0, y: 100 })
    expect(clamped.slides[0].image).toBe('cms/slide.webp')
    expect(clamped.slides[0].contentHtml).toBe('<p>Hello</p>')
    expect(clamped.slides[0].textPosition).toEqual({ x: 100, y: 0 })
    expect(clamped.slides[0].textWidth).toBe(95)

    // Invalid JSON falls back safely
    expect(parseHeroConfig('invalid-json').slides.length).toBeGreaterThanOrEqual(
      1,
    )
  })
})
