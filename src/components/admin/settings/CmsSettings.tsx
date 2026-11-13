import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { CMS_SECTION_META } from '#/lib/constants/cms'
import { formatShortDate, getErrorMessage } from '#/lib/formatters'
import { resetCmsSection, upsertCmsSection } from '#/server/cms-actions'
import { uploadAvatar } from '#/server/upload'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import type { CmsSectionData, CmsSectionKey } from '#/types'

interface CmsSettingsProps {
  initialSections: CmsSectionData[]
}

export function CmsSettings({ initialSections }: CmsSettingsProps) {
  const router = useRouter()
  const [sections, setSections] = useState<CmsSectionData[]>(initialSections)
  const [activeKey, setActiveKey] = useState<CmsSectionKey>(
    initialSections.at(0)?.key ?? 'hero',
  )

  const current =
    sections.find((s) => s.key === activeKey) ?? sections.at(0)

  const [title, setTitle] = useState(current?.title ?? '')
  const [subtitle, setSubtitle] = useState(current?.subtitle ?? '')
  const [body, setBody] = useState(current?.body ?? '')
  const [ctaLabel, setCtaLabel] = useState(current?.ctaLabel ?? '')
  const [ctaHref, setCtaHref] = useState(current?.ctaHref ?? '')
  const [images, setImages] = useState<string[]>(current?.images ?? [])
  const [metadata, setMetadata] = useState<Record<string, string>>(
    current?.metadata ?? {},
  )
  const [isPublished, setIsPublished] = useState(current?.isPublished ?? true)

  const [newImageUrl, setNewImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function loadSectionIntoForm(section: CmsSectionData) {
    setActiveKey(section.key)
    setTitle(section.title)
    setSubtitle(section.subtitle)
    setBody(section.body)
    setCtaLabel(section.ctaLabel)
    setCtaHref(section.ctaHref)
    setImages(section.images)
    setMetadata(section.metadata)
    setIsPublished(section.isPublished)
    setNewImageUrl('')
    setError(null)
    setSuccessMsg(null)
  }

  function handleSelectSection(key: CmsSectionKey) {
    const found = sections.find((s) => s.key === key)
    if (found) loadSectionIntoForm(found)
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const url = await uploadAvatar({ data: formData })
      setImages((prev) => [...prev, url])
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload image.'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleAddImageUrl() {
    const trimmed = newImageUrl.trim()
    if (!trimmed) return
    setImages((prev) => [...prev, trimmed])
    setNewImageUrl('')
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleMoveImage(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    setImages((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!current) return
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await upsertCmsSection({
        data: {
          key: current.key,
          title,
          subtitle,
          body,
          ctaLabel,
          ctaHref,
          images,
          metadata,
          isPublished,
        },
      })
      setSections((prev) =>
        prev.map((s) => (s.key === res.section.key ? res.section : s)),
      )
      loadSectionIntoForm(res.section)
      setSuccessMsg(`${CMS_SECTION_META[current.key].label} saved.`)
      await router.invalidate()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save section.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResetConfirm() {
    if (!current) return
    setIsResetting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await resetCmsSection({ data: { key: current.key } })
      setSections((prev) =>
        prev.map((s) => (s.key === res.section.key ? res.section : s)),
      )
      loadSectionIntoForm(res.section)
      setConfirmResetOpen(false)
      setSuccessMsg(
        `${CMS_SECTION_META[current.key].label} reset to defaults.`,
      )
      await router.invalidate()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset section.'))
      setConfirmResetOpen(false)
    } finally {
      setIsResetting(false)
    }
  }

  if (!current) return null

  const meta = CMS_SECTION_META[current.key]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Website Content &amp; Settings
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage copy, photography, and visibility for each section of the
            public resort website.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition self-start sm:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview Public Site
        </a>
      </div>

      {/* Section Tabs + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section Selector */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Public Site Sections
          </div>
          {sections.map((section) => {
            const sectionMeta = CMS_SECTION_META[section.key]
            const isSelected = section.key === current.key
            return (
              <button
                key={section.key}
                type="button"
                disabled={isUploading || isSaving || isResetting}
                onClick={() => handleSelectSection(section.key)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {sectionMeta.label}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      isSelected ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    {section.title}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    section.isPublished
                      ? isSelected
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-emerald-50 text-emerald-700'
                      : isSelected
                        ? 'bg-stone-700 text-stone-300'
                        : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {section.isPublished ? (
                    <>
                      <Eye className="w-2.5 h-2.5" />
                      Live
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-2.5 h-2.5" />
                      Hidden
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </aside>

        {/* Active Section Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6"
        >
          <fieldset
            disabled={isSaving || isResetting}
            className="space-y-6 disabled:opacity-80"
          >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-bold text-stone-900">{meta.label}</h2>
              <p className="text-xs text-stone-500">{meta.description}</p>
              {current.updatedAt && (
                <p className="text-[11px] text-stone-400 mt-1">
                  Last updated {formatShortDate(current.updatedAt)}
                  {current.updatedByName ? ` by ${current.updatedByName}` : ''}
                </p>
              )}
            </div>

            <label className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer self-start">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="text-xs font-semibold text-stone-700">
                Published on site
              </span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Primary Content Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="cms-title"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Section Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="cms-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              />
            </div>

            <div>
              <label
                htmlFor="cms-subtitle"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Subtitle
              </label>
              <input
                id="cms-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              />
            </div>

            <div>
              <label
                htmlFor="cms-body"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                Body Copy
              </label>
              <textarea
                id="cms-body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cms-cta-label"
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                >
                  Button / CTA Label
                </label>
                <input
                  id="cms-cta-label"
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Explore Rooms"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
                />
              </div>
              <div>
                <label
                  htmlFor="cms-cta-href"
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                >
                  Button / CTA Link
                </label>
                <input
                  id="cms-cta-href"
                  type="text"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="/rooms"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Section-Specific Metadata Fields */}
          {meta.metadataFields.length > 0 && (
            <div className="pt-4 border-t border-stone-100 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Section Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meta.metadataFields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.key === 'items' || field.key === 'paymentInfo'
                        ? 'sm:col-span-2'
                        : ''
                    }
                  >
                    <label
                      htmlFor={`cms-meta-${field.key}`}
                      className="block text-xs font-semibold text-stone-700 mb-1.5"
                    >
                      {field.label}
                    </label>
                    <input
                      id={`cms-meta-${field.key}`}
                      type="text"
                      value={metadata[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        setMetadata((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Manager */}
          <div className="pt-4 border-t border-stone-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Section Images ({images.length})
                </h3>
                <p className="text-[11px] text-stone-400">
                  Upload photography or paste image URLs. The first image is
                  used as the primary photo.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer transition self-start">
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    void handleImageUpload(file)
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://... paste an image URL"
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!newImageUrl.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add URL
              </button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {images.map((src, idx) => (
                  <div
                    key={`${src}-${idx}`}
                    className="group relative rounded-xl border border-stone-200 overflow-hidden bg-stone-50"
                  >
                    <img
                      src={src}
                      alt={`${meta.label} ${idx + 1}`}
                      className="w-full h-36 object-cover"
                    />
                    <div className="p-2 flex items-center justify-between gap-2 bg-white border-t border-stone-100">
                      <span className="text-[11px] text-stone-500 truncate">
                        #{idx + 1} · {src}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move image ${idx + 1} up`}
                          className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          aria-label={`Move image ${idx + 1} down`}
                          className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          aria-label={`Remove image ${idx + 1}`}
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={isSaving || isResetting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Defaults
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          </fieldset>
        </form>
      </div>

      <ConfirmModal
        isOpen={confirmResetOpen}
        title={`Reset ${meta.label}?`}
        description="This will remove custom edits for this section and restore the default copy and images."
        confirmText="Reset Section"
        variant="amber"
        isLoading={isResetting}
        onConfirm={handleResetConfirm}
        onClose={() => setConfirmResetOpen(false)}
      />
    </div>
  )
}
