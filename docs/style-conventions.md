# Style conventions

## Core rules

- Use Tailwind utility classes only. Prefer existing theme tokens over arbitrary values.
- Mobile-first: start with base styles, then `sm:`, `md:`, `lg:`.
- Keep class lists readable — group by layout → spacing → color → typography → state.
- Prefer `gap-*` over margin hacks for flex/grid.
- Use `size-*` when width and height are equal.
- Always provide visible `:focus-visible` styles.
- Respect `prefers-reduced-motion` for any non-essential animation.

## Design tokens

Public site:

- Backgrounds: warm cream / off-white
- Text: warm dark brown / charcoal
- Accent: soft gold / bronze (CTAs and highlights)
- Plenty of whitespace

Admin:

- Cleaner neutral palette (slate / zinc) + same gold accent

## Typography

- Headings: elegant serif or refined display font
- Body: clean sans-serif
- Generous line-height on long text
- Avoid heavy bold walls

## Layout

- Prefer Flexbox and Grid
- Consistent max-width containers
- Sticky booking bar / header is encouraged on public pages

## Accessibility

- Sufficient contrast (especially brown on cream)
- Interactive elements must be keyboard reachable
- Do not remove focus indicators without a clear replacement

## What to avoid

- Arbitrary values unless truly one-off
- `!important`
- Fixed positioning for core page structure
- Heavy animations that fight the calm Aman feel
