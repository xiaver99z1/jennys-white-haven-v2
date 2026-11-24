import type {
  CmsSectionData,
  CmsSectionKey,
  HeroCarouselConfig,
  HeroElementPosition,
  HeroSlideItem,
  TouristSpotCategory,
  TouristSpotItem,
} from '#/types'
import {
  DEFAULT_LUXURY_HERO_HTML,
  buildDefaultHeroContentHtml,
  sanitizeHeroRichText,
} from '#/lib/hero-rich-text'

export const HERO_CANVAS_WIDTH = 1280
export const HERO_CANVAS_HEIGHT = 720
export const HERO_MOBILE_CANVAS_WIDTH = 390
export const HERO_MOBILE_CANVAS_HEIGHT = 520
export const DEFAULT_HERO_TEXT_WIDTH = 72
export const DEFAULT_HERO_MOBILE_TEXT_WIDTH = 86
export const DEFAULT_HERO_MOBILE_TEXT_SCALE = 0.55
export const DEFAULT_HERO_IMAGE_FOCAL_X = 50
export const MIN_HERO_TEXT_WIDTH = 20
export const MAX_HERO_TEXT_WIDTH = 95

export const DEFAULT_HERO_POSITIONS: Readonly<
  Record<'text' | 'cta' | 'bookingBar', HeroElementPosition>
> = {
  text: { x: 50, y: 40 },
  cta: { x: 50, y: 58 },
  bookingBar: { x: 50, y: 80 },
}

export const DEFAULT_HERO_MOBILE_POSITIONS: Readonly<
  Record<'text' | 'cta' | 'bookingBar', HeroElementPosition>
> = {
  text: { x: 50, y: 26 },
  cta: { x: 50, y: 47 },
  bookingBar: { x: 50, y: 76 },
}

export const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [
  {
    id: 'hero-slide-1',
    image: '',
    contentHtml: DEFAULT_LUXURY_HERO_HTML,
    showText: true,
    textPosition: { ...DEFAULT_HERO_POSITIONS.text },
    textWidth: DEFAULT_HERO_TEXT_WIDTH,
    mobileTextPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.text },
    mobileTextWidth: DEFAULT_HERO_MOBILE_TEXT_WIDTH,
    mobileTextScale: DEFAULT_HERO_MOBILE_TEXT_SCALE,
    mobileImageFocalX: DEFAULT_HERO_IMAGE_FOCAL_X,
  },
]

export const DEFAULT_HERO_CONFIG: HeroCarouselConfig = {
  slides: DEFAULT_HERO_SLIDES,
  autoplay: true,
  intervalMs: 6000,
  showCta: true,
  ctaPosition: { ...DEFAULT_HERO_POSITIONS.cta },
  mobileCtaPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.cta },
  showBookingBar: true,
  bookingBarPosition: { ...DEFAULT_HERO_POSITIONS.bookingBar },
  mobileBookingBarPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.bookingBar },
}

function clampPosition(
  raw: unknown,
  fallback: HeroElementPosition,
): HeroElementPosition {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...fallback }
  }
  const obj = raw as Record<string, unknown>
  const x =
    typeof obj.x === 'number' && Number.isFinite(obj.x)
      ? Math.min(100, Math.max(0, Math.round(obj.x * 10) / 10))
      : fallback.x
  const y =
    typeof obj.y === 'number' && Number.isFinite(obj.y)
      ? Math.min(100, Math.max(0, Math.round(obj.y * 10) / 10))
      : fallback.y
  return { x, y }
}

function clampTextWidth(
  raw: unknown,
  fallback: number = DEFAULT_HERO_TEXT_WIDTH,
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback
  }
  return Math.min(
    MAX_HERO_TEXT_WIDTH,
    Math.max(MIN_HERO_TEXT_WIDTH, Math.round(raw * 10) / 10),
  )
}

function clampMobileTextScale(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_HERO_MOBILE_TEXT_SCALE
  }
  return Math.min(1, Math.max(0.35, Math.round(raw * 100) / 100))
}

function clampFocalPercentage(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return DEFAULT_HERO_IMAGE_FOCAL_X
  }
  return Math.min(100, Math.max(0, Math.round(raw)))
}

export function serializeHeroConfig(config: HeroCarouselConfig): string {
  return JSON.stringify(config)
}

export function parseHeroConfig(
  rawJson?: string | null,
  fallback?: { title?: string; subtitle?: string; images?: string[] },
): HeroCarouselConfig {
  const buildFallbackConfig = (): HeroCarouselConfig => {
    const legacyImages = (fallback?.images ?? []).filter(Boolean)
    const legacyHtml = buildDefaultHeroContentHtml(
      fallback?.title ?? "Jenny's White Haven",
      fallback?.subtitle ??
        'An intimate rooms-only island sanctuary on the quiet shores of Camotes Island, Cebu.',
    )
    const slides: HeroSlideItem[] =
      legacyImages.length > 0
        ? legacyImages.map((img, idx) => ({
            id: `hero-slide-${idx + 1}`,
            image: img,
            contentHtml: idx === 0 ? legacyHtml : '',
            showText: idx === 0,
            textPosition: { ...DEFAULT_HERO_POSITIONS.text },
            textWidth: DEFAULT_HERO_TEXT_WIDTH,
            mobileTextPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.text },
            mobileTextWidth: DEFAULT_HERO_MOBILE_TEXT_WIDTH,
            mobileTextScale: DEFAULT_HERO_MOBILE_TEXT_SCALE,
            mobileImageFocalX: DEFAULT_HERO_IMAGE_FOCAL_X,
          }))
        : [
            {
              id: 'hero-slide-1',
              image: '',
              contentHtml: legacyHtml,
              showText: true,
              textPosition: { ...DEFAULT_HERO_POSITIONS.text },
              textWidth: DEFAULT_HERO_TEXT_WIDTH,
              mobileTextPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.text },
              mobileTextWidth: DEFAULT_HERO_MOBILE_TEXT_WIDTH,
              mobileTextScale: DEFAULT_HERO_MOBILE_TEXT_SCALE,
              mobileImageFocalX: DEFAULT_HERO_IMAGE_FOCAL_X,
            },
          ]
    return {
      ...DEFAULT_HERO_CONFIG,
      slides,
      ctaPosition: { ...DEFAULT_HERO_POSITIONS.cta },
      mobileCtaPosition: { ...DEFAULT_HERO_MOBILE_POSITIONS.cta },
      bookingBarPosition: { ...DEFAULT_HERO_POSITIONS.bookingBar },
      mobileBookingBarPosition: {
        ...DEFAULT_HERO_MOBILE_POSITIONS.bookingBar,
      },
    }
  }

  if (!rawJson || !rawJson.trim()) {
    return buildFallbackConfig()
  }

  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return buildFallbackConfig()
    }
    const obj = parsed as Record<string, unknown>
    const rawSlides = Array.isArray(obj.slides) ? obj.slides : []
    const slides: HeroSlideItem[] = rawSlides
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
      .map((item, idx) => ({
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `hero-slide-${idx + 1}`,
        image: typeof item.image === 'string' ? item.image.trim() : '',
        contentHtml:
          typeof item.contentHtml === 'string'
            ? sanitizeHeroRichText(item.contentHtml)
            : '',
        showText: typeof item.showText === 'boolean' ? item.showText : true,
        textPosition: clampPosition(
          item.textPosition,
          DEFAULT_HERO_POSITIONS.text,
        ),
        textWidth: clampTextWidth(item.textWidth, DEFAULT_HERO_TEXT_WIDTH),
        mobileTextPosition: clampPosition(
          item.mobileTextPosition,
          DEFAULT_HERO_MOBILE_POSITIONS.text,
        ),
        mobileTextWidth: clampTextWidth(
          item.mobileTextWidth,
          DEFAULT_HERO_MOBILE_TEXT_WIDTH,
        ),
        mobileTextScale: clampMobileTextScale(item.mobileTextScale),
        mobileImageFocalX: clampFocalPercentage(item.mobileImageFocalX),
      }))

    const rawInterval =
      typeof obj.intervalMs === 'number' && Number.isFinite(obj.intervalMs)
        ? obj.intervalMs
        : DEFAULT_HERO_CONFIG.intervalMs

    return {
      slides: slides.length > 0 ? slides : buildFallbackConfig().slides,
      autoplay:
        typeof obj.autoplay === 'boolean'
          ? obj.autoplay
          : DEFAULT_HERO_CONFIG.autoplay,
      intervalMs: Math.min(20000, Math.max(2000, Math.round(rawInterval))),
      showCta:
        typeof obj.showCta === 'boolean'
          ? obj.showCta
          : DEFAULT_HERO_CONFIG.showCta,
      ctaPosition: clampPosition(obj.ctaPosition, DEFAULT_HERO_POSITIONS.cta),
      mobileCtaPosition: clampPosition(
        obj.mobileCtaPosition,
        DEFAULT_HERO_MOBILE_POSITIONS.cta,
      ),
      showBookingBar:
        typeof obj.showBookingBar === 'boolean'
          ? obj.showBookingBar
          : DEFAULT_HERO_CONFIG.showBookingBar,
      bookingBarPosition: clampPosition(
        obj.bookingBarPosition,
        DEFAULT_HERO_POSITIONS.bookingBar,
      ),
      mobileBookingBarPosition: clampPosition(
        obj.mobileBookingBarPosition,
        DEFAULT_HERO_MOBILE_POSITIONS.bookingBar,
      ),
    }
  } catch {
    return buildFallbackConfig()
  }
}

export const TOURIST_SPOT_CATEGORIES: readonly TouristSpotCategory[] = [
  'Beach',
  'Cave & Lagoon',
  'Lake & Nature',
  'Cliff & Viewpoint',
  'Heritage & Culture',
  'Food & Local Life',
] as const

const VALID_SPOT_CATEGORIES = new Set<string>(TOURIST_SPOT_CATEGORIES)

export const DEFAULT_TOURIST_SPOTS: TouristSpotItem[] = [
  {
    id: 'santiago-bay-beach',
    name: 'Santiago Bay White Beach',
    category: 'Beach',
    location: 'Brgy. Santiago, San Francisco, Camotes',
    travelTime: '5–10 mins from resort',
    bestTime: 'Early morning & sunset',
    entranceFee: 'Free public access',
    description:
      'A sweeping crescent of powdery white sand and calm, crystal-clear shallows that reveal a wide sandbar at low tide—ideal for unhurried swims and golden-hour walks.',
    tips: 'Visit around 4:30 PM for calm water and sunset views, then enjoy fresh grilled seafood at the beachfront eateries nearby.',
    image: '',
  },
  {
    id: 'lake-danao-park',
    name: 'Lake Danao Park',
    category: 'Lake & Nature',
    location: 'Brgy. Union & Esperanza, San Francisco',
    travelTime: '15–20 mins from resort',
    bestTime: 'Morning to mid-afternoon',
    entranceFee: '₱30–₱50 entrance · boat rentals available',
    description:
      "Cebu's largest natural freshwater lake, shaped like a figure eight and framed by quiet hills and palms. Guests can rent kayaks, board a slow sakanaw cruise, or unwind at the lakeside pavilions.",
    tips: 'Bring sun protection and enjoy lunch by the water—boat cruises to Lovers Islet take about 30 minutes.',
    image: '',
  },
  {
    id: 'bukilat-cave',
    name: 'Bukilat Cave',
    category: 'Cave & Lagoon',
    location: 'Brgy. McArthur, Tudela, Camotes',
    travelTime: '35–40 mins from resort',
    bestTime: '10:00 AM – 2:00 PM (overhead light)',
    entranceFee: '₱50 entrance',
    description:
      'A vast limestone cavern lit by natural skylights overhead, filled with cool, clear spring water and dramatic stalactite formations.',
    tips: 'Midday sunlight pours directly through the ceiling openings, illuminating the turquoise cave pool for photos.',
    image: '',
  },
  {
    id: 'buho-rock',
    name: 'Buho Rock Cliff & Viewpoint',
    category: 'Cliff & Viewpoint',
    location: 'Brgy. Eastern Poblacion, Poro, Camotes',
    travelTime: '25–30 mins from resort',
    bestTime: 'High tide afternoons',
    entranceFee: '₱50 entrance',
    description:
      'A sculpted coral-rock promontory jutting into deep turquoise water, famous for panoramic sea views, coastal walkways, and cliff-diving platforms.',
    tips: 'Check tide timing with our front desk before heading out if you plan to swim or jump from the lower decks.',
    image: '',
  },
  {
    id: 'mangodlong-rock',
    name: 'Mangodlong Rock & Paradise Cove',
    category: 'Beach',
    location: 'Brgy. Heminsulan, San Francisco',
    travelTime: '10–15 mins from resort',
    bestTime: '8:00 AM – 11:00 AM',
    entranceFee: '₱50–₱100 day use',
    description:
      'A sheltered cove with emerald waters, smooth limestone rock formations, and vibrant shallow reefs perfect for relaxed snorkeling.',
    tips: 'Bring water shoes or snorkel gear; morning tides keep the cove glassy and clear.',
    image: '',
  },
  {
    id: 'paraiso-timubo-caves',
    name: 'Paraiso & Timubo Caves',
    category: 'Cave & Lagoon',
    location: 'Brgy. Sonog & San Francisco, Camotes',
    travelTime: '15–20 mins from resort',
    bestTime: 'Morning to early afternoon',
    entranceFee: '₱50–₱100 per cave',
    description:
      'Refreshing underground freshwater pools tucked inside serene limestone caverns—a cool midday escape after exploring the beaches.',
    tips: 'Both caves are close to each other and pair easily into a single half-day island loop with Lake Danao.',
    image: '',
  },
]

export function getSpotImages(
  spot: Pick<TouristSpotItem, 'image' | 'images'>,
): string[] {
  const combined: string[] = []
  if (Array.isArray(spot.images)) {
    for (const img of spot.images) {
      if (typeof img === 'string') {
        const trimmed = img.trim()
        if (trimmed && !combined.includes(trimmed)) {
          combined.push(trimmed)
        }
      }
    }
  }
  const primary = typeof spot.image === 'string' ? spot.image.trim() : ''
  if (primary && !combined.includes(primary)) {
    combined.unshift(primary)
  }
  return combined
}

export interface SectionPhotoItem {
  url: string
  caption: string
}

export function parseImageCaptions(rawJson?: string | null): string[] {
  if (!rawJson || !rawJson.trim()) return []
  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => (typeof item === 'string' ? item : ''))
  } catch {
    return []
  }
}

export function serializeImageCaptions(captions: string[]): string {
  return JSON.stringify(captions)
}

export function getSectionPhotoItems(
  images: string[],
  rawCaptionsJson?: string | null,
): SectionPhotoItem[] {
  const captions = parseImageCaptions(rawCaptionsJson)
  const items: SectionPhotoItem[] = []
  images.forEach((rawUrl, idx) => {
    const url = rawUrl.trim()
    if (url) {
      items.push({
        url,
        caption: (captions[idx] ?? '').trim(),
      })
    }
  })
  return items
}

export function serializeTouristSpots(spots: TouristSpotItem[]): string {
  return JSON.stringify(spots)
}

export interface ParseTouristSpotsOptions {
  preserveDrafts?: boolean
}

export function parseTouristSpots(
  rawJson?: string | null,
  options?: ParseTouristSpotsOptions,
): TouristSpotItem[] {
  if (!rawJson || !rawJson.trim()) {
    return DEFAULT_TOURIST_SPOTS
  }

  const preserveDrafts = options?.preserveDrafts ?? false
  const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return ''
    return preserveDrafts ? value : value.trim()
  }

  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (!Array.isArray(parsed)) return DEFAULT_TOURIST_SPOTS

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
      .map((item, idx) => {
        const rawCategory =
          typeof item.category === 'string' ? item.category : 'Beach'
        const category = VALID_SPOT_CATEGORIES.has(rawCategory)
          ? (rawCategory as TouristSpotCategory)
          : 'Beach'
        const rawImage = normalizeText(item.image)
        const rawImagesList = Array.isArray(item.images)
          ? item.images
              .filter((img): img is string => typeof img === 'string')
              .map((img) => img.trim())
              .filter(Boolean)
          : []
        const dedupedImages = Array.from(
          new Set([
            ...rawImagesList,
            ...(rawImage.trim() ? [rawImage.trim()] : []),
          ]),
        )
        const primaryImage = dedupedImages[0] ?? rawImage
        return {
          id:
            typeof item.id === 'string' && item.id.trim()
              ? item.id.trim()
              : `spot-${idx + 1}`,
          name: normalizeText(item.name),
          category,
          location: normalizeText(item.location),
          travelTime: normalizeText(item.travelTime),
          bestTime: normalizeText(item.bestTime),
          entranceFee: normalizeText(item.entranceFee),
          description: normalizeText(item.description),
          tips: normalizeText(item.tips),
          image: primaryImage,
          images: dedupedImages,
        }
      })
      .filter((spot) => preserveDrafts || Boolean(spot.name))
  } catch {
    return DEFAULT_TOURIST_SPOTS
  }
}

export const CMS_SECTION_META: Record<
  CmsSectionKey,
  {
    label: string
    description: string
    metadataFields: Array<{ key: string; label: string; placeholder: string }>
  }
> = {
  hero: {
    label: 'Hero Banner',
    description:
      'Customizable hero carousel slides, rich-text styling, visibility toggles, and draggable overlays.',
    metadataFields: [],
  },
  story: {
    label: 'Our Sanctuary (Story)',
    description: 'Editorial introduction to the staycation experience.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'The Sanctuary',
      },
      {
        key: 'highlight',
        label: 'Pull Quote / Highlight',
        placeholder: 'Quiet mornings by the sea, unhurried island afternoons.',
      },
    ],
  },
  rooms: {
    label: 'Rooms Showcase',
    description: 'Heading and intro copy above the featured rooms grid.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'Accommodations',
      },
    ],
  },
  amenities: {
    label: 'Amenities & Experience',
    description: 'Curated resort highlights and staycation inclusions.',
    metadataFields: [
      {
        key: 'items',
        label: 'Highlights (comma-separated)',
        placeholder:
          'Private Beachfront Access, High-Speed Wi-Fi, Air-Conditioned Suites, Complimentary Island Breakfast, Airport & Port Transfer Assistance',
      },
    ],
  },
  gallery: {
    label: 'Photo Gallery',
    description: 'Visual showcase of the property and island surroundings.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Section Eyebrow',
        placeholder: 'Atmosphere',
      },
    ],
  },
  explore: {
    label: 'Explore Camotes (Tourist Spots)',
    description:
      'Curated island destinations, photos, travel times, and local tips shown on the /explore visitor page.',
    metadataFields: [
      {
        key: 'eyebrow',
        label: 'Page Eyebrow',
        placeholder: 'Island Guide · Camotes, Cebu',
      },
      {
        key: 'travelNote',
        label: 'Island Tour & Transport Note',
        placeholder:
          'Ask our front desk to arrange private multicab tours or motorbike rentals right from the resort.',
      },
    ],
  },
  contact: {
    label: 'Contact, Location & Policies',
    description:
      'Resort address, contact details, check-in/out hours, and payment instructions.',
    metadataFields: [
      {
        key: 'address',
        label: 'Address',
        placeholder: 'Santiago Bay, San Francisco, Camotes Island, Cebu',
      },
      {
        key: 'phone',
        label: 'Phone / Mobile',
        placeholder: '+63 917 000 0000',
      },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'stay@jennyswhitehaven.com',
      },
      {
        key: 'checkInTime',
        label: 'Check-In Time',
        placeholder: '2:00 PM',
      },
      {
        key: 'checkOutTime',
        label: 'Check-Out Time',
        placeholder: '12:00 PM',
      },
      {
        key: 'paymentInfo',
        label: 'Payment / GCash Instructions',
        placeholder:
          'GCash: 0917-000-0000 (Jenny White Haven) · 50% deposit confirms your stay.',
      },
      {
        key: 'mapEmbedUrl',
        label: 'Google Maps Embed URL',
        placeholder:
          'https://maps.google.com/maps?q=Santiago+Bay+San+Francisco+Camotes+Island+Cebu&output=embed',
      },
      {
        key: 'mapDirectionsUrl',
        label: 'Google Maps Directions Link',
        placeholder:
          'https://www.google.com/maps/search/?api=1&query=Santiago+Bay+San+Francisco+Camotes+Island+Cebu',
      },
    ],
  },
}

export const DEFAULT_CMS_SECTIONS: CmsSectionData[] = [
  {
    key: 'hero',
    title: '',
    subtitle: '',
    body: '',
    ctaLabel: 'Explore Rooms',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      heroConfigJson: serializeHeroConfig(DEFAULT_HERO_CONFIG),
    },
    isPublished: true,
    sortOrder: 0,
  },
  {
    key: 'story',
    title: 'Designed for stillness, warmth, and effortless rest.',
    subtitle: 'A boutique staycation shaped by sea breeze and natural light.',
    body: "Tucked away in Camotes Island, Jenny's White Haven pairs serene minimalist architecture with genuine Filipino warmth. Wake up to soft coastal light, spend your afternoon by the shore, and return to crisp linens and quiet comfort.",
    ctaLabel: 'Check Availability',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      eyebrow: 'The Sanctuary',
      highlight: 'Quiet mornings by the sea, unhurried island afternoons.',
    },
    isPublished: true,
    sortOrder: 1,
  },
  {
    key: 'rooms',
    title: 'Private Suites & Island Rooms',
    subtitle:
      'Each room is crafted as a calm coastal retreat with modern essentials and generous space.',
    body: '',
    ctaLabel: 'View All Rooms',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      eyebrow: 'Accommodations',
    },
    isPublished: true,
    sortOrder: 2,
  },
  {
    key: 'amenities',
    title: 'Simple luxuries for an unhurried stay.',
    subtitle: 'Everything you need for a restorative island getaway.',
    body: 'From seamless port-to-haven transfers to curated local recommendations across Camotes Island, our team takes care of the details so you can simply unwind.',
    ctaLabel: 'Book Your Stay',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      items:
        'Air-Conditioned Coastal Rooms, High-Speed Fiber Wi-Fi, Private En-Suite Bath, Fresh Linens & Bath Essentials, Port Transfer Assistance, Curated Island Tour Tips',
    },
    isPublished: true,
    sortOrder: 3,
  },
  {
    key: 'gallery',
    title: 'Spaces bathed in tropical light.',
    subtitle: 'A glimpse into daily life at the haven.',
    body: '',
    ctaLabel: '',
    ctaHref: '',
    images: [],
    metadata: {
      eyebrow: 'Atmosphere',
    },
    isPublished: true,
    sortOrder: 4,
  },
  {
    key: 'explore',
    title: 'Explore Camotes Island',
    subtitle:
      'White-sand coves, limestone cave pools, and tranquil freshwater lakes—all within easy reach of your stay.',
    body: "Whether you have a quiet afternoon or a full island-hopping day, these are our favorite destinations across San Francisco, Poro, and Tudela. Ask our team anytime to arrange a local multicab driver or motorbike rental.",
    ctaLabel: 'Browse Rooms & Rates',
    ctaHref: '/rooms',
    images: [],
    metadata: {
      eyebrow: 'Island Guide · Camotes, Cebu',
      travelNote:
        'Need transport? Our front desk can coordinate trusted local multicab day tours or scooter rentals straight from the resort.',
      spotsJson: serializeTouristSpots(DEFAULT_TOURIST_SPOTS),
    },
    isPublished: true,
    sortOrder: 5,
  },
  {
    key: 'contact',
    title: 'Plan your visit to Camotes Island.',
    subtitle:
      'Have questions about ferry schedules, room requests, or group stays? Reach out anytime.',
    body: 'We welcome guests daily with flexible check-in coordination based on Consuelo or Poro port arrivals.',
    ctaLabel: 'Check Booking Status',
    ctaHref: '/booking-status',
    images: [],
    metadata: {
      address: 'Santiago Bay, San Francisco, Camotes Island, Cebu',
      phone: '+63 917 000 0000',
      email: 'stay@jennyswhitehaven.com',
      checkInTime: '2:00 PM',
      checkOutTime: '12:00 PM',
      paymentInfo:
        'GCash / Bank Transfer accepted. A 50% deposit confirms your reservation.',
      mapEmbedUrl:
        'https://maps.google.com/maps?q=Santiago+Bay+San+Francisco+Camotes+Island+Cebu&t=&z=14&ie=UTF8&iwloc=&output=embed',
      mapDirectionsUrl:
        'https://www.google.com/maps/search/?api=1&query=Santiago+Bay+San+Francisco+Camotes+Island+Cebu',
    },
    isPublished: true,
    sortOrder: 6,
  },
]
