# Event Management and Heroes Table Design

## Goal

Align the event overview's management and event-heroes cards with the compact header and table language already used by the event ranking and recent-kills widgets.

## Explicit Non-goal

Do not modify the main event header containing the event name, status, world, assignment timeout, date range, pin action, coordination action, wrapped action, and rules action. The “Wakacje 2026” header remains exactly as it is for this change.

## Scope

- Restyle the `EventActionsCard` header to match the compact headers used by event ranking and recent kills.
- Replace the nested event hero cards with one TanStack Table rendered through Lootlog UI table primitives.
- Keep the existing add button visual variant and size, while adding more right-side breathing room in the header.
- Preserve all existing hero data, routes, timers, status badges, permissions, dialogs, mutations, and empty behavior.
- Do not change event APIs, query keys, event layout columns, hero ordering, or hero-detail behavior.

## Management Card

The management card remains a single bordered, rounded, overflow-hidden card. Its header becomes a compact minimum-48-pixel row:

- the settings icon and translated management title sit on the left;
- the icon uses the same small, unboxed treatment as the ranking and recent-kills headers;
- the header uses horizontal padding and a bottom divider consistent with those widgets;
- the edit, end/resume, and delete actions remain in the existing lower action strip;
- permission gating, pending states, destructive colors, and responsive action columns remain unchanged.

Only header presentation changes. No management behavior changes.

## Event Heroes Card

The event heroes section becomes one bordered, rounded, overflow-hidden card with no nested cards.

### Header

The header matches the event ranking and recent-kills widget structure:

- minimum height of 48 pixels;
- swords icon and translated “Event Heroes” title on the left;
- the existing outline small “Add” button on the right when the member can manage the event;
- the add button keeps its current interaction and visual style, but the header gives it additional right padding;
- remove the uppercase “Event goals” eyebrow from the visible header.

### Table

Use TanStack Table with Lootlog UI `Table` primitives and the shared `TanStackTableHeader` and `TanStackTableBody` renderers. The columns are:

1. Hero
2. Maps
3. Kills
4. Timer
5. Actions

The hero cell contains the NPC tile, name, level/profession suffix, search/status badge, and hero-detail link. It remains the primary flexible column.

The maps and kills cells show the same values currently displayed in the hero card metadata. The timer cell reuses `HeroTimerDisplay`. The actions cell preserves the existing management dropdown for editing the hero, managing maps, and deleting the hero. The row itself should not make the action menu part of the hero-detail link.

### Responsive Behavior

- Desktop: show all five columns.
- Maps and Kills use `hidden lg:table-cell`, so they are dedicated columns from the Tailwind `lg` viewport breakpoint upward.
- The Hero cell always shows the NPC ID in a muted secondary line. Below `lg`, that same line additionally shows map count and kill count using `lg:hidden` spans, so hiding the dedicated columns never removes their values.
- Mobile keeps Hero, Timer, and Actions visible. The translated hero status badge must remain visibly rendered at every width; it may wrap or move to the secondary line below `sm`, but it must not be replaced only by screen-reader text.
- Keep rows dense and separated by table borders rather than nested card outlines.
- Avoid horizontal page overflow and preserve a usable action hit target.

## Module Design

Introduce focused table modules under the event heroes feature:

- a column-definition module owns hero cell content, responsive labels, timer rendering, and action rendering;
- a table module owns the TanStack instance, Lootlog UI table markup, responsive column classes, and empty state;
- the existing `HeroCard` is removed if it has no remaining callers. Do not keep a re-export or compatibility wrapper.

The table interface receives prepared hero rows with their matching timer and stats plus the existing callbacks. Matching API responses to heroes remains in `EventDetail`, where those datasets are already available:

- timer matching continues to call `findEventHeroTimer(heroTimers, { heroNpcId: hero.npcId, heroName: hero.npcName })` for every hero;
- stats matching continues to use the current NPC comparison: `hero.npcId !== null && statistic.npcId === hero.npcId`;
- the matched stats provide profession and kill count exactly as they do for `HeroCard` today;
- no matching switches to `heroId` and no new fallback key is introduced.

No new request or global state is introduced.

Each file contains at most one React component, in line with repository rules.

## Data and Interactions

- Hero ordering remains the order supplied by `event.heroNpcs`.
- Clicking hero identity navigates to the existing hero-detail route.
- Clicking the timer or action menu must not trigger hero navigation.
- Add, edit, map management, and delete flows call the same existing handlers.
- Members without management permission do not see the Add button. The entire Actions column, including its header and cells, is omitted from the TanStack column definitions for those members; the table does not retain empty action cells.
- Missing stats continue to resolve map and kill values to their current safe fallbacks.

## States and Error Handling

- Empty heroes: render the existing translated empty state inside the single card beneath the table-style header.
- Missing timer: preserve the existing `HeroTimerDisplay` fallback.
- Missing stats: show zero kills and the derived map count already available from hero data.
- Existing upstream query errors remain handled by `EventDetail`; this table does not introduce a new request-level error state.

## Accessibility

- Management and heroes titles remain semantic headings.
- The heroes table uses real table semantics and translated column labels.
- Hero names remain accessible links with visible focus treatment.
- The actions trigger retains its translated accessible label and title.
- Decorative header and chevron icons remain hidden from the accessibility tree through their existing icon behavior.

## Testing

Add or update focused tests that verify:

- the management header uses the compact header structure while preserving all available actions and permission gating;
- the heroes table renders all column headers and each current data value;
- responsive class rules hide Maps and Kills while preserving their values in the Hero secondary line;
- hero-detail links, timers, and management actions retain their existing destinations and callbacks;
- the Actions controls and Add button follow management permissions;
- the empty state remains inside the heroes card;
- `EventDetail` continues to pass matched timer and stats data without changing the main event header.

Run focused event overview tests, the event kills regression tests already changed in this branch, TypeScript build, web lint, changeset validation, and responsive browser checks on the event overview at desktop and mobile widths.

## Release

Extend the existing `@lootlog/web` patch changeset for the event overview visual alignment. Do not add a second changeset for the same workspace change.
