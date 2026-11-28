import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus, ShieldCheck, X } from 'lucide-react'
import {
  ACCEPT_ALL_COOKIE_CATEGORIES,
  DEFAULT_EDITABLE_COOKIE_CATEGORIES,
  NECESSARY_ONLY_COOKIE_CATEGORIES,
  readCookieConsent,
  saveCookieConsent,
} from '#/lib/cookie-consent'
import type { EditableCookieCategories } from '#/lib/cookie-consent'
import { useI18n } from '#/lib/i18n'

interface CookieConsentCenterProps {
  isPreferencesOpen: boolean
  onOpenPreferences: (trigger?: HTMLElement | null) => void
  onClosePreferences: (options?: { saved?: boolean }) => void
}

type CategoryKey = 'necessary' | keyof EditableCookieCategories

const COOKIE_CATEGORY_DETAILS: Array<{
  key: CategoryKey
  title: string
  description: string
}> = [
  {
    key: 'necessary',
    title: 'Strictly Necessary Cookies',
    description:
      'Essential for the website to function properly, including room availability searches, reservation form security, payment proof uploads, and remembering your privacy preferences. These cookies cannot be switched off.',
  },
  {
    key: 'functional',
    title: 'Functional Cookies',
    description:
      'Allow the website to remember choices you make during your visit—such as selected check-in and check-out dates, guest count, and display preferences—to provide a smoother booking experience.',
  },
  {
    key: 'performance',
    title: 'Performance Cookies',
    description:
      'Help us understand how guests navigate our rooms and Camotes Island guide by collecting anonymous, aggregated traffic statistics so we can improve page speed and usability.',
  },
  {
    key: 'targeting',
    title: 'Targeting Cookies',
    description:
      'Used to measure the effectiveness of our travel promotions and share relevant staycation updates on social platforms. If disabled, you will not receive targeted promotions from this site.',
  },
]

export function CookieConsentCenter({
  isPreferencesOpen,
  onOpenPreferences,
  onClosePreferences,
}: CookieConsentCenterProps) {
  const { locale, t } = useI18n()
  const [hasMounted, setHasMounted] = useState(false)
  const [hasSavedConsent, setHasSavedConsent] = useState(true)
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<CategoryKey[]>([])
  const [draft, setDraft] = useState<EditableCookieCategories>(
    DEFAULT_EDITABLE_COOKIE_CATEGORIES,
  )

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const bannerPrefsBtnRef = useRef<HTMLButtonElement>(null)
  const openedFromBannerRef = useRef(false)
  const wasPreferencesOpenRef = useRef(false)

  useEffect(() => {
    setHasMounted(true)
    const stored = readCookieConsent()
    if (stored) {
      setHasSavedConsent(true)
      setDraft({
        functional: stored.functional,
        performance: stored.performance,
        targeting: stored.targeting,
      })
    } else {
      setHasSavedConsent(false)
      setDraft(DEFAULT_EDITABLE_COOKIE_CATEGORIES)
    }
  }, [])

  useEffect(() => {
    if (isPreferencesOpen) {
      wasPreferencesOpenRef.current = true
      setSaveError(null)
      const stored = readCookieConsent()
      if (stored) {
        setDraft({
          functional: stored.functional,
          performance: stored.performance,
          targeting: stored.targeting,
        })
      }
      closeBtnRef.current?.focus()
    } else if (wasPreferencesOpenRef.current) {
      wasPreferencesOpenRef.current = false
      if (openedFromBannerRef.current && !hasSavedConsent) {
        openedFromBannerRef.current = false
        bannerPrefsBtnRef.current?.focus()
      } else {
        openedFromBannerRef.current = false
      }
    }
  }, [isPreferencesOpen, hasSavedConsent])

  const handleCloseModal = useCallback(() => {
    setSaveError(null)
    onClosePreferences({ saved: false })
  }, [onClosePreferences])

  useEffect(() => {
    if (!isPreferencesOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseModal()
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) {
          e.preventDefault()
          dialogRef.current.focus()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPreferencesOpen, handleCloseModal])

  function applyAndSave(categories: EditableCookieCategories) {
    const result = saveCookieConsent(categories)
    if (!result.persisted) {
      setSaveError(
        'We could not save your cookie preferences because browser storage is blocked or full. Only strictly necessary cookies remain active for this session.',
      )
      setDraft(NECESSARY_ONLY_COOKIE_CATEGORIES)
      setHasSavedConsent(false)
      return
    }
    setSaveError(null)
    setDraft(categories)
    setHasSavedConsent(true)
    openedFromBannerRef.current = false
    onClosePreferences({ saved: true })
  }

  function toggleAccordion(key: CategoryKey) {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function toggleCategory(key: keyof EditableCookieCategories) {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const showBanner = hasMounted && !hasSavedConsent && !isPreferencesOpen

  return (
    <>
      {/* 1. Bottom Cookie Consent Banner */}
      {showBanner && (
        <aside
          aria-label="Cookie consent banner"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-300/80 bg-[#FAF8F4]/98 backdrop-blur-md shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 sm:py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5 max-w-4xl">
              {locale === 'en' ? (
                <p className="text-xs text-stone-700 leading-relaxed">
                  We use cookies and local browser storage to keep your
                  reservation session secure, remember your stay preferences,
                  and understand how guests explore Jenny&apos;s White Haven. By
                  clicking <strong>Agree</strong> or configuring{' '}
                  <strong>Cookie Preferences</strong>, you acknowledge our
                  privacy practices in accordance with the Philippine Data
                  Privacy Act of 2012 (RA 10173).
                </p>
              ) : (
                <p className="text-xs text-stone-700 leading-relaxed">
                  {t.cookies.bannerBody}
                </p>
              )}
              {saveError && (
                <p role="alert" className="text-xs font-medium text-rose-700">
                  {saveError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                ref={bannerPrefsBtnRef}
                type="button"
                onClick={(e) => {
                  openedFromBannerRef.current = true
                  onOpenPreferences(e.currentTarget)
                }}
                className="px-4 py-2.5 rounded-none sm:rounded-lg border border-stone-800 bg-transparent hover:bg-stone-200/60 text-stone-900 text-[11px] uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
              >
                {t.cookies.cookiePreferences}
              </button>
              <button
                type="button"
                onClick={() => applyAndSave(ACCEPT_ALL_COOKIE_CATEGORIES)}
                className="px-6 py-2.5 rounded-none sm:rounded-lg bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-[11px] uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
              >
                {t.cookies.agree}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Privacy Preferences Center Modal */}
      {isPreferencesOpen && (
        <div
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby="privacy-preferences-title"
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-[#FAF8F4] border border-stone-300 shadow-2xl my-auto max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
          >
            {/* Modal Top Brand Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#F3EFE7] border border-stone-200 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-amber-900" />
                </div>
                <div className="leading-tight">
                  <p className="font-serif text-sm text-stone-900">
                    Jenny&apos;s White Haven
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.24em] text-stone-500">
                    Camotes Island · Cebu
                  </p>
                </div>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleCloseModal}
                aria-label="Close privacy preferences center"
                className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-1 space-y-6 text-stone-800">
              <div className="space-y-3">
                <h2
                  id="privacy-preferences-title"
                  className="font-serif text-xl sm:text-2xl text-stone-900 font-semibold"
                >
                  {t.cookies.privacyCenterTitle}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  When you visit our website, we may store or retrieve
                  information on your browser, mostly in the form of cookies and
                  local storage. We use this information to make the reservation
                  and room browsing experience work as you expect it to, to
                  conduct anonymous analytics, and to provide a personalized
                  island staycation guide.
                </p>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Because we respect your right to privacy under the{' '}
                  <strong>
                    Philippine Data Privacy Act of 2012 (RA 10173)
                  </strong>{' '}
                  and international privacy standards, you can choose not to
                  allow certain types of optional cookies below. Click on the
                  category headings to learn more and adjust our default
                  settings.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    aria-expanded={showPrivacyNotice}
                    onClick={() => setShowPrivacyNotice((v) => !v)}
                    className="text-xs font-semibold text-amber-900 underline underline-offset-4 hover:text-stone-900 cursor-pointer"
                  >
                    {showPrivacyNotice
                      ? 'Hide Privacy & Cookie Notice'
                      : 'Read Privacy & Cookie Notice'}
                  </button>
                </div>

                {showPrivacyNotice && (
                  <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600 space-y-2 leading-relaxed">
                    <p className="font-semibold text-stone-900">
                      Jenny&apos;s White Haven Data &amp; Cookie Notice
                    </p>
                    <p>
                      We collect only the personal details you voluntarily
                      submit when making a room reservation (guest name, email
                      address, phone number, stay dates, and GCash/bank deposit
                      proof). Your booking data is used exclusively to confirm
                      and manage your stay at Jenny&apos;s White Haven in
                      Santiago Bay, Camotes Island, Cebu, and is never sold to
                      third parties.
                    </p>
                    <p>
                      You may update your cookie preferences at any time using
                      the <strong>Cookie Preferences</strong> link in the
                      website footer.
                    </p>
                  </div>
                )}
              </div>

              {/* Manage Consent Preferences Accordion Table */}
              <div className="space-y-3">
                {saveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
                  >
                    {saveError}
                  </div>
                )}

                <h3 className="font-serif text-base sm:text-lg text-stone-900 font-semibold">
                  {t.cookies.manageConsentPreferences}
                </h3>

                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white divide-y divide-stone-200">
                  {COOKIE_CATEGORY_DETAILS.map((cat) => {
                    const catKey = cat.key
                    const isExpanded = expandedKeys.includes(catKey)
                    const isChecked =
                      catKey === 'necessary' ? true : draft[catKey]

                    return (
                      <div key={catKey} className="bg-white">
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => toggleAccordion(catKey)}
                            className="flex items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-stone-900 hover:text-amber-900 transition cursor-pointer flex-1"
                          >
                            {isExpanded ? (
                              <Minus className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                            )}
                            <span>{cat.title}</span>
                          </button>

                          {catKey === 'necessary' ? (
                            <span className="text-xs font-semibold text-amber-900 whitespace-nowrap">
                              {t.cookies.alwaysActive}
                            </span>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              aria-label={`Toggle ${cat.title}`}
                              onClick={() => toggleCategory(catKey)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/30 ${
                                isChecked ? 'bg-emerald-700' : 'bg-stone-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                  isChecked ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="px-10 pb-4 text-xs text-stone-600 leading-relaxed">
                            {cat.description}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 sm:px-8 py-4 border-t border-stone-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyAndSave(NECESSARY_ONLY_COOKIE_CATEGORIES)}
                  className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-[11px] uppercase tracking-[0.15em] font-semibold transition cursor-pointer"
                >
                  {t.cookies.essentialOnly}
                </button>
                <button
                  type="button"
                  onClick={() => applyAndSave(ACCEPT_ALL_COOKIE_CATEGORIES)}
                  className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-[11px] uppercase tracking-[0.15em] font-semibold transition cursor-pointer"
                >
                  {t.cookies.allowAll}
                </button>
              </div>

              <button
                type="button"
                onClick={() => applyAndSave(draft)}
                className="px-6 py-2.5 rounded-lg bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-[11px] uppercase tracking-[0.18em] font-semibold transition cursor-pointer"
              >
                {t.cookies.confirmChoices}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
