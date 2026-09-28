# Design system — “Pastel Civic Atlas”

Reference for every UI change in this repo. Tokens live in `src/app/globals.css`
(Tailwind v4 `@theme inline`); never hardcode a colour, radius or font in a component.

## Direction

A calm public-information atlas: mint framing, warm ivory paper, forest-green ink,
and tactile inset cards in peach, butter, and sky. The map remains the main canvas;
pastel fills organize controls while stronger signal colours identify camera layers.
Bilingual by default: English and 繁體中文 are equal citizens, with flexible labels and
wrapping metadata instead of a first-language-only layout.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4f6f0` | app canvas behind floating cards |
| `--surface` / `--surface-2` | `#fffef9` / `#edf3ed` | cards, inset data surfaces |
| `--ink` / `--ink-2` | `#203b36` / `#405b52` | primary / secondary text |
| `--muted` | `#586b61` | readable metadata and labels, including on mint |
| `--line` / `--line-strong` | `#d8e2d8` / `#a8bcb0` | 1 px separators, control borders |
| `--accent` | `#286453` | focus ring, active language, primary action |
| `--mint` | `#dceee4` | header, collapsed layer control, hover fills |
| `--peach` / `--butter` / `--sky` | `#f7e1d4` / `#f3edce` / `#e0edf4` | red-light / speed / snapshot card tints |
| `--c-redlight` | `#aa5648` | red-light camera signal |
| `--c-speed` | `#947029` | speed enforcement signal |
| `--c-snapshot` | `#3e718b` | traffic snapshot signal (+ live) |
| `--c-parking` | `#1b6f8a` | parking availability signal |
| `--c-erp` | `#8f5a12` | ERP gantry / charge signal |
| `--c-ev` | `#4a7c1e` | EV charging signal |
| `--c-zones` | `#a63f7a` | school / silver zone overlay |
| `--c-expressway` | `#34497a` | corridor times and EMAS cards |
| `--ok` / `--warn` / `--err` | `#15803d` / `#a14b09` / `#b42318` | status |
| `--radius` / `--radius-control` | `20px` / `12px` | floating cards / controls |
| `--shadow-panel` | soft forest-tinted shadow and inset highlight | floating-card depth |

Layer colours are **double-encoded**: each layer also has its own marker shape
(circle = red-light, triangle = speed, camera rectangle = snapshot) so hue is never the only
signal.

## Typography

- Display / wordmark: **Instrument Serif** (`font-display`) — an atlas-like editorial counterweight to the map; 23 px desktop wordmark and 28 px modal heading.
- UI + numbers: **Archivo** (`font-sans`, default body font) with tabular figures.
- CJK: `Noto Sans TC → PingFang TC → Microsoft JhengHei → Heiti TC` fallbacks; Chinese text
  is tracked slightly tighter where it sits next to Latin.
- Micro-labels: `.label` = 11 px / uppercase / `0.1em` tracking / 600. Never shout in
  sentence case where a label is required.

## Motion

`rise` (280 ms ease-out) for cards entering, `pulse` for the live indicator, `skeleton`
shimmer for loading, 200 ms colour/transform transitions on controls. Everything respects
`prefers-reduced-motion`.

## Layout rules

- Desktop: map fills the viewport; mint header top-left, detail card top-right, MapLibre
  controls bottom-right, and the **layer rail docked bottom-centre**. The dock reserves a
  right-hand gutter (`calc(100vw - 150px)` at its widest) so the single-row icon dock scrolls instead of
  painting over the zoom/geolocate controls, and it retracts while a detail card is open.
- Phone: header pinned to the top, the layer control is a **rail of coloured icons docked at the
  bottom of the window**, spanning the available width with 8 px side insets and listing all twelve
  layers in every build. Map controls and attribution sit above the full-width dock, not beside it.
  Both platforms use one icon-only row: no visible group headings, layer labels, action labels or
  status strip. A layer
  the running build cannot reach is still listed, and its tooltip reports unavailability.
  Hovering or focusing an icon shows **one shared tooltip bubble above the rail**; tapping toggles
  visibility and briefly shows the layer name, state, count and description, without opening a popup.
  The pinned Options icon opens the last-tapped layer's details, filters, legends or summaries.
  Opening Options never changes visibility. Browse, Reset and Collapse are icons in the scrolling
  row; Options and data status are pinned at its edge. Closing a popup returns focus to its trigger.
  The rail retracts while a detail card is open (both platforms), and never lists the rows as a wall
  of text. Its one shared tooltip floats above the panel, points at the hovered tile with a caret,
  and is exposed to assistive tech through `aria-describedby`; the settings panel is not open at the
  same time, so the two never overlap.
- The top bar is retractable: its dedicated app-icon button collapses the header; the icon
  keeps **exactly** its expanded position (same left inset and glyph), and clicking it again restores
  it. The basemap toggle sits between the language and source-information controls; its label names
  the destination (Simple map or Street map), and the selected basemap persists locally. The bar itself
  carries no tooltip — it sits against the window edge, where a bubble would be clipped to a stray
  sliver; controls inside it use `.tip-below` so their bubbles open downwards. The header is not
  an interactive wrapper: each control owns its keyboard activation.
  On phones it stays strictly one row with the logo, short title, one EN/中 language toggle,
  icon-only basemap and Sources controls. Both languages reserve the Chinese short title's width,
  so switching language never resizes the bar or shifts its three right-aligned action buttons.
  Titles can truncate on unusually narrow screens;
  controls retain 44 px targets and the full title fits the iPhone 16 Pro Max portrait viewport.
- Floating cards use `.panel` (96% ivory surface + 16 px blur + hairline + shadow) and one
  of two radii: card `20px`, control `12px`. Inset layer cards use `14px`. Cards never position themselves — the parent
  owns layout so the map can inset them.
- Touch targets ≥ 44 px; icon-only buttons carry `aria-label` **and** a `.tip` tooltip. A tooltip
  must never be clipped: `.tip` places it above, `.tip-right` aligns it to the right edge,
  `.tip-below` opens it downwards (required near the top of the window) and rail tooltips wrap
  instead of running off a phone screen. An information-only surface (a legend, a corridor card)
  never justifies a modal step before the switch a user already committed to.
- Layer cards keep their own tinted fill, a white-backed glyph, large count, and a
  44 px switch target. An inactive card returns to ivory; state is also exposed to
  assistive technology. Metadata can wrap without pushing a switch out of the card.
- The nine driver layers are grouped **live road conditions** (1–4) then **route, parking &
  safety** (5–9); camera locations follow last. Every row keeps its own glyph, so a shared hue
  family is never the only way to tell two layers apart. Tooltips and accessible names identify
  every layer; opening Options names the official feeds behind it.
- The rail is a control surface, so it is never replaced by a loading state: icons render
  immediately with `—` counts while the first (slow) payload is in flight, and the pinned
  status icon carries the progress. Swapping controls for skeletons hid the layers outright.
- **Default view:** driver layers 1–2 on, everything else off — including the three camera layers,
  which never carry the default view in any build.
- Summaries stay compact and inside the panel: parking and EV aggregate into `.atlas-mini-card`
  chips, ERP into charge rows (`.atlas-erp-row`), expressway into corridor cards and an EMAS list.
  Only zoom-gated geometry (school/silver zones from zoom 14, ERP spans from zoom 14) and the
  parking/EV markers reach the map itself.
- Detail panels use the selected layer's narrow top rule, an inset metadata block,
  and a forest-green zoom action. Source sections repeat the same three pastel fills.
- No decorative gradients or map-wide CSS filters; colour changes must preserve
  readable basemap labels and distinct camera signals.

## Content rules

- Every user-visible string goes through `useI18n().t(key)`; `en` and `zh` dictionaries must
  stay key-for-key identical (checked by script and by `tsc`).
- Numbers are data: show the count, the unit word, and the source revision. Never round away
  a real value.
- Unavailable data is stated, never substituted: visible freshness/status on both platforms,
  actionable recovery, and raw upstream text in a `font-mono` technical-details disclosure. Retry
  is only offered for recoverable failures; missing configuration offers available camera layers.
  This applies to whole features: a removed ERP rate feed reports
  `partial` and links to the official table instead of showing a guessed charge, and a car park with
  no published gantry height says "Not published" rather than leaving a silent gap.
- Charge windows, lot counts and travel times are shown with the unit the official feed uses
  (SGD, minutes, kW) and the source is attributed inline where the value needs it.

## Operational clarity and accessibility

- The dock preserves the live conditions, trip planning and camera order, separated by small
  spacing breaks. It scrolls horizontally without wrapping, and its chevron signals more controls.
  All layer and utility actions have at least 44 px touch targets.
- A persistent data-status icon retains feed health through its color, tooltip and accessible name;
  tapping it opens capture dates and actionable feed issues. Static deployments identify their
  saved snapshot as a cached copy. Status remains available even when the dock is collapsed.
- Sources uses a native modal dialog with focus containment, Escape dismissal and focus return,
  and lists every road and camera layer. Other layer disclosures remain non-modal.
- Browse visible layers provides search and pagination over the active layers using the map's
  filters. It offers a textual selection path for keyboard/screen-reader users, including reports
  without published coordinates. Selection focuses details; Escape returns to the selecting control.
- Image polling runs only when its layer and the browser tab are visible. Road polling pauses
  in a hidden tab or when all road layers are off; returning to the tab refreshes enabled feeds.
