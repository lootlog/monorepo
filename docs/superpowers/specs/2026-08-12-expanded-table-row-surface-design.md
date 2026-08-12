# Expanded table row surface

## Goal

Define one application-wide visual contract for expanded detail rows in every table built with `Table` from `@lootlog/ui`. Expanded content must be visibly lighter than ordinary rows while remaining subordinate to selected-row and interactive states.

## Shared table contract

The `Table` component owns the expanded-detail surface. Any detail row rendered inside it opts into the contract with `data-state="expanded-detail"`.

`Table` applies `bg-muted/40` to rows in that state and preserves the same surface on hover. The selector belongs to the table root so it works for both `TableRow` and compatible custom row elements such as `motion.tr`. Consumers do not repeat the background token locally.

The contract remains separate from `data-state="selected"`. Summary rows may continue to use `data-state="expanded"` for behavioral or test hooks, but only detail rows use `expanded-detail`.

## Existing expandable tables

- The kill map coverage table marks its dedicated detail row as `expanded-detail` and removes both its local expanded background and its competing `hover:bg-transparent` override. Hover styling is owned entirely by the shared table contract.
- The battle statistics expandable table marks its animated detail row as `expanded-detail` and removes its local `bg-secondary` surface and hover override.
- Any other current semantic table built with `@lootlog/ui` and rendering a dedicated detail `<tr>` adopts the same state during the inventory pass.
- Tables without expanded detail rows are unchanged.

## Transitional non-table surface

The kill participant list currently uses grid-based rows rather than semantic table elements. Its expanded detail block uses the same selected `bg-muted/40` token locally so the page remains visually consistent. When this list is migrated to `@lootlog/ui` table primitives later, the local class can be removed in favor of `expanded-detail`.

Accordion panels and generic expandable lists that do not use `Table` from `@lootlog/ui` are outside this change. Future migration of those surfaces to the shared table component will make the contract available without redesigning it.

## Accessibility and behavior

- Expansion controls, `aria-expanded`, `aria-controls`, focus behavior, and keyboard interaction do not change.
- The surface is a supporting visual cue, not the only expansion signal; placement and separators remain.
- The expanded background does not override selected rows or change click and hover behavior of summary rows.
- Invalid, empty, full-coverage, and animated expanded-detail variants receive the same surface.

## Verification

- Add a `@lootlog/ui` table test proving that any descendant row with `data-state="expanded-detail"` receives the shared `bg-muted/40` contract without requiring `TableRow`.
- Update kill map tests to assert the detail-row state, removal of local expanded background ownership, and stable shared surface on hover without a local transparent-hover override.
- Update participant tests to assert the transitional `bg-muted/40` surface.
- Add or update battle statistics tests for the animated `motion.tr` detail row.
- Search all `@lootlog/ui/components/table` consumers for dedicated expanded rows and verify each one adopts the state.
- Run affected workspace tests, lint, build, and format checks.
- Inspect representative expanded tables in the browser for contrast, hover stability, separators, keyboard controls, responsive overflow, and console warnings.
