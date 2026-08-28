# Web App Design Guideline — Default v2

This document is the canonical UI contract for `apps/web`. It adapts the
Lootlog Signal System from `DESIGN.md` to an Operate surface: compact,
predictable, dark-only, and data-first.

## Visual Foundation

- Canvas: Night Ink `#07111f`.
- Panels and overlays: Raised Ink `#0d1a2c`.
- Structural borders: Rule Blue `#2b3b53`.
- Primary, supporting, and quiet text: Signal White `#f7f8f2`, Text Cloud
  `#b9c8de`, and Text Quiet `#91a4bf`.
- Navigation and primary actions: Broadcast Cobalt `#3157f6`.
- Live or synchronized state: Sync Cyan `#35d3e4`.
- Ready, successful, or available state: Resp Lime `#c8f135`.
- Time, waiting, or caution: Timer Amber `#ffbd3f`.
- Destructive, failed, or urgent state: Alert Coral `#ff665b`.

Use one dominant signal per screen. Color must communicate state, priority,
route, or action; pair it with a label or icon. Preserve item rarity colors
where they carry game meaning.

The system is flat first. Use solid surfaces and borders before elevation.
Do not add backdrop blur, purple ambience, starfields, gradient text, neon
glow, or decorative glass. Shadows are reserved for detached overlays.

## Shared Shell

- The app occupies `100dvh` and keeps navigation, page header, and working
  content in separate overflow regions.
- The guild selector and contextual navigation remain persistent on desktop
  and move into the existing sheet on mobile.
- The 56px page bar contains the sidebar trigger, back navigation,
  breadcrumbs, current route, and route actions.
- Current navigation uses a cobalt field or text treatment with a visible
  focus ring. Sidebar boundaries use Rule Blue.
- Page content uses 12px mobile and 16–24px desktop gutters. Operational page
  frames use the full available width inside those shell gutters. Constrain
  prose, a single form column, or preview media—not the page frame. Catalogs,
  galleries, boards, tables, and split workspaces must not sit inside a
  centered fixed `max-width` container.

## Page Archetypes

### Command Center

Use for dashboards, guild home, statistics, and event overview. Lead with the
current state and the most useful next action, followed by aligned summaries
and real lists or charts. Avoid equal feature-card grids.

### Stream

Use for loots, activity, battles, and notification history. Keep filters in a
sticky toolbar, preserve one primary scroll region, and use the existing
mobile filter sheet. Rows must keep timestamps, actors, state, and actions
aligned.

### Operational Board

Use for timers, reservations, coordination, and rankings. Group by operational
state and make availability, ownership, urgency, and next action visible
without opening details.

### Detail and Analysis

Use for battles, members, NPCs, kills, events, and reservation details. Start
with a compact summary strip, then stable local navigation and full-width
evidence. Keep identifiers and timestamps in Geist Mono.

### Editor and Configuration

Use for documents, notification rules, event configuration, and settings.
Keep one restrained form column, place secondary explanation beside it only
when space allows, and expose saving, saved, invalid, loading, and failure
states.

### Entry and Public

Use for sign-in, initialization, and public battle. Keep the task centered on
Night Ink with one clear action and restrained signal geometry. Do not turn
these screens into landing pages.

## Components

- Panels use `bg-card`, a 1px `border-border`, 16px corners, and no decorative
  blur. Nested cards are not permitted.
- Controls use 12px corners, a minimum 36px desktop height, and a 44px touch
  target where the control is used primarily on mobile.
- Page and section headers are open horizontal structures separated by a
  border, not cards.
- Tables use a quiet secondary header, 44px rows, 1px dividers, stable numeric
  alignment, and a restrained hover surface.
- Empty and error states explain what happened and the recovery action. Icons
  support the message rather than replace it.
- Skeletons preserve the final layout. Loading must not cause the page chrome
  to jump.
- Dialogs are only for interruption or protected focus. Persistent editing
  belongs on a route or side panel.
- Focus uses a visible 2px Sync Cyan ring with offset. Disabled controls retain
  their label and footprint.
- Every generic hover, active, selected, focus, surface, input, sidebar, and
  shadow state comes from an explicit semantic theme token. Do not create
  chromatic states with opacity suffixes, `color-mix()`, raw Tailwind palette
  colors, or component-local color literals.
- Game rarity, product status illustrations, and registered special-theme
  packages are the only color exceptions. Keep them allowlisted and scoped so
  they cannot restyle generic component chrome.
- Theme-scoped previews provide a `PortalContainerProvider`; dialogs, selects,
  dropdowns, popovers, and tooltips must inherit that local scope.

## Theme Builder

- The builder is a full-width split workspace: a 380–420px settings rail and a
  canvas that consumes the remaining width and height. It must not inherit a
  page-level `max-width` or a fixed preview height.
- The builder shell is neutral and independent from both the saved theme and
  the draft. Only the canvas receives the draft theme.
- Desktop, tablet, and mobile canvas modes respond to their selected simulated
  viewport, not the browser window width. Draft changes update the canvas
  immediately and never mutate application or backend state before an explicit
  action.
- "Try in application" is an in-memory session. It does not write settings,
  snapshots, or browser storage and always exposes a persistent exit path.
- Theme previews reuse product shells and query-free presentation views from
  real workflows. Do not maintain a separate demo dashboard, invented
  navigation model, or generic component gallery when the product surface
  already owns the corresponding layout.

## Responsive and Accessibility

- Validate at 360px, 768px, and 1440px widths. Also validate catalogs, boards,
  and split workspaces at 2560px; added width must increase usable workspace or
  column count instead of becoming symmetric empty margins.
- Toolbars wrap actions below the title before truncating meaningful copy.
- Data tables may scroll horizontally; primary row identity remains visible.
- Filter sidebars become sheets below the desktop layout breakpoint.
- Do not use hover as the only way to reveal a required action.
- Maintain WCAG AA contrast, logical tab order, accessible names, reduced
  motion, and readable Polish localization expansion.
- Use `ScrollArea` for product scroll regions and pair every flex scroll child
  with `min-h-0` or `min-w-0` as appropriate.
