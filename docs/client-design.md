# Client Design

Aman-inspired editorial calm paired with warm Camotes Island hospitality across all public visitor pages (`/`, `/rooms`, `/rooms/$id`, `/explore`, `/gallery`, `/reviews`, `/contact`, `/booking-status`).

## Visual & Editorial Principles

- **Surfaces & Palette:** Warm sand and cream backgrounds (`#FAF8F4`, `#F3EFE7`), crisp white cards (`bg-white`), deep charcoal/stone typography (`text-stone-900`), and warm bronze/amber accents (`amber-800` / `amber-900`) for eyebrows and interactive highlights.
- **Typography:** Editorial serif display headings (`font-serif`) paired with clean, tracked uppercase eyebrows (`tracking-[0.18em]` to `tracking-[0.26em]`) and generous body line-height.
- **Imagery & Performance:** Hero and primary room photos load eagerly (`fetchPriority="high" decoding="async"`), while below-the-fold cards, thumbnails, and gallery grids lazy-load (`loading="lazy" decoding="async"`) via Cloudflare CDN URLs.

## Interactive Public Patterns

- **Navigation & Currency:** Sticky translucent header with hover-and-keyboard accessible `More` menu (Photo Gallery, Guest Reviews, Google Map, Contact Us) and `CurrencySelector` powered by `Intl.NumberFormat`. Whenever a non-PHP currency is active, reservation summaries clearly note that final billing is settled in Philippine Pesos (`PHP`).
- **Date & Guest Controls:** `StayDateRangePicker` renders a viewport-clamped dual-month calendar popover on desktop and a modal sheet on mobile, visually marking occupied/blocked nights. `ExtraGuestsCounterField` stacks Adult and Child steppers cleanly so narrow sidebars never wrap awkwardly.
- **Live Chat Support (`PublicChatWidget`):** Calm bottom-right launcher pill displaying live staff presence (`Online` vs `Currently Away`), quick inquiry starters, saved visitor threads, and automatic staff app + email alerts.
- **Verified Reviews & Privacy:** Only completed, paid stays can submit reviews via `/booking-status`. `CookieConsentCenter` gates non-essential page-view analytics (`AnalyticsTracker`) until visitor consent is granted.
