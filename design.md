# Design — Zaid Ahmad Portfolio

Locked design system. Every page reads this before emitting code.
Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
modern-minimal

## Macrostructure family
- Portfolio page (index.html): Portfolio Grid — thin identity block → project rows → experience → contact
- Project pages: Long Document — continuous prose with mono section heads, left border accent

## Theme

Zero-chroma neutrals. Single chromatic accent: electric blue oklch 264°.
Full dark/light dual-mode. Dark is the default.

```
--color-paper    light: oklch(99% 0 0)    dark: oklch(11% 0 0)
--color-paper-2  light: oklch(96% 0 0)    dark: oklch(15% 0 0)
--color-paper-3  light: oklch(92% 0 0)    dark: oklch(20% 0 0)
--color-ink      light: oklch(10% 0 0)    dark: oklch(96% 0 0)
--color-ink-2    light: oklch(38% 0 0)    dark: oklch(65% 0 0)
--color-ink-3    light: oklch(58% 0 0)    dark: oklch(42% 0 0)
--color-rule     light: oklch(88% 0 0)    dark: oklch(22% 0 0)
--color-accent   light: oklch(54% 0.18 264)  dark: oklch(73% 0.14 264)
--color-focus    (same as accent)
--color-success  light: oklch(49% 0.15 150)  dark: oklch(65% 0.17 150)
```

## Typography

- Display: Inter, weight 700, tracking -0.035em
- Body:    Inter, weight 400, tracking 0, line-height 1.75–1.85
- Mono:    JetBrains Mono, weight 400–500 — dates, labels, tech pills, code only
- Display anchor: clamp(3rem, 7vw, 5.25rem)

Two-font system. Inter for prose. JetBrains Mono for precision details.
No italic serif. No decorative display faces.

## Spacing

4-point named scale. Pages use named tokens only — no raw rem values.

```
--space-3xs: 0.25rem   --space-2xs: 0.5rem    --space-xs: 0.75rem
--space-sm:  1rem      --space-md:  1.5rem    --space-lg: 2rem
--space-xl:  3rem      --space-2xl: 4.5rem    --space-3xl: 7rem
```

## Motion

Easings:
- --ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
- --ease-in:     cubic-bezier(0.7, 0, 0.84, 0)
- --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)

Durations: --dur-short: 180ms · --dur-mid: 320ms · --dur-long: 500ms

Reveal pattern: opacity + translateY(14px) on initial load only.
No scroll-triggered reveals on project content pages.
Spatial motion collapses to opacity-only at ≤150ms under prefers-reduced-motion.
Animate transform and opacity only — never layout properties.

## Microinteractions stance

- Silent success — no celebratory toasts
- Hover: subtle background fill (paper-2), no scale transforms on text elements
- Sprite float: translateY only, 3.5s period
- Interactive links: translateX/Y on arrow indicators only
- Focus rings: 2px solid accent, instant (never animated)

## CTA voice

- Primary: filled ink background, paper text, mono font, small border-radius
- Secondary: outlined rule border, ink-2 text, same mono font
- Link CTAs: typographic arrow ↗ or → suffix

## Nav & Footer

- Nav: N5 Floating pill — fixed top-center, blur backdrop, pill border-radius
- Footer: Ft2 Inline rule single line — mono font, hairline rule above, minimal

## Easter eggs (preserve across all pages)

- storm-bg.js — pixel cloud/lightning canvas, reads --bg/--bdr/--accent tokens
- terminal.js — Ctrl+Shift+L, snake game, fastfetch
- pokemon-battle.js — 5× click on .hero-zekrom sprite (keep class names)
- Theme toggle — SVG sun/moon morph, audio tick

The sprite toggle (Zekrom dark ↔ Reshiram light) is part of the brand identity.
Keep .hero-zekrom, .hz-dark, .hz-light class names on all index.html rebuilds.

## What pages MUST share

- The --color-* token system
- Inter + JetBrains Mono font stack
- The accent colour (electric blue) and its placement
- The CTA voice (id-btn pattern)
- Section heading rhythm (mono uppercase label above content)
- The floating pill nav on index; back-link topbar on project pages

## What pages MAY differ on

- Macrostructure within the page-type family
- Enrichment — none on project content pages (typography only)

## Exports

See tokens.css at project root for the full token set.
