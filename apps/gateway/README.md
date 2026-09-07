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
