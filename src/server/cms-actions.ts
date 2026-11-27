import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { requirePermission } from '#/server/room-actions'
import {
  DEFAULT_CMS_SECTIONS,
  getSpotImages,
  parseFeaturedGalleryFlags,
  parseHeroConfig,
  parseImageCaptions,
  parseTouristSpots,
  resolveBrandLogos,
  serializeFeaturedGalleryFlags,
  serializeHeroConfig,
  serializeImageCaptions,
  serializeTouristSpots,
} from '#/lib/constants/cms'
import {
  extractObjectKey,
  isBase64DataUrl,
  isR2ManagedObjectKey,
  resolvePublicMediaUrl,
} from '#/lib/r2'
import {
  normalizeImageMimeType,
  purgeReplacedR2Objects,
} from '#/server/upload'
import type { BrandLogosConfig, CmsSectionData, CmsSectionKey } from '#/types'

const VALID_KEYS = new Set<string>(DEFAULT_CMS_SECTIONS.map((s) => s.key))

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val
    .filter(
      (item): item is string =>
        typeof item === 'string' &&
        Boolean(item.trim()) &&
        !isBase64DataUrl(item),
    )
    .map((item) => resolvePublicMediaUrl(item))
}

function toStringRecord(val: unknown): Record<string, string> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

function resolveExploreMetadata(
  metadata: Record<string, string>,
): Record<string, string> {
  if (!metadata.spotsJson) return metadata
  const spots = parseTouristSpots(metadata.spotsJson).map((spot) => {
    const resolvedImages = getSpotImages(spot)
      .filter((img) => !isBase64DataUrl(img) && isR2ManagedObjectKey(img))
      .map((img) => resolvePublicMediaUrl(img))
      .filter(Boolean)
    return {
      ...spot,
      image: resolvedImages[0] ?? '',
      images: resolvedImages,
    }
  })
  return {
    ...metadata,
    spotsJson: serializeTouristSpots(spots),
  }
}

function resolveHeroMetadata(
  metadata: Record<string, string>,
  fallback?: { title?: string; subtitle?: string; images?: string[] },
): Record<string, string> {
  const { eyebrow: _removedEyebrow, ...rest } = metadata
  const config = parseHeroConfig(rest.heroConfigJson, fallback)
  const resolvedSlides = config.slides.map((slide) => ({
    ...slide,
    image:
      slide.image && !isBase64DataUrl(slide.image)
        ? resolvePublicMediaUrl(slide.image)
        : '',
  }))
  return {
    ...rest,
    heroConfigJson: serializeHeroConfig({
      ...config,
      slides: resolvedSlides,
    }),
  }
}

function extractHeroSlideImageKeys(metadata: unknown): string[] {
  const record = toStringRecord(metadata)
  if (!record.heroConfigJson) return []
  return parseHeroConfig(record.heroConfigJson)
    .slides.map((slide) => extractObjectKey(slide.image))
    .filter(Boolean)
}

function extractSpotImageKeys(metadata: unknown): string[] {
  const record = toStringRecord(metadata)
  if (!record.spotsJson) return []
  return parseTouristSpots(record.spotsJson)
    .flatMap((spot) => getSpotImages(spot))
    .map((img) => extractObjectKey(img))
    .filter(Boolean)
}

const BRAND_LOGO_KEYS = [
  'adminIconLogo',
  'adminAuthLogo',
  'publicBrandLogo',
] as const

function resolveBrandingMetadata(
  metadata: Record<string, string>,
): Record<string, string> {
  const next = { ...metadata }
  for (const field of BRAND_LOGO_KEYS) {
    const raw = (next[field] ?? '').trim()
    next[field] =
      raw && !isBase64DataUrl(raw) ? resolvePublicMediaUrl(raw) : ''
  }
  return next
}

function extractBrandingImageKeys(metadata: unknown): string[] {
  const record = toStringRecord(metadata)
  return BRAND_LOGO_KEYS.map((field) => extractObjectKey(record[field] ?? ''))
    .filter((key) => Boolean(key) && isR2ManagedObjectKey(key))
}

function mergeWithDefaults(
  rows: Array<{
    key: string
    title: string
    subtitle: string | null
    body: string | null
    ctaLabel: string | null
    ctaHref: string | null
    images: unknown
    metadata: unknown
    isPublished: boolean
    sortOrder: number
    updatedAt: Date
    updatedBy?: { name: string } | null
  }>,
): CmsSectionData[] {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  return DEFAULT_CMS_SECTIONS.map((def) => {
    const row = byKey.get(def.key)
    if (!row) return def
    const rowMeta = toStringRecord(row.metadata)
    const rowImages = toStringArray(row.images)
    const mergedMeta =
      def.key === 'hero'
        ? resolveHeroMetadata(rowMeta, {
            title: row.title,
            subtitle: row.subtitle ?? '',
            images: rowImages,
          })
        : { ...def.metadata, ...rowMeta }
    return {
      key: def.key,
      title: def.key === 'hero' ? '' : row.title,
      subtitle: def.key === 'hero' ? '' : (row.subtitle ?? ''),
      body: row.body ?? '',
      ctaLabel: row.ctaLabel ?? '',
      ctaHref: row.ctaHref ?? '',
      images: rowImages,
      metadata:
        def.key === 'explore'
          ? resolveExploreMetadata(mergedMeta)
          : def.key === 'branding'
            ? resolveBrandingMetadata(mergedMeta)
            : mergedMeta,
      isPublished: def.key === 'branding' ? true : row.isPublished,
      sortOrder: row.sortOrder,
      updatedAt: row.updatedAt,
      updatedByName: row.updatedBy?.name ?? null,
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

export const getPublicCmsSectionsHandler = createServerOnlyFn(
  async (): Promise<CmsSectionData[]> => {
    try {
      const rows = await prisma.siteSection.findMany({
        orderBy: { sortOrder: 'asc' },
      })
      return mergeWithDefaults(rows).filter((s) => s.isPublished)
    } catch (err) {
      console.warn('Failed to load public CMS sections, using defaults:', err)
      return DEFAULT_CMS_SECTIONS.filter((s) => s.isPublished)
    }
  },
)

export const getPublicCmsSections = createServerFn({ method: 'GET' }).handler(
  getPublicCmsSectionsHandler,
)

export const getPublicBrandLogosHandler = createServerOnlyFn(
  async (): Promise<BrandLogosConfig> => {
    try {
      const row = await prisma.siteSection.findUnique({
        where: { key: 'branding' },
        select: { metadata: true },
      })
      if (!row) return resolveBrandLogos(null)
      const resolvedMeta = resolveBrandingMetadata(toStringRecord(row.metadata))
      return resolveBrandLogos({ metadata: resolvedMeta })
    } catch {
      return resolveBrandLogos(null)
    }
  },
)

export const getPublicBrandLogos = createServerFn({ method: 'GET' }).handler(
  getPublicBrandLogosHandler,
)

export const getAdminCmsSectionsHandler = createServerOnlyFn(
  async (): Promise<CmsSectionData[]> => {
    await requirePermission('manage:cms')
    const rows = await prisma.siteSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { updatedBy: { select: { name: true } } },
    })
    return mergeWithDefaults(rows)
  },
)

export const getAdminCmsSections = createServerFn({ method: 'GET' }).handler(
  getAdminCmsSectionsHandler,
)

export interface UpsertCmsSectionInput {
  key: CmsSectionKey
  title: string
  subtitle?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  images: string[]
  metadata: Record<string, string>
  isPublished: boolean
}

export function validateUpsertCmsSection(data: UpsertCmsSectionInput) {
  return data
}

export const upsertCmsSectionHandler = createServerOnlyFn(
  async ({
    data,
  }: {
    data: UpsertCmsSectionInput
  }): Promise<{ success: true; section: CmsSectionData }> => {
    const admin = await requirePermission('manage:cms')

    if (!VALID_KEYS.has(data.key)) {
      throw new Error('Invalid CMS section key.')
    }

    const rawTitle = data.title.trim()
    const rawSubtitle = data.subtitle?.trim() || ''
    const title = data.key === 'hero' ? '' : rawTitle
    const subtitle = data.key === 'hero' ? null : rawSubtitle || null

    const def = DEFAULT_CMS_SECTIONS.find((s) => s.key === data.key)!
    if (data.images.some((u) => isBase64DataUrl(u))) {
      throw new Error(
        'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
      )
    }

    const rawCaptions = parseImageCaptions(data.metadata.imageCaptionsJson)
    const rawFeaturedFlags = parseFeaturedGalleryFlags(
      data.metadata.featuredHomeFlagsJson,
    )
    const seenImageKeyIndices = new Map<string, number>()
    let cleanImages: string[] = []
    const alignedCaptions: string[] = []
    const alignedFeaturedFlags: boolean[] = []
    data.images.forEach((rawUrl, idx) => {
      const key = extractObjectKey(rawUrl)
      if (!key) return
      const existingIdx = seenImageKeyIndices.get(key)
      if (existingIdx === undefined) {
        seenImageKeyIndices.set(key, cleanImages.length)
        cleanImages.push(key)
        alignedCaptions.push((rawCaptions[idx] ?? '').trim())
        alignedFeaturedFlags.push(rawFeaturedFlags[idx] === true)
      } else if (rawFeaturedFlags[idx] === true) {
        alignedFeaturedFlags[existingIdx] = true
      }
    })
    const cleanMeta: Record<string, string> = {}
    for (const [k, v] of Object.entries(data.metadata)) {
      if (data.key === 'hero' && k === 'eyebrow') continue
      cleanMeta[k] = v.trim()
    }
    if ('imageCaptionsJson' in cleanMeta) {
      cleanMeta.imageCaptionsJson = serializeImageCaptions(alignedCaptions)
    }
    if ('featuredHomeFlagsJson' in cleanMeta) {
      cleanMeta.featuredHomeFlagsJson =
        serializeFeaturedGalleryFlags(alignedFeaturedFlags)
    }

    const extraMediaKeys: string[] = []
    if (data.key === 'hero') {
      const parsedHero = parseHeroConfig(cleanMeta.heroConfigJson, {
        title: rawTitle,
        subtitle: rawSubtitle,
        images: cleanImages,
      })
      if (parsedHero.slides.some((slide) => isBase64DataUrl(slide.image))) {
        throw new Error(
          'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
        )
      }
      const normalizedSlides = parsedHero.slides.map((slide) => {
        const key = extractObjectKey(slide.image)
        if (key) extraMediaKeys.push(key)
        return { ...slide, image: key }
      })
      cleanMeta.heroConfigJson = serializeHeroConfig({
        ...parsedHero,
        slides: normalizedSlides,
      })
      cleanImages = Array.from(new Set(extraMediaKeys))
    }

    if (data.key === 'explore' && cleanMeta.spotsJson) {
      const parsedSpots = parseTouristSpots(cleanMeta.spotsJson)
      if (
        parsedSpots.some((spot) =>
          getSpotImages(spot).some((img) => isBase64DataUrl(img)),
        )
      ) {
        throw new Error(
          'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
        )
      }
      if (
        parsedSpots.some((spot) =>
          getSpotImages(spot).some((img) => !isR2ManagedObjectKey(img)),
        )
      ) {
        throw new Error(
          'External image URLs are not allowed for tourist spots. Upload photos via Cloudflare R2 instead.',
        )
      }
      const normalizedSpots = parsedSpots.map((spot) => {
        const keys = Array.from(
          new Set(
            getSpotImages(spot)
              .map((img) => extractObjectKey(img))
              .filter(Boolean),
          ),
        )
        for (const key of keys) extraMediaKeys.push(key)
        return {
          ...spot,
          image: keys[0] ?? '',
          images: keys,
        }
      })
      cleanMeta.spotsJson = serializeTouristSpots(normalizedSpots)
    }

    if (data.key === 'branding') {
      for (const field of BRAND_LOGO_KEYS) {
        const rawVal = cleanMeta[field] ?? ''
        if (!rawVal) {
          cleanMeta[field] = ''
          continue
        }
        if (isBase64DataUrl(rawVal)) {
          throw new Error(
            'Binary Base64 image data is not allowed in PostgreSQL. Upload via Cloudflare R2 instead.',
          )
        }
        const key = extractObjectKey(rawVal)
        cleanMeta[field] = key
        if (key && isR2ManagedObjectKey(key)) {
          extraMediaKeys.push(key)
        }
      }
      cleanImages = Array.from(new Set(extraMediaKeys))
    }

    const allMediaKeys = Array.from(new Set([...cleanImages, ...extraMediaKeys]))

    const session = await authSession()
    const existingRow = await prisma.siteSection.findUnique({
      where: { key: data.key },
      select: { images: true, metadata: true },
    })
    const previousImages = Array.from(
      new Set([
        ...(Array.isArray(existingRow?.images)
          ? existingRow.images.filter((i): i is string => typeof i === 'string')
          : []),
        ...extractHeroSlideImageKeys(existingRow?.metadata),
        ...extractSpotImageKeys(existingRow?.metadata),
        ...extractBrandingImageKeys(existingRow?.metadata),
      ]),
    )

    const saved = await prisma.$transaction(async (tx) => {
      const upserted = await tx.siteSection.upsert({
        where: { key: data.key },
        create: {
          key: data.key,
          title,
          subtitle,
          body: data.body?.trim() || null,
          ctaLabel: data.ctaLabel?.trim() || null,
          ctaHref: data.ctaHref?.trim() || null,
          images: cleanImages,
          metadata: cleanMeta,
          isPublished: data.isPublished,
          sortOrder: def.sortOrder,
          updatedById: admin.id,
        },
        update: {
          title,
          subtitle,
          body: data.body?.trim() || null,
          ctaLabel: data.ctaLabel?.trim() || null,
          ctaHref: data.ctaHref?.trim() || null,
          images: cleanImages,
          metadata: cleanMeta,
          isPublished: data.isPublished,
          updatedById: admin.id,
        },
        include: { updatedBy: { select: { name: true } } },
      })

      await tx.businessMedia.deleteMany({ where: { sectionId: upserted.id } })
      for (const [idx, objectKey] of allMediaKeys.entries()) {
        const mediaRow = await tx.media.upsert({
          where: { objectKey },
          create: {
            objectKey,
            bucket: 'public',
            mimeType: normalizeImageMimeType('', objectKey) || 'image/webp',
            status: 'READY',
            uploadedById: admin.id,
          },
          update: {
            status: 'READY',
            deletedAt: null,
          },
        })
        await tx.businessMedia.create({
          data: {
            sectionId: upserted.id,
            mediaId: mediaRow.id,
            sortOrder: idx,
          },
        })
      }

      return upserted
    })

    await purgeReplacedR2Objects(previousImages, allMediaKeys)

    await logActivity({
      userId: admin.id,
      action: 'CMS_SECTION_UPDATED',
      description: `Updated website section "${data.key}" (${data.isPublished ? 'published' : 'hidden'})`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    const savedMeta = toStringRecord(saved.metadata)
    const savedImages = toStringArray(saved.images)

    return {
      success: true,
      section: {
        key: data.key,
        title: data.key === 'hero' ? '' : saved.title,
        subtitle: data.key === 'hero' ? '' : (saved.subtitle ?? ''),
        body: saved.body ?? '',
        ctaLabel: saved.ctaLabel ?? '',
        ctaHref: saved.ctaHref ?? '',
        images: savedImages,
        metadata:
          data.key === 'explore'
            ? resolveExploreMetadata(savedMeta)
            : data.key === 'hero'
              ? resolveHeroMetadata(savedMeta, {
                  title: rawTitle,
                  subtitle: rawSubtitle,
                  images: savedImages,
                })
              : data.key === 'branding'
                ? resolveBrandingMetadata(savedMeta)
                : savedMeta,
        isPublished: data.key === 'branding' ? true : saved.isPublished,
        sortOrder: saved.sortOrder,
        updatedAt: saved.updatedAt,
        updatedByName: saved.updatedBy?.name ?? null,
      },
    }
  },
)

export const upsertCmsSection = createServerFn({ method: 'POST' })
  .validator(validateUpsertCmsSection)
  .handler(upsertCmsSectionHandler)

export function validateResetCmsSection(data: { key: CmsSectionKey }) {
  return data
}

export const resetCmsSectionHandler = createServerOnlyFn(
  async ({
    data,
  }: {
    data: { key: CmsSectionKey }
  }): Promise<{ success: true; section: CmsSectionData }> => {
    const admin = await requirePermission('manage:cms')
    if (!VALID_KEYS.has(data.key)) {
      throw new Error('Invalid CMS section key.')
    }

    const session = await authSession()
    const existingRow = await prisma.siteSection.findUnique({
      where: { key: data.key },
      select: { images: true, metadata: true },
    })
    const previousImages = Array.from(
      new Set([
        ...(Array.isArray(existingRow?.images)
          ? existingRow.images.filter((i): i is string => typeof i === 'string')
          : []),
        ...extractHeroSlideImageKeys(existingRow?.metadata),
        ...extractSpotImageKeys(existingRow?.metadata),
        ...extractBrandingImageKeys(existingRow?.metadata),
      ]),
    )

    await prisma.siteSection.deleteMany({ where: { key: data.key } })
    await purgeReplacedR2Objects(previousImages, [])

    await logActivity({
      userId: admin.id,
      action: 'CMS_SECTION_RESET',
      description: `Reset website section "${data.key}" to defaults`,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
    })

    const def = DEFAULT_CMS_SECTIONS.find((s) => s.key === data.key)!
    return { success: true, section: def }
  },
)

export const resetCmsSection = createServerFn({ method: 'POST' })
  .validator(validateResetCmsSection)
  .handler(resetCmsSectionHandler)
