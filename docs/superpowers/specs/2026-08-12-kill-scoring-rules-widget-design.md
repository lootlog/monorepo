# Kill scoring rules widget

## Goal

Make the scoring-rules section on the event kill detail page as compact and analytical as the participant and map-coverage sections. The widget should explain the scoring context of the current kill immediately, while keeping the full event configuration available on demand.

## Information hierarchy

The card keeps the shared section shell used across the kill detail page: a rounded bordered panel with a 48 px header, calculator icon, title, and a muted rule count aligned to the right. The header itself is not a disclosure control.

The default body has two layers:

1. A compact three-cell parameter strip showing the hard point cap, the minimum tracking percentage required for bonuses, and the scoring timezone.
2. A contextual list containing only enabled rules whose IDs occur in `highlightedRuleIds`, labelled as rules applied to this kill.

This replaces the current default view that lists every configured rule. Applied rules remain visible without interaction because they explain the result being inspected. Each applied entry shows its name and formatted action as the primary row; its formatted condition is supporting text. The presentation is a flat divided list, not a collection of nested cards.

If no rule ID was applied, the contextual area renders one concise muted empty state instead of an empty list. This state must not imply that no points were awarded, because base scoring may be represented elsewhere in the participant breakdown.

## Full-rule disclosure

When the event has configured advanced rules, a compact button below the contextual list toggles the complete rule ledger. Its labels are equivalent to “Show all rules” and “Hide all rules”, include the total rule count, and use `aria-expanded` plus `aria-controls`.

The complete ledger opens inside the same card. It uses the shared light expanded-detail surface (`bg-muted/40`) and separators, without introducing another border, rounded card, or card nesting. Every configured rule appears once and retains the existing information:

- resolved rule name;
- enabled, disabled, or applied status;
- formatted conditions joined with the translated conjunction;
- formatted scoring action.

Applied rules may therefore appear both in the always-visible contextual summary and in the complete ledger while it is open. This intentional repetition keeps the collapsed state useful and the expanded ledger complete.

The disclosure is collapsed on initial render. Opening and closing it does not mutate event data, routing, or scoring configuration.

## Static states

- In simple scoring mode, the card shows the shared header and one compact explanation of simple scoring. It does not render advanced-rule metadata or a disclosure.
- In advanced mode with no configured rules, the card shows the shared header and one compact empty state. It does not render a disclosure.
- In advanced mode with rules but no applied rule IDs, the metadata strip, contextual empty state, and full-rule disclosure remain available.
- Disabled rules never appear in the applied contextual list, even if their IDs occur in `highlightedRuleIds`. They remain visible with disabled status in the complete ledger.

## Responsive behavior

On medium and larger widths, the parameter strip uses three equal columns with vertical separators. On narrow screens it stacks or uses the existing responsive grid behavior without horizontal overflow. Rule names, conditions, and actions wrap naturally; no essential content is truncated.

The disclosure control keeps at least a 44 px touch target on mobile while remaining visually compact on desktop. Focus, hover, and expanded states use existing `@lootlog/ui` button and disclosure patterns.

## Component boundaries

`MultipliersCard` remains the public component consumed by the kill detail page and keeps its current props and data contract. The change is presentation-only and preserves `EventConfig`, `highlightedRuleIds`, and the existing scoring-format helpers.

If extracting markup is necessary to comply with the repository’s one-component-per-file rule, each extracted component lives in its own substantive file and imports point directly to it. No re-export-only wrapper is introduced.

All new labels and empty-state copy use the event i18n namespace. No Polish or English user-facing text is hardcoded in React.

## Accessibility

- The section retains a semantic heading.
- The full-rule control exposes its state and controlled region to assistive technology.
- Status is conveyed by translated text in addition to color.
- Keyboard users can toggle the complete ledger with the standard button interaction.
- The contextual empty state and static scoring states remain readable without relying on icons.

## Verification

- Update component tests to prove that only enabled highlighted rules appear in the default contextual list.
- Verify that disabled highlighted IDs do not appear as applied, while disabled rules remain present in the expanded complete ledger.
- Verify the full ledger is initially absent, can be opened and closed, and exposes correct accessibility attributes.
- Cover advanced rules with no applied IDs, advanced mode with no rules, and simple mode.
- Assert the parameter strip values and the expanded-detail surface contract.
- Run the targeted Vitest suite, `@lootlog/web` lint, build, and format checks.
- Inspect the widget in the running application at mobile and desktop widths for density, wrapping, focus visibility, touch target size, and console warnings.
- Add a patch changeset for `@lootlog/web` describing the compact contextual scoring-rules presentation.
