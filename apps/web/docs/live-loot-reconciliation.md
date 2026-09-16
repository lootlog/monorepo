# Live loot reconciliation (LOO-48)

`loot.created` is a signal to reconcile the authorized list. It must not start a
detail GET for each event. The event and HTTP contracts are unchanged.

## Update model

The API commits the loot, Organization record and publication intent in one
transaction. The outbox checks that the Organization record is still active
before publishing `guilds.loots.create` with a stable publication message ID.
Gateway filters recipients using their current Organization roles and NPC
visibility, then forwards `loot.created`. No new database reads run in Gateway.

Web holds one dirty flag and one timer per mounted list. Events received during
the 30–35 second reconciliation window share one refresh. Reconciliation uses
the first-page list endpoint, retaining the active filters and the server's
authorization and descending-ID order. It never hydrates an event through the
detail endpoint. Share updates patch an already cached detail and use the same
list reconciliation path.

Automatic reconciliation waits while the tab is hidden or the user is browsing
older rows. A visible status announces pending updates. Returning to the top or
using the refresh action reconciles from cursor zero and discards loaded pages;
further scrolling uses the new server cursor. This avoids refetching an unbounded
history and prevents new events from moving the row being read. Failed refreshes
remain visibly stale and stop automatic retries. A manual retry, reconnect or
permission revalidation can resume them; more loot events alone cannot retry a
failed lookup indefinitely.

Duplicate or delayed events can mark the list dirty again, but cannot build an
event queue or start one request per event. Reconnect reconciles missed changes.
Gateway's existing 10,000-message in-memory deduplication is an optimization,
not a durable replay guarantee.

Reconnect retains visible rows while revalidating in the background, including
when the refresh fails. Session join compares the new access snapshot with the
last snapshot retained by the Web gateway client. Unchanged or expanded access
does not clear data. Confirmed loot access restrictions or lost Organization
membership still cancel pending reads, clear active list/detail data and remove
inactive caches across canonical and alias routes. Explicit permission updates
retain conservative clearing. A response from the old policy cannot restore
rows after cancellation. Read cancellation also reaches the HTTP transport
through its abort signal. A legacy gateway without snapshots can report lost
Organization membership on join, but cannot establish an offline role change
until HTTP revalidation or an explicit permission update.

## Backend mitigation for existing Web clients

The API shares concurrent detail reads only when canonical Organization ID,
loot ID, effective permissions and role visibility match. The per-process map
retains at most 1,024 pending keys. Results, nulls and failures leave the map on
completion; there is no completed-response cache or visibility TTL. At capacity,
new keys use the existing query path. Mutation visibility checks remain separate.

If the caller that started a shared read disconnects, healthy waiting callers
fall back to independent reads. Cancelling a waiter does not cancel the shared
read. This recovery can temporarily restore ordinary query volume; coalescing
is a mitigation, not a global rate limiter.

This reduces duplicate database reads within a concurrent request burst. It
does not reduce the number of HTTP requests sent by old Web clients, and it
does not combine work across API replicas. Different policies never share a
read. Existing first-page list caching remains scoped to Organization, filters
and effective visibility.

## Not-found investigation

| Class                                             | Current source behavior                                                                       | Verification                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Current vanity alias                              | Resolves to the canonical Organization before the loot lookup                                 | HTTP boundary test                                            |
| Unknown or renamed alias                          | Organization resolution returns 404                                                           | HTTP boundary test; historical alias ownership is not guessed |
| Other Organization or insufficient NPC visibility | Source query returns no visible record; HTTP returns `404 LOOT_NOT_FOUND`                     | Existing records and source visibility tests                  |
| Archived before outbox dispatch                   | Publication is suppressed                                                                     | Outbox integration test                                       |
| Archived after publication                        | The old event may arrive, but current list/detail access excludes the archived record         | Outbox integration test                                       |
| Delivery retry or process restart                 | Stable message IDs deduplicate while retained; replay after eviction/restart remains possible | Gateway retry/federation tests and Web reconciliation tests   |
| Publication before initial commit                 | Not present in the current transaction/outbox implementation                                  | Durable publication integration tests                         |

These explain source-level not-found classes. They do not establish which class
caused the production responses reported in LOO-48: that sample lacks the
required correlated access and lifecycle evidence. A permission change between
publication and HTTP lookup can also legitimately revoke visibility. Preserve
the 404 rather than exposing whether an inaccessible record exists.

The `loot.detail.reads` counter has only `outcome=visible|unavailable` labels.
The sampled `loots.fetchLoot` span records canonical `organization.id`, `loot.id`
and outcome. It deliberately groups absent, archived and source-filtered records
without another query. Earlier authentication and Organization-resolution
failures retain their existing HTTP errors.

The `loot.publication.age_ms` histogram measures age of a committed intent when
published. Sampled `loots.publishCreated` spans carry Organization ID, loot ID,
publication message ID and age. Compare publication and read timestamps to
investigate outbox delay versus subsequent delivery or lookup delay. No IDs are
metric labels; neither diagnostic records cookies, tokens, client IPs or raw
request headers. The diagnostics do not attribute traffic to individual users.

## Separate releases

1. Release only the API coalescing and diagnostics changes if an immediate
   backend mitigation is needed. Keep this separate from the LOO-44 Discord REST
   sweeper hotfix. No migration, HTTP schema or generated client changes are
   required. Gateway remains compatible.
2. Extract the Web loot-list changes and translations onto the chosen production
   Web revision. Include the reconciliation/cache helpers and their tests.
   Do not deploy the current frontend branch wholesale: LOO-48 explicitly excludes
   its unrelated UI work. Apply the user-guide changes with the frontend release.
3. Verify an old and updated browser side by side against the same API and
   Gateway. The old browser still issues detail GETs; the updated browser issues
   bounded list GETs. Both consume the unchanged v2 loot payload inside realtime
   v1. API coalescing can be rolled out before or after Web.
4. Check a burst, reconnect, duplicate publication, hidden tab, active filters,
   older-page navigation and revoked access. Updated clients must issue zero
   event-triggered detail GETs. Refresh errors must remain visible. Track total
   detail traffic while old tabs remain open; a backend-only rollout cannot make
   that traffic disappear.
5. Compare request counts, API CPU and database CPU under the same isolated load
   and again during the authorized release observation. Retain existing immutable
   API image and Web deployment references for rollback; do not rebuild a rollback
   revision. Rolling Web back restores the original per-event request behavior.

This change does not deploy any service or mark production verification complete.

## Local load evidence

The opt-in PostgreSQL integration sample on 2026-09-16 exercised 200 concurrent
callers across ten distinct accepted loot records. It used the real persistence
and query operations against an isolated PostgreSQL container. The list scenario
deliberately bypassed Redis caching.

| Scenario                                         | Query-operation executions | Bun process CPU |      Elapsed |
| ------------------------------------------------ | -------------------------: | --------------: | -----------: |
| Original per-event detail reads                  |                      2,000 |    3,324.660 ms | 3,121.250 ms |
| Same old-client calls with API coalescing        |                         10 |       70.635 ms |   145.518 ms |
| One first-page reconciliation per updated client |                        200 |      367.895 ms |   535.265 ms |

These are one-run measurements, not latency guarantees. Each query operation
can issue several SQL statements. CPU is `process.cpuUsage()` for the Bun test
process executing API query code; PostgreSQL CPU, HTTP middleware, browser work
and network I/O are outside this sample. Existing clients still send 2,000
detail requests in the second scenario. The third models the query workload
after the Web coordinator combines the burst; coordinator tests independently
verify that scheduling behavior.

Reproduce from `apps/api`:

```sh
LOOT_DETAIL_LOAD_SAMPLE=1 bun --conditions=development test \
  --preload ./test/bun.e2e.setup.ts --max-concurrency 1 \
  ./test/loot-publication-outbox.integration.test.ts
```

The test creates isolated containers and verifies that all callers receive the
accepted records. Its operation-count assertions catch reintroduced database
fanout; CPU observations are reported without machine-dependent thresholds.
Production API/database CPU and the historical 404 distribution remain release
observation work, not conclusions from this local sample.

The Web coordinator test separately runs 500 clients. A 200-event burst produces
500 list-refresh callbacks and no event-specific detail reads; a mixed cohort of
250 legacy callbacks and 250 updated coordinators produces 50,000 legacy detail
callbacks and 250 list-refresh callbacks. The hook integration test uses the real
QueryClient, router, filters and generated HTTP client with a fake HTTP transport:
200 duplicate/share/reconnect events produce one initial and one reconciliation
list request, with zero detail requests. These are deterministic client tests,
not a production network load test.

Local checks: 854 Web tests, 492 API unit tests, 27 API HTTP boundary tests,
18 outbox integration tests including the load sample, and 175 Gateway tests
passed. Web/API/docs lint and typecheck passed. React Doctor fell back to a full
Web scan (73/100); its existing virtualizer warning remains. No running local
Web server was available for browser layout inspection.
