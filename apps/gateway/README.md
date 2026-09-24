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
