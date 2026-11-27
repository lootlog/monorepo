# 0021. Client data freshness and state

Status: accepted

## Context

The Web app and the Game client keep server state in a TanStack Query cache
that realtime gateway payloads, optimistic mutations, forced refreshes and
in-flight HTTP reads all write to. The order of those writers decides whether
the cache ends with the newest state. Multi-world reads, combined searches,
rolling statistics and a lagging search projection can each leave a page with
only part of an answer, and Lootlog must show that as unknown or stale rather
than as current truth.

Client state also crosses boundaries that outlive a render: the Organization
being viewed, several browser tabs sharing storage, and URLs that players
bookmark and share publicly. The public wiki adds a Worker that holds the
catalog service token and edge-caches its answers.

## Decisions

### Cache write ordering

- **`useRefreshJob`** (`apps/web/src/hooks/utils/use-refresh-job.tsx`): in-flight latest-job fetches are cancelled before a realtime update is written with `setQueryData`, so an older fetch cannot overwrite it. An update naming an unseen job invalidates the query, because progress updates omit the cooldown and other fields only the full read carries.
- **`refreshCurrentUserGuilds`** (`apps/web/src/lib/current-user-guilds.ts`): in-flight guild-list reads are cancelled before the forced refresh is written, because a read already in flight may return the API's older cached list.
- **`writeHeroSightingToCache`** and **`getHeroSightingPaths`** (`apps/web/src/features/guild/hero-sightings/hero-sighting-cache.ts`): writes reach every cache path of an Organization (its id and its vanity URL), skip boards still loading, and cancel then refetch an in-flight board, so a late HTTP response cannot overwrite a newer realtime update.
- **`useTimersSocket`** (`apps/web/src/features/guild/timers/use-timers-socket.ts`): an in-flight list fetch is cancelled before a delivered timer is patched, so a late snapshot cannot overwrite the event or a permission reset. A patch changes one timer, so expiry bookkeeping still dates from the last HTTP snapshot.
- **`isTimerView`** (`apps/web/src/features/guild/timers/use-timers-socket.ts`) and **`decodeHeroSightingView`** (`apps/web/src/features/guild/hero-sightings/use-hero-sightings-socket.ts`): the fields read from each gateway payload are validated before the cache write, because the payload crosses a service boundary and an incremental write bypasses the HTTP client's typing.
- **`RefreshMembersButton`** (`apps/web/src/features/guild/settings/members/components/refresh-members-button.tsx`): the start response is written into the latest-refresh-job cache only when the cached job has a different id, because gateway progress for the same job can arrive before the POST response.
- **`invalidateTimerHistory`** (`apps/game-client/src/features/timers/utils/invalidate-timer-history.ts`): history queries are cancelled synchronously before invalidation, because cancelling reverts state at once and stops an older in-flight response from marking the history fresh again. Closed popovers stay invalidated until next opened.
- **`useUserThemes`** (`apps/web/src/hooks/api/user/use-user-themes.ts`): deleting a theme also invalidates the user preferences query, because the server moves a stored selection of the deleted theme to its base theme.
- **`LIFETIME_KILL_STATS_PARAMS`** (`apps/web/src/features/kills/lifetime-kill-stats-params.ts`): `period: "all"` is passed explicitly, because the API counts only the last 7 days without it; one shared params object also shares one cache entry.

### Optimistic writes and query defaults

- **`mutateFromCurrent`** (`apps/web/src/hooks/api/user/use-user-preferences.ts`): the next preferences are derived from the cache at call time, so rapid changes build on the previous optimistic state instead of a value a render captured. The Game client uses the same pattern in `GuildSwitcher` (`apps/game-client/src/components/guild-switcher.tsx`), `toggleGuildVisibility` (`apps/game-client/src/features/settings/components/servers/server-visibility-settings-tab.tsx`), `useCharacterCatchingSelection` (`apps/game-client/src/hooks/use-character-catching-selection.ts`) and `useUpdateNotificationMutes` (`apps/game-client/src/lib/settings-persistence/use-notification-mutes.ts`).
- **`useDetectorRoutingForm`** (`apps/game-client/src/features/settings/components/detector/use-detector-routing-form.ts`): the rule list is read from the cache at each edit, not from props, because a re-render lags the optimistic cache by a tick and would drop the previous click of a rapid series.
- **`useUpdateUserPreferences`** (`apps/game-client/src/hooks/api/use-user-preferences.tsx`) and **`useUpdateLootlogCharactersConfig`** (`apps/game-client/src/hooks/api/use-update-lootlog-characters-config.tsx`): writes are serialized per mutation scope so the last click wins. Updaters build payloads from the cache before any await; a response replaces the cache only when no later write is queued; a failure does not roll back while a queued write derived from it will re-send it; and the full-document response replaces the cache instead of triggering a refetch.
- **`useLootLike`** (`apps/web/src/features/guild/loots-list/components/loots-list/use-loot-like.ts`): the heart flips optimistically, requests per loot are serialized through a module-level `pendingRequests` map shared by tile and dialog, and only the last request to settle replaces the optimistic likes.
- **`isLastSave`** (`apps/web/src/features/user/dashboard/feed/use-activity-feed-settings.ts`): only the last pending save replaces cached settings, because a queued change applies its optimistic value before earlier saves answer.
- **`applySettingsOperation`** (`apps/game-client/src/lib/settings-persistence/settings-documents.ts`): optimistic settings updates mirror the server patch semantics exactly: `set` overwrites effective values, `unset` falls back to catalog defaults, and touched fields point at the operation scope.
- **`createSettingsPatchQueue`** (`apps/game-client/src/lib/settings-persistence/settings-patch-queue.ts`): one request is in flight and batches go strictly in order, because the API accepts one operation per document and one id per scope type per request. Dependent patches and ancestor-reset-then-child-write sequences go into separate requests, and patches queued during a refetch are re-applied on top so forms never show stale server state.
- **`flushSettingsOnPageHide`** (`apps/game-client/src/lib/settings-persistence/settings-patch-client.ts`): debounced writes flush on `pagehide`, because a character or account switch reloads the page. The userscript sends them with `keepalive` and the extension hands them to its background worker; if a write is already in flight the rest are dropped rather than sent out of order.
- **`DEFAULT_QUERY_GC_TIME`** (`apps/web/src/lib/query-client.ts`): unused queries are collected after 10 minutes, because nothing persists the cache and the app stays open all day, so every filter, search and cursor variation would otherwise stay until the tab closes.
- **`queryClient`** (`apps/web/src/lib/query-client.ts`): mutations default to `retry: 0`, because writes carry no idempotency key and re-sending one whose response was lost can create a second record. Only idempotent mutations opt into retries.

### Unknown, partial and stale data

- **`useGuildHeroSightings`** (`apps/web/src/features/guild/hero-sightings/use-guild-hero-sightings.ts`) and **`useGuildTimers`** (`apps/web/src/features/guild/timers/use-guild-timers.ts`): no all-worlds board or list is exposed until every world's query has answered, because a partial one would read as complete.
- **`useLootSearchCommand`** (`apps/web/src/features/guild/loots-list/components/loots-filters/use-loot-search-command.ts`): the search reports an error when any combined catalog or player query fails, because partial hits would read as complete. `handleDirectSearch` matches the raw term against the loot database and stays offered while service results load, because the search projection can lag or miss a name entirely.
- **`isFailed`** (`apps/web/src/features/guild/loots-list/components/loots-list/use-live-loot-list.ts`): the list becomes a failure state only when nothing was loaded; a failed page or refresh keeps accepted records on screen with a retry row.
- **`summarizeWeek`** (`apps/web/src/features/user/dashboard/components/dashboard-today.tsx`) and **`summarizeWeeks`** (`apps/web/src/features/user/statistics/summarize-weeks.ts`): totals are `null` when analytics are missing, failed or outside Lootlog's history, and a day the API cannot count stays unknown instead of zero. Week comparisons use only the same weekdays of both weeks up to today.
- **`summarizePlayTime`** (`apps/web/src/features/user/statistics/summarize-play-time.ts`): kills per hour count only whole days with known online time, because a partly covered day would set a full day's kills against too little time.
- **`UserNotifications`** (`apps/web/src/features/user/notifications/notifications.tsx`): nothing actionable renders until both targets and watched items have data, because it would otherwise offer to create a DM target that may already exist. A retry paused offline has neither data nor error.
- **`ImportThemeDialog`** (`apps/web/src/features/user/settings/appearance/import-theme-dialog.tsx`): theme import ignores placeholder data, because the placeholder is the previous link's theme and must never be previewed or saved under the new link.

### Live lists

- **`lootMatchesListParams`** (`apps/web/src/features/guild/loots-list/components/loots-list/loot-list-cache.ts`): the client mirrors the API's loot list filters so realtime snapshots can be placed without a request, and returns `undefined` (defer to the server) for free-text search, which the server matches against resolved names. It changes together with the API filters.
- **`placeLoot`** (`apps/web/src/features/guild/loots-list/components/loots-list/loot-list-cache.ts`): lists are ordered by descending id, so a loot older than every loaded one belongs to an unread page and is inserted only when the list is complete.
- **`createLootListReconciliation`** (`apps/web/src/features/guild/loots-list/components/loots-list/loot-list-reconciliation.ts`): each open list has one dirty bit and one delayed, jittered timer, so reconciliation cost is independent of event volume, duplicates, reconnection and redelivery.
- **`useLiveLootList`** (`apps/web/src/features/guild/loots-list/components/loots-list/use-live-loot-list.ts`): realtime snapshots wait as pending, tagged with their Organization, until the list query is idle (read from the cache, not render state) and the reader is at the top, because a running fetch would replace the pages they land in. Unfinished reconciliation carries over to a new filter, world or connection, and the scroll position resets before reconciliation decides whether it may refresh.
- **`FEED_WINDOW_MS`**, **`groupFeedItems`** and **`matchesFeedFilters`** (`apps/web/src/features/user/dashboard/feed/live-feed-state.ts`): the live feed reuses the API's 24-hour window, grouping by `groupKey`, loot-to-closest-kill attachment and item filters, so live entries merge like history. They change together with the API.
- **`live-feed-state.ts`** (`apps/web/src/features/user/dashboard/feed/live-feed-state.ts`): a hidden kill is kept only while its loot can still arrive and reveal it, so a loot-only feed never holds a day of kills in memory. Only a `revalidatedAccess` snapshot replaces what the reader is reading, because ordinary refreshes can drop entries under the rolling time and count limit.
- **`useLiveFeed`** (`apps/web/src/features/user/dashboard/feed/use-live-feed.ts`): `accessRefreshTimer` waits 5 seconds after the last permission notification before fetching a replacement snapshot, because permission updates arrive in bursts.

### Cursors and route loading

- **`useCursorStack`** (`apps/web/src/hooks/use-cursor-stack.ts`): the stack resets to the first page synchronously during render whenever `resetKey` changes, because a cursor is valid only for the filters and sort that issued it. `useMemberStatsPage` (`apps/web/src/features/guild/stats/use-member-stats-page.ts`) keys it by serialized filters and the personal kills page (`apps/web/src/features/user/kills/kills.tsx`) by filters, sort order and sort field.
- **`useResetRejectedBattlePanelCursor`** (`apps/web/src/features/user/battle-panel/components/use-reset-rejected-battle-panel-cursor.ts`): a cursor the API rejects returns the page to the start, so bookmarks from before a cursor format change do not leave it stuck on an error.
- **Router options** (`apps/web/src/App.tsx`): `defaultPendingMs` is 50 ms, because parent layouts with cached data need a tick to settle before their generic skeleton would replace the page's own. `defaultPendingMinMs` is 0, because placeholders reveal themselves late through `animate-skeleton` and fast responses never flash one.
- **`withRouteLoaderCancellation`** (`apps/web/src/lib/router/route-errors.ts`): a loader is retried up to `MAX_ROUTE_LOADER_ATTEMPTS` (3), because a query it awaits can be cancelled while the route is active; TanStack Query reverts the query, so loading again refetches it.
- **`usePresentedPathname`** (`apps/web/src/lib/router/use-presented-location.ts`): shell chrome reads the path from rendered matches, because `useLocation` moves to the target as soon as navigation starts and would pair one page with another's address.
- **`prefetchEventDetailQueries`** (`apps/web/src/features/guild/events/event-route-prefetch.ts`): the prefetch swallows errors from `ensureQueryData(getShowEventQueryOptions)`, because the parent layout loader owns that request and its errors; the prefetch only joins the flight to learn the event's world.

### Organization-scoped and stored state

- **`GuildLayout`** (`apps/web/src/routes/_authenticated/$guildId.tsx`): the `<Outlet />` renders inside a `Fragment` keyed by `guildId`, so another Organization's pages mount fresh. `GuildPinnedEventsSection` (`apps/web/src/components/layout/guilds-sidebar-nav.tsx`) is keyed the same way, so one server's pins never stand in for another's while loading.
- **`useGuildWorld`** (`apps/web/src/hooks/context/use-guild-world.ts`): the world comes from the router's own search and from storage read synchronously with `useSyncExternalStore`, so one Organization's world is never paired with another's, even for one render. `toGuildWorld` reads an empty stored world as all worlds, which keeps preferences from when a world had to be picked readable.
- **`StatsCardSettingsSection`** (`apps/web/src/features/guild/settings/general/stats-card-settings-section.tsx`): the refresh cooldown (`nextRefresh`) is stored per Organization id, so one server's cooldown never shows on another's settings.
- **`useWhatsNew`** (`apps/web/src/components/whats-new/use-whats-new.ts`): `markStoredSeen` is a functional update that rereads storage, so seen ids written by another tab are merged.
- **`forgetLastOrganization`** (`apps/web/src/lib/last-organization.ts`): the stored Organization is removed only if it still equals the forgotten one, because another tab may have selected a different one meanwhile.
- **`Reservations`** (`apps/web/src/features/guild/reservations/reservations.tsx`): the status filter is deliberately not persisted, because a narrowing filter left from an earlier visit hid occupied spots whose future slots were still open.

### Links and browser history

- **Head-to-head redirects** (`apps/web/src/routes/_authenticated/@me/battle-panel/abyss_.h2h.tsx`, `statistics_.h2h.tsx`, `statistics_.matchmaking-h2h.tsx`): retired routes stay as redirect-only routes so old shared links open their replacements.
- **`knownValues`** (`apps/web/src/features/guild/loots-list/components/loots-list/loot-list-query.ts`): URL filter values missing from the generated enum are dropped, because the API rejects unknown values and an old bookmark must not break the list.
- **`findAbyssSeason`** (`apps/web/src/features/user/battle-panel/battle-panel-abyss/abyss-formatters.ts`): a season also matches by the first-battle part of its `abyss-<first>-<last>` id, because the last battle moves while a season lasts.
- **`updateFilters`** (`apps/web/src/features/guild/activity-logs/components/use-activity-logs-filter-model.ts`), **`StatisticsQuerySearch`** (`apps/web/src/features/user/statistics/statistics-query-search.tsx`) and **`WhatsNew`** (`apps/web/src/features/whats-new/whats-new.tsx`): typing into a search mirrored in the URL replaces the history entry, because one entry per keystroke would trap the Back button.
- **`readPageSegment`** and **`isNpcCatalogKey`** (`apps/wiki/src/lib/catalog-links.ts`): item segments accept an id without a name slug, and catalog keys such as `pl_template_257636_2` still address NPC pages, because old links carry them. The item and NPC routes (`apps/wiki/src/routes/items_.$itemSlug.tsx`, `apps/wiki/src/routes/npcs_.$npcSlug.tsx`) redirect old formats and outdated name slugs to the canonical id-and-name URL.
- **`encodeEquipmentSet`** and **`LEGACY_EQUIPMENT_SET_PARAM`** (`apps/wiki/src/lib/equipment-set.ts`): the shared set value format (`h250_h12345u5ds_b678u2-critred_168x10`) is a public contract that must stay parseable, and links are still read from the parameter name used before the rename.
- **Wiki search parameters** (`apps/wiki/src/lib/items-search.ts`, `apps/wiki/src/lib/npcs-search.ts`, `apps/wiki/src/routes/calculators.tsx`): level parameters accept strings as well as numbers, `validateNpcsSearch` still reads several types from a link, and per-calculator anchors still open their calculator, because older shared links carry those forms.

### Wiki catalog access

- **`catalogUpstreamUrl`** (`apps/wiki/src/lib/catalog-upstream.ts`): the catalog token stays on the Worker and browsers read only through `/api/catalog`. The Worker proxies only the reads the wiki's pages make, with only each read's parameters in a fixed order, so nothing else is reachable with its token and equivalent queries share one cached answer.
- **Catalog proxy route** (`apps/wiki/src/routes/api.catalog.$.ts`): answers are identical for every reader and change a few times a day, so the Worker caches them briefly at the edge. The cache is keyed by the upstream URL, which is safe only because the token travels in a header.
- **`useSignedInCatalogRequest`** (`apps/wiki/src/hooks/use-signed-in-catalog-request.ts`): calls made as the signed-in User go directly to the catalog with the shared auth cookie, because the Worker's token belongs to no User.
- **`CATALOG_MAX_TOTAL_HITS`** (`apps/wiki/src/lib/catalog-pages.ts`): the cap equals the catalog's Meilisearch `maxTotalHits`, so a total that reaches it is shown as "at least this many".
- **`canonicalLink`** (`apps/wiki/src/lib/link-preview.ts`): canonical URLs always point at the production wiki without page options, even on development hosts, so search engines index one address per page.
- **Sitemap route** (`apps/wiki/src/routes/sitemap[.]xml.ts`): the sitemap fails rather than serving a partial list, because a partial sitemap tells search engines the missing pages are gone.

### Forms and domain rules

- **`RuleFormFields`** (`apps/web/src/features/guild/notifications/utils/notification-rule-form.schema.ts`) and **`watchFormSchema`** (`apps/web/src/features/user/notifications/components/use-watch-item-form.ts`): cross-field rules live in one `Schema.makeFilter` over permissive fields, because Effect struct filters run only after every field decodes; a submit then reports every problem at once.
- **`TEMPLATE_NPC_SELECTION_PREFIX`** and **`toTimerNpcSearchSelection`** (`apps/web/src/features/guild/notifications/utils/notification-rule-form-npc.utils.ts`): a timer NPC id is stored as a bare number and a template id with the `template:` prefix, because a template selects every spawn and a timer id one. A bare timer id is offered only for one-world rules, so an all-world rule never silently narrows to one spawn.
- **`applyGroupRulebook`** (`apps/web/src/features/guild/events/utils/scoring-rule-templates.ts`): base rules are ordered from lowest to highest base, because the last matching base rule wins and a solo member also matches the small-group rule. Existing bonuses follow the base rules, and the cap is raised so the highest base with every bonus is not cut.
- **`isSightedHeroTimer`** (`apps/web/src/features/guild/hero-sightings/find-timer-hero-sighting.ts`): a hero timer matches a sighting by normalized hero name on one world, because the detector answer names only the hero.
- **`HeroSightingAddDialog`** (`apps/web/src/features/guild/hero-sightings/hero-sighting-add-dialog.tsx`): a hand-added hero is sent as `SPAWNING` unless a pasted detector answer for that hero says otherwise, because players do not stop to write down a roaming hero.
- **`ActivityLogsTable`** (`apps/web/src/features/guild/activity-logs/components/activity-logs-table.tsx`): rows always render the acting Member (`MemberIdentity` with a `discordId` fallback), because an audit entry must name who acted even when the Member is no longer known.

### Parity with the Game client

- **`keepOverdueTimers`** (`apps/web/src/features/guild/timers/keep-overdue-timers.ts`), **`SingleTimer`** (`apps/web/src/features/guild/timers/single-timer.tsx`) and **`useTimerExpiry`** (`apps/web/src/features/guild/timers/use-timer-expiry.ts`): Web timers follow the Game client's removal delay. The server lists an unpinned timer only until its maximum spawn time, the timer hides once expired, a refetch runs after max spawn plus the delay, and overdue timers already listed survive a refetch inside the delay.
- **`useGuildTimers`** (`apps/web/src/features/guild/timers/use-guild-timers.ts`): timers are read one world at a time, like the Game client, so each world keeps its own pinned expired timers.
- **`RESPONSE_LATENCY_ALLOWANCE_MS`** (`apps/web/src/features/guild/timers/use-timer-expiry.ts`): 60 seconds are allowed when judging whether a response already reflects an expiry, because the server evaluated it before the response arrived.
- **`ONLINE_NOW_MS`** (`apps/web/src/features/user/dashboard/components/dashboard-today.tsx`): a player counts as online for 5 minutes after the last report, because the Game client reports presence about once a minute.
- **`getOnboardingSteps`** (`apps/web/src/features/user/dashboard/onboarding/onboarding-steps.ts`): recorded kills or battles are the only proof the Game client works, because the API exposes no other signal. The checklist hides while activity is unknown and can be dismissed locally for players whose activity never reaches Lootlog.

## Consequences

- Every cache writer outside a query function must cancel or defer around in-flight reads; a new realtime handler that skips this can show older state after newer state.
- Optimistic updates read the cache at write time, never render values, and mirror server semantics exactly.
- Code that mirrors API rules (loot list filters, feed window and grouping, timer removal delay) must change in the same change as the API.
- Partial answers render as unknown, failed or incomplete; new aggregates need the same treatment.
- URL formats, shared wiki values and query parameters are public contracts; changes keep older forms readable or redirect them.
- State tied to an Organization is keyed by it, and shared storage writes merge with other tabs.
