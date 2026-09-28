# Ready Room discovery rollout

Active gatherings are Redis v3 aggregates with a maximum lifetime of 30 minutes.
Creation atomically adds the room to an expiry-scored index for every target
Organization and world. Discovery reads these indexes, removes expired entries,
and checks the current aggregate status and current membership, chat permissions,
NPC tier, and role level range. It returns visible character rosters without private account data
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
Only visible gatherings expose these totals. Participant projections retain
private ownership and action metadata; their additional volunteer roster carries
only the same public character fields as discovery. Deploy the additive API
response before the updated game client; legacy counters keep their meaning.

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

Clients reconcile discovery on every gateway join and on relevant realtime
events, and expire summaries locally. Owned/joined rooms are reconciled on every
gateway join and after permission changes, and expired rooms are re-read on
their local expiry. Clients must not poll either list on a timer: with thousands
of concurrent players a periodic refetch overloads the API. Chat retention and
notification toast settings are not the source of active-room truth.

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
- Handler tests assert that active summaries expose volunteers and observations
  without private participant ownership data; gateway source-event tests assert
  the corresponding delivery restrictions.
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

## Live volunteer and party state

Discovery and personal projections include `volunteers` (character ID, nickname,
icon, level, profession, and last observed party presence). Every registered
character is present even when outside the party. The separate `partyState` is
`UNKNOWN` until an organizer observation supplies actual member IDs, then
`OBSERVED` with `observedAt` and all observed members, including non-volunteers.
Withdrawing or removing an application changes the volunteer list, not the last
observed game party. Resolving invitation targets does not prove membership.

New clients may add `members` with available character display fields to the
existing `memberCharacterIds` observation payload. The IDs remain authoritative;
extra metadata cannot add a party member. Old clients can continue reporting IDs
alone. Known organizer/volunteer details fill missing metadata; otherwise clients
display an unnamed character. Room keys and schema version remain v3 and old
aggregates decode with unknown party state. Do not infer their composition from a
legacy count. Observed data becomes visibly stale after two minutes; clients use
a local deadline without polling. A later actual observation can refresh it.

Every committed creation, application, departure, removal, observation, or
cancellation publishes `guilds.party-gathering.updated` for each source
Organization. Its full snapshot or monotonic removal is forwarded as
`party-gathering.state-updated` only to sessions declaring
`lootlog.party-gathering-state.v1`. Gateway chat-source visibility applies before
delivery, including NPC tier/level filters and the existing organizer override.
Routing metadata stays in the internal envelope; each public snapshot contains
only visible Organization IDs and minimal roster data. Revision handling prevents
an older snapshot from resurrecting a removed gathering. Reconnects fetch the
existing active endpoint and reconcile concurrent events without periodic reads.

Each Redis mutation atomically stores its latest aggregate in a publication
outbox. The request attempts immediate delivery; a scoped API worker also drains
pending entries at startup and every second. Each worker attempt leases the
entry for 30 seconds; failure or interruption leaves it eligible for retry after
that lease expires. Delivery
to all source Organizations must succeed before acknowledgement. Acknowledgement
checks the revision, so a concurrent newer update remains pending. New snapshots
replace superseded pending revisions for the same gathering.

Pending entries have no room TTL. Cancellation remains deliverable after its
short room tombstone disappears, and an active snapshot that expires before
delivery produces a removal. Rabbit message IDs distinguish the Organization,
revision, and update type; duplicate delivery remains safe. The gateway applies
current membership and source visibility on delivery. Publication failures are
logged without roster data. Before removing this API worker during a rollback,
drain the pending publication hash and due index; retain pending entries through
broker outages instead of deleting them.

Deploy the new gateway consumer/schema first, then drain old API writers before
switching to the new API, and finally deploy the client. Old clients continue
using the legacy counters and personal updates and do not receive the new event.
Client parsers accept absent additive fields from old servers and show unknown
roster/party state. During rollback, follow the drain and 30-minute lifetime
procedure above: an old writer can discard observed party metadata.
