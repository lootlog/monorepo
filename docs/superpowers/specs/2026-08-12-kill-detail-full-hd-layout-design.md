# Kill Detail Full HD Layout

## Context

The compact kill-detail redesign improved the summary, participant rows, and map coverage presentation. On large screens, however, map coverage still occupies the full content width and pushes matching loots below a long list of maps. Users need to reach matched loot immediately without losing the new summary header.

## Decision

Keep the current full-width summary strip. Below it, restore the earlier analytical two-column composition on large screens:

- Left column, approximately two thirds of the available width:
  1. Participants
  2. Map coverage
- Right column, approximately one third of the available width:
  1. Matching loots
  2. Scoring rules, collapsed by default

The matching-loot section is intentionally first in the right column. Its heading and the beginning of its content must be visible near the top of the page without scrolling through map coverage. The loot list is not capped or internally scrolled. With multiple tall loot cards, the collapsed scoring summary may naturally continue below the initial viewport.

## Responsive behavior

- Activate the two-column layout at the `2xl` breakpoint, where the application shell leaves enough content width for a useful right rail. Widths below 1536 px retain the compact single-column layout.
- Use a resilient grid such as `minmax(0, 2fr) minmax(20rem, 1fr)` so long participant and map names truncate instead of forcing horizontal overflow.
- Below `2xl`, use this explicit single-column order: summary, participants, map coverage, matching loots, scoring rules. Preserve the existing mobile participant treatment.
- Do not introduce a sticky right rail. Matching loot is available immediately at the top of the rail, while normal document scrolling remains predictable for tall loot cards and expanded scoring rules.

## Component composition

- `KillDetailSummary` remains full width and unchanged.
- A new responsive content grid contains two vertical stacks.
- `KillParticipantsCard` and `KillMapsTimelineSection` form the primary analysis stack.
- The existing matching-loot section moves above `MultipliersCard` in the secondary stack.
- Existing queries, mutations, accordion state, permissions, routing, and data contracts remain unchanged.

## States and accessibility

- Loading, error, empty participant, empty loot, and manual-close states keep their current behavior.
- Expanded participant and map content remains inside its owning column.
- Keyboard controls and 44 px mobile actions remain unchanged.
- The right column must remain readable with long loot content and long translated labels.

## Verification

- Confirm the single-column layout at 360, 768, and 1440 px.
- Confirm the two-column layout at 1536 and 1920 px.
- At Full HD, the matching-loot heading and the beginning of its content must be visible alongside participants without scrolling through map coverage. The scoring summary may follow a tall loot list below the initial viewport.
- Expand a participant, a map, and scoring rules to check that neither column causes horizontal overflow.
- Run targeted Vitest tests, lint, build, and format checks for `@lootlog/web`.
