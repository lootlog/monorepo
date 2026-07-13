# Ready Room Multi-Character Participants and Repeat Invitations

## Context

The first Ready Room implementation treats an authenticated Discord ID as the participant identity. The aggregate is keyed by `discordId`, participant projections expose one entry, participant commands infer their target from the authenticated Discord ID, and Redis acceptance locks are also keyed by Discord ID.

That model incorrectly merges two Margonem characters owned by the same Lootlog user. It also prevents an organizer from applying with a second character because the organizer and applicant have the same Discord ID. Separately, `Zaproś wszystkich` disappears while every eligible participant has an active invitation reservation and is disabled while a batch is being processed. This prevents the deliberate rapid repeat clicks used by organizers.

The correction keeps authorization attached to Discord identity while making Ready Room participation character-specific. It also treats every button or hotkey activation as a separate explicit invitation intent. No socket event, timer, party observation, readiness change, or other background process may enqueue an invitation.

## Goals

- Allow one Discord identity to own several independent participant entries in the same Ready Room.
- Allow an organizer to apply with another owned character while rejecting a duplicate of the organizing character.
- Track application, readiness, invitation, and party-presence state independently per character.
- Keep `Zaproś wszystkich` visible for the organizer and allow deliberate repeat clicks without waiting for the control to disappear and return.
- Preserve the rule that Lootlog performs a game action only because of a direct click or configured hotkey activation.

## Non-goals

- Automatically accepting applicants.
- Automatically inviting after acceptance, readiness, reconnect, reservation expiry, or party changes.
- Verifying Margonem account ownership beyond the authenticated application flow already used by the game client.
- Migrating live legacy Ready Rooms into the new schema. The cutover invalidates them explicitly as described below.

## Considered Identity Models

### Discord ID as the participant key

This is the current model and is rejected because it collapses all characters owned by one Lootlog user into one entry.

### Character ID as the participant key

This distinguishes characters but mixes domain identity with authorization and assumes character IDs alone are globally unique. It also makes ownership checks less explicit.

### Server participant ID with an owner and character identity

This is the selected model. Every participant record receives a server-generated `participantId`. The record also contains its owner `discordId` and the submitted `accountId` plus `characterId`. Within a room, `(discordId, accountId, characterId)` identifies an existing application for idempotent reapplication, while `participantId` is the stable command target.

## Domain Model

The Ready Room aggregate stores:

```ts
participants: Record<participantId, PartyReadyRoomParticipant>;
```

`PartyReadyRoomParticipant` gains `participantId` and a monotonically increasing `applicationVersion`, and retains `discordId` as its owner. Application, readiness, invitation, and party-presence fields remain attached to that participant record. The initial application uses version `1`. An idempotent repeat application leaves the version unchanged; reapplication after `DECLINED` or `WITHDRAWN` increments it.

The same Discord identity may have multiple `APPLIED` or `ACCEPTED` records in one room, provided their character identities differ. Repeating an application for the same owner and character is idempotent. A `DECLINED` or `WITHDRAWN` record may be reapplied without changing its `participantId`, but it starts a new application version. Within one room, `(world, characterId)` is unique across participant records, preventing two Discord identities from representing the same in-game character.

The organizer may apply with another character owned by the same Discord identity. An application matching the room's organizing `(accountId, characterId)` is rejected because the organizing character is already represented by the organizer record.

No participant command uses a Discord ID as its target. Organizer commands target `participantId`. Participant-local commands also carry `participantId`, and the API verifies that the targeted record's `discordId` matches the authenticated caller.

## Projections and Recipients

The organizer projection contains every participant keyed by `participantId` and an `ownedParticipantIds` list identifying entries owned by the organizer's Discord identity. A non-organizer participant projection contains all participant records owned by the authenticated Discord identity, not records owned by other users.

The game client identifies the entry for the locally active Margonem character by `accountId` and `characterId`. This lets two browser sessions authenticated with the same Discord identity operate on their respective character entries. If the viewer is also the organizer, organizer permissions remain available and the locally matching owned entry can still answer its own ready check or withdraw.

API discovery returns every active room referenced by the viewer's user-room index, plus an organizer-owned room. Repository results are deduplicated by `notificationId` before projection. When the viewer owns the room and also has participant entries, the service returns exactly one organizer projection with `ownedParticipantIds`; organizer projection always takes precedence over participant-only projection.

The client derives accepted-room state per local character identity instead of keeping one accepted room for the entire Discord identity. A selector receives the active `(accountId, characterId)` and returns the room containing the matching `ACCEPTED` participant. Switching browser character therefore switches the selected participant room without changing another browser's selection.

Publications are deduplicated by recipient Discord ID. Multiple changed participant records owned by the same Discord identity produce one personalized projection for that recipient, so sharing a Discord login across browsers does not produce duplicate socket envelopes.

## Redis Indexes and Locks

The organizer-room index remains keyed by Discord ID because room ownership is still a Discord-level permission.

The pending index is replaced by a user-room index keyed by Discord ID. It contains a room while that user has at least one active `APPLIED` or `ACCEPTED` participant record there. Every transition out of `APPLIED` or `ACCEPTED`, including decline, removal, withdrawal, room close, and room cancel, applies the same atomic rule: keep the room in the index if and only if another active participant owned by that Discord identity remains in that room.

The accepted-room lock becomes character-specific and is keyed by the owner and character identity. It prevents the same `(discordId, accountId, characterId)` from being accepted in two rooms while allowing another character owned by the same Discord identity to be accepted independently.

Room termination removes the room from each unique participant owner's user-room index and releases every character-specific acceptance lock before writing the terminal tombstone. Natural-expiry pruning follows the same key model.

### Schema cutover

The new aggregate, organizer index, user-room index, character acceptance locks, and terminal tombstones use a `v2` Redis key prefix. The API never deserializes an unversioned legacy aggregate as the new shape. Deployment intentionally invalidates active legacy Ready Rooms: the old keys become unreachable to the new API and expire under their existing fixed room TTL, which is at most 30 minutes.

The first v2 list synchronization is authoritative rather than merge-only. At request start, the client captures a baseline of projection IDs and revisions. On response it merges returned projections first, removes projections without `schemaVersion: 2`, and removes an absent v2 projection only when it existed in the baseline and its current revision has not advanced past the captured baseline revision. A room introduced by a socket after request start, or advanced by a newer socket revision while the request is in flight, survives the delayed response.

Socket envelopes and REST projections carry `schemaVersion: 2`; the client ignores other Ready Room schema versions. This prevents an already-open game client from retaining a legacy room after deployment without allowing a delayed list response to overwrite newer socket state. No key scan or eager migration is required.

## Invitation Commands

`Zaproś wszystkich` is always rendered in an active organizer view. It does not disappear because a target is `COMMAND_RESERVED`, `SENT`, or `FAILED`. It is enabled only when the room is active, connected and synchronized, not locally expired, the local Margonem character matches the room's organizing `(accountId, characterId)`, and at least one participant is `ACCEPTED` and currently observed as `OUTSIDE`. Earlier queued intents do not disable it.

The button and its configured hotkey use one shared FIFO invitation coordinator. Every physical click or hotkey activation captures one explicit intent containing the current `notificationId`, organizing character identity, and the click-time snapshot of `(participantId, applicationVersion)` pairs that are `ACCEPTED` and `OUTSIDE`. New participants accepted after that click are not added to the intent. A participant that exits and later reapplies is a new application version and is not covered by the older intent. The control remains clickable while earlier intents are running.

At execution time, the coordinator loads the latest projection for the captured room only. It cancels the intent without a game action if the room is no longer active or the local character no longer matches the captured organizing character. The API reserves only captured targets that remain `ACCEPTED` and `OUTSIDE`; participants who joined the party since the click are omitted. A room switch cannot redirect an old intent to the new room.

Each intent reserves a fresh batch and per-target command IDs before calling the game helper. The API accepts the captured participant IDs and application versions and reserves only exact current matches. An explicit later intent may supersede an unexpired earlier reservation for the same target; acknowledgements carrying an older command ID remain stale and cannot overwrite the newer invitation state. A reservation with no remaining eligible target returns an empty batch and the current projection without invoking a game helper.

Invitation reservation does not depend on a client-supplied global revision. It uses a bounded server-side semantic CAS loop of at most four attempts: each conflict reloads the room, rechecks organizer authorization, room status, participant ID, application version, acceptance, and party presence, then commits fresh command IDs only for still-valid targets. This lets acknowledgement commits race with the next explicit reservation without discarding that click because of an avoidable `REVISION_CONFLICT`. Exhaustion returns `REVISION_CONFLICT` and invokes no game helper.

The coordinator serializes reservation and game-helper issuance for intents originating in one client. Acknowledgements may overlap a later reservation, but both server operations use semantic CAS retries; if the later reservation commits first, the older acknowledgement becomes `STALE_COMMAND`, and if acknowledgement commits first, the reservation retries against that revision.

One successful reservation invokes the game helper at most once per returned target for that intent. A failed reservation invokes no game helper. A click that cannot reserve because the room changed reports the error and is not silently converted into an automatic retry.

After a batch reservation, helper invocation proceeds independently per target. A synchronous helper exception records `FAILED` for that target and does not stop the remaining targets. Once every returned target has either been invoked or failed synchronously, the next queued intent may start; it does not wait for acknowledgement network completion.

Acknowledgements run independently with the immutable command ID and outcome produced by that intent. Transport failures may retry the acknowledgement request at most twice with the same command ID because acknowledgement never calls the game helper. `STALE_COMMAND` is terminal and is not retried. Timeout or exhaustion leaves the command unresolved but never stalls the invitation FIFO and never schedules another game action.

Individual invitation actions use the same coordinator and participant IDs, preventing a single-invite click from racing a queued invite-all intent. They use the same connected, synchronized, active-room, local-expiry, and organizing-character enablement gates as `Zaproś wszystkich`. The coordinator is shared by the Party Finder button, participant-row buttons, and the global hotkey rather than being local to each React hook instance.

## Explicit-Action Boundary

The following events may enqueue an invitation intent:

- clicking an individual invite button;
- clicking `Zaproś wszystkich`;
- activating the configured `invite-all` hotkey.

No other event may enqueue one. In particular, application acceptance, ready-check completion, a participant becoming `OUTSIDE`, socket synchronization, mounting a component, reservation expiry, and party observation remain informational state changes only.

Only a browser whose locally active character matches the room's organizing `(accountId, characterId)` may enqueue organizer invitation intents or publish party observations. Other browsers sharing the organizer's Discord identity may use non-game organizer controls and may operate on their own locally matching participant record, but their local game party is never used for the organizer's invitations or observations.

The existing dedicated-click boundary for friend invitations is unchanged.

## Party Observation

Only the organizing-character browser publishes the complete set of observed party member character IDs. The room world is fixed, and the API matches each observed `characterId` against the unique `(room.world, participant.character.characterId)` of every `ACCEPTED` participant. Matching entries become `IN_PARTY`; other accepted entries become `OUTSIDE`. One observation may therefore update several participant IDs, including several records owned by the same Discord identity. The payload never names a participant ID or account ID and never invokes a game action.

## Error Handling

- A command targeting a missing participant ID returns `INVALID_STATE_TRANSITION` without touching the game.
- A participant-local command targeting an entry owned by another Discord identity returns `FORBIDDEN`.
- Reapplying the organizing character returns `INVALID_STATE_TRANSITION` without creating an entry.
- Reusing the same `(world, characterId)` under another participant owner returns `CHARACTER_ALREADY_APPLIED` without creating an entry.
- A stale invitation acknowledgement returns `STALE_COMMAND` and cannot replace a newer explicit invitation intent.
- A queued target whose `applicationVersion` no longer matches is omitted and cannot invite a later reapplication.
- A queued intent whose targets have all entered the party receives an empty reservation batch and invokes no game helper.
- A reservation failure is surfaced for that explicit intent and the FIFO continues with the next captured click.
- A helper failure affects and acknowledges only that target; remaining targets and later intents continue.
- An acknowledgement timeout or exhausted retry is reported but never stalls the FIFO and never schedules a game action.

## Client Behavior

Lists and React keys use `participantId`, so two entries with the same Discord owner render independently. Organizer actions pass participant IDs. Participant actions choose the record matching the active local character before sending a command.

The organizer can see and manage their second character as a normal participant entry. The second browser receives the same organizer-authorized projection because authorization is shared, but readiness and withdrawal actions target only its locally matching participant record. Organizer game-context controls are disabled there unless that browser is running the organizing character.

The store derives pending and accepted rooms for the active character rather than for the whole Discord identity. Multiple browser sessions may therefore select different participant entries and rooms from the same personalized projection without overwriting one another.

## Testing Strategy

### API and Redis

- Applying two distinct characters from one Discord identity creates two participant IDs and two organizer-list entries.
- Repeating the same character application is idempotent and reuses its participant ID.
- Reapplication after decline or withdrawal reuses the participant ID and increments `applicationVersion`.
- An organizer may apply with a second character but not the organizing character.
- Accept, decline, remove, withdraw, ready response, invitation reservation, acknowledgement, annotation, and reconciliation affect only their targeted participant ID.
- Participant command DTOs and invitation targets use `participantId`; queued invitation targets additionally carry `applicationVersion` and never use Discord ID as a command target.
- Participant-local commands cannot target another Discord owner's entry.
- One character cannot be accepted in two rooms, while two characters owned by one Discord identity can be accepted independently.
- Removing one of several entries retains the user-room index until the final active entry exits.
- Decline, removal, withdrawal, close, and cancel all apply the same atomic user-room retention rule.
- Recipient lists contain each Discord ID once even when several owned entries change.
- Termination and lazy pruning remove user-room indexes and character locks without leaving stale rooms discoverable.
- V2 discovery never parses legacy aggregates, and authoritative synchronization removes legacy client projections.
- Discovery deduplicates organizer/user index overlap and returns one organizer-precedence projection.
- One complete party observation matches the full accepted set by unique `(room.world, characterId)` and may update several participant records without naming a participant ID.

### Game client

- Two entries sharing a Discord ID render with distinct keys and controls.
- The active local account and character select the correct owned participant entry.
- `Zaproś wszystkich` remains rendered during reservation and acknowledgement work.
- Rapid clicks create serialized explicit intents; every successfully reserved intent invokes the helper once per returned target.
- A target observed `IN_PARTY` before a queued intent executes is skipped.
- A queued click remains bound to its original room and target snapshot across room changes and later acceptances.
- A queued click cannot target a later application version of the same participant ID.
- Button, participant-row action, and hotkey share the same coordinator.
- Reservation errors, partial helper failures, stale acknowledgements, and acknowledgement timeouts never stall later queued clicks.
- Both acknowledgement-before-reservation and reservation-before-acknowledgement orderings preserve the later explicit intent without an avoidable revision conflict.
- A browser running the organizer's second character cannot issue organizer invitations or party observations; the organizing-character browser can.
- An apply socket envelope received during authoritative list synchronization survives a delayed REST response.
- No socket, timer, observer, ready transition, mount effect, or API synchronization calls a game helper.

## Documentation

After implementation, update the Ready Room implementation record with the new participant identity, Redis indexes, projection behavior, and repeat-invitation semantics. Record the focused and full verification commands that passed.
