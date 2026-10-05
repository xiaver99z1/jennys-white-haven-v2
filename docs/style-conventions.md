## Style conventions

## Core rules

- Use Tailwind utility classes only. Prefer existing theme tokens over arbitrary values.
- Mobile-first: start with base styles, then `sm:`, `md:`, `lg:`.
- Keep class lists readable — group by layout → spacing → color → typography → state.
- Prefer `gap-*` over margin hacks for flex/grid.
- Use `size-*` when width and height are equal.
- Always provide visible `:focus-visible` styles (Tailwind’s default ring is fine).
- Respect `prefers-reduced-motion` for any non-essential animation.

## Design tokens (extend in CSS or tailwind config)

Primary direction for the public site:

- Backgrounds: warm cream / off-white
- Text: warm dark brown / charcoal
- Accent: soft gold / bronze (for CTAs and highlights)
- Plenty of whitespace — avoid dense layouts on client pages

Admin can use a cleaner neutral palette (slate / zinc) with the same accent color.

## Typography

- Headings: elegant serif or refined display font
- Body: clean sans-serif
- Keep line-height generous on long text
- Avoid bold text walls — hierarchy through size and weight sparingly

## Layout

- Prefer Flexbox and Grid
- Use consistent max-width containers
- Sticky booking bar / header on public pages is encouraged

## Accessibility

- Sufficient contrast (especially brown text on cream)
- Interactive elements must be keyboard reachable
- Do not remove focus indicators without a clear replacement
- Hover-only information must also be available on focus/touch

## What to avoid

- Arbitrary values (`w-[137px]`, `text-[#abc]`) unless truly one-off
- `!important`
- Fixed positioning for core page structure
- Heavy animations that fight the calm Aman feel
