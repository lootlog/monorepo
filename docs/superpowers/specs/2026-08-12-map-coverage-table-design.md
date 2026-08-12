# Map coverage table

## Goal

Replace the loose accordion rows in kill map coverage with a compact, responsive table that visually matches the participants section while preserving the existing expanded diagnostics.

## Table structure

The map coverage panel keeps its current section header and legend. Its body uses TanStack Table with `useReactTable` and `getCoreRowModel`, rendered through `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` from `@lootlog/ui/components/table`.

The desktop columns are:

1. ID
2. Map
3. Participants
4. Coverage
5. Actions

The ID cell displays the numeric map identifier in a compact monospace style. The map cell is the primary identity and displays only the truncated map name. The participants cell displays a `Users` icon and the unique normalized participant count without avatars. The coverage cell is right-aligned, uses tabular numerals, and retains the existing semantic percentage colors. The actions cell contains the expansion control.

The table does not add a separate status column. Status would duplicate information already communicated by the coverage value and its semantic color.

## Expansion model

TanStack Table owns a controlled `ExpandedState` record through `state.expanded` and `onExpandedChange`. The table uses `getRowId: (map) => map.mapId`, `getRowCanExpand: () => true`, and `getExpandedRowModel()` so expansion follows the stable map identifier across data refreshes. The record form allows multiple maps to remain expanded. Only the explicit action button toggles a row; clicking elsewhere in the row does not unexpectedly open details.

An expanded map renders a second `TableRow` immediately after its summary row. That row contains one `TableCell` whose `colSpan` equals `row.getVisibleCells().length`. The detail cell explicitly uses normal whitespace wrapping and `min-w-0` to override the shared table cell's non-wrapping default. It hosts the existing content without adding a nested card:

- normalized coverage diagnostics;
- coverage timeline;
- grouped member assignments;
- longest gaps and full gap audit.

The divider under the summary row remains in the same position in both states. Expanded content begins directly below it without an extra top gap. Multiple maps may remain expanded at the same time, matching the current accordion behavior.

## Responsive behavior

At the Tailwind `md` breakpoint and above (`>= 768px`) the table header is visible and all five columns keep stable widths. The ID column appears first with a compact fixed width. The map column receives remaining width; participants and coverage use compact fixed widths; actions remains the narrowest column.

Below `md` (`< 768px`) the dedicated ID and participants columns are removed through TanStack column visibility, leaving a three-column grid. The map cell includes a secondary metadata line with the participant count but does not repeat the hidden ID. Coverage and the expansion action remain visible and right-aligned. Coverage uses a 64 px column without extra horizontal cell padding. Actions uses a 44 px column and keeps the same 44 × 44 px expansion control as the participant table. Long map names truncate without pushing the percentage or action out of the viewport. The remaining three-column header stays in the DOM and accessibility tree but is visually clipped with the standard screen-reader-only technique rather than `display: none`; at `md` it returns to normal table-header rendering. At exactly 768 px, verification expects the five-column desktop layout.

The expanded detail row always spans the complete table width. Its existing responsive diagnostic layout remains unchanged. The table must not introduce horizontal page overflow at 360, 768, or 1440 px.

## Components and data flow

The map timeline section passes timeline maps and the kill window into a dedicated table component. Column definitions derive display values from the existing normalized map diagnostics helper, ensuring the collapsed coverage percentage and expanded metrics use the same data. A responsive media-query hook controls TanStack's participants-column visibility; `row.getVisibleCells().length` therefore yields four columns at `md` and above and three below it.

The summary row and expanded detail are rendered by a focused row component in its own file. The existing expanded diagnostic components remain reusable and do not move back into one large component. No re-export-only files are introduced.

API contracts, routing, stored data, matching-loot behavior, and the normalization rules remain unchanged.

## Accessibility

- Table headers provide localized column names.
- The table has a localized accessible name, and its visually hidden narrow-screen headers remain associated with their cells.
- The expansion button has a localized accessible name containing the map name, exposes `aria-expanded`, and has a minimum 44 × 44 px hit target.
- Each map name receives a stable summary label ID based on `mapId`. The expansion button's `aria-controls` points to a stable detail container ID based on the same map ID, and the detail container uses `aria-labelledby` to reference the summary label.
- Coverage is available as text, not color alone.
- Keyboard users can toggle details with the native button control.
- Narrow-screen headers remain in the accessibility tree; they are never hidden with `display: none`.

## States

- Loading remains handled by the existing section skeleton.
- An empty map collection preserves current behavior: `KillMapsTimelineSection` returns `null`, so the entire map coverage section stays hidden and no new empty-state copy is introduced.
- Invalid kill windows retain the unavailable-data detail state.
- Full coverage retains the green 100% value and full-coverage detail message.
- Zero participants displays the localized zero-person count.
- Long map names truncate visually while the complete name remains available to assistive technology.

## Verification

- Test TanStack column definitions and stable desktop column order.
- Test unique participant count and normalized coverage percentage in collapsed rows.
- Test explicit expansion and collapse, stable `mapId`-based expansion after a data refresh, multiple expanded maps, `aria-expanded`, `aria-controls`, `aria-labelledby`, and the responsive detail row `colSpan` (five at `md`, three below it).
- Test that the detail divider does not gain extra top spacing when expanded.
- Test the `< 768px` visibility rules for the visually clipped but accessible header, hidden ID and participants columns, participant metadata, 64 px coverage column, and 44 px action column; test the five-column layout at exactly 768 px.
- Retain the existing normalization, assignment grouping, full audit, invalid-window, and duplicate-key regression tests.
- Run targeted Vitest tests, `@lootlog/web` lint, build, and format check.
- Inspect the live page at 360, 768, and 1440 px for alignment, truncation, keyboard behavior, touch target size, horizontal overflow, and React console warnings.
