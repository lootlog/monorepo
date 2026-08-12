# Respawn delta presentation

## Goal

Keep the kill summary metrics at a uniform height while preserving the visible difference between the actual respawn time and the maximum respawn window.

## Design

The respawn metric displays its primary duration and the comparison delta in one row:

- The actual respawn duration remains the dominant value.
- A respawn before the maximum displays a smaller, muted negative delta, for example `−1h 11m`.
- A respawn after the maximum displays a smaller amber positive delta, for example `+1m`.
- An overdue value takes precedence if both early and overdue comparison inputs are present.
- A respawn exactly at the maximum, or a respawn without comparison data, omits the delta entirely.
- The delta never creates a second content row or increases the metric strip height.
- The value row does not wrap. At narrow widths the primary duration may truncate, while the shorter delta remains visible; the accessible label and tooltip retain the complete values.
- The existing tooltip retains the detailed timestamps.
- The metric's accessible label includes the full localized comparison phrase, such as “1h 11m before max,” instead of relying on the visual sign alone.
- When the delta is omitted, the accessible label also omits the comparison phrase.

## Scope

This change is limited to the kill detail presentation and the local preparation of its comparison value. It does not alter respawn calculations, API contracts, routing, or other metric cards.

## Verification

- Test the early-respawn negative delta.
- Test the overdue positive delta and amber treatment.
- Test overdue precedence when both comparison inputs are present.
- Test that exact-maximum and missing comparison data render no delta.
- Test localized accessible names for early, overdue, and omitted comparisons.
- Test that the comparison is rendered inline with the primary value.
- Test that the value row does not wrap and keeps the delta from shrinking at narrow widths.
- Verify the desktop kill summary no longer grows because of the comparison text.
