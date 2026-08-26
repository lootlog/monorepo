# @lootlog/web

## 1.4.3

### Patch Changes

- 008ef3f: Rebuild reservations around server-owned authorship, bounded calendar queries,
  personal reminders, pinned spots, direct Organization sharing, and responsive
  week/day scheduling. Split the user dashboard kill statistics into two compact
  cards with locally scoped shared filters and place reservations in a narrower
  responsive side column. Keep pinned reservation spots
  first while ordering the remaining catalog by level and name. Make the
  reservation catalog toolbar responsive and persist its selected filter between
  visits. Restore continuous rounded borders for compact toggle groups. Polish
  the reservation settings workflow and clear revoked one-time invitation links
  immediately. Present the complete personal reservation history without cursor
  pagination and let its page use the full available content width.
  Add compact management actions for personal reservations, including an
  icon-only cancellation control and an ownership-checked edit flow for dates,
  comments, and DM reminders. Format reservation reminder dates with Discord-native
  relative timestamps while preserving ISO dates in notification metadata. Add
  mouse range selection to the compact reservation schedule and a scroll-safe
  long-press range gesture for touch devices, with tighter compact date navigation
  and contextual details and cancellation actions restored on reservation blocks.
  Keep reservation detail overlays mounted between selections so mobile drawers
  animate consistently when opening from a calendar tile and when closing.
  Consume context-menu dismissal presses inside the calendar so they cannot click
  through into the new-reservation flow on pointer or touch devices.
  Separate reservation details from a bordered action footer and keep an explicit
  dismiss action available regardless of cancellation permissions. Keep dialog
  backdrops transparent through the full Base UI exit lifecycle so closing a
  dialog cannot flash a full-screen dark frame. Move compact calendar actions
  into a safe-area-aware floating dock while preserving the desktop header and
  leaving enough scroll space below the final hour. Add a quick action that finds
  the nearest partner-safe free slot and opens a prefilled reservation form.
  Add touch-only horizontal day swiping to the compact calendar with direct
  finger tracking, reduced-motion support, conflict-safe long-press handling, and
  a native touch-event fallback for mobile webviews without pointer-based drag.
  Keep the adjacent day grids and reservations visible beside the active day
  during the gesture, including swipes that cross a week boundary. Snap deliberate
  partial swipes to the adjacent day with a short deterministic ease-out while
  returning small accidental movements with a shorter deterministic transition.
  Keep native touch events as the single swipe input pipeline so duplicate
  pointer endings, late touch cancellation, or a second gesture cannot interrupt
  an active day transition. Center the current-time marker vertically without
  letting it horizontally scroll the three-day track away from the active pane.
  Mirror unavailable-hour backgrounds in adjacent day previews so their surface
  does not change tone after a swipe settles.
  Center compact day navigation across the full calendar header while preserving
  equal touch targets on both sides of the date.
  Commit the swiped date and reset its track before the next paint so reservation
  tiles cannot flash out between adjacent day panels.
  Limit day swiping to coarse, non-hover mobile input and contain the three-day
  track so compact calendars cannot drift into native horizontal scrolling.
  Render the compact calendar with a vertical-only scroll area so its swipe
  previews never expose a horizontal scrollbar on mobile devices.
  Keep the reservation V2 rollout compatible with both deployed API versions,
  claim sharing invitations atomically, tolerate post-commit invalidation publish
  failures with bounded retry and dead-letter routing, scope invalidations to the
  reservation's source sharing graph, and redact source Organization editing
  policy from partner calendar responses.
- Updated dependencies [008ef3f]
  - @lootlog/types@3.0.1
  - @lootlog/api-client@5.0.2
  - @lootlog/ui@3.0.1

## 1.4.2

### Patch Changes

- 0dcba2c: Hide native scrollbars behind the custom Base UI scrollbars on Windows.

## 1.4.1

### Patch Changes

- Updated dependencies [3a87411]
  - @lootlog/api-client@5.0.1

## 1.4.0

### Minor Changes

- 321b96a: Replace event pin settings with dedicated, permission-aware event pin resources that support vanity guild URLs and concurrent updates safely.

### Patch Changes

- da456cf: Migrate the shared UI primitives and their consumers from Radix UI and Vaul to Base UI while preserving the existing visual design.
- ca77e38: Fix MultiSelect popover triggers that render as non-button elements.
- 4ae5fe2: Remove the development permission override UI, transport contract, and server-side permission substitution so all clients use the standard guild permission model.
- Updated dependencies [321b96a]
- Updated dependencies [da456cf]
- Updated dependencies [eaecbd3]
- Updated dependencies [4ae5fe2]
  - @lootlog/api-client@5.0.0
  - @lootlog/types@3.0.0
  - @lootlog/ui@3.0.0

## 1.3.1

### Patch Changes

- d782374: Keep sidebar navigation icons legible when their item is active by applying the active foreground color.
- 5b97659: Present event kill history, recent kills, and event heroes in responsive data tables with compact overview headers, exact context-aware kill counts, and automatic infinite scrolling where appropriate.
- d782374: Standardize expanded table detail rows on a shared, brighter muted surface across Lootlog tables.
- 846a786: Align the event overview loot and ranking widgets with their full-detail list and table presentations.
- 88fb9ae: Hide event hero status badges on small screens to keep hero rows compact.
- d782374: Improve guild breadcrumbs by collapsing long ancestor paths responsively, preserving the current page context on narrow screens, and replacing raw kill identifiers with a meaningful detail label.
- d782374: Display event ranking member names using their highest role color.
- 2fea6f3: Improve responsive event hero layouts, map assignment stability, and compact ranking readability.
- 88fb9ae: Improve the recent event kills preview by placing the kill date below the monster name and hiding the participants column.
- d782374: Polish event kill details into a compact analytical view, present normalized map coverage in a responsive analytical table, show scoring rules in an always-visible compact list, add direct hero-loot navigation, and fix duplicate timeline assignment keys.
- 2fea6f3: Shorten scoring action labels in kill details to bracketed point values.
- 88fb9ae: Redesign the event hero detail view with compact headers, a responsive participant roster, flat map assignment rows, double-click assignment controls, isolated coverage timers, and collapsible map groups. Prevent the ranking preview from entering an update loop when sibling content changes.
- da827a6: Improve event member statistics, event rankings, and event kill history with denser full-width summaries, filter-driven context, responsive operational rows, clearer history layouts, and stable list initialization after client-side navigation.
- 7172750: Align the loot list toolbar divider with the gap between the loot results and desktop filters, and refine event participant link hover styling.
- Updated dependencies [d782374]
- Updated dependencies [d782374]
  - @lootlog/ui@2.0.2
  - @lootlog/api-client@4.0.1

## 1.3.0

### Minor Changes

- ed13484: Rebuild event wrapped as a verified, story-style presentation and expose leader evidence so ambiguous or inconsistent superlatives can be omitted.

### Patch Changes

- ed13484: Keep reservation, event, and document controls visible while browsing, and align their empty states with the shared list pattern.
- Updated dependencies [ed13484]
  - @lootlog/api-client@4.0.0

## 1.2.5

### Patch Changes

- c9e3ca1: Improve responsive dashboard, kill statistics, and event list/detail cards including event hero navigation, management actions, and level-profession labels, align dashboard navigation, loot filters and empty states, timer controls, metadata, and empty/world-selection states, polish reservation search, list and grid cards with shared interface patterns, and refine platform-aware shortcuts, sidebar density, and pointer focus behavior.
- Updated dependencies [c9e3ca1]
  - @lootlog/api-client@3.0.1

## 1.2.4

### Patch Changes

- 0a285b3: Rebuild immutable frontend artifacts with reliable Cloudflare promotion handling.

## 1.2.3

### Patch Changes

- feb696f: Correct event hero timer and map status colors, preserve presence during room
  rebalancing, wait for gateway room changes, and resynchronize realtime map
  assignments afterward.

## 1.2.2

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/datetime@1.0.1
  - @lootlog/scoring@1.0.1
  - @lootlog/types@2.0.2
  - @lootlog/api-client@3.0.0

## 1.2.1

### Patch Changes

- 5af6865: Show expired participation confirmations once and persist their acknowledgement so they do not repeatedly interrupt event views.
- 5af6865: Enforce event map assignment windows in the API and coordinator UI.
- 5af6865: Unify player tiles across events and loot views and restore player hover tooltips.
- 5af6865: Embed permission-scoped edit history in the event ranking response and remove the per-ranking history endpoint so the ranking and its histories load in one request.
- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [5af6865]
- Updated dependencies [25406a5]
  - @lootlog/api-client@3.0.0
  - @lootlog/socket-parser@1.0.2
  - @lootlog/types@2.0.1
  - @lootlog/ui@2.0.1

## 1.2.0

### Minor Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

### Patch Changes

- e1e6c48: Refine the loot filters layout and search density, stabilize the search dialog height, center its feedback states, improve loot header and footer alignment, truncate long locations, prevent quick-filter layout shifts, keep the search divider visible, expand the world selector, and redesign the sidebar account control with a full-width menu and shared logout action.
- Updated dependencies [9096829]
  - @lootlog/api-client@2.0.0
  - @lootlog/types@2.0.0
  - @lootlog/ui@2.0.0

## 1.1.1

### Patch Changes

- Updated dependencies [4b501b7]
  - @lootlog/api-client@1.1.1

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/api-client@1.1.0

## 1.0.2

### Patch Changes

- c1ee3a0: Introduce the Resp Orbit brand mark across browser icons, landing metadata, the web app shell, and userscript metadata.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/api-client@1.0.1
  - @lootlog/socket-parser@1.0.1
  - @lootlog/types@1.0.1
  - @lootlog/ui@1.0.1
