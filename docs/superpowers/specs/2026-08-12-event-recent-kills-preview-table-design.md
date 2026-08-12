# Event Recent Kills Preview Table Design

## Goal

Align the event overview's “Recent kills” widget with the redesigned event kill history and with the existing event ranking preview. The widget should reuse the production kill-history table instead of maintaining a separate card-list presentation.

## Scope

- Redesign `RecentKillsPreview` on the event overview and hero detail screens.
- Reuse the same TanStack Table columns, Lootlog UI table primitives, row links, responsive visibility rules, and row density as the full event kill history.
- Move the “View all” action from the bottom full-width button into the top-right corner of the widget header.
- Preserve the current hero tabs, active-hero selection, query limit, route destinations, loading behavior, and empty behavior.
- Do not change API endpoints, query keys, pagination contracts, event layout columns, ranking behavior, or kill-detail routing.

## Visual Design

The widget becomes one bordered, rounded, overflow-hidden card with zero internal card gap and padding. Its header follows the event ranking preview structure:

- a minimum 48 px high header row;
- a skull icon and the translated “Recent kills” title on the left;
- a small ghost “View all” link with a chevron on the right when at least one kill exists;
- a bottom border separating the header from optional tabs and table content.

When more than one hero can be selected, the existing scrollable hero tabs remain directly below the header in their own bordered strip. The table follows immediately below. The old eyebrow label, stacked card rows, and bottom full-width button are removed.

The table matches the full history table's responsive behavior:

- monster and action remain visible at every width;
- date is a dedicated column from the small breakpoint and becomes the monster's secondary line on smaller screens;
- participants are visible on larger screens;
- respawn time follows the full history's largest-breakpoint rule;
- rows keep the same direct kill-detail links and accessible action labels.

## Component Design

`EventKillsTable` gains an explicit preview presentation mode. The default mode remains the infinite history table and keeps its current behavior. Preview mode:

- renders the same TanStack column definitions and Lootlog UI table primitives;
- accepts the already limited `kills` returned by `useRecentHeroKills`;
- does not create an `IntersectionObserver`;
- does not reset or require a scroll container;
- does not render the loading/end/error pagination sentinel row;
- can render without its own rounded outer border so `RecentKillsPreview` owns the single widget frame;
- uses the same initial loading, initial error, and empty-state language as the history table, scaled to the preview card.

The interface should model preview and infinite-history behavior explicitly rather than supplying inert placeholder pagination callbacks. A discriminated prop shape or a small presentation wrapper is acceptable as long as invalid combinations are prevented and the shared table markup remains single-sourced.

`RecentKillsPreview` continues to own:

- selected hero state and tab rendering;
- `useRecentHeroKills` with the existing default limit of five;
- active-hero route selection for the “View all” link;
- the ranking-style card header and widget frame.

## Data and Navigation

No new data request is introduced. The widget continues to fetch at most five recent kills for the active context.

- Event overview: the active hero tab determines the query and links to that hero's history. When no hero-specific context exists, it links to the event-wide history.
- Hero detail: the fixed `heroId` determines the query and link.
- Changing tabs updates the query through the existing query key and replaces the table rows.

The “View all” action is only shown when the current query returns at least one kill, matching the existing behavior.

## States and Error Handling

- Loading: render table-shaped skeleton rows inside the widget frame; the header remains visible.
- Empty: render the translated no-kills state below the header and optional tabs; omit “View all.”
- Query error: render the shared translated event error state inside the widget; omit “View all.”
- Success: render the compact shared table and the top-right “View all” action.

Changing hero tabs must not retain a stale destination in the header. The destination is derived from the same active hero identifier used for the query.

## Accessibility

- The widget title remains a semantic heading.
- The top-right action remains a real link with visible translated text and a decorative chevron.
- Table semantics and accessible kill-detail labels come from the shared table implementation.
- Hidden responsive columns must not leave duplicated accessible content.

## Testing

Add or update focused tests that verify:

- preview mode uses the same table columns and rows but omits infinite-scroll behavior and the terminal sentinel;
- the ranking-style header renders the “View all” link in the header for successful non-empty data;
- the link targets the active hero history after a tab change and the event-wide history when no hero context is selected;
- loading, empty, and error states remain inside the widget frame and do not show the action;
- existing infinite history behavior remains covered, including automatic pagination.

Run the focused event kills tests, TypeScript build, web lint, changeset validation, and responsive browser checks on the event overview at desktop and mobile widths.

## Release

Extend the existing `@lootlog/web` patch changeset for the kill-history redesign to include the event overview preview alignment.
