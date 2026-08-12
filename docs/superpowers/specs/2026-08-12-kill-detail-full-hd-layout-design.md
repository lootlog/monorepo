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

- `KillDetailSummary` remains full width.
- A new responsive content grid contains two vertical stacks.
- `KillParticipantsCard` and `KillMapsTimelineSection` form the primary analysis stack.
- The existing matching-loot section moves above `MultipliersCard` in the secondary stack.
- Existing queries, mutations, accordion state, permissions, routing, and data contracts remain unchanged.

## Summary strip alignment

The kill summary strip must use the same visual language as the member statistics summary strip:

- the identity row uses the same spacing, typography hierarchy, and 40×40 px NPC/avatar footprint;
- the metric strip uses the same muted background, label typography, value sizing, and responsive separators;
- the metric strip uses three columns by default and six columns from the `md` breakpoint, matching the member strip;
- kill-specific metric labels remain sentence case and do not display decorative icons;
- existing time tooltips and kill-specific values remain available through focusable triggers with accessible labels, not hover alone;
- the manual-close badge remains on the right side of the identity row, is shown only for manually closed kills, and retains its accessible name and tooltip when its visible text is hidden on mobile.

The two strips should stay separate components because their data and behavior differ. This is visual consistency, not a shared abstraction.

The secondary maximum-respawn-window value uses the concise Polish copy “{{duration}} przed max” when the kill was resolved before the maximum window. Overdue copy remains unchanged.

## Scoring rules ledger

The scoring-rules card is always expanded and cannot be collapsed. Its header contains only the calculator icon and the “Scoring rules” title; the mode, rule count, point cap, and disclosure chevron are removed because the same information is available in the card body or the page summary.

Advanced scoring rules render as a compact ledger in configuration order:

- every rule is one full-width row separated by a quiet divider;
- the rule name is the primary label;
- applied rules receive a subtle semantic-success background and an explicit localized “Applied” status;
- disabled rules receive an explicit localized disabled status;
- the condition and result are visually separated and labeled with localized “If” and “Then” labels instead of being presented as one low-contrast sentence;
- long conditions and translated content wrap naturally without horizontal scrolling in the Full HD side rail or on mobile.

The footer presents the hard point cap, timezone, and minimum tracking percentage as three aligned definition-list metrics. Simple mode and the no-rules state remain concise text states inside the same always-open panel. Existing scoring data, rule formatting helpers, highlighting inputs, and ordering remain unchanged.

Verification covers the absence of disclosure controls, immediate visibility of rules, applied and disabled statuses, simple and empty states, long content, keyboard semantics, and responsive rendering in the single-column and Full HD side-rail layouts.

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
