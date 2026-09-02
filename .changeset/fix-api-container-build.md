---
"@lootlog/api": patch
"@lootlog/activity": patch
"@lootlog/auth": patch
"@lootlog/battlelog": patch
"@lootlog/cli": patch
"@lootlog/client": patch
"@lootlog/discord-bot": patch
"@lootlog/game-client": patch
"@lootlog/gateway": patch
"@lootlog/landing": patch
"@lootlog/search": patch
"@lootlog/web": patch
---

Declare the Bun type definitions required by the API's isolated Docker build.
Upgrade Better Auth and Redis storage to 1.7.2, add the issuer identity
migration with collision preflight, and make fresh, 1.6, and 1.7 database
adoption explicit. Move Activity, Auth, Battlelog, Search, and Discord Bot HTTP
operations to Effect HttpApi without changing their deployed paths or operation
IDs. Replace Search's Promise service graph with typed Effect modules while
preserving fail-soft public reads and Rabbit requeue behavior. Replace
Battlelog's controller and Promise service classes with functional modules and
direct Drizzle, Redis, and R2 adapters while preserving all 26 operations.
Replace API's Events and Notifications controller dispatcher with exhaustive
typed adapters, and route Activity's API health and permission reads through a
bounded, retry-aware Effect HttpClient adapter. Give every Kills/Loots data
operation its stable OpenAPI operation-ID span and remove its legacy-layer path.
Replace API's Maps Promise/fetch service with a bounded, interruptible Effect
HttpClient operation that retains the existing Redis key and fail-soft response.
Move Gateway websocket credential verification to a typed, interruptible Effect
HttpClient module without retrying single-use tickets.
Move Gateway Organization permission and Margonem proof-key reads to bounded,
interruptible Effect modules while preserving Redis projection fallbacks.
Replace API's remaining direct outbound HTTP calls with one local typed Effect
adapter, bounded responses, explicit deadlines, and mutation-safe retry rules.
Delete the superseded Map Templates Promise service/repository path and unused
API runtime, database, observability, and health compatibility modules.
Replace API Settings, Timer Settings, and Sound Settings Promise classes with
one typed Effect module backed by direct transactional Drizzle operations.
Replace API Docs Promise service/repository classes with a typed Effect module,
direct Drizzle reads and spanned transactional writes.
Replace the public Organization stats-card Promise service/repository path with
an Effect module over direct Drizzle, Redis, HttpClient, and image adapters.
Replace the Internal Guild permission/read and Roles read/update HttpApi paths
with direct Effect/Drizzle modules and explicit Redis adapters while preserving
their authorization and cache contracts.
Replace the Guild Configuration HttpApi path with direct Effect/Drizzle and
Redis adapters while preserving validation, vanity aliases, and cache keys.
Replace the User Lootlog Config HttpApi path with direct Effect/Drizzle and a
fail-soft Redis adapter while preserving permission filtering and cache keys.
Replace API's Discord Bot Promise client class with a typed Effect client while
preserving the channel refresh behavior used by the current service graph.
Replace the Discord notification consumer and delivery classes with one typed
Effect delivery module with mutation-safe timeout policy while preserving
Rabbit delivery-result contracts.
Route idempotent Discord SDK reads through a bounded Effect adapter with
deadlines and per-attempt telemetry.
Replace the remaining API identity, Organization, member, role, settings,
timer, reservation, document, loot, kill, event, notification, channel,
messaging, and ready-room compatibility paths with domain-owned Effect modules
and direct infrastructure adapters. Delete the compatibility Layer factory,
legacy controller dispatcher, static routing table, and monolithic native data
layer.
Replace Discord Bot synchronization, event callbacks, and Rabbit publishing
with Effect-native operations while keeping Discord SDK Promises inside the
adapter boundary. Complete Battlelog's analytics, metadata, pagination,
deduplication, and worker orchestration as functional Effect modules.
Remove obsolete framework documentation, tooling, lifecycle/middleware shims,
and project-local ORM skills.
Remove unused workspace dependencies and declare Battlelog's
maintenance-script dependency explicitly.
