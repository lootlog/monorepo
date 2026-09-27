# Event kill history

`makeEventKillHistory` owns authorized lists, details and timelines. It resolves
the Organization, event, visible heroes and optional member before selecting a
page or reading the 10-second list cache. Lists use `(killedAt DESC, id DESC)`
and a matching tuple continuation condition.

The new `GET /guilds/:guildId/events/:eventId/kill-history` endpoint returns
compact event or member summaries. Its page, participant counts and selected
member's points come from one SQL statement. Versioned cursors carry the
boundary and filter scope, so continuing does not require the boundary row to
exist. Each request applies current permissions; pagination does not freeze a
snapshot.

Details and timelines keep their deployed contracts and remain uncached. They
use separate projections, preserving saved points, snapshots, fallbacks and
the existing distinction between closure time and the end of scoring.

## Retiring the legacy lists

The Web event, member and recent-kill hooks already call `listEventKillHistory`.
The Game client has no runtime callers of the three old list operations. This
does **not** establish that deployed clients or external integrations have
migrated: the public SDK still exports those operations.

Remove the adapters only after the new API and clients are deployed, supported
SDK/API-key integrations have migrated, and production request evidence shows
the old routes are unused over the agreed compatibility window. Account for
open browser sessions and rollback to older client releases. Retirement is a
separate breaking API change; announce it in the contract changelog and follow
the SDK release policy.

All three routes below share the prefix `/guilds/:guildId/events/:eventId`:

| Deprecated GET route       | Replacement query on `/kill-history` |
| -------------------------- | ------------------------------------ |
| `/kills`                   | Optional `heroId`                    |
| `/members/:memberId/kills` | `memberId`, optionally `heroId`      |
| `/heroes/:heroId/kills`    | `heroId`                             |

Search for `TODO(kill-history-legacy)` to find the retirement boundaries.
Paths below are relative to the repository root.

| Owner                                                                                                          | Remove after retirement                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/http-api/contracts/events/api.ts` and `apps/api/src/http-api/handlers/events/events.handlers.ts` | The three `EventsRankingControllerGet{Event,Member,Hero}KillHistory` route definitions and handlers, plus unused imports.                                                                                                                                                                      |
| `apps/api/src/events/history/event-kill-history.ts`                                                            | `legacyPage`, `prepareLegacy`, `legacyEvent`, `legacyMember`, their returned properties and legacy imports, including `groupBy`. Their `legacy-kill-history:v3` and `legacy-member-kill-history:v3` cache entries expire naturally after 10 seconds.                                           |
| `apps/api/src/events/history/event-kill-history.cursor.ts`                                                     | `decodeLegacyHistoryCursor`.                                                                                                                                                                                                                                                                   |
| `apps/api/src/events/history/event-kill-history.store.ts`                                                      | `findPage`, `findAnchor`, `findHeroes` and their returned properties.                                                                                                                                                                                                                          |
| `apps/api/src/events/history/event-kill-history.projection.ts`                                                 | `buildKillPointMapDataByKillMember`, `getPresenceByMapId`, `MapPresenceData`, `KillPointMapDataEntry`, and the returned map-hydration method.                                                                                                                                                  |
| `apps/api/src/events/kills/event-kill-response.schema.ts`                                                      | `EventKillHistoryEntryResponse`, `EventKillHistoryResponse`, `EventMemberKillHistoryEntryResponse`, `EventMemberKillHistoryResponse`. Retain the rest of this file.                                                                                                                            |
| `apps/api/src/contracts/events/schemas.ts`                                                                     | Legacy `EventKillHistoryResponse`, `EventMemberKillHistoryResponse`, `EventKillHistoryQuery`, `HeroKillHistoryQuery`, `EventMemberPath`, and their type exports. Also remove private `KillParticipation`, `EventMapParticipation`, `KillHistoryBonusBreakdown` and `MemberKillBonusBreakdown`. |
| `apps/api/src/openapi/generate-effect-openapi.ts`                                                              | The two legacy nullable-component names `EventKillHistoryResponseDto__schema0` and `EventMemberKillHistoryResponseDto__schema0`. Retain `KillHistoryBonusBreakdown`, which names the new API's JSON component.                                                                                 |
| `packages/schema/src/public-api-policy.ts`                                                                     | The three matching legacy list operations.                                                                                                                                                                                                                                                     |
| `packages/client/scripts/check-openapi-parity.ts` and its tests                                                | Replace the `LEGACY_KILL_HISTORY_OPERATIONS` status/deprecation allowances with explicit, verified retirement expectations. Keep unrelated parity checks intact.                                                                                                                               |
| `apps/web/src/features/guild/events/hooks/mutations/invalidate-kill-queries.ts`                                | The three legacy list matches and the now-unused `getEventKillsPath` and `getEventMembersPathPrefix` helpers.                                                                                                                                                                                  |

Once the legacy callers are gone, also remove the unused optional `memberId`
filter from store `findPoints`, the `heroNpcIds` filter from `findAssignments`,
and the exposed `findPoints`, `findMapsForHeroes` and
`getEffectiveWindowStartByKillId` properties. Keep the underlying functions:
details still use them internally.

## Keep after retirement

- `list`, `authorize`, `detail`, `timeline`, the new cursor codec and parsers.
- `orderedKills`, `pageConditions`, `findLeanPage`, `findPoints`, kill-detail,
  map, assignment and window-summary queries. `findKillDetail` calls
  `findPoints`; `findMaps` calls `findMapsForHeroes`.
- Detail projections, `normalizeKillPointTracking`,
  `getEffectiveWindowStartByKillId` and shared tracking-window helpers.
- Detail/timeline routes under `/heroes/:heroId/kills/:killId`, point-edit
  routes, participant schemas used by `KillDetailResponse`, and Web navigation
  routes ending in `/kills`. A `/kills` substring alone does not identify a
  legacy list API.
- Cache invalidation after kills and point edits, global permission/reconnect
  handling, the new indexes and the recorded index migration.
- Kill persistence, scoring, rankings and the separate respawn-summary history.

## Verification when removing the adapters

Remove legacy UUID/list assertions from `event-kill-history.test.ts` and
`test/http-boundary.e2e-spec.ts`, and remove legacy methods from HTTP domain-error
fixtures. Update `contracts/events/schemas.spec.ts` and the old list response
schema tests without deleting unrelated contract coverage. Move the shared Date
serialization regression in `event-read-cache.service.spec.ts` to the new list
or retained detail schema.

Keep pagination, current-access/cache isolation, point-edit invalidation,
snapshot/fallback, detail/timeline and Web recovery tests. Search again for all
three operation names and retired schema names; distinguish historical
changelog entries from executable callers.

Run relevant lint, typecheck and tests, then `bun run client:generate`. Review
the removed operations and models in OpenAPI, `packages/client` and
`packages/sdk`; do not hand-edit generated files. Run `bun run client:check`
with the generated changes committed. Update the contract changelog and release
the SDK separately from the application deployment.
