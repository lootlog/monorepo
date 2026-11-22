# 0009. Margonem runtime integration rules

Status: accepted

## Context

The Game client runs inside Margonem's page on two interfaces, the new
interface (NI) and the legacy one (SI), and reaches them only through the
runtime bridge and adapters (see ADR 0005). Margonem's packets are partial,
repeated after reloads or inactive tabs, and sometimes never finished; its DOM
and tooltips are rebuilt and cached by the game; and its frame loop and canvas
are shared with Lootlog. A Lootlog failure there must not change the game's
behaviour or slow it down.

The decisions below record how the client reads each runtime quirk, how its
hooks stay invisible to the game, and how it reconstructs battles, kills, and
loot splits from what the game shows. They also cover the extension's page
bridge, the sandbox that imitates the runtime, and the browser support range
the client ships to without polyfills.

## Decisions

### Runtime packet and object semantics

- **`RuntimeNpc`** (`apps/game-client/src/lib/margonem-runtime/runtime.types.ts`): `id` is Margonem's per-spawn runtime id (`npc.id`, used by `npcs_del` and as battle `originalId`) and `templateId` is `npc.tpl`, shared by every spawn and null unless positive; the two are never interchanged.
- **`getCharacterIdentityKey`** (`apps/game-client/src/lib/character-identity-key.ts`): Every per-character projection keys characters by `accountId:characterId`, because a character id is unique only within its account.
- **`LegacyGameOther`** (`packages/margonem/src/others.ts`): `id` is `string | number`, because NI's `OthersManager.updateDATA` assigns string keys from a for-in loop while legacy globals expose numbers. `OtherHandle` covers both interfaces: NI wraps character data in `d`, SI keeps it on the handle.
- **`OtherUpdate`** (`packages/margonem/src/game-events/other.ts`): Any `stasis` other than 1, and any movement (which never carries `stasis`), ends stasis, matching Margonem's partial player updates.
- **`PartyEventMember`** (`packages/margonem/src/game-events/party.ts`): `commander` is `boolean | number` and is read by truthiness, as Margonem does. `normalizeParty` in `apps/game-client/src/lib/margonem-runtime/runtime-state-projection.ts` keeps a member's known profession when a push omits it, mirroring `PartyMember.updateData`.
- **`TownEvent`** (`packages/margonem/src/game-events/town.ts`): All fields are optional, because Margonem merges town packets into map state and a packet may update one field.
- **`getNpcResp`** (`packages/margonem/src/world-config.ts`): It throws on SI until the first packet and returns 0 on NI, so callers handle both before using the respawn multiplier.
- **`CharacterTipUpdate`** (`packages/margonem/src/tooltip.ts`): It is emitted through `afterCharacterTipUpdate` before `createStrTip` returns `text`, so a handler may replace `text`; party member tips carry no `object`.
- **`resolveGameVersion`** (`apps/game-client/src/lib/margonem-runtime/runtime-adapter.ts`): A host maps to an edition by suffix-matching the edition domain, because each world is a subdomain; new worlds need no list entry, and lookalike or unknown hosts resolve to null.
- **Reload facts** (`apps/game-client/src/lib/margonem-runtime/runtime-event-parser.ts`): A `t: "reload"` packet is its own fact, because Margonem clears its map state, players included, without sending `del` entries.
- **`pendingIds`** (`apps/game-client/src/lib/margonem-runtime/runtime-other-handles.ts`): Other-player handles track pending ids, because SI queues `other` packets and creates the player on a later tick, so a player can be projected before its native handle exists.
- **`readNativeMap`** (`apps/game-client/src/lib/margonem-runtime/runtime-state-projection.ts`): A missing map name or PvP mode is recovered from native state only for the same map id, because the event queue may lag behind a transition. Recovered facts are emitted before packet facts while the raw packet stays unchanged, so recovery cannot reset the map's new NPCs.
- **`resolveNpcIcon`** (`apps/game-client/src/lib/margonem-runtime/runtime-state-projection.ts`): Icons resolve from a raw `icon.id` or an already resolved string, because `NpcManager.mergeNpcDataWithNpcIconData` resolves the id before storage while ingress packets carry either.
- **`decodeRelatedPlayer`** (`apps/game-client/src/lib/margonem-runtime/social-relations-projection.ts`): Social lists are decoded as flattened rows whose widths come from `Society.setHowRecordsOnPerson` and `Diplomacy.updateFriend/updateEnemy`, and a relation is read from the CREATE entry or a later partial update, because Other.js merges each packet.
- **`useSocialRelationsStore`** (`apps/game-client/src/store/social-relations.store.ts`): Friends, enemies, and clan diplomacy are persisted per character and clan, because the game sends them only while its society or clan window is open; the relation each player carries on the map corrects the stored state.

### NPC and kill semantics

- **`ATTACKABLE_NPC_TYPES`** (`apps/game-client/src/lib/margonem-runtime/adapters/renderer-runtime-adapter.ts`): Only Margonem NPC types 2 and 3 are attackable and pingable; other types are dialogue characters, objects, and decorations.
- **`killSeconds`** (`packages/margonem/src/game-events/npcs.ts`): It is 0 or absent when an NPC has no removal countdown; a Hero Tracker gains one only after a player claims it. `getEntranceClosesAt` in `apps/game-client/src/utils/game/hero-tracker-entrance.ts` therefore sets the close time only from a positive value, keeping the running countdown on later updates.
- **`NpcsDetectionProcessor`** (`apps/game-client/src/processors/npcs-detection-processor.ts`): Margonem sends `npcs` for spawns and updates alike, so only NPCs the detector does not show yet count as detections, except a Hero Tracker claimed while shown. Packet templates and icons are indexed once with a later duplicate winning, as in Margonem's managers.
- **`MAX_REMOVED_NPCS`** (`apps/game-client/src/store/npcs.store.ts`): Like `NpcManager.deleteNpc`, a removed NPC stays known until the map changes, so a battle or loot after its `npcs_del` can still identify it; at most 256 are kept.
- **`MAX_DETECTION_AGE_MS`** (`apps/game-client/src/processors/hero-detector-processor.ts`): Hero detector answers older than two minutes are ignored, because Margonem re-delivers recent chat history after a login or reload.
- **`NpcsDeleteProcessor`** (`apps/game-client/src/processors/npcs-delete-processor.ts`): Deletions are not reported as timers while the hero is in stasis, because the hero learns of kills late; Margonem's own kill timer skips these too.
- **`getBattleParticipants`** (`apps/game-client/src/utils/game/get-battle-participants.ts`): A battle NPC the map never showed gets type 2 when its warrior has none, because the warrior names no template and NI never reads a warrior `type`. Loot NPC payloads carry `runtimeId` and `templateId`, while `id` keeps what older API revisions expect: the template id when known, else the runtime id.
- **`MapThreatSource`** (`apps/game-client/src/lib/map-threat-source.ts`): Current Organization members are excluded from threats, because members of different clans in one Organization can be each other's clan enemies.
- **`MAIN_WEAPON_CLASSES`** (`apps/game-client/src/lib/margonem-tooltips/weapon-kills.ts`): Weapon-kill counters apply to item classes 1, 2, 3, 4, and 6, the main weapon slot's classes; the counter map is not keyed by character because a character switch reloads the page.

### Battle capture

- **`BattleEventProcessor`** (`apps/game-client/src/processors/battle-event-processor.ts`): `close` without `endBattle` submits an unfinished battle, because a player who dies in a group battle may close it; a resent battle after an inactive tab must not restart the capture; and a new battle while one is open concludes the previous one with what was captured. Every store write happens before the first await of `handle`, because the next packet is handled while a submission is still hashing.
- **`resolveKillIntent`** (`apps/game-client/src/processors/battle-event-processor.ts`): A kill is reported when Margonem ended the battle, or when an interrupted battle has no living NPC; a battle the player left is not a kill. The party sent is the battle's party at the end, because survivors decide loot rolls, and every player reports because the API deduplicates.
- **`resolveWeaponKillsIntent`** (`apps/game-client/src/processors/battle-event-processor.ts`): PvP battles are captured whether or not the player collects battles, because weapon kill counters come from the same log; the log is sent only when it contains the hero's finishing blow, with the weapon the hero wore.
- **`claimBattleSubmission`** (`apps/game-client/src/processors/battle-submission-ledger.ts`): The last 50 submitted battle ids are remembered in storage, because Margonem repeats a finished battle until it is closed, even after a reload; a transient failure releases the claim so a later repeat can retry.
- **`mergeBattleWarriorPatches`** (`apps/game-client/src/hooks/game-events/helpers/battle.helpers.ts`): Patches merge over current participants, because `OneWarrior.updateWarrior` updates only supplied keys and only a warrior's first packet is whole. `parseNumericHpValue` passes numeric HP through verbatim, as Margonem stores it, and requires finite results only for parsed strings.
- **`mapBattleEventsToPayload`** (`apps/game-client/src/helpers/mappers/battlelog.mappers.ts`): Only complete warrior snapshots are sent, because a patch without its team would hide the warrior's side from the finishing-blow check.
- **Warrior map NPC capture** (`apps/game-client/src/hooks/game-events/helpers/battle.helpers.ts`): An NPC warrior's map NPC is captured once and kept, because its `npcs_del` can arrive before the battle or loot and the warrior alone has no template or type.

### Loot split protocol

- **`LootSplitState`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): Other participants' choices come from other Lootlog clients, because Margonem tells each player only their own `loot.states`; several splits can be open at once, each keeping the participants it opened with. `LOOT_SPLIT_CHOICES` in `packages/schema/src/loot-split.ts` mirror those states (0, 1, 2).
- **`LootSplit`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): The split id is its smallest item id, a stable identity for all participants because item ids are unique server-wide.
- **`applyGameEvent`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): `loot.init` opens a split before `f.init` is checked, because a reload delivers fight and loot in one packet; only a fight without loot closes the hero's window. `fillParticipants` fills the party later, because after a reload the loot window can precede it.
- **`closeOwnWindow`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): A fight start or new loot marks the hero's split accepted, because both interfaces close the loot window without a request and the server finalizes the choices. `resumeSplit` continues a known split when a map change hands the window over again.
- **`parseCommandChoices`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): Choices are taken from the outgoing `loot&want=&not=&must=` command, because SI "nie chcę wszystkiego" sends every item under `not` and the server may never echo them.
- **`settleAccept`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): `acceptRequested` records the hero's `final=1`, and the accept counts only once the next answer lacks `w`, because NI `Loot.finalize` keeps the window open on refusal; the party is never told of a refused accept.
- **`ownLootFilterAcceptRecipients`** (`apps/game-client/src/features/loot-split/loot-split-model.ts`): A loot-filter accept is detected from the battle log drop line, because the game then sends that client no loot window. `pendingFilterAccepts` holds remote ones that arrive before the split opens locally.
- **`useLootSplitSync`** (`apps/game-client/src/features/loot-split/use-loot-split-sync.ts`): Choice changes within `CHOICES_COALESCE_MS` coalesce into one frame but an accept is sent at once; frames are not queued offline, because a split is over within seconds, and reconnect resends the latest view of every open own split.
- **`LootSplitWindow`** (`apps/game-client/src/features/loot-split/loot-split-window.tsx`): The window opens from an effect that waits for the split, the gateway, and the settings together, because after a reload the split can arrive first.
- **`NI_FRAME_CLASS`** (`apps/game-client/src/features/loot-split/loot-split-item-tile.tsx`): Item tiles use the game's own rarity frame classes, so frames follow the player's frame style and "show item ranks" setting.

### Hooks preserve native behaviour

- **Runtime bridge wrappers** (`apps/game-client/src/lib/margonem-runtime/margonem-runtime-bridge.ts`): Original functions are called with `Reflect.apply`, which works even if an addon overrides `apply`; a native exception clears the captured packet intent and is rethrown unchanged.
- **`subscribeCommand`** (`apps/game-client/src/lib/margonem-runtime/margonem-runtime-bridge.ts`): Outgoing requests are observed, never modified; handlers run inside the game's request call so they stay cheap, and a throwing handler is reported but never reaches the game.
- **`subscribeCharacterTipUpdates`** (`apps/game-client/src/lib/margonem-runtime/adapters/tooltip-runtime-adapter.ts`): Every hook into a native method preserves receiver, arguments, return value, exceptions, and call count, with Lootlog work inside try/catch; callbacks the game runs unguarded, such as API handlers inside `createStrTip`, are isolated.
- **`wrapItemTipBuilder`** (`apps/game-client/src/lib/margonem-runtime/adapters/item-tip-runtime-adapter.ts`): Wrappers of shared hooks (`MargoTipsParser.getTip`, and `Engine.others.addMcPanelToMenu` in `wrapOtherMenu`) leave output unchanged when `extend` fails and become a pass-through on restore instead of unwrapping, because another addon may have wrapped on top.
- **`scheduleRuntimeTeardown`** (`apps/game-client/src/lib/margonem-runtime/margonem-runtime-bridge.ts`): Teardown is deferred to a microtask so the diagnostics report never stalls the detecting game callback, and the report is taken before `dispose()` resets the stores that describe the failure.
- **`showRuntimeFailureNotice`** (`apps/game-client/src/lib/runtime-failure-notice.ts`): The notice is plain DOM with inline styles, because it appears after the overlay and its stylesheet are torn down, and it never touches Margonem globals.
- **`useChatMessages`** (`apps/game-client/src/features/chat/hooks/use-chat-messages.ts`): Mention resolution is best-effort and its errors are swallowed, so it never interrupts chat ingestion.

### Frame loop and canvas

- **`makeDrawGuard`** (`apps/game-client/src/lib/margonem-runtime/adapters/renderer-runtime-adapter.ts`): Drawing inside the game's frame loop runs through a guard: an error skips one frame, 120 consecutive failures (about 2 s) disable the step, and accessors fall back instead of throwing. One wrapper per drawable is cached in a WeakMap so a frame allocates nothing.
- **`CharacterAuraRenderer`** (`apps/game-client/src/features/character-auras/character-aura-renderer.ts`): `guard` never lets an error leave the frame loop; after `MAX_FAILURES` consecutive failures it disables one aura, or all auras when the shared `FRAME_KEY` work fails, and each step counts failures separately.
- **`Aura`** (`apps/game-client/src/features/character-auras/engine/render.ts`): Drawing is wrapped in `ctx.save()`, `try`, and `restore()`, so the game's context returns unchanged even when a draw throws.
- **`isNativeOtherGlowDrawable`** (`apps/game-client/src/lib/margonem-runtime/adapters/glow-runtime-adapter.ts`): Glows hook `OthersManager.getDrawableList`, which runs every frame after players move, so each glow follows its player; the patch builds at most one array per call and keeps every other drawable by identity.
- **`captureCharacterFrame`** (`apps/game-client/src/lib/margonem-runtime/adapters/aura-runtime-adapter.ts`): Auras run Character.js `drawIcon` against a recording context instead of computing sprite frames, so water, animated outfits, and offsets match, taking the tallest blit because water blits twice. Frames the game would not draw are skipped: right after a map change (no hero position) and while the battle window covers the map.
- **`spriteOf`** (`apps/game-client/src/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter.ts`): SI auras decode the element's `background-image` url again, which works because SI loads sprites into same-origin `blob:` urls, so the canvas is not tainted.
- **`AuraSilhouette`** (`apps/game-client/src/features/character-auras/engine/silhouette.ts`): `pixels` is null when a sprite is cross-origin and reading would taint the canvas; the blurred `glow` then stands in, so consumers handle both. `supportsFilter` uses `ctx.filter` when available and falls back to an off-canvas shadow for Safari before 18.

### Game DOM and tooltips

- **`CharacterAuraTooltip`** (`apps/game-client/src/features/character-auras/engine/tooltip.ts`): Tooltip auras draw on one canvas fixed over the page with the tip cut out, because the game's tip sits above its own layer; a subtree `MutationObserver` follows `Tips.js` re-appending the tip, and an exception stops the loop and hides the canvas.
- **`useCharacterAuras`** (`apps/game-client/src/features/character-auras/hooks/use-character-auras.ts`): A character's tip is rebuilt whenever its aura changes, because Margonem caches built tips.
- **`showLegacyOtherShiftSection`** (`apps/game-client/src/lib/margonem-tooltips/patcher.ts`): The Shift-only section is tracked per player, because the game caches tip html in `other.tip` (NI) or the `tip` attribute (SI) until rebuilt; SI's capture-phase mouseover updates the attribute before Tip reads it. A new active player is published only when the id changes, to avoid a refresh loop.
- **`setLegacyOtherTip`** (`apps/game-client/src/lib/margonem-runtime/adapters/tooltip-runtime-adapter.ts`): On SI, a tooltip is updated by replacing the `tip` attribute, which SI re-reads every 100 ms while hovered.
- **`refreshItemTips`** (`apps/game-client/src/lib/margonem-runtime/adapters/item-tip-runtime-adapter.ts`): Item ids drop NI's `-showeq` suffix, and refreshing rebuilds NI's shared tip and, on SI, both `g.item[id].tip` and every element's `tip` attribute.
- **Catching-guild tooltip sections** (`apps/game-client/src/lib/margonem-tooltips/catching-guilds.ts`): Sections in the game's `t_other` tooltip use inline styles in the game's palette, and SI gets an inline separator because its game.css lacks `.line`.
- **`escapeRuntimeMessage`** (`apps/game-client/src/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter.ts`): Text for the game's `message()` escapes every special character, including brackets, as a double-escaped entity, because `message()` decodes once and renders HTML and BB codes; player names must render literally.
- **`watchIntegratedChatHost`** (`apps/game-client/src/lib/margonem-runtime/adapters/chat-host-runtime-adapter.ts`): The chat tab mounts beside the children NI's `new-chat-window` owns and registers no native channel, because channel names are protocol-owned; it carries `unblock-scroll` and pins `right` so a tab does not widen NI's window.
- **`getWhoIsHereAirTagHost`** (`apps/game-client/src/lib/margonem-runtime/adapters/who-is-here-runtime-adapter.ts`): Lootlog rows live in a sibling after the native player list, because the game rebuilds that list.
- **`subscribeMinimapHover`** (`apps/game-client/src/lib/margonem-runtime/adapters/minimap-player-runtime-adapter.ts`): The hover handler is bound through the game's own jQuery so it runs after the game's handler.
- **`keepKeyInTrigger`** (`apps/game-client/src/features/chat/components/chat-compose-mode-menu.tsx`): Key presses in the menu stop propagating, except Escape, because Margonem handles every document key press outside a text field.
- **`createGlowLayer`** (`apps/game-client/src/features/pings/battle-controls.ts`): The quick-fight glow is a Lootlog element inside the game's button, so the button's styles stay untouched.
- **`WARRIOR_SELECTOR`** (`apps/game-client/src/features/pings/battle-warriors.ts`): Warriors are found by `.battle-window .one-warrior` and identified by the `other-id-battle-<id>` class, because Margonem names them only by class; auto battles insert none, so they cannot be pinged. `BattlePingMarker` in `apps/game-client/src/features/pings/battle-ping-marker.tsx` is portalled outside `#lootlog-root`, so it applies the theme and reduced-motion classes itself.

### Extension bridge, public API, and retries

- **`decodeExtensionRequest`** (`apps/game-client/src/extension/protocol.ts`): Page requests into the extension use `onExcessProperty: "error"`, because they cross a trust boundary; unknown keys and over-limit header names are rejected.
- **`createBackgroundConnection`** (`apps/game-client/src/extension/background-connection.ts`): Pages may subscribe only to `global.chat` and `global.chat.world`, so they can never subscribe to an Organization topic, and the reconnect handler is a no-op because rejoining needs a fresh session proof, never a replayed one.
- **`createPageTransport`** (`apps/game-client/src/extension/page-transport.ts`): Requests to `public-api.margonem.pl` and `.com` bypass the background so they keep Margonem's cookies, and `connectionRequested` clears on `disconnected` so the next `connect()` reaches a background left disconnected by a refused join.
- **`toPublicOnlinePlayer`** (`apps/game-client/src/features/public-api/mappers.ts`): Add-ons get presence without account, session, or User identifiers, ordered by name rather than grouped by User. `Timers` in `apps/game-client/src/features/timers/timers.tsx` keeps its query observed while closed, so the public API stays current.
- **`latestAttemptStartMs`** (`apps/game-client/src/api/retry-policy.ts`): Automatic timer submissions start no attempt after 20 s, because the API deduplicates them for only 30 s.
- **`requireLocation`** (`apps/game-client/src/api/require-location.ts`): A missing location throws with `status: 400`, because it is permanent and the retry policy treats 4xx as non-retryable.
- **Retry elapsed time** (`apps/game-client/src/lib/logs/log-actions.ts`): Retry deadlines use the larger of wall-clock and monotonic elapsed time, so suspension counts and clock corrections cannot extend retries.

### Sandbox and browser support

- **`installSandboxRuntime`** (`apps/game-client/sandbox/fake-runtime/install.ts`): Fake globals are installed before `@/bootstrap` is imported (`apps/game-client/sandbox/main.ts`), because the projection picks the NI or SI adapter at module evaluation.
- **`SandboxWorld`** (`apps/game-client/sandbox/fake-runtime/world.ts`): Objects are mutated in place, because the game hands out long-lived references such as `window.hero` that adapters hold.
- **`SANDBOX_GAME_ORIGIN`** (`apps/game-client/vite.sandbox.config.ts`): Proxied requests use a Margonem origin, because the gateway classifies a Game client socket by origin; every service is proxied same-origin through local Traefik. `redirectRootToSandbox` keeps the Vite root at the app so Tailwind scans `src/` as the userscript dev server does.
- **`groupByToMap`** (`apps/game-client/src/lib/group-by-to-map.ts`): It exists because `Map.groupBy` is too new for Chrome 111 and Safari 16.4 without polyfills, and es-toolkit's `groupBy` reorders numeric-looking keys such as snowflakes.
- **`useReadyRoomMinutesLeft`** (`apps/game-client/src/components/common/use-ready-room-minutes-left.ts`): The clock is stored as a fresh object per fire, because a coarse clock may repeat a value and React would skip the update, leaving no timer armed.
- **`inputSizeClasses`** (`apps/game-client/src/components/ui/input.tsx`): Inputs carry 1 px top padding because Chrome rounds the Arimo baseline up, and size classes follow the font-size utility because tailwind-merge drops a preceding `leading-*`.
- **`useDrag`** (`apps/game-client/src/hooks/ui/use-drag.ts`): `pointerdown` calls `preventDefault()` to suppress the compatibility `mousedown`, which would start a text selection.

## Consequences

- Every new hook into a Margonem function must preserve its native semantics and isolate Lootlog failures, or it violates the first trade-off priority.
- Changes to packet handling need evidence from the Margonem source for both NI and SI; the types in `packages/margonem` record those quirks and must stay accurate.
- Work inside the frame loop must stay allocation-free and guarded, and new canvas work needs a fallback for tainted sprites and missing `ctx.filter`.
- Battle, kill, and loot-split reconstruction rely on server-side deduplication and on other Lootlog clients, so their wire contracts are as stable as the API's.
- Browser-support workarounds can be removed only when the supported browser floor moves past them.
