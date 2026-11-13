import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { authSession } from '#/lib/auth-helpers'
import { logActivity } from '#/lib/logger'
import { requirePermission } from '#/server/room-actions'
import { DEFAULT_CMS_SECTIONS } from '#/lib/constants/cms'
import type { CmsSectionData, CmsSectionKey } from '#/types'

const VALID_KEYS = new Set<string>(DEFAULT_CMS_SECTIONS.map((s) => s.key))

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((item): item is string => typeof item === 'string')
}

function toStringRecord(val: unknown): Record<string, string> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(val)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
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
    return {
      key: def.key,
      title: row.title,
      subtitle: row.subtitle ?? '',
      body: row.body ?? '',
      ctaLabel: row.ctaLabel ?? '',
      ctaHref: row.ctaHref ?? '',
      images: toStringArray(row.images),
      metadata: { ...def.metadata, ...toStringRecord(row.metadata) },
      isPublished: row.isPublished,
      sortOrder: row.sortOrder,
      updatedAt: row.updatedAt,
      updatedByName: row.updatedBy?.name ?? null,
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getPublicCmsSectionsHandler(): Promise<
  CmsSectionData[]
> {
  const rows = await prisma.siteSection.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return mergeWithDefaults(rows).filter((s) => s.isPublished)
}

export const getPublicCmsSections = createServerFn({ method: 'GET' }).handler(
  getPublicCmsSectionsHandler,
)

export async function getAdminCmsSectionsHandler(): Promise<CmsSectionData[]> {
  await requirePermission('manage:cms')
  const rows = await prisma.siteSection.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { updatedBy: { select: { name: true } } },
  })
  return mergeWithDefaults(rows)
}

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

export async function upsertCmsSectionHandler({
  data,
}: {
  data: UpsertCmsSectionInput
}): Promise<{ success: true; section: CmsSectionData }> {
  const admin = await requirePermission('manage:cms')

  if (!VALID_KEYS.has(data.key)) {
    throw new Error('Invalid CMS section key.')
  }

  const title = data.title.trim()
  if (!title) {
    throw new Error('Section title is required.')
  }

  const def = DEFAULT_CMS_SECTIONS.find((s) => s.key === data.key)!
  const cleanImages = data.images.map((u) => u.trim()).filter(Boolean)
  const cleanMeta: Record<string, string> = {}
  for (const [k, v] of Object.entries(data.metadata)) {
    cleanMeta[k] = v.trim()
  }

  const session = await authSession()

  const saved = await prisma.siteSection.upsert({
    where: { key: data.key },
    create: {
      key: data.key,
      title,
      subtitle: data.subtitle?.trim() || null,
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
      subtitle: data.subtitle?.trim() || null,
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

  await logActivity({
    userId: admin.id,
    action: 'CMS_SECTION_UPDATED',
    description: `Updated website section "${data.key}" (${data.isPublished ? 'published' : 'hidden'})`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  return {
    success: true,
    section: {
      key: data.key,
      title: saved.title,
      subtitle: saved.subtitle ?? '',
      body: saved.body ?? '',
      ctaLabel: saved.ctaLabel ?? '',
      ctaHref: saved.ctaHref ?? '',
      images: toStringArray(saved.images),
      metadata: toStringRecord(saved.metadata),
      isPublished: saved.isPublished,
      sortOrder: saved.sortOrder,
      updatedAt: saved.updatedAt,
      updatedByName: saved.updatedBy?.name ?? null,
    },
  }
}

export const upsertCmsSection = createServerFn({ method: 'POST' })
  .validator(validateUpsertCmsSection)
  .handler(upsertCmsSectionHandler)

export function validateResetCmsSection(data: { key: CmsSectionKey }) {
  return data
}

export async function resetCmsSectionHandler({
  data,
}: {
  data: { key: CmsSectionKey }
}): Promise<{ success: true; section: CmsSectionData }> {
  const admin = await requirePermission('manage:cms')
  if (!VALID_KEYS.has(data.key)) {
    throw new Error('Invalid CMS section key.')
  }

  const session = await authSession()
  await prisma.siteSection.deleteMany({ where: { key: data.key } })

  await logActivity({
    userId: admin.id,
    action: 'CMS_SECTION_RESET',
    description: `Reset website section "${data.key}" to defaults`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  const def = DEFAULT_CMS_SECTIONS.find((s) => s.key === data.key)!
  return { success: true, section: def }
}

export const resetCmsSection = createServerFn({ method: 'POST' })
  .validator(validateResetCmsSection)
  .handler(resetCmsSectionHandler)
