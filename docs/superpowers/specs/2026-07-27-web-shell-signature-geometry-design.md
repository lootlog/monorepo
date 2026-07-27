# Lootlog Web Shell — Signature Geometry Follow-up

## Status

Approved through visual exploration on 2026-07-27.

This specification refines the shell polish already implemented in `apps/web`.
It covers three user-approved changes:

1. a signature rounded junction between the guild rail and contextual
   navigation;
2. a raised command dock for the user menu;
3. an asymmetric command header with stacked context and route-aware actions.

Routing, permissions, navigation order, guild ordering, theme behavior and
mobile drawer behavior remain unchanged.

## Design intent

The shell should feel constructed rather than decorated. A small number of
structural gestures should make it recognizable:

- one deliberate curve at the rail/navigation junction;
- one compact, clearly bounded identity surface at the bottom of the sidebar;
- one asymmetric title plate that makes wide headers feel intentional.

The Default v2 theme continues to use the Signal System vocabulary: Night Ink,
Raised Ink, Rule Blue, cobalt active fields and cyan interaction signals.
Decorative themes inherit the same geometry and behavior while mapping colors
through their existing theme tokens.

## 1. Rail and navigation junction

### Location

The curve belongs to the contextual navigation panel, not the guild rail and
not either header.

On the expanded desktop shell:

- the guild rail occupies `x = 0–64`;
- the contextual navigation occupies `x = 64–288`;
- both headers occupy `y = 0–56`;
- the approved curve begins at `x = 64, y = 56`.

The contextual navigation receives a `top-left` radius of approximately 20–22
px. Its top border turns into its left border through this radius, so the curve
travels downward beside the rail. The guild/sidebar header above it remains
rectangular.

### Border treatment

- The resting border follows the curve using the existing Rule Blue/sidebar
  border token.
- The curve must not create a permanent neon outline.
- Cyan is reserved for focus and other existing interactive signal states.
- No second curve is added to the page header, content canvas, footer or lower
  rail.

### Responsive behavior

- Expanded desktop and tablet drawer layouts use the same junction geometry
  when both the guild rail and contextual navigation are visible.
- The fully collapsed desktop sidebar remains hidden; no icon-only mode is
  introduced.
- The radius must not change the 64 + 224 px shell widths or the 320 px maximum
  mobile drawer width.

## 2. Raised command dock

The user menu becomes an inset command dock at the bottom of the contextual
navigation.

### Geometry

- The dock is inset 12 px from the navigation edges and bottom.
- It is exactly 60 px high, has an 11 px radius and a single Rule Blue border.
- There is no additional horizontal divider above the dock.
- The avatar is centered vertically with no upward translation, overlap,
  hover-scale or glow.
- The avatar is exactly 40 px.
- The chevron sits in a quiet, bounded action area but the full dock remains the
  menu trigger.

The dock lives in `SidebarFooter`, outside the scrolling `SidebarContent`.
`SidebarFooter` is 72 px high: the 60 px dock plus its 12 px bottom inset. Long
navigation, pinned events and permission-gated items scroll independently and
must never overlap, displace or scroll the dock.

### Content hierarchy

- Primary line: localized user display name with truncation.
- Secondary line: localized connection/account status only when that state
  already exists in the application; do not invent presence data.
- If no meaningful secondary state is available, retain a single vertically
  centered name rather than adding decorative copy.

### States

- Hover raises contrast through Raised Ink only.
- Keyboard focus uses the shared 2 px Sync Cyan ring.
- Open state may strengthen the border and rotate the existing chevron.
- Mobile interaction still closes the drawer before navigating to settings.

## 3. Asymmetric command header

The shared 56 px page header is divided into three conceptual zones:

1. a leading title plate;
2. intentional flexible space;
3. route-aware actions.

### Title plate

- The plate begins at the content edge and uses Raised Ink against the Night Ink
  header background.
- It contains the sidebar trigger/back action and stacked route context.
- At `md` and above it is exactly
  `width: clamp(20rem, 36vw, 25rem)` (320–400 px).
- Its bottom-right corner has a 20 px radius.
- A 72 px accent segment terminates the lower border 20 px before the curve. It
  uses the existing signal/accent token at subdued opacity and never becomes a
  glow or full-width cyan rule.
- Below `md` the title plate shape is removed and the mobile header treatment
  applies.

### Stacked route context

Desktop hierarchy:

- first line: compact localized parent context, such as
  `Zgarbieni · Lootlog`;
- second line: the current route title, such as `Lista łupów`.

Both lines truncate independently. Breadcrumbs are static; no animated
repositioning returns.

For root routes, use the available account, guild or module context rather than
rendering an empty placeholder. Do not duplicate a label when parent and current
title are identical.

Context is resolved deterministically:

| Route shape               | Parent context                                                                         | Current title                | Missing-data fallback                                            |
| ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `/@me`                    | localized `Konto`                                                                      | localized `Dashboard`        | parent remains `Konto`                                           |
| `/@me/<feature>`          | localized `Konto`, followed by existing intermediate breadcrumb labels joined with `·` | existing current route label | omit unavailable intermediate labels                             |
| `/<guild-slug>`           | guild display name followed by the localized root navigation label, joined with `·`    | existing current route label | use the root navigation label when the guild name is unavailable |
| `/<guild-slug>/<feature>` | guild display name followed by existing parent breadcrumb labels joined with `·`       | existing current route label | omit the unavailable guild name and retain parent labels         |

All fixed labels in this mapping must come from i18n. Existing route and
breadcrumb labels remain the source of truth; adapters do not create parallel
route-name maps.

Mobile hierarchy:

- retain the existing 56 px header;
- show only the current title;
- center it between the leading action and route-action reservation;
- omit the title-plate shape when it would reduce usable title width.

### Route-aware actions

At `lg` and above, the right side contains controls or actions that already
belong to the current route:

| Route                        | Header actions at `lg+`                                            | What remains below the header                            |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `/@me`                       | existing dashboard scope and world selectors                       | dashboard content                                        |
| `/@me/battle-panel`          | no new actions                                                     | existing Walki/Analityka/Otchłań tabs and battle filters |
| `/<guild-slug>` Lootlog root | existing world selector, list/grid selector and filter trigger     | search input and result content                          |
| Other user/guild routes      | only actions already supplied through the shared route-action slot | existing route-local toolbars                            |

Between `md` and `lg`, controls listed above remain in their existing route
toolbars to protect title width. Below `md`, existing mobile layouts remain the
source of truth.

Do not add fake metadata or ornamental badges to fill space. Routes without
actions leave this area empty. The negative space is intentional because the
title plate has a visible end rather than pretending to fill the full header.

Promoting an existing control into the header must reuse the same component
instance or state owner; it must not duplicate state, permissions, keyboard
behavior or mobile availability. Responsive placement must render a control in
exactly one location at a time.

## Component boundaries

Implementation should preserve focused components:

- `ShellPageHeader` owns the shared three-zone header layout and responsive title
  hierarchy.
- Guild/user shell adapters provide localized parent context, current title and
  existing route actions.
- `SidebarNav` owns the approved navigation-panel radius.
- `UserMenu` owns command-dock presentation and menu interaction.
- The guild rail remains responsible only for guild selection and guild actions.

No public API, route, model or permission contract changes are required.

## Accessibility and interaction

- The curve and title plate are decorative structure and must not alter DOM
  reading order.
- Existing sidebar trigger labeling, `Ctrl/Cmd+B`, drawer `Escape` handling and
  route focus order remain intact.
- The title plate must not clip focus rings.
- User-menu and route-action targets remain at least 44 px on touch layouts.
- Truncated context and titles retain accessible full labels through existing
  semantic text or an accessible name; do not rely on hover-only tooltips.
- `prefers-reduced-motion` requires no special branch because the approved
  geometry is static.

## Theme behavior

Shared across all themes:

- dimensions;
- radii;
- borders;
- hit areas;
- focus geometry;
- responsive behavior.

Theme-specific:

- surface and border token values;
- existing thin Rukia/Rias/Cat decorative layers;
- accent color mapping where already supported.

Decorative themes must not add shadows or glows that obscure the approved
curve, command dock border or focus ring.

## Verification

Component coverage should include:

- rail/navigation curve rendered in expanded shell and mobile drawer;
- header root route and nested route context;
- independent truncation of long parent and current Polish labels;
- route actions present and absent;
- mobile current-title-only layout;
- command dock name truncation and optional secondary status;
- command dock keyboard/open states.

Visual verification should cover `/@me`, `/@me/battle-panel` and `/zgarbieni`
at 360, 768 and 1440 px in Default v2 and one representative decorative theme.
Check expanded/collapsed sidebar, mobile drawer and routes with and without
header actions.

The existing patch changeset for `@lootlog/web` should be updated rather than
adding a second changeset for this follow-up.
