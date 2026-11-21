import { describe, it, expect } from 'vitest'
import {
  CMS_SECTION_META,
  DEFAULT_CMS_SECTIONS,
  DEFAULT_TOURIST_SPOTS,
  TOURIST_SPOT_CATEGORIES,
  parseTouristSpots,
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
      },
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
      },
    ])
  })
})
