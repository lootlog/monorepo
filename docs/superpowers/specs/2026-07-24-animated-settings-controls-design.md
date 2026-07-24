# Animated Settings Controls

## Goal

Unify `ToggleGroup` and `Slider` as compact, switch-inspired controls with
fast, deliberate motion. Keep their public interfaces, accessibility
semantics, and settings persistence unchanged.

## ToggleGroup

- Render one shared purple indicator behind the active item instead of
  animating each item's background independently.
- Measure the active item's real offset and width so the indicator supports
  two or more items and labels with unequal widths.
- Move and resize the indicator over 120 ms using
  `cubic-bezier(.4, 0, .2, 1)`.
- Keep item text above the indicator and preserve Base UI focus, keyboard,
  disabled, single-value, and multiple-value behavior.
- Keep the existing gray track, compact rectangular shape, border, and
  right alignment in Settings.

## Slider

- Use the same gray rectangular track, border, purple fill, and compact thumb
  visual language as `ToggleGroup` and `Switch`.
- During pointer dragging, update the fill and thumb directly with no
  positional transition or trailing motion.
- Use the 120 ms snap transition for track clicks, keyboard changes, and
  programmatic value updates.
- Scale the thumb down subtly while pressed and restore it on release.
- Preserve the current value tooltip, endpoint labels, controlled and
  uncontrolled modes, commit behavior, and public props.

## Motion and Accessibility

- Disable indicator movement, fill/thumb transitions, and press scaling under
  `prefers-reduced-motion: reduce`.
- Do not add animation libraries; implement the motion with the existing React,
  Base UI, and CSS toolchain.
- Motion must not change DOM roles, accessible names, tab order, or keyboard
  selection behavior.

## Verification

- Test indicator placement and updates for unequal item widths and three-item
  groups.
- Preserve click and keyboard selection tests for `ToggleGroup`.
- Test Slider pointer dragging without positional transition and keyboard or
  programmatic changes with the snap transition enabled.
- Test pressed and reduced-motion states through public DOM attributes and
  classes.
- Run the game-client component and Settings tests, full game-client test
  suite, type check, lint, and `git diff --check`.
