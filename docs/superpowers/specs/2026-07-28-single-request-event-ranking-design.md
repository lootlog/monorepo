# Single-request event ranking

## Goal

Load the event ranking and all edit histories needed by its UI through one HTTP request. Opening a ranking history popover must not trigger another request.

## Response contract

`GET /guilds/:guildId/events/:eventId/ranking` continues to return the visible ranking entries and adds an `editHistory` array to every entry.

- For members with `OWNER` or `ADMIN`, `editHistory` contains the entry's complete edit history ordered newest first.
- For other members with ranking read access, `editHistory` is always an empty array.
- Each history item keeps the existing history response fields, including the editor display name and signed points delta.

The dedicated `GET /guilds/:guildId/events/:eventId/ranking/:rankingId/history` endpoint and its generated client query are removed because they no longer have consumers.

## Backend data flow

The existing cached ranking remains permission-independent. The controller filters ranking entries by visible event heroes before enriching the response.

For `OWNER` and `ADMIN`, the backend:

1. Collects the visible ranking IDs.
2. Fetches every matching history row with one `findMany` query using `rankingId IN (...)`, ordered newest first.
3. Fetches editor display names with one member query for the distinct editor user IDs.
4. Groups the mapped history entries by ranking ID and attaches the matching array to each ranking entry.

For other members, the backend skips both enrichment queries and attaches empty arrays. This preserves the current history authorization without putting permission-dependent data into the shared ranking cache.

## Frontend data flow

`EventRankingTable` reads history directly from `ranking.editHistory`. It removes the per-row history query, loading state, and retry policy. Popovers only toggle local presentation state and never access the network.

Ranking invalidation after a points edit remains sufficient: refetching the ranking response refreshes both totals and embedded history.

## Verification

- Backend tests cover bulk grouping, newest-first ordering, editor-name mapping, empty histories for non-admin readers, and no enrichment queries without permission.
- Controller tests cover permission-aware enrichment after hero visibility filtering.
- Frontend tests use the HTTP seam to verify one ranking request, zero history endpoint requests, and no request when a history popover opens.
- Regenerate OpenAPI and the API client, then verify API and web tests, lint, type checks, builds, and generated-client consistency.

## Release impact

This is an intentional breaking contract simplification: the per-entry history endpoint is removed and ranking entries gain `editHistory`. Add changesets for `@lootlog/api` and `@lootlog/web`; include `@lootlog/api-client` if its workspace release policy treats generated contract changes as releasable.
