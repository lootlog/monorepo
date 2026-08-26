---
"@lootlog/api": patch
"@lootlog/web": patch
"@lootlog/gateway": patch
"@lootlog/types": patch
"@lootlog/api-client": patch
"@lootlog/ui": patch
---

Rebuild reservations around server-owned authorship, bounded calendar queries,
personal reminders, pinned spots, direct Organization sharing, and responsive
week/day scheduling. Split the user dashboard kill statistics into two compact
cards with locally scoped shared filters and place reservations in a narrower
responsive side column. Keep pinned reservation spots
first while ordering the remaining catalog by level and name. Make the
reservation catalog toolbar responsive and persist its selected filter between
visits. Restore continuous rounded borders for compact toggle groups. Polish
the reservation settings workflow and clear revoked one-time invitation links
immediately. Present the complete personal reservation history without cursor
pagination and let its page use the full available content width.
Add compact management actions for personal reservations, including an
icon-only cancellation control and an ownership-checked edit flow for dates,
comments, and DM reminders. Format reservation reminder dates with Discord-native
relative timestamps while preserving ISO dates in notification metadata. Add
mouse range selection to the compact reservation schedule and a scroll-safe
long-press range gesture for touch devices, with tighter compact date navigation
and contextual details and cancellation actions restored on reservation blocks.
Keep reservation detail overlays mounted between selections so mobile drawers
animate consistently when opening from a calendar tile and when closing.
Consume context-menu dismissal presses inside the calendar so they cannot click
through into the new-reservation flow on pointer or touch devices.
Separate reservation details from a bordered action footer and keep an explicit
dismiss action available regardless of cancellation permissions. Keep dialog
backdrops transparent through the full Base UI exit lifecycle so closing a
dialog cannot flash a full-screen dark frame. Move compact calendar actions
into a safe-area-aware floating dock while preserving the desktop header and
leaving enough scroll space below the final hour. Add a quick action that finds
the nearest partner-safe free slot and opens a prefilled reservation form.
Add touch-only horizontal day swiping to the compact calendar with direct
finger tracking, reduced-motion support, conflict-safe long-press handling, and
a native touch-event fallback for mobile webviews without pointer-based drag.
Keep the adjacent day grids and reservations visible beside the active day
during the gesture, including swipes that cross a week boundary. Snap deliberate
partial swipes to the adjacent day with a short deterministic ease-out while
returning small accidental movements with a shorter deterministic transition.
Keep native touch events as the single swipe input pipeline so duplicate
pointer endings, late touch cancellation, or a second gesture cannot interrupt
an active day transition. Center the current-time marker vertically without
letting it horizontally scroll the three-day track away from the active pane.
Mirror unavailable-hour backgrounds in adjacent day previews so their surface
does not change tone after a swipe settles.
Center compact day navigation across the full calendar header while preserving
equal touch targets on both sides of the date.
Commit the swiped date and reset its track before the next paint so reservation
tiles cannot flash out between adjacent day panels.
Limit day swiping to coarse, non-hover mobile input and contain the three-day
track so compact calendars cannot drift into native horizontal scrolling.
Render the compact calendar with a vertical-only scroll area so its swipe
previews never expose a horizontal scrollbar on mobile devices.
