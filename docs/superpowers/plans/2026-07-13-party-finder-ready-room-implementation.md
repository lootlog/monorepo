# Party Finder Ready Room Implementation Plan

## Objective

Implement the approved Ready Room design in the API, gateway, shared contracts, and game client without creating durable gathering history. Preserve explicit user-clicked single and batch party invitations. No socket event, timer, ready transition, reconnect, raw game event, or render effect may execute a game action.

Source design: `docs/superpowers/specs/2026-07-13-party-finder-ready-room-design.md`.

## Delivery Rules

- Work test-first at each domain boundary: add or update the focused test, observe the failure, implement the smallest complete behavior, then rerun the focused test.
- Do not edit generated OpenAPI clients manually. Regenerate them after API DTOs and controllers stabilize.
- Keep React to one component per file and use i18n for every user-facing string.
- Do not start the application. Verification uses focused tests, package builds/typechecks, and lint.
- Use descriptive imports from real modules; do not add re-export-only wrappers.
- Preserve regular NPC notification volunteering as a separate legacy flow. Only general party gatherings and NPC notifications with `isGatheringParty` create Ready Rooms.
- Use `MAX_CAS_ATTEMPTS = 4`. Semantic CAS retries run immediately because the aggregate is capped at ten participants; after four conflicts, return the latest authorized projection with a conflict code. Do not retry organizer revision commands.
- Before terminal cleanup, capture the organizer plus current `APPLIED`/`ACCEPTED` recipients from the pre-transition aggregate. Publish their personalized tombstones after the atomic state/index transition.

## Phase 1: Shared Contracts and API Domain

### Task 1. Add transport contracts

Files:

- Create `packages/types/src/common/party-ready-room.types.ts`.
- Update `packages/types/src/index.ts`.
- Create `packages/types/src/common/party-ready-room.types.test.ts` only if runtime helper logic is added.

Define const-backed string unions and transport types for:

- room status;
- application, readiness, invitation, invitation source, and party-presence states;
- organizer and participant projections;
- personalized update envelope with `recipientDiscordId`, `eligibleGuildIds`, and projection;
- per-target invitation reservation and batch grouping;
- explicit error codes used across API and client.

Keep Redis aggregate internals out of the public transport contract.

Verification:

```sh
pnpm --filter @lootlog/types build
```

### Task 2. Add the API Ready Room domain model

Files:

- Create `apps/api/src/messaging/ready-room/ready-room.types.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-errors.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-projection.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-projection.spec.ts`.

Implement the internal aggregate, participant record keyed by Discord ID, ready-check round, invitation reservation, terminal tombstone, and organizer/participant projection builders. Projection tests must prove participants never receive another applicant's data and that terminal recipients are captured from the pre-transition aggregate.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room-projection.spec.ts
```

## Phase 2: Atomic Redis Repository

### Task 3. Implement Ready Room persistence and indexes

Files:

- Create `apps/api/src/messaging/ready-room/ready-room.repository.ts` as the service-facing interface.
- Create `apps/api/src/messaging/ready-room/ready-room-redis.repository.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-redis-scripts.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-redis.repository.spec.ts`.

Keys:

- aggregate by notification ID;
- organizer active-room string key;
- accepted-room string key per participant Discord ID;
- pending-application sorted set per participant, scored by `expiresAt`.

Implement command-specific Lua CAS operations for create, apply/reapply, accept, decline/remove, withdraw, invitation mutation, ready-check mutation, observation, close, and cancel. Scripts must:

- compare serialized aggregate/revision as appropriate;
- update aggregate and affected indexes atomically;
- preserve original `expiresAt`;
- release a lock only when it points at the current room;
- give concurrent cross-room acceptance one winner;
- remove all secondary indexes on explicit terminal transitions;
- retain only a short terminal tombstone;
- lazily prune expired/missing pending entries.

Repository tests mock the Redis boundary to assert scripts, keys, TTL arguments, and result mapping. Add a focused integration-style test against the repository abstraction for concurrent acceptance semantics when the test environment provides Redis; otherwise document the missing external-runtime proof in the final implementation record.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room-redis.repository.spec.ts
```

## Phase 3: API State Machine and HTTP Contract

### Task 4. Implement the state machine service

Files:

- Create `apps/api/src/messaging/ready-room/ready-room.service.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room.service.spec.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-publisher.ts`.
- Create `apps/api/src/messaging/ready-room/ready-room-publisher.spec.ts`.
- Update `apps/api/src/enum/routing-key.enum.ts`.

Implement every transition and authorization rule from the spec. Organizer commands use `expectedRevision`. Apply/reapply, participant withdraw, participant ready response, party observation, and invitation acknowledgement use bounded semantic CAS retries. Invitation acknowledgement is idempotent by per-target command ID.

Use `USERS_PARTY_READY_ROOM_UPDATED = "users.party-ready-room.updated"` for personalized RabbitMQ envelopes. Publish full projections after commit. A publish failure is logged but does not roll back Redis state.

Tests must cover:

- one participant record per Discord ID;
- same-character reapply idempotency and different-character conflict;
- multiple pending applications and one accepted-room lock;
- concurrent ready responses without global-revision conflicts;
- ready-check rounds and participants accepted/removed mid-round;
- explicit invitation reservation, per-target batch IDs, acknowledgements, reconciliation, and retry;
- no automatic transition from missing acknowledgement to `FAILED`;
- complete party snapshots, including empty snapshots;
- close/cancel recipient capture and cleanup;
- fixed TTL and four-attempt CAS exhaustion.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room.service.spec.ts ready-room-publisher.spec.ts
```

### Task 5. Add DTOs and controller routes

Files:

- Create `apps/api/src/messaging/ready-room/party-ready-room.controller.ts`.
- Create focused DTO files under `apps/api/src/messaging/ready-room/dto/` for application, organizer participant action, ready check, response, invitation reserve/ack/reconcile, party observation, projections, and errors.
- Create `apps/api/src/messaging/ready-room/party-ready-room.controller.spec.ts`.
- Update `apps/api/src/messaging/messaging.controller.ts` to remove only routes moved to the focused controller.
- Update `apps/api/src/messaging/messaging.module.ts` providers/controllers.
- Update `apps/api/src/messaging/messaging.service.ts` to delegate gathering creation/cancel behavior instead of retaining a second state owner.
- Update `apps/api/src/messaging/dto/create-notification.dto.ts` so `isGatheringParty` requires an organizer character snapshot.
- Update relevant messaging DTO/service/controller tests.

Routes under `/messaging/party-gathering`:

- create general gathering;
- fetch all authorized pending/accepted/owned projections and fetch one room;
- apply and withdraw self;
- accept, decline, or remove a participant;
- start ready check and respond as self;
- reserve single/batch invitation commands;
- acknowledge issued/failed per-target commands;
- reconcile/manual-annotate invitation state;
- report complete party member IDs;
- close and cancel.

Creation validates the entire request, then returns `ACTIVE_GATHERING_EXISTS` without mutating the old room. NPC creation with `isGatheringParty` goes through the same Ready Room service and aggregate. Ordinary NPC notifications and their volunteer endpoint stay unchanged.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- party-ready-room.controller.spec.ts messaging.service.spec.ts messaging.controller.spec.ts create-notification.dto.spec.ts
```

## Phase 4: Gateway Delivery

### Task 6. Add private user-and-guild rooms

Files:

- Update `apps/gateway/src/gateway/utils/room-utils.ts`.
- Update `apps/gateway/src/gateway/utils/room-utils.spec.ts` or create it if absent.
- Update `apps/gateway/src/gateway/services/subscription.service.spec.ts`.
- Update `apps/gateway/src/gateway/gateway.service.spec.ts` for permission rebalancing.

Add `buildUserGuildRoomName(discordId, guildId)`. Include one such server-controlled room per current guild in `calculateUserRooms`, so initial join and permission rebalance share the same calculation. Tests prove another Discord user cannot share the room and losing a guild removes it.

### Task 7. Route personalized Ready Room envelopes

Files:

- Add `USERS_PARTY_READY_ROOM_UPDATED` entries to `apps/gateway/src/gateway/enums/routing-key.enum.ts` and `apps/gateway/src/gateway/enums/queue.enum.ts`, including retry/DLQ variants consistent with existing handlers.
- Add `PARTY_READY_ROOM_UPDATE` to `apps/gateway/src/gateway/enums/gateway-event.enum.ts`.
- Update `apps/gateway/src/gateway/gateway-queue.handler.ts` and its spec.
- Update `apps/gateway/src/gateway/gateway.service.ts` and its spec.

Validate the shared envelope, build the recipient's eligible user-and-guild rooms, and emit the projection only to their Socket.IO union. Never use a guild-wide notification room for Ready Room participant data.

Focused verification:

```sh
pnpm --filter @lootlog/gateway test -- room-utils.spec.ts subscription.service.spec.ts gateway-queue.handler.spec.ts gateway.service.spec.ts
```

## Phase 5: Generated Clients and Game-Client State

### Task 8. Regenerate OpenAPI clients

Run:

```sh
pnpm api:client:generate
```

Review generated diffs for the new Ready Room DTOs and hooks in both game-client and web outputs. Do not hand-edit generated files. Run:

```sh
pnpm openapi:check
```

### Task 9. Replace local Ready Room authority with projections

Files:

- Rewrite the Ready Room portion of `apps/game-client/src/store/party-finder.store.ts`.
- Add `apps/game-client/src/store/party-finder.store.test.ts`.
- Create `apps/game-client/src/features/party-finder/hooks/use-party-ready-room-socket.ts` and test.
- Create `apps/game-client/src/features/party-finder/hooks/use-party-ready-room-sync.ts` and test.
- Create `apps/game-client/src/features/party-finder/hooks/use-party-ready-room-expiry.ts` and test.
- Update `apps/game-client/src/lib/socket.ts` and `apps/game-client/src/config/gateway.ts`.
- Update `apps/game-client/src/App.tsx` to install the new hooks.

Store projections by notification ID, with selected room, owned room, pending IDs, and accepted room derived from projections. Merge REST and socket data only when the incoming aggregate revision is newer. Remove persisted `partyGathering` and local invitation timeout state.

If non-gathering NPC volunteer state still needs local storage, move only that legacy slice to `apps/game-client/src/store/notification-volunteers.store.ts`; do not mix it into Ready Room projections.

At local `expiresAt`, disable controls and resync. A `404` removes the projection.

Focused verification:

```sh
pnpm --filter @lootlog/game-client test -- party-finder.store.test.ts use-party-ready-room-socket.test.ts use-party-ready-room-sync.test.ts use-party-ready-room-expiry.test.ts
```

## Phase 6: Party Observation and Explicit Invitation Commands

### Task 10. Report complete party snapshots

Files:

- Keep raw event parsing in `apps/game-client/src/processors/party-processor.ts`.
- Update `apps/game-client/src/processors/party-processor.test.ts` only for normalized complete/empty snapshot guarantees.
- Create `apps/game-client/src/features/party-finder/hooks/use-party-ready-room-observer.ts` and test.
- Update `apps/game-client/src/store/party.store.ts` only if a stable normalized selector/version is needed.

The observer is active only for the organizer's room. It sends the complete normalized member-ID set once after initial detection and again only when the set changes. It calls the Ready Room HTTP endpoint and never a game helper.

### Task 11. Implement the two-phase invitation hooks

Files:

- Create `apps/game-client/src/features/party-finder/hooks/use-invite-ready-room-participant.ts` and test.
- Create `apps/game-client/src/features/party-finder/hooks/use-invite-all-ready-room-participants.ts` and test.
- Keep `apps/game-client/src/utils/game/character-actions.ts` as the explicit game-command boundary.
- Extend `apps/game-client/src/utils/game/character-actions.test.ts` only where the boundary needs clearer coverage.

Single and batch flows must reserve first, invoke each helper exactly once only after a successful reservation, then acknowledge without re-invoking the helper. A lost acknowledgement displays derived `UNKNOWN`; only another explicit click may reserve a new command ID. Batch flow uses immutable per-target IDs returned by the API.

Focused verification:

```sh
pnpm --filter @lootlog/game-client test -- use-invite-ready-room-participant.test.ts use-invite-all-ready-room-participants.test.ts character-actions.test.ts use-party-ready-room-observer.test.ts party-processor.test.ts
```

## Phase 7: Ready Room UI and Existing Entry Points

### Task 12. Build the organizer and participant views

Files:

- Keep `apps/game-client/src/features/party-finder/party-finder.tsx` as the single window shell.
- Create one component per file under `apps/game-client/src/features/party-finder/components/` for organizer view, participant view, participant row, application list, accepted list, status badges, ready-check controls, invitation controls, and empty states.
- Add focused component tests beside the views.
- Delete obsolete `volunteers-list.tsx` and `volunteers-list-item.tsx` after updating imports; do not leave re-export wrappers.
- Update `apps/game-client/src/i18n/translations/party-finder.json`.

Organizer UI exposes accept, decline, remove, ready check, explicit single/batch invite, manual annotation/reconciliation, close, and cancel according to projection state. Participant UI exposes only own state, ready response, and withdraw. Copy distinguishes command issued from invitation accepted and explains that remove does not kick from the Margonem party.

### Task 13. Update creation, chat, notification, quick-access, and hotkey flows

Files:

- Update `apps/game-client/src/features/party-finder/hooks/use-party-gathering-orchestration.ts` and tests.
- Remove `apps/game-client/src/hooks/api/use-silent-cancel-party-gathering.ts` and its tests after removing all imports.
- Update `apps/game-client/src/hooks/api/use-cancel-party-gathering.ts` and tests for terminal projections.
- Update `apps/game-client/src/features/chat/components/party-gathering-card.tsx` and test to apply/open the Ready Room.
- Update `apps/game-client/src/features/notifications/components/single-notification.tsx` only where `isGatheringParty` must use Ready Room application; keep ordinary notification volunteering unchanged.
- Update `apps/game-client/src/features/quick-access/quick-access.tsx`, `apps/game-client/src/hooks/use-hotkeys.tsx`, and `apps/game-client/src/features/npc-detector/components/npc-list-item.tsx` to use projection selectors.
- Delete `apps/game-client/src/features/party-finder/hooks/use-party-finder-socket.ts` only after ordinary NPC volunteer handling has a separate owner path.
- Update `apps/game-client/src/features/party-finder/hooks/use-party-gathering-socket.ts` so announcements remain notifications while Ready Room state comes from the new sync channel.

General and NPC gathering creation must stop silently cancelling the existing room. `ACTIVE_GATHERING_EXISTS` opens the current room and asks the organizer to close or cancel it explicitly. Successful creation uses the returned organizer projection instead of synthesizing local session state.

Focused verification:

```sh
pnpm --filter @lootlog/game-client test -- party-gathering-card.test.tsx use-party-gathering-socket.test.ts use-cancel-party-gathering.test.ts
```

## Phase 8: Verification, Safety Audit, and Implementation Record

### Task 14. Run package verification

Focused suites first, then:

```sh
pnpm --filter @lootlog/types build
pnpm --filter @lootlog/api test
pnpm --filter @lootlog/api lint
pnpm --filter @lootlog/api build
pnpm --filter @lootlog/gateway test
pnpm --filter @lootlog/gateway lint
pnpm --filter @lootlog/gateway build
pnpm --filter @lootlog/game-client test
pnpm --filter @lootlog/game-client build
pnpm openapi:check
```

Do not claim success from a narrow test if a broader package command fails.

### Task 15. Audit game-action boundaries

Run repository searches proving that Party Finder game helpers are reachable only from explicit click-driven invitation hooks:

```sh
rg -n "inviteCharacterToParty|inviteCharacterToFriends|window\._g" apps/game-client/src/features/party-finder apps/game-client/src/store apps/game-client/src/processors
rg -n "inviteCharacterToParty|inviteCharacterToFriends" apps/game-client/src
```

Inspect every result. Tests must prove socket events, effects, expiry timers, ready transitions, reconnects, and raw party processing never call these helpers.

### Task 16. Save the verified implementation record

Create:

`docs/superpowers/implementation/2026-07-13-party-finder-ready-room-implementation.md`

Record only current evidence:

- implemented behavior and changed modules;
- transport/API/realtime contracts;
- exact verification commands and results;
- explicit game-action boundary and audit results;
- deferred research-plan items;
- limitations, including any atomic Redis behavior not exercised against a real Redis runtime.

Format the record, run `git diff --check`, and include it in the final implementation commit.

## Completion Gate

Before declaring this vertical complete, audit each of the nine success criteria in the design against current files and test output. Any criterion without direct evidence remains incomplete. The broader research goal stays active after Ready Room completion; the next recommended independent vertical is contextual pings.
