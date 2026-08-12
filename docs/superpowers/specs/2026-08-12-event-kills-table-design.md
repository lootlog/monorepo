# Event Kill History Table Design

## Goal

Redesign the event kill history page to follow the compact visual and interaction pattern of the event member kill history page. The page must keep event-level kill data and navigation while replacing the current stack of kill cards with a responsive semantic table.

## Scope

The change is limited to the event kill history screen in `apps/web`.

- Preserve the existing event and kill-history queries.
- Preserve hero filtering and kill-detail navigation.
- Preserve event participation confirmation behavior.
- Replace the card list with a table built with `@tanstack/react-table` and the table primitives from `@lootlog/ui`.
- Match the spacing, borders, header density, row density, and responsive behavior of the member kill history screen.
- Keep all user-facing text in i18n resources.

The API contract, event member page, and kill detail page are outside the scope of this change.

## Page Composition

The page keeps its existing vertical composition inside one scroll area:

1. A compact summary strip showing the history label, event name, and either the selected hero or the all-heroes label.
2. The existing horizontally scrollable hero filter when the event has more than one hero.
3. An inline query error state when kill history loading fails.
4. A bordered, rounded table container containing the kill history and its infinite-loading row.

The summary strip remains event-oriented. It does not introduce aggregate statistics because the current event history response does not provide a reliable aggregate summary and adding a new query is not required for the requested redesign.

## Table Architecture

### `EventKillsTable`

`EventKillsTable` replaces the current list container. It owns table state and infinite-loading behavior.

Inputs:

- `kills`: flattened event kill history rows.
- `guildId` and `eventId`: route context for kill-detail links.
- `scrollElement`: the element used as the `IntersectionObserver` root.
- `resetKey`: the selected hero ID or the all-heroes key.
- Loading, error, next-page, and fetch-next-page state from the existing query.

Responsibilities:

- Create the TanStack table with `useReactTable` and `getCoreRowModel`.
- Render `Table` from `@lootlog/ui/components/table`.
- Render headers and rows through the existing `TanStackTableHeader` and `TanStackTableBody` helpers.
- Render a final semantic table row that reports the end of the list or acts as the infinite-loading sentinel.
- Reset the scroll container to the top when `resetKey` changes.
- Observe the sentinel with `IntersectionObserver`, using the page scroll element as its root, and request the next page before the user reaches the end.
- Disconnect the observer during cleanup and avoid observing while a request is already in progress.

### Column definitions

The table contains these columns:

1. **Monster**: NPC tile, hero name, and link to the existing kill-detail route.
2. **Date**: formatted kill timestamp.
3. **Respawn time**: elapsed time between `minSpawnTimeAtKill` and `killedAt`; manual closes display the translated manual-close label instead.
4. **Participants**: number of point entries associated with the kill.
5. **Actions**: an accessible detail link represented by the existing icon language.

Column definitions use TanStack accessors and cell renderers. They do not duplicate fetching, filtering, or derived server state.

### Component boundaries

- `EventKillsHistoryContent` continues to own queries, selected hero state, and flattened pages. It additionally captures the scroll element and passes it to the table.
- `EventKillsTable` owns table rendering, loading states, and infinite pagination.
- Column definitions live in a dedicated module so their formatting and routing behavior can be tested without growing the table component.
- Existing formatting utilities and `NpcTile` are reused.
- The current card-specific `EventKillRow` is removed after its tests and imports are migrated; no re-export wrapper is retained.

## Responsive Behavior

The desktop table follows the density of the member kill history table.

- Monster and action columns are always visible.
- Date remains visible on small screens when space permits.
- Respawn time and participant count hide at narrower breakpoints and become visible as horizontal space increases.
- Numeric values use tabular figures and right alignment.
- The table container clips overflow and does not create horizontal page scrolling.
- Row targets and detail links remain keyboard accessible.

The exact breakpoint classes follow the existing member table patterns rather than adding a new responsive system.

## Data Flow

1. `EventKillsHistoryContent` fetches event overview and paginated kill history with the current hooks.
2. Selecting a hero updates `selectedHeroId`, which changes the existing kill-history query key.
3. Query pages are flattened and passed to `EventKillsTable` together with the selected-hero reset key.
4. TanStack Table creates the row model from the flattened data.
5. When the sentinel enters the scroll viewport, the table calls the existing `fetchNextPage` function.
6. A monster or action link navigates to the existing hero kill-detail route.

No new API call, cache shape, or global state is introduced.

## Loading, Empty, Error, and End States

- Initial loading renders a table-shaped skeleton with a header and several row placeholders.
- An empty successful result renders the existing translated no-kills message and icon treatment.
- A query error renders the existing translated event error message in the page flow; the table does not render stale rows as a successful state.
- Pagination loading is shown inside the sentinel row.
- When no next page exists, the sentinel row displays the translated end-of-list message.
- Event overview loading and event-not-found behavior remain unchanged.

## Accessibility

- Use semantic `table`, header, body, row, header-cell, and data-cell elements supplied by Lootlog UI.
- The actions header retains a screen-reader-only label.
- Detail links have translated accessible names that identify the monster.
- Manual-close state is communicated with text, not color alone.
- Focus styles follow existing application link and table patterns.

## Testing

Component tests cover:

- Column headers and representative row values.
- Kill-detail links with the correct guild, event, hero, and kill parameters.
- Respawn duration formatting and manual-close rendering.
- Participant count derivation.
- Initial loading skeleton, empty result, error state, pagination loading, and end-of-list state.
- `IntersectionObserver` requesting the next page only when allowed and disconnecting during cleanup.
- Scroll reset after the hero filter key changes.
- Responsive visibility classes on optional columns.

Existing event kill history content and filter tests are updated only where the table integration changes observable behavior.

## Release Impact

This is a user-facing redesign of `apps/web`, so implementation must include a patch changeset for the web workspace with a concise English summary.
