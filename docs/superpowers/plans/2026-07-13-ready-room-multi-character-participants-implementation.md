# Ready Room Multi-Character Participants Implementation Plan

**Spec:** `docs/superpowers/specs/2026-07-13-ready-room-multi-character-participants-design.md`

## 1. Shared contract

- Add Ready Room schema version `2`.
- Add `participantId` and `applicationVersion` to participant records.
- Change participant projections from one Discord-keyed entry to participant-ID-keyed records, with organizer `ownedParticipantIds`.
- Replace invitation target `participantDiscordId` fields with `participantId`; reservation requests also carry `applicationVersion`.
- Update DTO schemas and regenerate API clients instead of editing generated files.

Verification:

```sh
pnpm --filter @lootlog/types test
pnpm --filter @lootlog/types typecheck
```

## 2. API domain and projections

- Write failing projection and service tests for two characters owned by one Discord identity, organizer alternate-character application, idempotent application versions, authorization by participant ID, recipient deduplication, and organizer projection precedence.
- Key aggregate participants by server-generated participant ID.
- Enforce unique room `(world, characterId)` and allow the organizer's different character.
- Target every organizer and participant-local transition by participant ID.
- Return all viewer-owned entries to non-organizers and mark organizer-owned entries in organizer projections.
- Match party observations across the complete accepted set by room world and character ID.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room-projection.spec.ts ready-room.service.spec.ts party-ready-room.controller.spec.ts
```

## 3. Redis v2 repository

- Write failing repository tests for v2 key isolation, user-room discovery, character-specific acceptance locks, multi-entry retention, termination cleanup, lazy pruning, and organizer/user index deduplication.
- Replace legacy Ready Room prefixes with v2 prefixes.
- Replace the pending index with a user-room index maintained atomically whenever the final active entry of an owner leaves a room.
- Key accepted-room locks by owner plus account and character identity.
- Deduplicate discovery IDs before loading aggregates.
- Keep terminal tombstones and all indexes on the aggregate's fixed TTL rules.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room-redis.repository.spec.ts ready-room.service.spec.ts
```

## 4. Reservation semantics

- Add failing tests for application-version-bound targets, explicit supersession of active reservations, acknowledgement-before-reservation and reservation-before-acknowledgement orderings, empty batches, and four-attempt CAS exhaustion.
- Remove client global revision from reservation preconditions.
- Implement bounded server-side semantic CAS retries that revalidate organizer, room, participant ID, application version, acceptance, and party presence.
- Keep acknowledgements idempotent by command ID; stale acknowledgements cannot replace a newer command.

Focused verification:

```sh
pnpm --filter @lootlog/api test -- ready-room.service.spec.ts
```

## 5. Client projection store and synchronization

- Write failing store and sync tests for per-character accepted-room selection, multiple owned entries, authoritative v2 list replacement, and socket updates arriving during list synchronization.
- Derive current participant state from active local account and character IDs.
- Capture a baseline before list requests; merge REST results and remove only unchanged baseline entries absent from the response.
- Ignore non-v2 projections and retain newer socket revisions.
- Update chat cards, selectors, participant views, and organizer lists to use participant IDs.

Focused verification:

```sh
pnpm --filter @lootlog/game-client test -- party-finder.store.test.ts use-party-ready-room-sync.test.ts party-gathering-card.test.ts
```

## 6. Shared explicit invitation coordinator

- Write failing deterministic tests using deferred promises for rapid clicks, FIFO reservation ordering, partial helper failures, acknowledgement retries, stale acknowledgements, room switches, application-version changes, party-entry changes, and shared button/hotkey/row coordination.
- Add one shared coordinator outside individual React hook instances.
- Capture notification ID, organizer character, and click-time participant ID/application-version pairs for each intent.
- Serialize reservations and synchronous helper issuance; acknowledgements retry independently at most twice without ever re-invoking a game helper.
- Keep `Zaproś wszystkich` rendered and clickable while earlier intents run; disable game-context controls unless connected, synchronized, active, unexpired, and running on the organizing character.
- Apply the same gates to individual invitation controls and the global hotkey.

Focused verification:

```sh
pnpm --filter @lootlog/game-client test -- use-ready-room-invitations.test.ts use-hotkeys.test.ts use-party-ready-room-observer.test.ts
```

## 7. Full verification and implementation record

- Run API, gateway, game-client, types, and web type checks/tests affected by the contract.
- Run repository formatting, lint, build, and `git diff --check`.
- Update `docs/superpowers/implementation/2026-07-13-party-finder-ready-room-implementation.md` with implemented multi-character and repeat-invitation behavior plus exact verification results.
- Commit cohesive implementation slices using Conventional Commits without bypassing hooks.

Verification:

```sh
pnpm --filter @lootlog/api test
pnpm --filter @lootlog/gateway test
pnpm --filter @lootlog/game-client test
pnpm --filter @lootlog/game-client build
pnpm --filter @lootlog/web typecheck
pnpm lint
pnpm format:check
git diff --check
```
