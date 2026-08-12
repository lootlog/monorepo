# Kill detail table density

## Goal

Align the participant list and map coverage table on the kill detail page so they share the same compact vertical rhythm, separators, and expanded-row hierarchy.

## Participant table

The desktop participant column header uses a fixed 36 px height, matching the map table header. It keeps the existing column grid, typography, and muted secondary background, but uses vertical centering instead of padding-driven height. A single `border-bottom` separates the header from the first row; the list wrapper no longer adds a second top border.

Desktop participant summary rows use a 48 px minimum height with no extra vertical padding. Mobile rows retain a 56 px minimum height and 44 px touch targets. Member names keep the table-standard 14 px (`text-sm`) size and existing weight, truncation, role color, and external-link icon.

Expanded participant details use one subtle lighter surface across the complete expanded area. The surface uses the existing muted token at a slightly stronger but still restrained opacity so the detail block reads as subordinate to its summary row without introducing a nested card.

## Map coverage table

An expanded map summary row has exactly one divider beneath it. The expanded detail row does not add a competing top border, and the summary-row divider stays in the same position when opening or closing the row.

The complete expanded map detail uses the same lighter surface treatment as participant details. Diagnostics, timeline, assignments, and gap audit keep their internal separators, but the outer detail container provides one continuous background so the expanded content is visually distinct from collapsed rows.

## Accessibility and responsive behavior

- Existing labels, keyboard controls, `aria-expanded`, and touch targets remain unchanged.
- Compact 48 px participant rows apply at the existing desktop breakpoint only.
- Mobile participant rows remain 56 px high.
- Color is not the only signal for expanded content; the existing borders and placement remain.
- No API, routing, data, or mutation contracts change.

## Verification

- Test that the participant header uses a 36 px height and one bottom border.
- Test that desktop participant rows use a 48 px minimum height while mobile rows retain 56 px.
- Test that participant names remain 14 px.
- Test that expanded participant and map detail containers use the shared lighter background.
- Test that an expanded map has one separator between its summary and detail rows.
- Run targeted Vitest tests, `@lootlog/web` lint, build, and format check.
- Inspect the live page at 360, 768, and 1440 px for row rhythm, border continuity, expanded-state contrast, overflow, and React console warnings.
