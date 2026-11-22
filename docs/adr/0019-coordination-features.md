# 0019. Coordination features

Status: accepted

## Context

Party gatherings (Ready Rooms), loot splits, chats, Organization documents
and the reservation schedule let several Members act on shared state at the
same time. Updates arrive from list endpoints, gateway events and mutation
responses in any order, the gateway connection can drop, and clients retry
after timeouts. A view must never present an incomplete or resurrected
collection as current, and one Member's write must never silently replace
another's.

Margonem limits what each client can see and do: invites, relogs, the loot
window and requests from the API's addresses all shape these features. The
Game client must also stay cheap to run, and the Web schedule must stay smooth
on phones.

## Decisions

### Party observations and loot splits

- **`LootSplitSendPayload.splitId`** (`packages/schema/src/loot-split.ts`): a split's id is its smallest item id, because Margonem item ids are unique server-wide.
- **`LootSplitAutoAcceptPayload`** (`packages/schema/src/loot-split.ts`): carries no split id, because when a participant's loot filter auto-accepts, the game opens no loot window and tells that client neither the items nor the choices.
- **`PARTY_OBSERVATION_HEARTBEAT_MS`** and **`PARTY_OBSERVATION_REFRESH_MS`** (`packages/schema/src/party-ready-room.ts`): the organizer re-reports an unchanged party every 60 s, well inside the 2-minute freshness window, and the API commits an unchanged observation only when it is at least 45 s old, so every heartbeat refreshes viewers while reconnects and remounts publish no new revisions.

### Ready Room ownership

- **`useAccountOwnedReadyRoom`** (`apps/game-client/src/features/party-finder/hooks/use-ready-rooms.ts`): ownership is scoped to the Margonem account: every character of the organizer's account manages the room and none may join, while other accounts of the same Discord user join like anyone else.
- **`organizer`** prop (`apps/game-client/src/features/chat/components/chat-available-gatherings.tsx`): whether a gathering is the user's own is passed explicitly, because the projection marks the viewer ORGANIZER for every character of the organizer's Discord user, including one that only participates.
- **`needsFriendship`** (`apps/game-client/src/features/party-finder/components/ready-room-participant-item.tsx`): asks to befriend a remote applicant who is not a friend or clan member, because Margonem invites others only when they stand next to the organizer.
- **`useReadyRoomCharacterSwitch`** (`apps/game-client/src/features/party-finder/hooks/use-ready-room-character-switch.ts`): remembers each account's last application locally and reapplies for the newly played character, because the server drops an application after an offline grace period a slow relog can outlast.

### Ready Room client synchronization

- **`useReadyRooms`** (`apps/game-client/src/features/party-finder/hooks/use-ready-rooms.ts`): is the single owner of the collection, like `useTimers`, so every view loads its own data; socket updates and mutation responses write into the same cache entry. Its `staleTime` is 0 until a list is applied and Infinity afterwards, so only explicit resynchronization refetches.
- **`ReadyRoomProjections`** (`apps/game-client/src/features/party-finder/ready-room-cache.ts`): keeps the highest revision per room and tombstones removals, so a late response cannot resurrect a closed room.
- **`ReadyRoomCache.listAppliedAt`** and **`areReadyRoomsSynchronized`** (`apps/game-client/src/features/party-finder/ready-room-cache.ts`, `apps/game-client/src/features/party-finder/hooks/use-ready-rooms.ts`): the collection counts as synchronized only while the gateway is joined and an authoritative list was applied, because a socket update says nothing about rooms it does not mention. `invalidateReadyRoomSync` clears the stamp before every resync, and `writeReadyRoomCache` carries it forward unchanged.
- **`applyAuthoritativeReadyRoomSync`** (`apps/game-client/src/features/party-finder/ready-room-cache.ts`): treats a list response as authoritative only for rooms known when the request left, so a room created in flight is not dropped.
- **`usePartyReadyRoomSync`** (`apps/game-client/src/features/party-finder/hooks/use-party-ready-room-sync.ts`): refetches the full list on every gateway rejoin and character switch, because updates missed while disconnected are recovered only by a fresh list.
- **`usePartyReadyRoomSocket`** (`apps/game-client/src/features/party-finder/hooks/use-party-ready-room-socket.ts`): decodes gateway payloads with `decodePartyReadyRoomClientUpdate` and skips updates it cannot decode, such as a newer schema version.
- **`usePartyReadyRoomExpiry`** (`apps/game-client/src/features/party-finder/hooks/use-party-ready-room-expiry.ts`): rechecks each expiring room against the server, because a room can lapse without any message; a 404 removes it.

### Ready Room party reporting

- **`activeReport`** (`apps/game-client/src/features/party-finder/ready-room-party-reporter.ts`): one in-flight report is shared across remounts to avoid needless compare-and-set conflicts. The change key includes scope, display fields and the organizer map but excludes HP and the room revision, so frequent ticks do not trigger reports.
- **`scheduleHeartbeat`** (`apps/game-client/src/features/party-finder/ready-room-party-reporter.ts`): re-reports an unchanged party one heartbeat after the last report, because viewers mark an observation stale after a fixed age.
- **`flush`** and **`isCurrentScope`** (`apps/game-client/src/features/party-finder/ready-room-party-reporter.ts`): a timeout releases the queue while `expectedRevision` fences the old write, and any response for the same room scope is server truth because it carries the newest revision.
- **Versioned party reports** (`apps/api/src/messaging/ready-room/ready-room-party.ts`): only unversioned reports may skip an unchanged, fresh observation; a versioned report always bumps the revision, because a retry after a timeout may carry the same `expectedRevision` as the in-flight request.

### Ready Room storage and publication

- **`ASSERT_READY_ROOM_REVISION_SCRIPT`** (`apps/api/src/messaging/ready-room/ready-room-redis-scripts.ts`): compares the aggregate's `revision` token atomically instead of JSON bytes, because schema decoding can reorder fields without changing state.
- **`DECLARE_INDEXED_ROOM_KEYS_SCRIPT`** (`apps/api/src/messaging/ready-room/ready-room-redis-scripts.ts`): resolves index keys before any mutation and makes the caller retry with them declared, because Dragonfly locks only the keys a script declares.
- **`ENQUEUE_READY_ROOM_PUBLICATION_SCRIPT`** (`apps/api/src/messaging/ready-room/ready-room-redis-scripts.ts`): a full snapshot replaces older pending revisions while delivery acknowledges only the revision it published, and publication keys have no room TTL, so a cancellation survives room expiry.
- **`DROP_PUBLICATION_SCRIPT`** (`apps/api/src/messaging/ready-room/ready-room-publication-outbox.ts`): an undecodable pending publication is logged and dropped, since retrying cannot fix it, and only while it still holds that payload, so a valid publication committed meanwhile survives.
- **Gathering cancellation** (`apps/api/src/messaging/ready-room/ready-room-lifecycle.ts`): after a committed cancellation, a chat cleanup failure neither skips publications nor fails the request, because retries cannot repeat the cancellation.
- **`buildGoingRateLimitKey`** (`apps/api/src/messaging/messaging.data-layer.ts`): going answers have their own sliding-window rate limit, because every answer pushes to the Lootlogs and messages the reporter in game. Hero Tracker entrance countdowns are converted to the server clock so recipients count down on server time.

### Organization chat

- **`endPartyGatheringMessages`** (`apps/api/src/chat/chat.data-layer.ts`): rewrites gathering messages by value, never by list index, because a concurrent send trims the Redis list and shifts indexes.
- **`ChatMessageList`** (`apps/game-client/src/features/chat/components/chat-message-list.tsx`): freezes the scroller's default position for the mount, because the scroller re-applies it whenever that prop changes; the parent remounts per transcript.
- **Pending jump** (`apps/game-client/src/features/chat/components/chat-transcript.tsx`): a jump to a row finishes on the next animation frame, because preserve-position-on-prepend would undo a scroll made in the same commit.
- **`useTranscriptFollow`** (`apps/game-client/src/features/chat/hooks/use-transcript-follow.ts`): resumes following whenever the reader is back at the bottom, because MessageScroller stops following on every wheel, touch or key scroll; a held pointer pins rows so text selection is not moved.
- **`useTranscriptWindow`** (`apps/game-client/src/features/chat/hooks/use-transcript-window.ts`): anchors its window to the keys of its first rows rather than an index, so appended messages never unmount rows being read; only a fully replaced list reopens at the newest page.

### Global chat

- **`makeRefreshingGlobalChatAdmins`** (`apps/api/src/global-chat/global-chat-admins.ts`): admins are the configured User ids plus holders of the `global-chat-admin` platform role, re-read every minute; while the auth service is unreachable the last answer stands.
- **`KNOWN_WORLDS_TTL`** (`apps/api/src/global-chat/global-chat.data-layer.ts`): the world list is derived from Organizations' timers and cached for an hour, because Margonem refuses requests from the API's addresses.
- **`StoredGlobalChatMessageJson`** (`apps/api/src/global-chat/global-chat.data-layer.ts`): the sender's User id is stored only to mark own messages, show admins and let an admin mute the author, and is stripped from what readers receive.
- **`useGlobalChat`** and **`useGlobalChatSync`** (`apps/game-client/src/features/global-chat/hooks/`): history is held only while a window is open, while a session-long follower counts arrivals for the quick access button. `useGlobalChatChannel` loads the world list only for the open window, so starting the game costs no request.
- **`appendGlobalChatMessage`** (`apps/game-client/src/features/global-chat/global-chat.helpers.ts`) and **`useGlobalChatModeration`** (`apps/game-client/src/features/global-chat/hooks/use-global-chat-moderation.ts`): merges are idempotent, because the gateway echoes the sender's own message and every moderation change; a known id stays in place and only gains `isOwn`.
- **`capGlobalChatHistory`** (`apps/game-client/src/features/global-chat/global-chat.helpers.ts`): drops whole oldest pages first so the oldest kept cursor still reads earlier history.
- **`GlobalChatChannelView`** (`apps/game-client/src/features/global-chat/components/global-chat-channel-view.tsx`): loads older pages with `fetchNextPage({ cancelRefetch: false })`, because joining a paused retry instead of cancelling it keeps retries bounded.

### Organization documents

- **`useGuildDocDraft`** (`apps/web/src/features/guild/docs/use-guild-doc-draft.ts`): replaces the draft with a newer version only when it has no unsaved edits; a kept draft keeps its old `baseVersion`, so the server refuses to let it overwrite another Member's change.
- **`serializeGuildDocEditorState`** (`apps/web/src/features/guild/docs/editor/guild-doc-editor-content.ts`): round-trips Lexical state through JSON because Lexical emits explicit `undefined` fields, and the draft must equal the persisted JSON to compare with the saved revision.
- **`GuildDocItemSnapshotSchema`** and **`GuildDocMemberSchema`** (`apps/web/src/features/guild/docs/editor/guild-doc-item-node.tsx`, `apps/web/src/features/guild/docs/editor/guild-doc-member-node.tsx`): item nodes persist a catalog snapshot so a document reads the same after the game changes the item, and mentions persist `userId` with the name only as a fallback for a departed member.
- **`useGuildDocTrash`** (`apps/web/src/features/guild/docs/use-guild-doc-trash.ts`): trashes immediately with Undo only for admins, because only admins can restore; other writers confirm first.
- **`URL_MATCHER`** (`apps/web/src/features/guild/docs/editor/guild-doc-editor.tsx`): excludes `ITEM#` identifiers, which end like a domain, from auto-linking.
- **`GuildDocItemChip`** and **`GuildDocItemFindableId`** (`apps/web/src/features/guild/docs/editor/`): the chip draws the clipped identifier through CSS `content` so find-in-page matches only the full identifier, which uses `hidden="until-found"` set imperatively because React 19 cannot render that value; `beforematch` reveals it with `flushSync` because the browser highlights the match right after the event.

### Reservation schedule rendering

- **`getDayColumnStyle`** (`apps/web/src/features/guild/reservations/schedule/desktop-week-schedule.tsx`): positions day overlays absolutely, because grid items would take cells from the auto-placed hour slots and shift every following row.
- **`setSwipeOffset`** and **`animateSwipeTo`** (`apps/web/src/features/guild/reservations/schedule/use-mobile-day-schedule.ts`): the mobile swipe track is its own compositor layer driven by direct transforms and Web Animations, so a swipe neither re-renders React nor repaints. After the exit animation the new day commits inside `flushSync` with the track reset, so both land in one frame.
- **`ReservationBlock`** (`apps/web/src/features/guild/reservations/schedule/reservation-block.tsx`): a static block without `onSelect` renders no `ContextMenu`, which is most of a block's render cost.

## Consequences

- Every shared collection needs one owner hook, revision-based merging and an explicit synchronized state; a socket stream alone never proves a collection is complete.
- Writes to shared aggregates are fenced by revisions or base versions, so retries and concurrent Members produce conflicts instead of silent overwrites.
- Ready Room scripts must declare every key they touch, because Dragonfly locks only declared keys.
- Gateway echoes make client merges idempotent by id; optimistic updates must tolerate the same change arriving again.
- Persisted document nodes are snapshots and stable ids, so changing their shape needs a migration of stored documents.
