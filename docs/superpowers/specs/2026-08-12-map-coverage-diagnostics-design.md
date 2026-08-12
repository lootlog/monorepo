# Map coverage diagnostics

## Goal

Make an expanded kill map answer why its coverage is low within a few seconds, while keeping the complete assignment and gap audit available on demand.

## Expanded layout

### Diagnostic summary

The expanded content starts with three compact metrics derived from normalized intervals within the clipped kill window:

- Covered: total covered duration and coverage percentage.
- Uncovered: total `UNCOVERED` duration and gap count.
- Unassigned: total `UNASSIGNED` duration and gap count.

The three metrics use the same green, amber, and destructive semantics as the map coverage legend. Durations and counts use tabular numerals. On narrow screens the metrics remain in three columns with short localized labels and no horizontal overflow. The primary duration stays on one line; percentage or gap count may move to a second line. Each metric has a complete localized accessible name, so no value is available only through truncated visual text.

### Timeline

The existing coverage timeline remains directly below the diagnostic summary. Its start and end timestamps remain visible. It uses the same normalized, disjoint gap intervals as the diagnostic totals, so its visual range and the diagnostic totals describe the same kill window.

### Assigned members

Assignments are grouped by member instead of rendering every assignment period as an equal row. Each member row displays:

- avatar and member name;
- number of assignment periods;
- total assigned duration within the kill window.

The duration represents assignment time, not confirmed map coverage. Assignment intervals for each member are clipped and merged before their count and duration are calculated. Overlapping or touching intervals therefore form one period and their overlap is counted once. A member row with multiple normalized periods can expand to reveal its clipped start and end timestamps. Single-period rows do not add a redundant expansion control.

### Longest gaps and full audit

When gaps exist, the content shows at most the three longest normalized gaps, sorted by duration descending, then start time ascending, then stable gap identifier. Each row displays the localized gap type, start and end time, duration, and the matching semantic color.

If more than three gaps exist, a localized toggle labelled with the total count reveals the complete gap audit within the same section. The expanded audit:

- does not create a nested card;
- remains vertically bounded with an internal scroll area;
- preserves a minimum touch target for the toggle;
- can be collapsed again;
- keeps deterministic ordering by start time for audit use.

When the map has full coverage, the gap section is replaced by the existing compact green full-coverage message.

## Data and boundaries

All interval durations are recalculated from their clipped timestamps, even when the API provides `durationSeconds`. Open-ended gaps and assignments end at the kill end time. Intervals completely outside the window and intervals with zero or negative clipped duration are discarded.

Gap normalization produces disjoint intervals:

- overlapping or touching intervals of the same type are merged;
- `UNASSIGNED` takes priority over `UNCOVERED` where different types overlap;
- an `UNCOVERED` interval is split around higher-priority `UNASSIGNED` time;
- covered duration is the kill-window duration minus the union of all normalized gaps.

This guarantees that covered, uncovered, and unassigned durations sum to the valid kill window and match the timeline. Gap counts refer to normalized intervals, not raw API rows.

Each normalized gap segment receives a deterministic identifier composed from its gap type, clipped start timestamp, clipped end timestamp, and the sorted unique API identifiers of every raw gap that contributed to the segment. Merging unions the contributing identifier sets; splitting retains the contributing identifiers on every resulting segment. The complete tuple is used for React keys and the final longest-gap sort tie-breaker, so input ordering cannot change identity or presentation.

If `endTime <= startTime`, the component treats the window as invalid: it omits the timeline, percentages, assignments, and gap lists, and renders a compact localized unavailable-data state instead of implying 100% coverage.

The change is local to the kill map timeline UI and its presentation helpers; API contracts, routing, and stored data do not change.

## Accessibility

- Expansion controls retain clear localized accessible names and `aria-expanded` state.
- Gap type is communicated with text as well as color.
- Member-period expansion is keyboard operable.
- The full-audit toggle includes the total gap count in its accessible name.

## States

- No assignments and gaps: show diagnostics and gaps without an empty member section.
- Assignments and no gaps: show grouped members and the full-coverage message.
- No assignments and no gaps: show the full-coverage message without empty lists.
- Missing or stale gap duration: always derive duration from clipped timestamps.
- Open-ended gaps: clip their end to the kill end time.
- Overlapping gaps: normalize to disjoint intervals with `UNASSIGNED` priority.
- Overlapping member assignments: merge per member and count overlap once.
- Invalid or empty window: show the unavailable-data state without metrics or timeline.
- Long member and map names: truncate visually while retaining accessible text.

## Verification

- Test diagnostic totals and counts by gap type, including overlaps and `UNASSIGNED` priority.
- Test assignment grouping, clipping, interval union, duration totals, and multiple-period expansion.
- Test deterministic normalized-segment identifiers after merge and split, longest-gap sorting with duration, start-time, and identifier tie-breakers, the three-row limit, full-audit toggle, deterministic audit ordering, and collapse.
- Test no-assignment, no-gap, full-coverage, open-ended-gap, and long-name states.
- Test invalid-window and zero-duration interval handling.
- Test keyboard access, complete metric and control names, and `aria-expanded` state.
- Verify at 360, 768, and 1440 px that content does not overflow horizontally and the default expanded map stays compact.
