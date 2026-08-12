# Kill scoring rules widget

## Goal

Make the scoring-rules section on the event kill detail page as compact and analytical as the participant and map-coverage sections. The widget gives equal access to the current member’s scoring explanation and the event’s scoring configuration, while preserving a clear reading order and keeping rule internals available on demand.

## Information hierarchy

The card keeps the shared section shell used across the kill detail page: a rounded bordered panel with a 48 px header, calculator icon, title, and a muted rule count aligned to the right. In advanced mode the count includes every configured rule, including disabled rules, and remains visible as zero when the configuration is empty. Simple mode omits the count. The header itself is not a disclosure control.

The default body has two layers:

1. A compact three-cell parameter strip showing the hard point cap, the minimum tracking percentage required for bonuses, and the scoring timezone.
2. A contextual list containing only enabled rules whose IDs occur in `highlightedRuleIds`, labelled as rules applied to the current member’s result.

This replaces the current default view that lists every configured rule. `highlightedRuleIds` is currently derived from the logged-in user’s participant record, so the copy must not describe it as a union of rules applied to the whole kill. Applied rules remain visible without interaction because they explain that member’s result. Each applied entry uses a narrow Sync Cyan leading marker, shows its name and formatted action on the primary line, and presents its formatted condition as supporting text. The total member score is not repeated because it already appears in the participant table. The presentation is a flat divided list, not a collection of nested cards.

If no rule ID is available, the contextual area is omitted rather than claiming that no rules were applied. This covers both a current participant with no matched rule IDs and a viewer who is not a participant. The metadata strip and full-rule disclosure remain available.

## Full-rule disclosure

When the event has configured advanced rules, a full-width disclosure row below the contextual list toggles the complete rule ledger. Its collapsed label is equivalent to “Full configuration”, with the total rule count and chevron aligned to the right. Its expanded label is equivalent to “Hide full configuration”. It uses `aria-expanded` plus `aria-controls` and reads as a secondary section row rather than a primary button.

The complete ledger opens inside the same card. It uses the shared light expanded-detail surface (`bg-muted/40`) and separators, without introducing another border, rounded card, or card nesting. Every configured rule appears once and retains the existing information:

- resolved rule name;
- applied or disabled status when either state is true; active rules that did not apply remain visually neutral and receive no invented status label;
- formatted conditions joined with the translated conjunction;
- formatted scoring action.

Applied rules may therefore appear both in the always-visible contextual summary and in the complete ledger while it is open. This intentional repetition keeps the collapsed state useful and the expanded ledger complete. The ledger remains visually neutral; Sync Cyan is reserved for the contextual applied-rule markers and focus states.

The disclosure is collapsed on initial render. Opening and closing it does not mutate event data, routing, or scoring configuration.

## Static states

- In simple scoring mode, the card shows the shared header without right-side count and one compact explanation of simple scoring. It does not render advanced-rule metadata or a disclosure.
- In advanced mode with no configured rules, the card shows a zero rule count in the shared header, keeps the parameter strip visible, and renders one compact empty state below it. It does not render a disclosure.
- In advanced mode with rules but no applied rule IDs, the metadata strip and full-rule disclosure remain available; the contextual member section is omitted.
- Disabled rules never appear in the applied contextual list, even if their IDs occur in `highlightedRuleIds`. They remain visible with disabled status in the complete ledger.

## Responsive behavior

From the `sm` breakpoint upward, the parameter strip uses three equal columns with vertical separators. Below `sm`, it uses two columns: point cap and minimum tracking share the first row, while timezone spans both columns in the second row. Horizontal and vertical separators follow that grid and the strip never overflows. Rule names, conditions, and actions wrap naturally; no essential content is truncated.

The disclosure row keeps at least a 44 px touch target on mobile and a compact 36 px height on desktop. Focus, hover, and expanded states use existing `@lootlog/ui` button and disclosure patterns.

## Component boundaries

`MultipliersCard` remains the public component consumed by the kill detail page and keeps its current props and data contract. The change is presentation-only and preserves `EventConfig`, `highlightedRuleIds`, and the existing scoring-format helpers.

If extracting markup is necessary to comply with the repository’s one-component-per-file rule, each extracted component lives in its own substantive file and imports point directly to it. No re-export-only wrapper is introduced.

All new labels and empty-state copy use the event i18n namespace. No Polish or English user-facing text is hardcoded in React.

## Accessibility

- The section retains a semantic heading.
- The full-rule control exposes its state and controlled region to assistive technology.
- Status is conveyed by translated text in addition to color.
- The Sync Cyan marker is decorative and never the sole indication that a rule was applied; the section label and rule placement carry the same meaning.
- Keyboard users can toggle the complete ledger with the standard button interaction.
- Static scoring states remain readable without relying on icons.

## Verification

- Update component tests to prove that only enabled highlighted rules appear in the default member-context list and that its copy is scoped to the current member rather than the whole kill.
- Verify that disabled highlighted IDs do not appear as applied, while disabled rules remain present in the expanded complete ledger.
- Verify the full ledger is initially absent, can be opened and closed, and exposes correct accessibility attributes.
- Cover advanced rules with no applied IDs, advanced mode with no rules, and simple mode, including their exact header-count behavior and the parameter strip remaining visible for an empty advanced configuration.
- Assert the parameter strip values and the expanded-detail surface contract.
- Assert the contextual applied-rule marker, the absence of a duplicated member total, and the “full configuration” disclosure copy.
- Run the targeted Vitest suite, `@lootlog/web` lint, build, and format checks.
- Inspect the widget in the running application at mobile and desktop widths for density, wrapping, focus visibility, touch target size, and console warnings.
- Add a patch changeset for `@lootlog/web` describing the compact contextual scoring-rules presentation.
