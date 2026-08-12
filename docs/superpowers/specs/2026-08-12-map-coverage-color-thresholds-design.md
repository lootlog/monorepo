# Map coverage color thresholds

## Goal

Make map-coverage percentages easier to scan by using one consistent semantic color scale everywhere the kill-detail map coverage is displayed.

## Thresholds

- Values below 50% use the destructive/red text color.
- Values from 50% up to, but not including, 90% use the warning/yellow text color.
- Values at or above 90% use the success/green text color.

Boundary behavior is explicit: 49% is red, 50% is yellow, 89% is yellow, and 90% is green.

## Scope

Apply the thresholds through one shared coverage-color helper used by the compact table rows and any percentage repeated in expanded map details. The value remains ordinary text rather than a badge. Do not change coverage calculations, API data, timeline colors, gap-type legend colors, or unrelated percentage displays.

## Accessibility

Color supplements the visible numeric percentage and is never the only carrier of meaning. Existing text contrast tokens and percentage formatting remain unchanged.

## Verification

- Add boundary tests for 49%, 50%, 89%, and 90%.
- Verify every kill-detail coverage percentage uses the shared helper.
- Run the targeted Vitest suite, `@lootlog/web` lint, build, and format checks.
- Inspect representative red, yellow, and green values in the running kill-detail page.
