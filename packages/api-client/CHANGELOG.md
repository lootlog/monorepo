# @lootlog/api-client

## 5.0.6

### Patch Changes

- 0c6ae17: Correct workspace dependency ownership, standardize quality and database command interfaces, and align package build metadata with production artifacts.

## 5.0.5

### Patch Changes

- 1f174e8: Return Reservation sharing invitation paths from the API and build complete
  links from the active Web origin so production invitations cannot inherit a
  local development hostname. Accept the previous absolute-URL response during
  the Web-first rollout. Keep partner reservations visible without letting them
  affect local availability, nearest-free suggestions, or collision checks.

## 5.0.4

### Patch Changes

- 87c9155: Prevent duplicate manual notification submissions in the Game client and rate
  limit notification creation to five attempts per five seconds per authenticated
  user with an atomic Redis limiter and a typed HTTP 429 response.

## 5.0.3

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- af13bc9: Refactor complex control flow into smaller internal helpers while preserving existing behavior and contracts.

## 5.0.2

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

## 5.0.1

### Patch Changes

- 3a87411: Remove the in-game Event Mode widget, its persisted client state, and its
  dedicated backend API.

## 5.0.0

### Major Changes

- 321b96a: Replace event pin settings with dedicated, permission-aware event pin resources that support vanity guild URLs and concurrent updates safely.

## 4.0.1

### Patch Changes

- d782374: Display event ranking member names using their highest role color.

## 4.0.0

### Major Changes

- ed13484: Rebuild event wrapped as a verified, story-style presentation and expose leader evidence so ambiguous or inconsistent superlatives can be omitted.

## 3.0.1

### Patch Changes

- c9e3ca1: Improve responsive dashboard, kill statistics, and event list/detail cards including event hero navigation, management actions, and level-profession labels, align dashboard navigation, loot filters and empty states, timer controls, metadata, and empty/world-selection states, polish reservation search, list and grid cards with shared interface patterns, and refine platform-aware shortcuts, sidebar density, and pointer focus behavior.

## 3.0.0

### Major Changes

- 5af6865: Embed permission-scoped edit history in the event ranking response and remove the per-ranking history endpoint so the ranking and its histories load in one request.

### Patch Changes

- 5af6865: Show expired participation confirmations once and persist their acknowledgement so they do not repeatedly interrupt event views.
- 5af6865: Enforce event map assignment windows in the API and coordinator UI.
- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.

## 2.0.0

### Major Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

## 1.1.1

### Patch Changes

- 4b501b7: Prevent repeated Margonem events and equivalent battle submissions from creating duplicated battles or doubled combat statistics.

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
