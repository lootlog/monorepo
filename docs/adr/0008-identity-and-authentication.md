# 0008. Identity and authentication at the edge

Status: accepted

## Context

Discord is the only sign-in provider, and Better Auth in the auth service owns
sessions, OAuth accounts, API keys, and platform roles. Traefik forward-auth
sends every proxied request through the auth service, which asserts identity,
roles, and API key access as headers to services on the private network.
Those services trust the headers, so header stripping, failure modes, and the
verify path's cost are security and performance contracts at once.

Better Auth has behaviours that conflict with Lootlog's needs: cookie caches
that outlive revocation, write-heavy API key verification, scope updates only
through linking, and generic errors that hide provider failures. The admin
panel, the gateway, the Game client, the Web app, and the developer portal
each sit on top of this identity and must not widen it. Older Game clients
also report characters, accounts, and NPCs in shapes that are persisted, so
the API keeps reading them.

## Decisions

### Forward-auth identity headers

- **`AUTH_USER_ID_HEADER`** (`packages/schema/src/api-key-access.ts`): The auth service asserts `x-auth-user-id`, `x-auth-discord-id`, and `x-auth-api-key-access` for every proxied request and the edge strips client-sent copies, so services on the private network trust them as identity. `x-auth-roles` (`AUTH_ROLES_HEADER` in `packages/schema/src/platform-roles.ts`) is stripped the same way.
- **`BearerSecurityPassthrough`** (`packages/protocol/src/http/bearer-security.ts`): Services perform no credential verification because the edge already verified it; they only read the forwarded headers.
- **`readIdentity`** (`apps/gateway/src/auth/auth-service.ts`): The gateway trusts forwarded headers only because Traefik forward-auth is the only path that can set them, so the gateway must never be exposed without that proxy. A request with an API key header but no edge-issued access assertion never authenticates.
- **`verify`** (`apps/auth/src/http/auth-handlers.ts`): The verify endpoint returns identity in response headers because Traefik copies them onto the forwarded request.

### Forward-auth verification cost

- **`SESSION_DECISION_TTL_MS`** (`apps/auth/src/auth/auth-service.ts`): A verified session cookie's decision is cached for 5 seconds, because one page load sends the same cookie through forward-auth about a dozen times; a revoked session stays valid at most this long on top of the cookie cache window.
- **`sessionDecisionKey`** (`apps/auth/src/auth/auth-service.ts`): The decision cache is keyed by a hash of the session cookies, so the cache never holds a credential.
- **`verify`** (`apps/auth/src/auth/auth-service.ts`): Only successful decisions without a cookie refresh are cached, because a refusal must flip as soon as the User signs in and a refreshed cookie must reach the browser. Verification uses Better Auth's cookie cache and returns its Set-Cookie headers (`toAuthProvider` in `apps/auth/src/auth/provider/better-auth.ts`), because the refresh only reaches the browser through the response.
- **`hasSessionCookie`** (`apps/auth/src/auth/auth-service.ts`): The session lookup is skipped when no session token cookie is present, keeping API key and bearer requests off the session store.
- **`verify`** (`apps/auth/src/auth/api-key-service.ts`): API key verification hashes the key with Better Auth's default hasher and reads the row itself instead of calling `verifyApiKey`, because Better Auth writes the key row twice per verification and cannot be told not to.
- **`TracingLive`** (`apps/auth/src/http/server.ts`): `/auth/verify` has tracing and per-request access logging disabled, because Traefik calls it once per proxied request and its spans and log lines outnumbered everything else while carrying no information; defects still fail the handler and are logged.

### Better Auth integration

- **`getFreshSession`** (`apps/auth/src/auth/provider/better-auth.ts`): Fresh session reads use `disableCookieCache` and only the cookie header, because the cookie cache answers for minutes after sign-out, ban, or revocation, and the bearer plugin would treat an Authorization header as a session token.
- **`toAuthProvider`** (`apps/auth/src/auth/provider/better-auth.ts`): Admin account writes (roles, bans) go through Better Auth's API instead of direct SQL, so the sessions it keeps in secondary storage follow the User row (`apps/auth/src/admin/admin-service.ts`).
- **`jwt` plugin** (`apps/auth/src/auth/provider/better-auth.ts`): `disableSettingJwtHeader` is set because session verification does not consume JWTs; `/token` still issues them.
- **`apiKey` plugin** (`apps/auth/src/auth/provider/better-auth.ts`): Better Auth's built-in API key rate limit is disabled because `ApiKeyService` owns a shared fixed-window Redis limit that all auth replicas enforce.
- **`PostgresPool`** (`apps/auth/src/database/postgres.ts`): Better Auth gets its own Promise-based Drizzle instance on a separate scoped `pg` pool, because its adapter cannot use the Effect database.
- **`createAuthRedisConnection`** (`apps/auth/src/auth/storage/auth-redis-storage.ts`): The Redis client enables the offline queue, because Bun's client connects lazily and the first OAuth state write must not be dropped while connecting.
- **`FAILED_TO_GET_ACCESS_TOKEN`** (`apps/auth/src/auth/auth-service.ts`): This Better Auth error maps to "token expired" rather than an internal error, because Better Auth reports every failed refresh of an expired provider token that way and a new sign-in replaces it.
- **`logRefreshFailure`** (`apps/auth/src/auth/provider/discord-auth-options.ts`): A failed Discord token refresh logs only the HTTP status and OAuth error code, because Better Auth replaces the failure with a generic error and tokens must stay out of logs.
- **`logOAuthCallbackError`** (`apps/auth/src/auth/provider/better-auth.ts`): Better Auth log details and OAuth callback failures are logged without payloads, only the message and `?error=` code, because details may contain OAuth input, profile data, or query parameters.

### API keys and platform roles

- **`PublicApiOperation`** (`packages/schema/src/public-api-policy.ts`): `PUBLIC_API_OPERATIONS` is an explicit inventory: any operation not listed is session-only and unavailable to API keys and the SDK. Feed dashboard filters stay `sessionOnlyParameters` (`packages/schema/src/public-api-operations/main-accounts.ts`) because exposing them would move the SDK call's request options behind a new argument.
- **`ApiKeyEndpointPolicy`** (`packages/protocol/src/http/api-key-http.ts`): The policy only adds API key restrictions; a request without the assertion header is a session that each service still authorizes. `ApiKeyHttpErrors` declares 429 because the edge enforces API key rate limits before the service.
- **`readApiKeyAccess`** (`packages/schema/src/api-key-policy.ts`): The reader returns `undefined` for a session and `null` for a malformed proxy assertion, which callers must fail closed on.
- **`readForwardedPlatformRoles`** (`packages/schema/src/platform-roles.ts`): No platform roles are forwarded for API key requests, so a key never acts with its owner's roles.
- **`PLATFORM_ROLES`** (`packages/schema/src/platform-roles.ts`): `admin`, `wiki-moderator`, and `global-chat-admin` have the auth service as their only writer and the admin panel as the only surface that changes them; `admin` implies every role, and the API reads chat and aura admins only from these roles.
- **`parsePlatformRoles`** (`packages/schema/src/platform-roles.ts`): Unknown role names are dropped, so a role removed from the catalog stops granting anything.
- **`PLATFORM_ROLE_HOLDERS_PATH`** (`packages/schema/src/platform-roles.ts`): The path is internal: callers present the service credential shared with the auth service, and the edge does not route it.

### Gateway identity

- **`ApiKeyLeases`** (`apps/gateway/src/auth/api-key-leases.ts`): Lease age is measured from before the remote validity checks, so a slow renewal cannot extend stale authority past the lease.
- **`CommandRoute`** (`apps/gateway/src/realtime/command-routes.ts`): API key integrations may send only commands whose route sets `apiKey`.
- **`readOrganizationPresence`** (`apps/gateway/src/http-api/gateway-http.ts`): The HTTP presence read applies the WebSocket subscription policy but refuses API keys, because lease checks live only on the socket.
- **`OrganizationPresence`** (`apps/gateway/src/http-api/contracts/presence/schemas.ts`): The HTTP contract identifies players by internal User and omits `discordId`; Discord identities stay inside the realtime protocol.
- **`joinSession`** (`apps/gateway/src/realtime/session-join.ts`): A join keeps the session's current identity until every fallible step passes, so a failed re-join leaves the session unchanged.
- **`publishAccountVerified`** (`apps/gateway/src/realtime/session-join.ts`): `MargonemAccountVerifiedV1`, published on a proof-verified join, is the only fact other services trust for Margonem account ownership.

### Admin panel

- **`authorizeAdminRequest`** (`apps/auth/src/admin/admin-service.ts`): The admin API requires both the panel's `ADMIN_API_SECRET` and a live session of a User in `ADMIN_ACCOUNT_IDS`; neither alone opens it, nobody enters when either is unconfigured, and the edge does not route admin endpoints.
- **`getOperatorAccess`** (`apps/admin/src/server/queries.ts`): The panel's root `beforeLoad` and this query only decide what the panel shows; the auth service authorizes every admin call again. `asPanel` in `apps/admin/src/server/auth-api.ts` sends the panel secret and the operator's session cookie and leaves that decision to the auth service.
- **`verifyAccessToken`** (`apps/admin/src/server/access.ts`): The Cloudflare Access JWT signature, team, and audience are verified on every request, because anything inside the cluster can reach the panel's port. The Vite dev server binds to 127.0.0.1 so the tunnel stays the only exposure.
- **`readAdminConfig`** (`apps/admin/src/server/config.ts`): Configuration is read once at start, so a half-configured panel fails to start instead of passing health checks; a production build without an Access application and operator is refused.
- **`authorizeRequest`** (`apps/admin/src/server/guard.ts`): State-changing requests must come from the panel's own origin as well as carry a valid Access token, because browsers attach the Access cookie to cross-site form posts. `currentRequest` in `apps/admin/src/server/request-context.ts` throws outside a guarded request, so no auth call can skip this.
- **`contentSecurityPolicy`** (`apps/admin/src/server/guard.ts`): Only nonce-marked own scripts and styles run, and framing, connections, and foreign form targets are forbidden, so markup injected through a name or ban reason cannot execute; inline style attributes stay allowed for popup positioning. The router passes the request nonce to SSR (`apps/admin/src/router.tsx`).
- **`BASE_HEADERS`** (`apps/admin/src/server/guard.ts`): Responses send `cache-control: no-transform` so Cloudflare's Rocket Loader does not rewrite script tags, and `referrer-policy: same-origin` because `no-referrer` would blank the Origin header the guard checks.
- **`UserAvatar`** (`apps/admin/src/components/user-avatar.tsx`): Images not on Discord's CDN fall back to initials, because the CSP loads images only from there.
- **`validateUsersSearch`** (`apps/admin/src/lib/users-search.ts`): Every admin route's `validateSearch` returns each key even when empty, because the router overlays the result on the raw search and an omitted key would keep its unvalidated value. The router parses search with plain `URLSearchParams` so a Discord id is not turned into an imprecise number.
- **`read`** (`apps/admin/src/lib/format.ts`): Dates are assembled from `formatToParts` fields, because locale wording differs between server and browser and would break hydration.

### Admin actions and audit

- **`audited`** (`apps/auth/src/admin/admin-service.ts`): The audit entry is written first, marked not completed, and the mark is cleared after the Better Auth action finishes, because the action cannot share the audit transaction; a failure after the action landed is not surfaced, since that would hide that it happened.
- **`revokeApiKey`** (`apps/auth/src/admin/admin-service.ts`): Deleting the key and writing its audit entry share one transaction, so a key never vanishes unaudited.
- **`ban`** (`apps/auth/src/admin/admin-service.ts`): The ban is set before sessions are revoked, because a session revoked first could be replaced by a new sign-in before the ban lands. `AdminBanUser` in `apps/auth/src/http/admin-handlers.ts` refuses to ban the operator's own account, which could lock every admin out.
- **`getUser`** (`apps/auth/src/admin/admin-service.ts`): User detail returns session metadata only; the session token is the credential and never leaves the auth service.
- **`adminAuditLog`** (`apps/auth/src/database/drizzle.schema.ts`): `targetUserId` is not a foreign key, because an audit row must outlive the User it names.
- **Better Auth route filter** (`apps/auth/src/http/server.ts`): Better Auth's `/admin/` and `/api-key/` plugin endpoints answer 404, because the admin plugin, kept to enforce bans, would let any `admin` role holder impersonate Users; only the audited admin API manages them.

### Client sign-in and session switching

- **`useDiscordSignIn`** (`packages/client/src/auth-session.ts`): An already signed-in User links the Discord account instead of signing in again, because Better Auth updates an existing account's scopes only through linking.
- **`useLogout`** (`packages/client/src/auth-session.ts`): Every cached query response is cleared after sign-out, so it cannot leak to the next User.
- **`signinRedirectPath`** (`apps/web/src/features/signin/signin-redirect-path.ts`): Only root-relative paths without a second slash, backslash, or whitespace are accepted, because the value is appended to this origin and inputs like `//host` would leave it after sign-in.
- **`callbackErrorMessages`** (`apps/web/src/features/signin/signin.tsx`): The `error` codes Better Auth appends to `errorCallbackURL` map to sign-in messages.
- **`Init`** (`apps/web/src/features/init/init.tsx`): After the bot installation callback, a 404 for the new Organization is retried up to twice and accessible guilds are refreshed, because Discord's callback can precede the Organization and the API's cached guild list may predate it.
- **`LoginWindow`** (`apps/game-client/src/components/login-window.tsx`): Both installations sign in only on the Lootlog website: the extension reads that session through its background worker, while the userscript depends on the browser sending Lootlog's cookie to the Margonem page, so a round trip that ends signed out is reported as blocked third-party cookies. While signed out it re-notifies `$sessionSignal` on focus, because returning from the website tab causes no visibility change and visibility is all Better Auth listens to.
- **`App`** (`apps/game-client/src/App.tsx`): When the signed-in User changes, the old tree unmounts, then the socket, sound playback, query cache, and transient state are disposed, and only then does `activeUserId` mount the new tree, so it never sees the previous User's data.

### Developer portal

- **`getPortalEnvironment`** (`apps/developer/src/lib/environment.ts`): Unknown hosts such as previews map to development, so a non-production host can never reach production services.
- **`apiKeysQueryOptions`** (`apps/developer/src/lib/key-queries.ts`): The key cache is keyed by the signed-in User id, so another User on the same page never sees cached keys.
- **`ApiReference`** (`apps/developer/src/components/api-reference.tsx`): Hash navigation and scrolling in the HTTP reference belong to Scalar: router scroll restoration is off there, the Scalar configuration is a module constant because Scalar reapplies navigation when it changes, and motion runs after Scalar places the target (`apps/developer/src/lib/use-reference-navigation-motion.ts`). Every tag is listed in an `x-tagGroups` group (`apps/developer/src/lib/reference-metadata.ts`) because Scalar hides ungrouped tags.

### Legacy Margonem identities

- **`parseCharacterIdentity`** (`apps/api/src/shared/margonem/player-snapshot.repository.ts`): A missing or zero account is unknown (`UNKNOWN_ACCOUNT_ID`, because Margonem does not report every character's account), malformed ids yield null, and combined ids split only when callers pass `legacyCombinedId`. Snapshot resolution also matches existing rows by stored data because older writers hashed different inputs.
- **`LEGACY_ID`** (`apps/api/src/loots/submission/loot-submission-normalization.ts`): Parsing stays because older Game clients appended the account id to participant character ids.
- **`lootNpcIdentity`** (`apps/api/src/loots/submission/loot-submission-normalization.ts`): A reported template id goes to the template namespace, a spawn without a template stays in the runtime namespace, and `legacy` covers clients that send only the overloaded `id`.
- **`monsterKey`** (`apps/api/src/loots/query/user-loot-stats.ts`): User loot stats key monsters by world and name, because kills identify colossi by a name-derived id and older clients reported template ids rather than spawn ids.
- **`feedNpcId`** (`apps/api/src/users/user-feed.ts`): Loots link to kills by `coalesce(runtimeNpcId, npcSnapshot.npcId)`, because kills use the runtime spawn id while older clients sent only the overloaded id.
- **`TimerNpcIdentity`** (`apps/api/src/timers/timer-projection.ts`): `npcId` is a runtime id for automatic timers and a generated id for manual and event timers, and `templateId` is the observed template or null. Auto timer reports keep the previous template id when older clients omit it (`apps/api/src/timers/timer-auto-report.ts`).
- **`MIN_MANUAL_TIMER_NPC_ID`** (`apps/api/src/shared/margonem/npc-identity.ts`): Manual timer NPC ids start at 1e9, far above runtime ids, so they cannot collide with game NPCs.
- **`normalizeReservationSpotId`** (`apps/api/src/reservations/reservation-spot-id.ts`): The original folding stays instead of `foldText` because spot ids are persisted: only U+0300–U+036F marks and ł fold, and ß, æ, ø, œ stay separators.
- **Catalog NPC publications** (`apps/api/src/loots/submission/loot-submission-publications.ts`): Revisions missing icon, level, weight, or type are skipped, because only revisions stored before those fields became required lack them.

## Consequences

- Any service reachable without Traefik forward-auth would accept forged identity; every new deployment path must keep the edge in front and strip the headers.
- The verify path must stay cheap: new work there needs measurement, and logging, tracing, or session-store reads on it are regressions.
- Revocation is bounded but not instant: a session can outlive sign-out by the decision cache plus the cookie cache window.
- Every new operation is session-only until listed in `PUBLIC_API_OPERATIONS`.
- The admin panel and the auth service both enforce access, so a change to one must not assume the other covers it.
- Legacy identity shapes are persisted, so their parsing stays until a data migration removes them.
