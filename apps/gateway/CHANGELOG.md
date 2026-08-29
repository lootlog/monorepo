# @lootlog/gateway

## 1.0.10

### Patch Changes

- 6568b3a: Authenticate Socket.IO connections before exposing websocket message handlers and reject incomplete socket identities.
- bf625a4: Introduce Organization-owned Loot records while retaining one global Loot and
  allocation. Apply one all-NPC visibility policy to API reads, statistics,
  comments, archives, real-time events, and watched-item notifications, and add
  an action-specific loot archive permission. Require version 2 loot events with
  the complete NPC list across API, gateway, and web consumers.
- 42a49c1: Upgrade backend services to NestJS 12 and native ESM builds and tests without SWC.
- Updated dependencies [bf625a4]
- Updated dependencies [42a49c1]
  - @lootlog/loot-visibility@1.0.1
  - @lootlog/types@3.0.2
  - @lootlog/nest-shared@1.0.9
  - @lootlog/instrumentation@0.0.3
  - @lootlog/socket-parser@1.0.2

## 1.0.9

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- 02813db: Remove vulnerable build tooling from production images and update transitive runtime dependencies to patched releases.
- Updated dependencies [7742f4f]
- Updated dependencies [f0a1338]
  - @lootlog/instrumentation@0.0.3
  - @lootlog/nest-shared@1.0.8
  - @lootlog/socket-parser@1.0.2
  - @lootlog/types@3.0.1

## 1.0.8

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
  - @lootlog/nest-shared@1.0.7

## 1.0.7

### Patch Changes

- 4ae5fe2: Remove the development permission override UI, transport contract, and server-side permission substitution so all clients use the standard guild permission model.
- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/types@3.0.0
  - @lootlog/nest-shared@1.0.6

## 1.0.6

### Patch Changes

- feb696f: Correct event hero timer and map status colors, preserve presence during room
  rebalancing, wait for gateway room changes, and resynchronize realtime map
  assignments afterward.

## 1.0.5

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/nest-shared@1.0.5
  - @lootlog/types@2.0.2

## 1.0.4

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/instrumentation@0.0.2
  - @lootlog/nest-shared@1.0.4
  - @lootlog/socket-parser@1.0.2
  - @lootlog/types@2.0.1

## 1.0.3

### Patch Changes

- Updated dependencies [9096829]
  - @lootlog/types@2.0.0
  - @lootlog/nest-shared@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/nest-shared@1.0.2

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/instrumentation@0.0.1
  - @lootlog/nest-shared@1.0.1
  - @lootlog/socket-parser@1.0.1
  - @lootlog/types@1.0.1
