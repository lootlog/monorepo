# 0022. Web interface behaviour

Status: accepted

## Context

The Web app and the wiki are built on `@lootlog/ui` primitives that wrap Base
UI, Sonner and browser APIs. Those layers have defaults and quirks around
portals, focus, transitions, clipboard access, iOS zoom, sticky positioning and
touch input that are easy to break when code is simplified. React Compiler owns
memoization, but it cannot see that a TanStack virtualizer mutates in place.

Normal scrolling and typing must stay fast on phones, interfaces must meet
WCAG 2.2 AA, and the server-rendered wiki must hydrate without flashes or
mismatches. These decisions record why components that look over-engineered
are shaped the way they are.

## Decisions

### Shared primitives

- **`ConfirmDialog`** (`packages/ui/src/components/confirm-dialog.tsx`): click propagation stops at the content, because React events bubble through the portal to the trigger's ancestors, such as a clickable row.
- **`DialogContent`** (`packages/ui/src/components/dialog.tsx`): `DialogOverlay` renders with `forceRender`, because Base UI skips a nested dialog's backdrop and its fallback sits under the parent's, so outside clicks never closed a nested dialog.
- **Drawer `onFocus`** (`packages/ui/src/components/drawer.tsx`): a resizable drawer expands on content focus only for `:focus-visible` focus, because the focus a tap leaves when opening must not skip the medium detent.
- **`HorizontalMenu`** (`packages/ui/src/components/horizontal-menu.tsx`): reading `highlight.offsetWidth` forces a reflow that commits the snapped position before transitions return; without it the highlight flies in from the list origin.
- **`PageMarkdownActions`** (`packages/ui/src/components/page-markdown-actions.tsx`): `ClipboardItem` receives a promised Blob that fetches inside the promise, because Safari keeps the user activation only for a promised clipboard item.
- **`PopoverContent`** (`packages/ui/src/components/popover.tsx`): `FilterBarContext` resets to false, because context passes through the portal and filters inside a popup must keep their full fields.
- **`ScrollArea`** (`packages/ui/src/components/scroll-area.tsx`): the root is a flex column so the viewport scrolls inside a root sized by a max height or a flex parent; `height: 100%` resolves only against a definite height and clips the content.
- **`closeOnPress`** (`packages/ui/src/components/shared-tooltip-provider.tsx`): the shared tooltip closes and cancels pending opens on any press, because a navigating trigger leaves without a pointer or focus event and the tooltip would stay over the next page.
- **`Tooltip`** (`packages/ui/src/components/tooltip.tsx`): `disableHoverablePopup` defaults to true. Tooltips hold no controls, so they close as soon as the pointer leaves and never cover the next trigger, such as the cell above in a heatmap.
- **`useMaxWidth`** (`packages/ui/src/hooks/use-max-width.ts`): queries use `rem` like Tailwind breakpoints, so a larger browser text size switches layouts at the same points as the stylesheet.
- **`preventIosFocusZoom`** (`packages/ui/src/lib/ios-focus-zoom.ts`): `maximum-scale=1` is set only on iOS, including iPadOS reporting a Mac with touch points, because iOS zooms into focused fields below 16px yet still allows pinch zoom, while other browsers would block pinch zoom.
- **`nativeButtonForRender`** (`packages/ui/src/lib/native-button.ts`): Base UI's `nativeButton` flag is derived from the `render` element, because components defaulting it to false warn on a native `<button>` and call sites should not repeat the flag.
- **`toast`** (`packages/ui/src/lib/toast.ts`): `toast.error` stays until dismissed, with a close button and no timer, because a failure must not vanish before it is read; confirmations keep Sonner's timeout.

### React Compiler opt-outs

- **`usePageVirtualizer`** (`apps/web/src/hooks/utils/use-page-scroll.ts`): callers declare `"use no memo"`, because the virtualizer mutates in place and React Compiler skips direct `useVirtualizer` callers automatically but not callers of this wrapper. `ActivityLogs` (`apps/web/src/features/guild/activity-logs/activity-logs.tsx`), `LootsList` and `useLiveLootList` (`apps/web/src/features/guild/loots-list/components/loots-list/`) and `MembersList` (`apps/web/src/features/guild/settings/members/members-list.tsx`) opt out for this reason.
- **`BattleLogList`** (`apps/web/src/components/battle/battle-log-list.tsx`): the list opts out because it reads a virtualizer, so derived indexes such as the warriors map are built in the parent `BattleLog` (`apps/web/src/components/battle/battle-log.tsx`), where compiler caching still applies.
- **Event settings and rulebook forms** (`apps/web/src/features/guild/events/event-edit-settings-page.tsx`, `event-edit-rulebook-page.tsx`): `useForm` receives `resetOptions: { keepFieldsRef: true }`, because React Compiler memoizes the first `register` result and a reset that unregisters fields would stop typing from reaching the form.
- **`useEventSummaryDialog`** (`apps/web/src/features/guild/events/components/dialogs/use-event-summary-dialog.ts`): `wasOpen` stays React state despite `rerender-state-only-in-handlers`, because it drives the render-time slide reset on reopen and a ref would lose the committed transition.
- **`RefreshStatusProvider`** (`apps/web/src/features/guild/settings/members/contexts/refresh-status-provider.tsx`): the inline context value is allowed despite `jsx-no-constructed-context-values`, because React Compiler caches it by `failedIds` and `refreshedIds` with stable callbacks, as verified in the transformed module.
- **`useLiveFeed`** (`apps/web/src/features/user/dashboard/feed/use-live-feed.ts`): the effect disables `effect-needs-cleanup`, because its callback-owned timer is replaced only after cancellation and the cleanup clears it with every socket listener and pending fetch.

### Motion and touch

- **`TabBar`** (`apps/web/src/components/layout/tab-bar.tsx`): geometry and fades derive from the scroll-progress motion value with `useTransform`, so the bar follows scrolling on the compositor without a React render per frame. `searchRoom` stays a motion value even without search, because `useMotionTemplate` drops a literal `0` and produces an invalid `calc()` width.
- **`buildSparkStyles`** (`packages/ui/src/components/ember-sparks.tsx`): embers are seeded by their caller, such as a loot id, so they stay stable across renders, and their count stays small because each running ember costs main-thread work every frame.
- **`usePauseSparksWhileScrolling`** (`packages/ui/src/hooks/use-pause-sparks-while-scrolling.ts`): one capturing scroll listener serves every mounted ember and only toggles `data-scrolling` on the document element, so embers pause in CSS without a React render.
- **`LootDrawDialogBody`** (`apps/web/src/features/guild/loots-list/components/loot-draw/loot-draw-dialog-body.tsx`): only the draw this viewer just ran spins; while it spins the body keeps the editor's height so nothing moves under the wheel, and without motion the result shows at once.
- **`LootDrawDialog`** (`apps/web/src/features/guild/loots-list/components/loot-draw/loot-draw-dialog.tsx`): initial focus goes to the body, because focus on the item tile in the header would open its tooltip over the dialog.
- **`TOUCH_HOLD_DELAY_MS`** (`apps/web/src/components/layout/guild-reorder-item.tsx`): the 250 ms hold stays shorter than the 500 ms long press that opens the guild context menu, so a hold then move drags while a still hold opens the menu.
- **`GuildReorderItem`** (`apps/web/src/components/layout/guild-reorder-item.tsx`): `Reorder.Item`'s own drag listener is not used, because it sets `touch-action: pan-x` and blocks scrolling the rail on touch screens; mouse and pen drag immediately, touch scrolls natively and drags after a hold. Scrolling under a lifted item stops through a native `touchmove` listener with `{ passive: false }`, because React attaches it passively and cannot call `preventDefault`.

### Page scrolling and layout

- **`usePageScrollsDocument`** (`apps/web/src/hooks/utils/use-page-scroll.ts`): below `md` the document scrolls every page so mobile browsers can collapse their toolbars and offer pull-to-refresh; from `md` up the shell has a fixed height and each page scrolls its own viewport.
- **`useVisualViewportHeight`** (`apps/web/src/hooks/use-visual-viewport-height.ts`): `--visual-viewport-height` is published from `window.visualViewport`, because an on-screen keyboard shrinks only the visual viewport and `dvh` still reaches under it.
- **`useInfiniteScrollSentinel`** (`apps/web/src/hooks/utils/use-infinite-scroll-sentinel.ts`): the observer uses the document as root when the document scrolls the page, because a page viewport that grows with its content would always contain the sentinel and request every page.
- **`RESULTS_TABLE_MEDIA_QUERY`** (`apps/web/src/components/common/page-sticky-table-header.ts`): a filtered results table renders from Tailwind `xl`, where it fits beside the sidebar; narrower pages render tiles, because a wider table would need its own horizontal scroller and unpin its header from the `FilterBar`.
- **`TableScroller`** (`apps/web/src/components/common/table-scroller.tsx`): horizontal scrolling turns on only while the table overflows, because any scrolling box traps sticky descendants.
- **`BATTLE_DETAIL_COLUMN_CLASS_NAME`** (`apps/web/src/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-layout.ts`): Base UI scroll-area viewports below `xl` are forced to `overflow: visible`, because Base UI still makes them scroll containers, which would trap sticky bars.

### Virtualized lists

- **`BattleLogList`** (`apps/web/src/components/battle/battle-log-list.tsx`): jumping to a selected turn first calls `scrollToIndex` with `behavior: "auto"` to measure the destination, because estimated row heights make smooth scrolling to an unmeasured row land in the wrong place.
- **`VirtualTableSpacerRow`** (`apps/web/src/components/ui/virtual-table-spacer-row.tsx`): the spacer keeps the rows' bottom border, because under `border-collapse` a row owns half of each border and a borderless spacer shifts rendered rows by half a pixel while scrolling.
- **`ActivityLogsTable`** (`apps/web/src/features/guild/activity-logs/components/activity-logs-table.tsx`): the table uses `table-fixed` with an explicit `colgroup`, because rows mount and unmount while scrolling and content-sized columns would jump.

### Accessibility announcements

- **`CooldownAnnouncement`** (`apps/web/src/components/common/cooldown-announcement.tsx`): the live region renders unconditionally beside its control and changes text only on cooldown transitions, because a live region must stay mounted to be announced and the ticking countdown must never be read out.
- **`GuildDiscordSyncNotice`** (`apps/web/src/components/common/guild-discord-sync-notice.tsx`): the `Alert` renders with `role={undefined}` so only the description is live; an alert role would re-announce the countdown on every tick.

### Code splitting and startup

- **Chart modules** (`apps/web/src/components/common/loot-stats/loot-timeline-chart.tsx`, `loot-top-npcs-chart.tsx`, `apps/web/src/features/user/statistics/statistics-play-time-chart-content.tsx`, `statistics-week-chart-content.tsx`): Recharts is imported statically despite `prefer-dynamic-import`, because each module is itself the lazily loaded boundary and Recharts must live in the same chunk as the chart that composes it.
- **`AppErrorBoundary`** (`apps/web/src/components/router/app-error-boundary.tsx`): `componentDidCatch` calls `releaseStartupScreen()`, because the router never resolves after a crash and the startup screen would cover the recovery actions.
- **`useLottieAnimation`** (`apps/web/src/themes/cat/use-lottie-animation.ts`): the `queryClient` is passed explicitly, because loading indicators can render before the root route mounts `QueryClientProvider`.

### Browser and Base UI constraints

- **`useAnimatedInitialOpen`** (`apps/web/src/hooks/utils/use-animated-initial-open.ts`): `open` is held back for one commit, because Base UI skips the enter transition of a popup that mounts already open and lazily mounted dialogs mount on their first open.
- **`APP_LAUNCH_TIMEOUT_MS`** (`apps/web/src/lib/discord-profile.ts`): the wait for the Discord desktop app is 1 second, because browsers allow `window.open` only shortly after a click and a longer wait gets the web fallback blocked.
- **`openDiscordProfile`** (`apps/web/src/lib/discord-profile.ts`): coarse-pointer devices open the web URL directly, because the installed app claims it while an unknown `discord:` scheme on phones shows an error.
- **`notifyContextMenuClosedOnUnmount`** (`apps/web/src/features/guild/reservations/schedule/reservation-block.tsx`): `ReservationBlock` reports the menu closed on unmount, because the menu stays open during a pending cancel and the block disappears with the reservation without the menu ever closing.

### Wiki rendering and interaction

- **`ChoiceCard`** (`apps/wiki/src/components/common/choice-card.tsx`): a radio option drawn as a card keeps the native radio input, so keyboard and screen reader users can operate the group.
- **`NpcPortrait`** (`apps/wiki/src/components/common/npc-portrait.tsx`): the sprite is measured in a ref callback as well as `onLoad`, because an image cached before hydration has already loaded and never fires the event.
- **`ShowMoreResults`** (`apps/wiki/src/components/common/show-more-results.tsx`): results load the next page automatically near the end, but the button stays for keyboard users and for failed automatic loads.
- **`SetItemPicker`** (`apps/wiki/src/components/equipment/set-item-picker.tsx`) and **`WikiSearchDialog`** (`apps/wiki/src/components/layout/wiki-search-dialog.tsx`): hits kept from an earlier query stay visible but disabled, so Enter never acts on a row the field no longer asks for.
- **`WikiNavigationMenu`** (`apps/wiki/src/components/layout/wiki-navigation-menu.tsx`): the open panel closes when the bar gives way to the narrow menu, because the portaled panel would float over the narrow layout.
- **`wikiThemePersistence`** (`apps/wiki/src/config/theme-cookie.ts`): the applied theme is stored in cookies named like the Web app's storage keys, so the server renders the User's theme and a reload never flashes the default.
- **`useSharedStoredState`** (`apps/wiki/src/hooks/use-shared-stored-state.ts`): the server renders `empty` and the real value is read after hydration, so first markup matches. Reading a shared link consumes it from the address bar, so it is read exactly once even when Strict Mode runs the effect twice.
- **`createQueryClient`** (`apps/wiki/src/lib/query-client.ts`): server renders use a per-request cache that never retries, leaving a slow or failing query to the browser. The browser keeps server-sent data at least until hydration so it does not refetch on load; development refetches through `staleTime` instead.

## Consequences

- Simplifying a primitive or removing a "redundant" line (a reflow read, a `forceRender`, a native listener) needs a check against the quirk it works around.
- Every new caller of `usePageVirtualizer` must declare `"use no memo"`; lint suppressions carry their reason.
- Scroll-linked visuals stay in motion values or CSS state, never React state.
- Any new scrolling wrapper around a results table or a sticky element breaks pinning; tables give way to tiles below `xl`.
- Live regions stay mounted and announce transitions only.
- Wiki components must render identical markup on the server and on first client render.
