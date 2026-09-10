# Ready Room discovery rollout

Active gatherings are Redis v3 aggregates with a maximum lifetime of 30 minutes.
Creation atomically adds the room to an expiry-scored index for every target
Organization and world. Discovery reads these indexes, removes expired entries,
and checks the current aggregate status and current membership, chat permissions,
NPC tier, and role level range. It returns summaries without participant rosters
or hidden Organization IDs. Cancellation leaves a short aggregate tombstone;
discovery rejects it immediately even while its index entry remains.

NPC gatherings now retain their source NPC metadata in the aggregate and private
projection. HTTP discovery, signup, details and owned/joined lists, and gateway
projection delivery apply that source policy. Generic and pre-upgrade aggregates
retain their existing behavior. New chat NPC reports also carry an optional
`npc.world`; historical reports without it remain readable but must not initiate
source-dependent actions.

An organizer with current gathering-creation permission in an Organization can
read and cancel their own gathering regardless of NPC tier or level restrictions.
The shared policy applies to HTTP discovery, details, owned lists and gateway
projection delivery. Other viewers retain the NPC source restrictions; ownership
never grants access to another Organization. Deploy API and gateway together for
this organizer recovery behavior; persisted rooms need no migration.

Discovery summaries include nonnegative integer `applicantCount` and
`inPartyCount` values derived from registered characters. Both exclude the
organizer character, even if explicitly registered; `inPartyCount` includes only
registered characters observed in the party, not unrelated party members.
Only visible gatherings expose these totals, and participant projections remain
private. Deploy this additive API response before the updated game client; the
legacy counters require no persistence migration.

The optional `partyMemberCount` reports the total deduplicated character IDs from
an organizer observation, including the organizer and unregistered party members.
It is absent until the first observation. It is persisted in the aggregate and
included in both private projections and visible discovery summaries. Observed
total changes publish updates to all current room recipients even when applicant
presence is unchanged. The legacy `inPartyCount` keeps its registered-character
meaning for existing clients. Deploy the additive API and gateway schemas before
the game client; drain old API writers because they can discard the new field.

## Deployment

1. Deploy the gateway source-visibility filter before any API instance emits the
   new NPC-bearing projections.
2. Pause gathering mutations at ingress while switching API versions. Drain all
   old API instances and their in-flight requests before routing gathering
   mutations to the new version. Do not run old and new gathering writers
   concurrently: an old writer can discard the new NPC metadata. Record the
   drain completion time, then reopen mutations on the new API only.
3. Wait at least 30 minutes after the last old instance is drained. Old aggregates
   have neither a discovery index nor reliable NPC source metadata. Chat retention
   cannot reconstruct that metadata reliably, so do not broadly backfill them.
4. Deploy the game client after this interval. New rooms created during the wait
   are already indexed. Existing old clients remain compatible with the additive
   fields and endpoint.

Verify a newly created room through the active endpoint on its original world,
with an authorized second account, and verify that cancellation removes it.
Also verify rejection on another world and under a role that cannot read its NPC
source. Do not print real rosters or account data in deployment logs.

Clients reconcile discovery on connection, relevant realtime events and every
30 seconds, and expire summaries locally. Owned/joined rooms are also reconciled
periodically and after permission changes. Chat retention and notification toast
settings are not the source of active-room truth.

## Rollback

Reuse the recorded immutable deployments or image references; never rebuild the
rollback revision. Roll back the client first if needed. Keep the new gateway
filter and API source policy while NPC-bearing rooms can still exist. An older
API or gateway must not resume processing these rooms: older code can discard
source metadata during a write or omit its visibility checks.

To roll back the backend fully, first stop new gathering creation at ingress,
drain the new API writers, and wait the full 30-minute lifetime of the last
accepted room before restoring the older API/gateway. Verify no live indexed
rooms remain before reopening creation. Do not delete accepted rooms or flush
Redis as a rollback shortcut. A later forward rollout repeats the deployment
sequence above.

## Verification

- `ready-room-cas.integration.test.ts` exercises the real Redis scripts, world
  and Organization indexes, deduplication, revision conflicts and cancellation.
- `ready-room-visibility.test.ts` exercises membership, tier and level policy
  against the database boundary.
- Handler tests assert that active summaries omit participant data; gateway
  source-event tests assert the corresponding delivery restrictions.
- Run `bun run client:generate` and review the additive OpenAPI/client changes.
  Run `bun run client:check` on the committed result; its generated-file check
  rejects any uncommitted generated outputs, even when regeneration is stable.

Generic gathering creation publishes `guilds.party-gathering` for each authorized Organization after persistence, in addition to the private organizer update. This lets viewers refresh discovery without a chat message or a page reload.

Cancellation publishes `guilds.party-gathering.cancel` to every source Organization after successful termination, independently of chat messages and participant-only updates. Discovery viewers can therefore remove the gathering without reloading.

Game-client disconnection uses a gateway-owned 10-second reconnect grace period.
The gateway persists pending deadlines, cancels them on renewed character presence,
and publishes `game.character.offline` after verifying no matching game session
remains. The API consumes this fact and cancels the matching organizer's active
room or removes only the matching participant. World, character, source
Organization, and creation-time checks prevent delayed events from affecting a
new gathering or application. Duplicate facts do not advance terminal state.
Deploy the API consumer before the gateway publisher; no HTTP contract changes
are required. The timer starts when the gateway detects disconnection, so network
failures can take longer to detect than an ordinary browser close.
