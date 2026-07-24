# Animated Settings Controls

## Goal

Unify `ToggleGroup` and `Slider` as compact, switch-inspired controls with
fast, deliberate motion. Keep their public interfaces, accessibility
semantics, and settings persistence unchanged.

## ToggleGroup

- In `single` mode, render one shared purple indicator behind the active item
  instead of animating each item's background independently.
- In `multiple` mode, do not render the shared indicator. Preserve independent
  purple pressed backgrounds so every selected item remains visible.
- Measure the active item's real offset and width so the indicator supports
  two or more items and labels with unequal widths.
- Move and resize the indicator over 120 ms using
  `cubic-bezier(.4, 0, .2, 1)`.
- Keep item text above the indicator and preserve Base UI focus, keyboard,
  disabled, single-value, and multiple-value behavior.
- Keep the existing gray track, compact rectangular shape, border, and
  right alignment in Settings.
- Keep measurement private to `toggle-group.tsx`. The root owns its DOM ref and
  exposes the indicator through a pseudo-element driven by
  `--toggle-indicator-x` and `--toggle-indicator-width`.
- Compose the internal measurement ref with any consumer-provided root ref so
  existing ref behavior remains unchanged.
- Recompute geometry after mount, selection changes, child mutations, and root
  or active-item resizing. Batch observer updates in one animation frame and
  disconnect observers on unmount.
- Hide the indicator until a selected item has valid geometry. If selection is
  empty or the selected item disappears, remove the visible state without
  changing ToggleGroup values.

## Slider

- Use the same gray rectangular track, border, purple fill, and compact thumb
  visual language as `ToggleGroup` and `Switch`.
- Use an 8 px total `border-box` height `rounded-sm` gray-700 track, including
  its gray-400 border, a purple-500/80 indicator, and the existing 10×14 px
  thumb changed to `rounded-sm` with a purple-300 border and white fill.
- During pointer dragging, update the fill and thumb directly with no
  positional transition or trailing motion.
- Use the 120 ms snap transition for track clicks, keyboard changes, and
  programmatic value updates.
- Scale the thumb to 90% while pressed and restore it on release.
- Preserve the current value tooltip, endpoint labels, controlled and
  uncontrolled modes, commit behavior, and public props.
- Treat a thumb pointer-down as direct dragging immediately. For a track
  pointer-down, keep snap enabled for the initial jump; switch to direct mode
  on the first pointer move and remain direct until pointer-up or
  pointer-cancel. Keyboard and controlled updates remain in snap mode.
- Keep interaction state private to `slider.tsx`; do not introduce a shared
  motion hook or new public props.

## Motion and Accessibility

- Disable indicator movement, fill/thumb transitions, and press scaling under
  `prefers-reduced-motion: reduce`.
- Reduced motion changes duration to zero but still updates geometry and values
  immediately.
- Do not add animation libraries; implement the motion with the existing React,
  Base UI, and CSS toolchain.
- Motion must not change DOM roles, accessible names, tab order, or keyboard
  selection behavior.
- Expose stable DOM state for verification: ToggleGroup keeps
  `data-slot="toggle-group"` and adds `data-indicator-visible`; Slider adds
  `data-slot="slider"` and `data-interaction="snap" | "direct"`. Motion classes
  include explicit `motion-reduce:transition-none` for movement and
  `motion-reduce:scale-100` for press feedback. Reduced motion must preserve
  positioning transforms and CSS geometry variables.

## Verification

- Test indicator placement and updates for unequal item widths and three-item
  groups.
- Test that `multiple` mode uses independent pressed states without a shared
  indicator.
- Preserve click and keyboard selection tests for `ToggleGroup`.
- Test Slider state transitions from snap to direct for thumb drag, track click
  followed by drag, pointer-up, and pointer-cancel.
- Test keyboard and controlled updates with snap enabled.
- Test pressed and reduced-motion states through the specified public DOM
  attributes and motion-reduce classes.
- Run the game-client component and Settings tests, full game-client test
  suite, type check, lint, and `git diff --check`.

## Implementation Boundary

- Limit production changes to the existing shared modules
  `components/ui/toggle-group.tsx` and `components/ui/slider.tsx`.
- Extend their existing adapter tests and Settings integration tests as needed.
- Do not change settings forms, persistence, public props, or introduce another
  shared abstraction.
