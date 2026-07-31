# Event Wrapped Rework

**Date:** 2026-07-31  
**Surface:** `apps/web` event detail  
**Mode:** Operate with a short, celebratory presentation  
**Status:** Approved design

## Goal

Rebuild the Event Wrapped dialog as a focused, story-led recap similar in
rhythm to Spotify Wrapped or YouTube Recap while preserving Lootlog's visual
language and factual credibility.

The result should:

- take over most of the viewport and temporarily become the primary
  experience;
- reveal one meaningful fact per slide;
- use real event data without inventing narrative;
- automatically advance while remaining easy to pause and control;
- look native to Lootlog rather than like a separate marketing microsite;
- adapt to desktop and mobile without introducing internal scrolling.

Exporting or sharing slides is outside this iteration.

## Current Problems

The current dialog combines a presentation shell with a dense dashboard:

- six slides contain many equally weighted metric cards;
- a blue ambient background, multiple colored glows, gradients, large corner
  radii, and looping decoration conflict with the flat Lootlog application;
- the header repeats the active step as badges while the slide repeats the
  same title and description;
- the content scrolls inside the dialog and navigation floats over it;
- generic narrative copy overstates weak or ambiguous data;
- semantically different metrics are presented as if directly comparable;
- sparse and inconsistent data still produce superlatives and leader cards;
- Polish count labels are not consistently inflected.

The current sample exposes credibility risks:

- the event overview reports 25 kills while hero and leader summaries show 2;
- total tracked activity is 2h 53m while the longest assignment is 160h 6m;
- six loot records contain seven rarity-qualified items, but the copy presents
  both as the same kind of "drop".

Some differences may be technically valid because the values come from
different sources. The interface must explain the distinction or omit the
comparison instead of manufacturing a story around it.

## Approved Experience

### Container

Use a near-full-screen dialog:

- desktop: constrained by a small viewport gutter and a sensible maximum
  width, with the event page still faintly visible behind the overlay;
- mobile: use the available viewport height and width as a focused takeover;
- keep a visible close action at all sizes;
- preserve focus trapping, Escape-to-close, and restoration of focus to the
  trigger.

The dialog contains three stable regions:

1. segmented progress and compact event context;
2. one non-scrollable slide stage;
3. navigation and playback state.

### Sequence

Build at most 10 short slides from trustworthy data. The final count is
dynamic.

Candidate sequence:

1. event opening;
2. total recorded kills;
3. tracked activity duration;
4. busiest recorded hour;
5. recorded loot count;
6. rarity-qualified item composition;
7. kill or point leader;
8. coverage, when coverage data is complete;
9. hero spotlight;
10. final recap with up to three verified facts.

The presentation mode requires at least three verified fact candidates in
addition to its opening and finale. With fewer than three fact candidates,
render the sparse-data summary state instead of a slideshow.

Select candidates in the priority order above until the 10-slide limit is
reached. Skip candidates that are empty, redundant, or fail the deterministic
quality checks below. Progress and accessible step labels must always use the
resulting slide count.

### Pace and Controls

Every slide auto-advances after exactly 8 seconds. The visible progress fill
uses the same 8-second duration.

Pause autoplay when:

- the pointer is over the presentation;
- focus is inside the presentation;
- the user selects text;
- the browser tab is hidden;
- the user has just navigated manually.

Resume from the elapsed progress when pointer, focus, selection, or visibility
pauses clear. Manual navigation resets the elapsed progress to zero. Pressing
the explicit pause control keeps autoplay paused until the user presses play,
even when all transient pause reasons clear.

Support:

- previous and next buttons;
- left and right arrow keys;
- swipe gestures on touch devices;
- clicking or tapping the side navigation regions;
- direct progress-segment selection;
- an explicit pause/play control.

Navigation never wraps. Previous actions are disabled or no-op on the first
slide. Autoplay and next-side-region actions stop on the final slide and leave
it visible. The explicit next button becomes "Finish" on the final slide and
closes the dialog. A right-arrow key press on the final slide is a no-op so an
accidental key press cannot dismiss the recap.

With `prefers-reduced-motion`, disable autoplay and use a short opacity
transition instead of directional movement.

## Visual Direction: Stat Theater

Each slide communicates one fact through:

- one short uppercase context label;
- one dominant number, name, or conclusion;
- one concise factual qualifier;
- optional quiet source or sample-size context.

Use the existing Lootlog tokens:

- `bg-background` and `bg-card` for Night/Raised Ink surfaces;
- `border-border` for all structural rules;
- `text-foreground`, `text-muted-foreground`, and quiet text hierarchy;
- the current `primary` theme token as the single dominant signal;
- rarity colors only when rarity is the subject of the slide.

Do not hard-code a separate Wrapped palette. Avoid:

- ambient radial gradients;
- decorative blue, rose, cyan, or yellow glows;
- glass and backdrop blur;
- gradient text;
- nested metric-card grids;
- looping decorative animations;
- ornamental badges that repeat headings;
- large rounded "AI cards" for every datum.

Use Geist display typography with one heavy voice per viewport. Numeric facts
may use tabular figures or Geist Mono only when alignment is useful. The
presentation should feel bold because of scale, contrast, and pacing rather
than decoration.

### Responsive Behavior

Validate at 360px, 768px, and 1440px.

- Desktop may align the primary fact and one supporting visual or context
  block in two columns.
- Mobile collapses to a centered single statement with a full-width primary
  navigation action.
- The slide stage must fit without internal scrolling at every supported
  width.
- Copy must clamp by design through concise templates, not CSS truncation.
- Primary touch actions must provide at least a 44px target.

## Data Credibility

Introduce a deterministic quality layer before slide construction. It must
not use generated prose, probabilistic classification, or subjective
thresholds.

The quality result contains:

- a typed trusted-view-model containing only eligible facts;
- an omission entry for every rejected candidate;
- a stable omission reason:
  `missing-source`, `non-finite`, `zero-denominator`, `source-mismatch`,
  `insufficient-candidates`, `non-positive-winner`, `tied-winner`,
  `outside-event-window`, `incomplete-coverage`, or `duplicate-fact`.

### API Evidence Contract

The Wrapped API must expose enough evidence to validate preselected leaders.
Represent every leader selection as `EventWrappedLeaderResultDto`:

```ts
interface EventWrappedLeaderResultDto {
  winner: EventWrappedLeaderDto | null;
  candidateCount: number;
  tiedWinnerCount: number;
}
```

The service computes both counts from the same finite comparable candidate set
used by the selector, independently of whether a positive winner exists.
`candidateCount` is zero only for an empty comparable set. `tiedWinnerCount`
counts candidates sharing the maximum primary value and is zero for an empty
set. `winner` is null when the set is empty, the maximum is non-positive, or
the winning value is tied.

Replace every field in `EventWrappedLeadersDto` and every hero `topHunter`
field with this result object. Generated API-client models must be regenerated
through the existing Orval workflow.

The client derives the ranking-based kill total by summing
`data.heroes[].totalKills`; those hero totals already come from the complete
event ranking rows. It compares that sum with the canonical overview kill total
from recorded kill entities. No second ranking request is introduced.

### Required Checks

- Compare the canonical overview kill total with the ranking-based total
  derived by summing all hero kill totals. The source is consistent only when
  both finite integer totals exactly match. Retain the canonical overview fact
  when they differ, but omit every leader or hero superlative derived from the
  ranking source.
- Treat tracked activity duration and map-assignment duration as different
  metrics. Never describe assignment time as active play time.
- Bound assignment durations to the authoritative event interval:
  `event.startsAt` through `event.endsAt ?? generatedAt`. Parse ISO timestamps
  as absolute instants. Both boundaries are inclusive. If `startsAt` is absent,
  invalid, or later than the end instant, omit assignment-duration facts. A
  duration is eligible only when it is finite, non-negative, and no longer
  than the interval in seconds.
- Treat `totalLoots` as loot records/screens and rarity totals as item counts.
  Label them separately and never imply their sums must match.
- Show a preselected leader only when its source is consistent,
  `candidateCount >= 2`, `tiedWinnerCount === 1`, `winner` is non-null, and the
  winning value is greater than zero. Use the evidence counts to distinguish
  empty, insufficient, tied, and non-positive results.
- Classify leader omissions in this order: `source-mismatch`;
  `insufficient-candidates` when `candidateCount < 2`; `non-positive-winner`
  when the maximum is not positive; then `tied-winner` when
  `tiedWinnerCount > 1`. A tied non-positive set is therefore classified as
  `non-positive-winner`.
- Show a rate metric only when its numerator is finite and non-negative and
  its denominator is a finite integer greater than zero.
- Coverage is complete only when `totalWindowCount` and `totalWindowSeconds`
  are greater than zero; all coverage duration fields are finite and
  non-negative; and `coveragePercentage` is finite and within 0–100 inclusive.
- Omit zero-value rarity and leader slides unless zero is itself the intended
  conclusion.
- Do not repeat a fact across ordinary slides. The finale is the only allowed
  repetition: it recaps up to three facts already shown and introduces no new
  metric or claim.
- Identify duplicates by stable fact IDs defined in the trusted view model,
  never by translated text or formatted values.
- Use Polish i18n pluralization for heroes, maps, kills, points, loot records,
  and items.

### Copy Rules

All copy remains in i18n. Use a small set of controlled templates.

Good:

- "Zarejestrowano 25 bić."
- "Największy ruch był o 21:00 — 5 bić w ciągu godziny."
- "6 zapisów łupu zawierało 7 przedmiotów o wyróżnionej rzadkości."

Avoid:

- unsupported emotional claims;
- slang such as "indywidualni kozacy";
- filler such as "tutaj robiło się głośno";
- causal claims inferred from correlation;
- superlatives based on a single participant or hero.

When data are insufficient, say so directly and neutrally.

## Component Boundaries

Keep one React component per file.

### `event-summary-dialog.tsx`

Owns:

- the query;
- open and close behavior;
- selected slide index;
- integration of the stage, autoplay, and error states.

It must not contain slide-specific markup or quality rules.

### `wrapped-data-quality.ts`

A pure module that:

- normalizes the API response;
- derives source comparisons and validity flags;
- exposes a typed trusted-view-model and exact typed reasons for omissions.

The module must not produce JSX or user-facing copy.

### `build-wrapped-slides.ts`

A pure builder that:

- receives the trusted view model and translation function;
- selects, orders, and deduplicates candidate slides;
- returns typed slide descriptors;
- guarantees a valid dynamic count.

### `event-wrapped-stage.tsx`

Renders:

- progress segments;
- event context;
- active slide;
- close, previous, and next controls;
- playback state.

It owns layout and accessibility but not query state.

### `event-wrapped-slide.tsx`

Renders a small closed set of slide variants:

- opening;
- metric;
- leader;
- rarity composition;
- hero spotlight;
- finale.

Variants share one visual grammar and do not become independent card systems.

### `use-wrapped-autoplay.ts`

Owns:

- timing;
- pause reasons;
- visibility state;
- manual-navigation reset;
- reduced-motion behavior;
- cleanup of timers and listeners.

Its interface accepts the active stable slide ID, enabled state, fixed duration,
stage container ref, and `onAdvance` callback. It returns elapsed progress,
explicit paused state, a pause/play toggle, and a reset function.

The hook owns `visibilitychange` and `selectionchange` listeners. It considers
text selected only when the selection's anchor or focus node is inside the
stage container. The stage supplies pointer-enter/leave and focus-in/out events
to the hook's transient pause handlers. Manual navigation calls the returned
reset function after selecting a slide. No nested menu or child dialog is in
scope for this iteration.

## Loading, Refetch, Error, and Sparse Data

- Initial loading renders the stable presentation frame without progress
  segments, metrics, or autoplay.
- A background refetch keeps the current successful slides visible. On
  success, rebuild the sequence and retain the active slide by stable slide ID.
  If that ID no longer exists, select
  `Math.min(previousIndex, newSlides.length - 1)` and reset elapsed progress to
  zero. The sparse-data branch handles a rebuilt sequence with no slides before
  this calculation runs.
- A background refetch failure keeps the previous successful data. An initial
  failure uses the shared error/empty-state language with a retry action.
- With fewer than three trustworthy fact candidates, show a concise
  "not enough consistent data" summary and do not start autoplay.
- Missing images never block a slide; use the existing avatar or NPC fallback.
- Closing and reopening starts from the first slide.

## Accessibility

- Keep focus on the control the user activated; slide changes never move focus
  automatically.
- Announce the active slide's context label, primary fact, and qualifier once
  through a polite, atomic live region after the transition completes.
- Every progress segment is a button with an accessible slide label and
  `aria-current="step"` on the active segment.
- Pause/play, previous, next, and close controls have visible text or
  accessible names and visible focus rings.
- Autoplay never resumes while focus remains inside the presentation.
- Reduced motion disables autoplay and directional movement.

## Motion

Motion communicates sequence only:

- forward slides enter from the right and exit left;
- backward slides reverse the direction;
- progress fills linearly while autoplay runs;
- paused progress remains at its current value;
- no floating blobs, shimmer sweeps, bouncing icons, or perpetual ambient
  motion.

Use transform and opacity only. Reduced motion switches to a brief fade and
manual navigation.

## Testing

### Unit Tests

Cover:

- kill-source mismatches;
- assignment duration bounds;
- loot-record versus rarity-item semantics;
- leader eligibility;
- empty, single-candidate, uniquely positive, tied-positive, uniquely
  non-positive, and tied non-positive leader sets;
- zero denominators and insufficient candidate counts;
- deduplication and dynamic ordering;
- Polish pluralization inputs;
- sparse and fully invalid responses.

### Component Tests

Cover:

- arrow-key and direct-step navigation;
- close behavior and focus restoration;
- autoplay progression;
- autoplay stopping on the final slide;
- first- and final-slide behavior for every navigation mechanism;
- all pause reasons;
- explicit pause/play persistence;
- manual reset of progress;
- reduced-motion behavior;
- live-region announcements and progress semantics;
- refetches that remove or reorder the active slide;
- retry and insufficient-data states.

### Browser Verification

Verify the real event route with:

- representative complete data;
- the current inconsistent sample;
- a one-participant/one-hero sample;
- no loot and no coverage;
- desktop, tablet, and mobile viewports.

Check that no slide scrolls, controls remain reachable, focus order is logical,
and the background event page does not compete with the presentation.

## Release Scope

Expected affected workspaces:

- `@lootlog/web` for the dialog, slide system, translations, and tests;
- `@lootlog/api` for leader evidence fields and their aggregation tests;
- `@lootlog/api-client` for regenerated Wrapped response models.

Add a patch changeset for the compatible web behavior change. Treat the
intentional leader-result contract replacement and its generated client update
according to the repository's Changesets policy for breaking public contracts.
