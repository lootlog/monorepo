# Realtime startup and recovery

The Game client starts each connection to a current gateway with one
`session.join`. A gateway that negotiates `lootlog.session-hello.v1` sends
`session.hello` with its connection ID before the join. The client requests the
Margonem proof for that ID and includes it in the join. Concurrent joins for the
same identity share one attempt.

A replaced character, disconnected socket, or disposed client cannot complete an
old join. Reconnect requests a new proof. Proof failure or its five-second timeout
allows a reported join. An older gateway that does not send hello falls back
after one second to the existing two-step flow: join to obtain the connection ID,
then join with its proof. This preserves verified-character features during a
rolling deployment or gateway rollback. Frames from a replaced transport cannot
complete a new connection's join or update its policy.

The socket provider publishes initial presence once after a successful join.
AirTags subscribes without repeating that publication. Later map, AFK, or presence
selection changes still publish their own updates.

## HTTP snapshots and permissions

The first timer and chat-history reads wait for realtime to join, so changes
between an earlier HTTP response and subscription cannot be missed. If the gateway
is unavailable, HTTP remains available. The first eventual join refreshes that
offline snapshot. A normal first join does not invalidate its fresh reads again.
Reconnect still refreshes state that may have changed while the client was
offline. Replacing an organization ID array with equivalent IDs does not trigger
another read.

The first access policy filters global timers, chat history, and organization
metadata at their query boundary without cancelling and restarting those reads.
Optional organization timer-history queries retain their conservative
cancellation and reload behavior. Subsequent access restrictions still remove
inaccessible data immediately, and expanded access requests missing data.
Organization metadata readers share the same query owner.
The first authenticated session establishes chat identity without discarding the
history just requested; subsequent account changes and logout clear it.

User preferences no longer refetch on window focus. Preference writes continue
to update the shared query cache from their full response.

## Active party gatherings

The API publishes organization-scoped `active-party-gathering.updated` facts after
ready-room changes. Each summary contains only that organization's ID and the
fields visible through the active-gathering HTTP endpoint. It contains no private
participant list. The gateway applies the current source permissions and NPC
level/tier policy before delivery and only sends the new event to capable clients.

The client applies summaries by aggregate revision. Removal revisions prevent
delayed updates from resurrecting a closed gathering, and an HTTP response cannot
overwrite newer events received while that request was running. Initial reads,
reconnects, and permission changes still reconcile through HTTP. Gateways without
the capability retain the existing throttled HTTP fallback.

While the gathering bar is visible, an independent timer reconciles through HTTP
every 60–66 seconds. The per-client jitter spreads recovery requests, and incoming
events cannot postpone them. This recovers from a lost best-effort publication
without fetching after each event. A failed refresh remains marked stale even if
individual deltas arrive later.

Removal history is bounded to 512 entries without a time-based expiry. After an
eviction, unknown gathering IDs require an authoritative snapshot before they can
appear. The cache marks ambiguous updates stale and rejects snapshots that cross
an eviction. This prevents delayed redelivery from restoring a cancelled room;
after that bound is reached, a newly created gathering may wait for the next
reconciliation before appearing.

Deploy in this order:

1. Deploy every API publisher with the new RabbitMQ fact and optional HTTP
   `revision` field.
2. Deploy gateways that consume the fact, negotiate the active-gathering
   capability, and send the opt-in hello event.
3. Publish the userscript and both browser extensions. All use the same startup
   implementation and negotiate both capabilities.

If an API rollback removes the publisher, first remove the gateway capability so
clients resume HTTP reconciliation. Existing clients ignore the additive HTTP
field and are not sent unknown realtime events. No database migration is needed.

## Bootstrap decision

LOO-202's bootstrap endpoint is deferred. The duplicate-free base startup already
has eight necessary HTTP reads in the controlled fixture. An open chat requires
three additional reads for history, member summaries, and active gatherings. A
live Margonem capture remains necessary before claiming the issue's request budget
for deployed installations.

The six proposed bootstrap domains currently belong to the API, so a later
endpoint can compose their existing authorized readers without a new service or
cross-service database access. Combining those six reads would reduce the base
fixture from eight requests to three. It would leave six with chat open unless
the bootstrap also includes chat data. These are calculated targets, not measured
bootstrap results.

Persisting the combined response requires more than a character key: include the
internal User, game account, character, world, and response schema version. Clear
it on logout or User change. Cached organization data must remain untrusted until
current access is established. Timer events, permission changes, settings writes,
and character changes must invalidate the relevant representation.

`If-None-Match` can reduce response bytes, but it still makes an authenticated HTTP
request. A hash computed after all six reads also retains their database work.
Implement a bootstrap only with measured request/byte/CPU benefit and a revision
scheme that covers permissions as well as all included data. The present change
does not introduce persistent caching or ETags.

## Verification

Run the real AppContent startup against test-only HTTP, WebSocket, and Margonem
boundaries:

```sh
LOOTLOG_COLD_START_REPORT=1 bun run --cwd apps/game-client test src/app-cold-start.test.tsx
```

The test leaves queries empty at mount, enables timers and AirTags, opens chat,
uses an authenticated User in one Organization, and waits beyond the deferred
access refresh interval. It asserts that snapshots and join are not repeated.
It does not measure network latency, forwardAuth calls, or a real WebSocket
upgrade. Settings migration writes, failed-request retries, and additional open
windows can add traffic beyond this scenario.

Controlled request counts against the source exported from
`403ddb8ed51746c2a718976fe3f7828598daafad`, with 20 ms HTTP responses and a 5.1-second
settling window:

| Scenario                                          | Before | After |
| ------------------------------------------------- | -----: | ----: |
| Lootlog HTTP, chat closed                         |     12 |     8 |
| Lootlog HTTP, chat open                           |     16 |    11 |
| `session.join`                                    |      2 |     1 |
| `presence.publish`                                |      2 |     1 |
| All client WS commands in this fixture            |      5 |     3 |
| Margonem proof HTTP, excluded from Lootlog totals |      1 |     1 |

Both fixtures create one WebSocket transport. Closed-chat measurement uses the
same fixture with that window closed. The open-chat HTTP result remains above the
issue's approximate eight-request target. No authenticated running game tab or
local API/gateway was available for a before/after live network capture; the table
must not be used as a production cold-start result.
