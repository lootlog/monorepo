# Kill scoring rules widget

## Goal

Make the scoring-rules section on the event kill detail page as compact and analytical as the participant and map-coverage sections. Every configured rule must be visible immediately, without a disclosure or separate contextual list, while the current member's applied rules remain easy to identify.

## Information hierarchy

The card keeps the shared section shell used across the kill detail page: a rounded bordered panel with a 48 px header, calculator icon, title, and a muted rule count aligned to the right. In advanced mode the count includes every configured rule, including disabled rules, and remains visible as zero when the configuration is empty. Simple mode omits the count.

The advanced body has two always-visible layers:

1. A compact three-cell parameter strip showing the hard point cap, the minimum tracking percentage required for bonuses, and the scoring timezone.
2. One flat divided list containing every configured rule.

Each rule occupies one compact analytical row. The primary line places the resolved rule name on the left and its formatted scoring action on the right. The formatted conditions appear below the name as quieter supporting text. The row does not repeat structural labels equivalent to “IF” and “THEN”; hierarchy and alignment make the condition and result clear. The total member score is not repeated because it already appears in the participant table.

Enabled rule IDs present in `highlightedRuleIds` receive a narrow decorative Sync Cyan leading marker and a translated applied status. `highlightedRuleIds` is derived from the logged-in user's participant record, so this treatment describes only that member's result. Disabled rules use a translated disabled status and a quieter presentation. Active rules that did not apply remain neutral and receive no invented status label.

All rules appear exactly once. There is no disclosure, toggle, collapsed state, nested card, or separately repeated list of applied rules.

## Static states

- In simple scoring mode, the card shows the shared header without a right-side count and one compact explanation of simple scoring. It does not render advanced-rule metadata.
- In advanced mode with no configured rules, the card shows a zero rule count in the shared header, keeps the parameter strip visible, and renders one compact empty state below it.
- In advanced mode with rules but no applied rule IDs, the complete rule list remains visible and all enabled rules use the neutral presentation.
- A disabled rule stays visible and is never styled as applied, even if its ID occurs in `highlightedRuleIds`.

## Responsive behavior

From the `sm` breakpoint upward, the parameter strip uses three equal columns with vertical separators. Below `sm`, it uses two columns: point cap and minimum tracking share the first row, while timezone spans both columns in the second row.

Rule rows keep the action aligned to the right while names and conditions use the remaining width. Long names and conditions wrap naturally, actions do not shrink, and the card never introduces horizontal scrolling. Mobile rows retain a compact readable rhythm and do not hide essential content.

## Component boundaries

`MultipliersCard` remains the public component consumed by the kill detail page and keeps its current props and data contract. `ScoringConfigurationStrip` renders the metadata. A single substantive rule-list component renders all rule rows and owns applied/disabled presentation. Shared display helpers remain non-component utilities.

The obsolete disclosure component and separate applied-rule component are removed rather than retained as wrappers. No re-export-only file is introduced. All visible copy uses the event i18n namespace.

## Accessibility

- The section retains a semantic heading.
- Every rule and its condition/action relationship remains readable without interaction.
- Applied and disabled states are conveyed by translated text in addition to color.
- The Sync Cyan marker is decorative and not the sole indication that a rule applied.
- Static scoring states remain readable without relying on icons.

## Verification

- Verify every configured rule is present immediately and no disclosure button or hidden ledger exists.
- Verify an enabled highlighted rule has the applied status and Sync Cyan marker without being duplicated.
- Verify a disabled highlighted rule has only the disabled presentation.
- Verify active, non-applied rules have no status label.
- Assert conditions and actions remain present without “IF” and “THEN” labels and the member total is not duplicated.
- Cover advanced rules with no applied IDs, advanced mode with no rules, and simple mode, including header-count and parameter-strip behavior.
- Run the targeted Vitest suite, `@lootlog/web` lint, build, and format checks.
- Inspect the widget in the running application at mobile and desktop widths for density, wrapping, contrast, and console warnings.
- Keep the existing patch changeset for `@lootlog/web` updated with the always-visible compact scoring-rule list.
