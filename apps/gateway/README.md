# Gateway authentication

Web and the userscript open a native WebSocket with the existing session cookie.
Traefik calls Auth's `GET /auth/verify` before forwarding the upgrade. Auth returns
`X-Auth-User-Id` and `X-Auth-Discord-Id`; Gateway requires both nonempty headers.
Gateway does not validate cookies, accept realtime tickets, or call Auth itself.
Its Origin checks and Organization authorization still apply.

## Proxy boundary

Gateway must be reachable only by the trusted proxy in production. Do not publish
its port or route around forward auth: a direct caller can supply identity headers.
The local Docker Compose setup is a development environment, not a production
network-isolation configuration.

Apply these middleware steps in order to every public Gateway WebSocket route:

1. Remove inbound `X-Auth-User-Id` and `X-Auth-Discord-Id`.
2. Run forward auth against the private Auth `/auth/verify` endpoint, forwarding
   `Cookie` and `Authorization`.
3. Copy the two identity headers from the successful Auth response.

The repository's development route demonstrates this with `stripAuthIdentity`
before `apiForwardAuth` in `traefik/dev/traefik_dynamic.yml`. Production dynamic
router configuration is maintained outside this repository; apply the same
middleware ordering and network restriction there. Keep Auth and Gateway traffic
inside the trusted network. Preserve WebSocket upgrade headers and the existing
realtime subprotocols.

## Coordinated rollout

Deploy Auth, Gateway, Web, the userscript, and proxy configuration together. The
removed `POST /auth/realtime-ticket` endpoint has no compatibility period. Existing
Redis ticket keys expire under their original TTL; no database migration or cache
flush is required. Gateway no longer requires `AUTH_URL`.

Keep session cookies configured with `SameSite=None; Secure` and the existing
cookie domain. The WebSocket hostname must be covered by that cookie domain.
Public endpoints require HTTPS/WSS. Do not broaden cookie scope to Margonem.

The first release supports Web and the userscript. Extension source remains
buildable, but extension cookie delivery is not a release acceptance criterion.
Arbitrary Firefox UUID origins are not automatically trusted.

## Release verification

Using an existing signed-in browser session:

- Open Web, establish realtime, reconnect, and confirm subscriptions recover.
- Open Margonem with the new userscript. In browser network tools, check the
  Gateway handshake returns 101 and the overlay joins its Organization.
- Confirm neither client calls the retired ticket endpoint or sends credentials
  in its WebSocket URL or subprotocol. Check reconnect and presence recovery.
- Verify missing/invalid sessions cannot upgrade through Traefik, including when
  a request supplies forged identity headers. Disallowed origins must also fail.
- Confirm a user cannot join another Organization without access.

A userscript connects from the Margonem site to Lootlog. If browser privacy
settings block the session cookie on that handshake, forward auth rejects it.
Record the browser and observed blocked-cookie reason; do not replace this flow
with another token or claim the browser path passed without observing it. Do not
include cookie values or private handshake headers in reports or committed tests.

## Realtime connection diagnostics

### Gathering state rollout

Deploy every Gateway replica with federation version 3 before deploying the API
publisher of `guilds.party-gathering.updated`, then deploy the Game client.
Gateway retries the new queue while any live replica reports an older federation
version. Complete the Gateway rollout before enabling the publisher; the normal
bounded retry policy still applies and exhausted deliveries reach its DLQ.

Clients offer `lootlog.party-gathering-state.v1` alongside the wire subprotocol.
Only opted-in session clients receive `party-gathering.state-updated`; API keys
and older clients do not. The join acknowledgement advertises this capability
only after the whole Gateway cluster supports it. Existing gathering notification
and private ready-room events remain unchanged.

The state event carries an Organization-scoped volunteer roster and the last
observed party composition. Each replica applies the same chat/NPC source policy
as the active-gatherings endpoint, including removal events. Source authorization
metadata remains private to federation; each public snapshot names only its
recipient Organization. Like the active-gatherings endpoint, a snapshot keeps
the organizer's Discord ID so clients can show the organizer's name and role. Clients combine equally revisioned snapshots from
multiple authorized Organizations and reconcile an initial snapshot on reconnect.
The same publication includes the organizer as a direct recipient, so an
authorized organizer without chat-read permission still receives updates. Source
authorization remains required, and overlapping direct and chat audiences receive
one frame per publication.
Volunteering or accepting an invitation does not establish party membership.

### Connection metrics

`lootlog_gateway_connections_opened_total` counts admitted sockets. Connection
capacity rejections are counted only by the existing runtime gauge
`lootlog_gateway_connections_rejected_total`, which samples the process's
cumulative admission rejection count.

`lootlog_gateway_connection_lifetime_seconds` records each admitted socket's
lifetime once when it closes. Its histogram count is the closed-connection count
(`lootlog_gateway_connection_lifetime_seconds_count` in Prometheus); there is no
separate closed counter. Buckets include 24 hours and infinity, and the unit is
seconds. Fixed labels identify the platform, joined state, close code and cause.
Encoding mismatches use `1003 / unsupported_frame`. Bun reports oversized frames
as `1006` with its fixed `Received too big message` reason, classified as
`payload_limit`; other 1006 closes are `abnormal`. Browser transport loss normally
appears as an abnormal close. Arbitrary close reasons and session identifiers
never become labels.

`lootlog_gateway_commands_completed_total` counts decoded, admitted commands by
type and outcome: `success`, `retryable`, `rejected`, `defect`, or `interrupted`.
Here `rejected` means a nonretryable command failure, such as denied access.
Admission overloads are counted only by the existing runtime gauge
`lootlog_gateway_commands_rejected_total`; they are not command completions.
Both event counters are monotonic. Command traces cover `session.join` and
`presence.publish`, including their failure exits; high-frequency commands such
as heartbeats use the completion metric without creating a root trace.

Presence-capable clients keep the current socket after a correlated retryable
heartbeat error. Retries use exponential backoff with jitter and must leave at
least two seconds for a response before the last successful presence refresh
expires (60 seconds). A retryable error that exhausts this budget closes with
`4003`; silence closes with `4001`, and a nonretryable rejection with `4002`.
Game and Web providers restore their session and presence after a reconnect.

Gateway closes a slow consumer with `1013` as soon as its buffered output exceeds
`WEBSOCKET_MAX_BACKPRESSURE_BYTES` or Bun reports a dropped frame. Queued frames
remain accepted. A skipped event now interrupts the session so the client can
reconnect, rejoin, and restore its subscriptions. Refreshing each feature's
snapshot or missed history remains the client's responsibility; Gateway does not
replay dropped events. The former `WEBSOCKET_MAX_BACKPRESSURE_STRIKES` setting is ignored
and can be removed from deployment configuration. The byte threshold and the
existing reconnect protocol are unchanged; no coordinated client rollout is
required.

Federated events without local subscription or identity recipients skip frame
decoding. Events that reach a local audience still pass the same validation and
recipient authorization. The presence expiry sweep removes empty Organizations
from its Redis registry atomically with the cardinality check. Heartbeats and
publications restore both indexes atomically, including after partial eviction;
pruning does not remove the pending offline queue or shorten its ten-second grace.

## Ping routing and presence expiry

Gateway indexes each connected socket by platform, character world and current
map. A map-filtered publication, such as a map or battle ping, intersects that
index with its subscription audiences before checking individual recipients.
Wildcard Organization subscriptions retain their existing meaning.
Authorization, API-key restrictions, sender exclusion, the battle-team character
filter, ping capability negotiation and delivery deduplication still run for
each candidate, locally and after federation. `RealtimeHub.setPresence` owns presence assignment and index
maintenance; callers must use it when publishing, clearing or reconciling presence.
The index is local to a replica and rebuilds as connections register.

Presence refreshes atomically maintain the existing payload, durable metadata,
Organization indexes and the additive `presence:expiry:due` sorted set. A member
is the JSON pair `[organizationId, sessionId]`, scored at `lastSeen + 60 seconds`.
Idle expiry sweeps inspect scores instead of fetching every active payload.
Due entries are read in batches of at most 100. A drain yields between batches
and stops starting more batches after one second. An individual batch can take
longer when Redis or publication is slow; the bound limits batch size, not request
latency.

A 30-second token lease coordinates upgraded replicas. Due Organizations also
use the existing `presence:sweep-lock:<organizationId>` locks to coordinate with
older sweepers. Removal checks ownership and the captured payload and metadata
atomically. It schedules the durable departure in the same operation, so a stale
worker cannot recreate an offline event already handled by its successor. A
concurrent heartbeat defeats removal. The ten-second offline grace period and
publication retry queue remain unchanged.

### Expiry rollout and recovery

No client, WebSocket, federation or database migration is required. Deploy Gateway
normally without clearing Redis. New refreshes write both old and new indexes;
older replicas continue using the original records and Organization indexes.
Existing records and legacy-only writes are backfilled by a shared cursor scan,
at most one Organization page of 100 session candidates per five-second sweep.
Scan overflow is retained across replicas and restarts. Healthy indexed sessions
need no payload read during this reconciliation.

Heartbeats repair independently evicted indexes. If the due index is lost, the
bounded legacy scan rebuilds it even for sessions that no longer heartbeat;
recovery can therefore take multiple sweep intervals for a large backlog.
If only the Organization registry is lost, existing due entries can still expire.
Durable metadata retains identity and the final observed expiry time after the
payload TTL elapses. Fresh payloads from older writers correct stale due scores.

Rollback needs no data rewrite. Older Gateway versions continue reading the
retained records and indexes. They ignore the additive expiry keys, which the
new version reconciles when it returns. Old workers retain their existing
concurrency behavior until replaced; the stronger captured-value removal guard
applies to upgraded workers.

### Performance verification

Run `bun run perf:routing` and `bun run perf:presence` in `apps/gateway`.
The presence benchmark starts an isolated Dragonfly container and requires
Docker. These are local synthetic measurements, not production latency claims.

On Bun 1.4.2, the routing fixture uses 5,000 sockets, 20,000 publications and
1,000,000 deliveries. With identical candidate-count instrumentation before and
after the change, wildcard routing went from 5,000 to 50 candidates per
publication, 1,114 to 225–230 ms wall time and 1,146 to 264–276 ms CPU time.
Exact-map routing already had 50 candidates; its wall time changed from 226 to
232–245 ms due to the additional intersection. Delivery assertions passed in
both cases.

The expiry baseline was revision `ef1e509fe4`. All sessions were active, with no
expired entries. The same Dragonfly 1.34.1 fixture measured:

| Organizations | Sessions per Organization | Replicas | Gateway Redis calls, before / after | Server commands, before / after | Active payload entries read, before / after | JSON reply bytes, before / after | Sweep ms, before / after |
| ------------- | ------------------------- | -------- | ----------------------------------- | ------------------------------- | ------------------------------------------- | -------------------------------- | ------------------------ |
| 1             | 100                       | 1        | 4 / 6                               | 4 / 134                         | 100 / 0                                     | 24,273 / 48                      | 3.96 / 4.07              |
| 10            | 100                       | 1        | 31 / 5                              | 31 / 138                        | 1,000 / 0                                   | 242,721 / 48                     | 14.87 / 5.24             |
| 100           | 10                        | 2        | 402 / 7                             | 402 / 144                       | 1,000 / 0                                   | 246,782 / 53                     | 33.92 / 2.21             |
| 100           | 50                        | 4        | 604 / 9                             | 604 / 186                       | 5,000 / 0                                   | 1,242,564 / 61                   | 40.47 / 3.74             |

Gateway call counts treat one script evaluation as one call. Server commands use
Dragonfly's command counter and include Lua operations and script loading; they
exclude the measurement's own INFO command. Reconciliation adds score checks,
so small installations can execute more server commands even while transferring
less data. Reply bytes are JSON-encoded command results, not Redis wire bytes.
Small wall-time differences are noisy; the stable result is bounded idle work
with zero active-payload reads as session and Organization counts grow.

## Realtime access policy updates

Each connection can retain at most 4,096 distinct subscriptions, including its
automatic Organization subscriptions. A scope's JSON representation is limited
to 1,024 UTF-8 bytes. Extra subscriptions are rejected with the existing
`COMMAND_REJECTED` response and `retryable: false` before either routing index
changes. Replacing an existing scope remains allowed at capacity; unsubscribing
releases capacity. These limits apply to JSON and MessagePack clients and to
air-tag subscriptions through the same hub.

If server-side subscription reconciliation exceeds a limit, the gateway clears
the connection's subscriptions and closes it with code 1008. It never retains
revoked subscriptions or silently reports a partially applied replacement.
This requires no protocol version change or client rollout.

Hero-specific coordination events carry `heroNpcLvl` from the API's source row.
Gateway applies the same level visibility function as HTTP before local or
federated delivery, including after role changes. Missing source metadata is
rejected; an explicit null or zero level retains the HTTP unknown-level policy.
Deploy the API publishers before Gateway. The Rabbit field is additive and
optional for wire compatibility, but older queued messages without it are not
delivered by the updated gateway; clients can refresh the authorized HTTP view.

Gateway refreshes each connected session's server-side roles after a permission
rebalance. It sends `permissions.updated` only when the effective policy changes.
Role identifiers, role order, and redundant overlapping grants do not cause a
client refresh. Subsequent source-event filtering uses the refreshed roles even
when no client event is sent.

The realtime v1 events retain `organizationIds` and `subscriptionScopes` and add
these optional fields:

| Event                 | Field          | Meaning                                                                          |
| --------------------- | -------------- | -------------------------------------------------------------------------------- |
| `session.joined`      | `accessPolicy` | Current authorized organizations, effective permissions, and level grants        |
| `permissions.updated` | `accessPolicy` | Complete current policy snapshot                                                 |
| `permissions.updated` | `changes`      | Changed organizations and areas, with separate `restricted` and `expanded` flags |

`session.join` acknowledgements also contain `accessPolicy`. The schema and
browser-safe comparison helpers live in
`packages/protocol/src/realtime/access-policy.ts`.

The gateway's snapshot `version` is a SHA-256 digest of the canonical policy.
It identifies policy content; it is not a timestamp or an increasing revision.
The snapshot merges overlapping level grants and preserves the requirement that
loot tier access and the base loot permission belong to the same role. Owner and
administrator handling follows the source policy; administrators do not bypass
loot level grants.

The game client compares each snapshot with its last local snapshot, including
on reconnect. It does not assume the event's `changes` describe everything missed
while disconnected. Receiving the same version in both the joined event and its
acknowledgement does not trigger duplicate work. If all Organization access was
removed while disconnected, Gateway sends an authoritative empty
`permissions.updated` snapshot before rejecting `session.join` with the existing
`COMMAND_REJECTED` error. The client can therefore clear retained data even
though the new connection never joined an Organization.

Restrictions cancel affected pending requests and remove inaccessible cached
rows immediately. Expansion refreshes affected queries after five seconds of
quiet while retaining visible rows. Timer, chat, notification, and presence
changes remain scoped to their Organization and area. Gateway preserves
still-authorized custom subscriptions and air-tag scopes during rebalance.

### Policy rollout and rollback

Deploy Gateway before the updated game client. The additional fields are
optional in realtime v1, so existing clients can decode the events and continue
to use the existing organization and subscription fields. This change requires
no HTTP schema or database migration.

An updated client connected to a gateway without policy snapshots uses a
conservative fallback for legacy permission events: cancel and clear affected
cache families, clear stored notifications, and coalesce required refetches over
five seconds. This fallback cannot preserve the same selective view as a full
policy snapshot. Gateway-first rollout enables selective updates immediately;
rolling Gateway back may temporarily restore broader view clearing.

Verify unchanged rebalances, a tier revocation, a level-range restriction, and a
reconnect after an offline permission change. Check both userscript and extension
transports against the same realtime event codec. Unchanged rebalance must cause
no timer or chat requests, and restricted cached rows must not reappear after an
older pending response completes.

## Character departure queue

Character departures keep the existing ten-second reconnect grace period. New
Gateway replicas atomically store each departure in the existing
`presence:offline:pending` set, its character index, and the additive
`presence:offline:due` sorted set. The sorted-set score is the departure time plus
ten seconds, so a sweep reads only due departures in batches of at most 100.

During a rolling upgrade, a bounded scan backfills departures written by older
replicas that only maintain the pending set. Both indexes remain in use; no Redis
flush or coordinated client rollout is required. Cancellation and successful
claims remove the due entry as well as the original pending entry. A stale due
score from an older writer is checked against the captured departure before a
claim. Rolling back leaves an unused due index that is reconciled when the new
Gateway returns; the original records and pending set remain usable.

A 30-second lease coordinates upgraded sweepers. Acquisition is interruptible,
and shutdown attempts lease release for at most one second; an orphaned lease
expires. Confirmed publication acknowledges the captured outbox value and renews
the lease. Lease loss stops the current drain, while a failed publication leaves
the durable outbox record for retry. Malformed stored departure records are
removed without terminating the sweep or discarding valid records in the batch.

## Replicas, probes and draining

Replicas share Dragonfly under the `${SERVICE_NAME}:${ENV}` key prefix, consume
the same durable RabbitMQ queues, and federate delivery through one Redis
Pub/Sub channel. An established WebSocket stays on its pod, and a reconnecting
client may land on any ready replica, so sticky sessions stay disabled.

`GET /healthz` is liveness: it reports only that the process serves HTTP.
Dependency failures never fail it, so a Dragonfly outage cannot restart every
replica. `GET /readyz` returns `503` with `reason: "federation-unavailable"`
until the replica is subscribed to the federation channel, and with
`reason: "draining"` after shutdown starts. WebSocket upgrades receive the same
`503` while the replica is unavailable. `lootlog_gateway_available` samples the
same state as `1` or `0`.

A replica drops a federated frame whose type its schema does not know, and a
rolling upgrade runs old and new replicas side by side. Each replica therefore
reports `FEDERATION_VERSION` in its metrics snapshot (older images report
none, read as `1`), and `clusterFederationVersion` holds the lowest version
among live replicas. A new federated event type bumps the version and is
published only once every live replica reports it; until then AirTags federate
one `air-tag.updated` per target instead of `air-tag.scope-updated`. A replica
that rejoins after a rollback is noticed within one 10-second sample.

Redis Pub/Sub has no replay. When a replica's federation subscriber disconnects,
it withdraws readiness and immediately closes every local socket with `1013`,
because frames published during the gap may include events or
`permissions.rebalance` controls. No session survives the gap: clients reconnect
with jitter, and each rejoin re-reads Organization access, restores
subscriptions, and refetches feature snapshots. The replica admits new sessions
again after it has resubscribed.

On `SIGTERM` the replica stops admitting sessions and waits 5 seconds for
Traefik to drop the terminating endpoint. It then closes local sockets with
`1012` over 10 seconds, so the remaining replicas absorb rejoins gradually. It
waits up to 10 more seconds for disconnect cleanup (presence removal and
`DISCONNECT_EVENT` activity) before stopping the server. The deployment's
`terminationGracePeriodSeconds` must exceed these 25 seconds plus consumer and
Redis shutdown. Local development skips the endpoint and spread delays.

Deploy this image before switching the readiness probe to `/readyz`. Older
images return `404` there. Two gateway replicas do not provide host or ingress
high availability while the cluster has one server and one Traefik replica.
