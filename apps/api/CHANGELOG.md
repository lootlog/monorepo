# @lootlog/api

## 5.0.9

### Patch Changes

- d597da5: Centralize capability expansion and authorization decisions behind a shared Access policy while preserving deployed permission-array transport contracts. Refresh Docker runtime base layers during builds so deployed images receive current Alpine security packages.
- 894dca8: Round-trip the event read cache through superjson instead of a hand-maintained
  list of date field names. `RedisService.getOrSetJson`/`getOrSetJsonBestEffort`
  now accept an optional `codec` so callers can bring their own JSON serializer;
  the default stays `JSON`. The event read cache passes a superjson codec, so any
  `Date` in an event read model survives the cache without being registered
  anywhere. The internal cache key prefix is bumped so stale entries expire on
  their own. No HTTP contract change.
- 0c6ae17: Correct workspace dependency ownership, standardize quality and database command interfaces, and align package build metadata with production artifacts.
- Updated dependencies [d597da5]
- Updated dependencies [894dca8]
- Updated dependencies [0c6ae17]
  - @lootlog/access-policy@1.1.0
  - @lootlog/nest-shared@1.1.0
  - @lootlog/types@3.0.3
  - @lootlog/api-helpers@1.0.4
  - @lootlog/datetime@1.0.2
  - @lootlog/instrumentation@0.0.5
  - @lootlog/loot-visibility@1.0.2
  - @lootlog/reservations@1.0.2
  - @lootlog/scoring@1.0.2

## 5.0.8

### Patch Changes

- 2b571ba: Use unit-aware HTTP latency histogram buckets for accurate duration percentiles.
- 2b571ba: Exclude health probes from HTTP telemetry and identify each service replica in
  exported OpenTelemetry resources.
- 2b571ba: Send application telemetry to the self-hosted observability stack, emit
  structured JSON logs with active trace context, and remove the Axiom transport.
- Updated dependencies [2b571ba]
- Updated dependencies [2b571ba]
- Updated dependencies [2b571ba]
  - @lootlog/instrumentation@0.0.4
  - @lootlog/nest-shared@1.0.10

## 5.0.7

### Patch Changes

- 1f174e8: Return Reservation sharing invitation paths from the API and build complete
  links from the active Web origin so production invitations cannot inherit a
  local development hostname. Accept the previous absolute-URL response during
  the Web-first rollout. Keep partner reservations visible without letting them
  affect local availability, nearest-free suggestions, or collision checks.
- 4d04efa: Query Organization Loot records directly when paginating loot lists so PostgreSQL can use the tenant-scoped ordering index before loading global loot facts.

## 5.0.6

### Patch Changes

- fc87eab: Centralize Reservation settings defaults and time validation in a shared domain
  module. Keep Organization settings in the API database while making the Web
  form match the authoritative 60-second past-start grace and preserving existing
  Reservation mutation error contracts. Replace localized Reservation settings
  errors in the API with stable translation keys.
- bf625a4: Introduce Organization-owned Loot records while retaining one global Loot and
  allocation. Apply one all-NPC visibility policy to API reads, statistics,
  comments, archives, real-time events, and watched-item notifications, and add
  an action-specific loot archive permission. Require version 2 loot events with
  the complete NPC list across API, gateway, and web consumers.
- 42a49c1: Upgrade backend services to NestJS 12 and native ESM builds and tests without SWC.
- 87c9155: Prevent duplicate manual notification submissions in the Game client and rate
  limit notification creation to five attempts per five seconds per authenticated
  user with an atomic Redis limiter and a typed HTTP 429 response.
- Updated dependencies [fc87eab]
- Updated dependencies [bf625a4]
- Updated dependencies [42a49c1]
  - @lootlog/reservations@1.0.1
  - @lootlog/loot-visibility@1.0.1
  - @lootlog/types@3.0.2
  - @lootlog/nest-shared@1.0.9
  - @lootlog/api-helpers@1.0.3
  - @lootlog/datetime@1.0.1
  - @lootlog/instrumentation@0.0.3
  - @lootlog/scoring@1.0.1

## 5.0.5

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- af13bc9: Refactor complex control flow into smaller internal helpers while preserving existing behavior and contracts.
- 02813db: Remove vulnerable build tooling from production images and update transitive runtime dependencies to patched releases.
- Updated dependencies [7742f4f]
- Updated dependencies [f0a1338]
  - @lootlog/api-helpers@1.0.3
  - @lootlog/instrumentation@0.0.3
  - @lootlog/nest-shared@1.0.8
  - @lootlog/datetime@1.0.1
  - @lootlog/scoring@1.0.1
  - @lootlog/types@3.0.1

## 5.0.4

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

## 5.0.3

### Patch Changes

- 5f8f6bf: Make loot-share updates idempotent, allow chat-confirmed allocations to replace inferred item ownership, and initialize validated standard-colossus shares during loot creation.

## 5.0.2

### Patch Changes

- 3a87411: Remove the in-game Event Mode widget, its persisted client state, and its
  dedicated backend API.
- 921b7fe: Run the Nest Swagger compiler plugin against the TypeScript 6 compatibility API so SWC metadata generation continues to work when the workspace uses TypeScript 7.

## 5.0.1

### Patch Changes

- 66edca7: Correct mine dialog NPC levels for loot visibility and backfill existing NPC snapshots.

## 5.0.0

### Major Changes

- 321b96a: Replace event pin settings with dedicated, permission-aware event pin resources that support vanity guild URLs and concurrent updates safely.
- 4ae5fe2: Remove the development permission override UI, transport contract, and server-side permission substitution so all clients use the standard guild permission model.

### Patch Changes

- Updated dependencies [321b96a]
- Updated dependencies [4ae5fe2]
  - @lootlog/types@3.0.0
  - @lootlog/nest-shared@1.0.6

## 4.0.1

### Patch Changes

- d782374: Display event ranking member names using their highest role color.

## 4.0.0

### Major Changes

- ed13484: Rebuild event wrapped as a verified, story-style presentation and expose leader evidence so ambiguous or inconsistent superlatives can be omitted.

## 3.0.3

### Patch Changes

- c9e3ca1: Improve responsive dashboard, kill statistics, and event list/detail cards including event hero navigation, management actions, and level-profession labels, align dashboard navigation, loot filters and empty states, timer controls, metadata, and empty/world-selection states, polish reservation search, list and grid cards with shared interface patterns, and refine platform-aware shortcuts, sidebar density, and pointer focus behavior.

## 3.0.2

### Patch Changes

- 3e25d98: Consolidate duplicated scoring, date and time handling, runtime types, Nest infrastructure, RabbitMQ retry behavior, canonical serialization, and reusable React UI primitives.
- Updated dependencies [3e25d98]
  - @lootlog/datetime@1.0.1
  - @lootlog/nest-shared@1.0.5
  - @lootlog/scoring@1.0.1
  - @lootlog/types@2.0.2

## 3.0.1

### Patch Changes

- 0036206: Prevent cached event kill history responses from failing date validation.

## 3.0.0

### Major Changes

- 5af6865: Embed permission-scoped edit history in the event ranking response and remove the per-ranking history endpoint so the ranking and its histories load in one request.

### Patch Changes

- 5af6865: Show expired participation confirmations once and persist their acknowledgement so they do not repeatedly interrupt event views.
- 5af6865: Enforce event map assignment windows in the API and coordinator UI.
- 5af6865: Fix guild-scoped user settings access for members linked through their global user ID.
- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/api-helpers@1.0.2
  - @lootlog/instrumentation@0.0.2
  - @lootlog/nest-shared@1.0.4
  - @lootlog/types@2.0.1

## 2.0.0

### Major Changes

- 9096829: Introduce the dark-only Lootlog Signal System across frontend surfaces, replace
  the default web theme with Default v2, and remove the obsolete color-mode
  preference from the database and public API contracts.

### Patch Changes

- Updated dependencies [9096829]
  - @lootlog/types@2.0.0
  - @lootlog/nest-shared@1.0.3

## 1.1.0

### Minor Changes

- fee6e4d: Add synchronized Discord server visibility preferences for the web and game clients.

### Patch Changes

- Updated dependencies [fee6e4d]
  - @lootlog/types@1.1.0
  - @lootlog/nest-shared@1.0.2

## 1.0.2

### Patch Changes

- 9406178: Prevent duplicate game-event side effects when multiple client consumers mount, omit undefined fields from exported diagnostic logs, and keep concurrent loot submissions retryable while their distributed lock is held.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/api-helpers@1.0.1
  - @lootlog/instrumentation@0.0.1
  - @lootlog/nest-shared@1.0.1
  - @lootlog/types@1.0.1
