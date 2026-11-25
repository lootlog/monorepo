# 0010. Margonem data semantics

Status: accepted

## Context

Lootlog records and explains data that Margonem defines and changes without
notice. Margonem ids are scoped in ways that do not make stable keys: a
character id is unique only within its world, NPCs and items are shared by
every world of an edition, the same monster can appear under template,
runtime, and legacy identities, item ids are reused, and NPCs and items get
renamed. Battle logs use signs and keys the way the game's own renderer reads
them, and game rules come from published help pages, forum posts, and what
real items show.

Several derived ids and hashes are persisted in kill tables, timer keys,
event records, and stored preferences. The catalog, player search, and
monster statistics are rebuildable projections of the API's observations, so
replays must produce exactly what live indexing builds. The decisions below
record each interpretation so it is not "fixed" back to a wrong reading.

## Decisions

### Identity scopes

- **`characterNeedsWorld`** (`apps/api/src/contracts/kills/analytics-schemas.ts`): Every filter by `characterId` must also carry `world`, because a character id is unique only within its world; the contract enforces it.
- **`getPlayerRowValue`** (`apps/web/src/features/guild/loots-list/components/loots-filters/loot-search-presentation.ts`): Characters are keyed by world and id. User statistics (`apps/web/src/features/user/statistics/statistics-character-select.tsx`, `statistics-search.ts`) do the same and drop a URL `characterId` that has no world.
- **`useLootSearchCommand`** (`apps/web/src/features/guild/loots-list/components/loots-filters/use-loot-search-command.ts`): NPC and item catalog searches send no world, because every world of an edition shares NPCs and items; only character searches use the selected world. `use-loot-filters-sidebar.ts` follows the same rule.
- **`buildLootRoster`** (`apps/web/src/features/guild/loots-list/components/loots-list/build-loot-roster.ts`): Map players pair with loot recipients by character id only, because names are not unique across worlds and legacy records without ids must not merge by name.
- **`npcSpawnPositionTable`** (`apps/api/src/database/drizzle/npc-spawn.schema.ts`): Spawn tiles carry no world, Organization, or reporter, because maps are identical on every world and the data feeds the public wiki; `reports` counts submissions, not kills.
- **`userMargonemAccountTable`** (`apps/api/src/database/drizzle/user.schema.ts`): An account belongs to every User the gateway verified with Margonem's signed proof, and a shared account is attributed to the User with the latest `verifiedAt` for per-account data such as auras.
- **`ITEM_HID_IN_TEXT_PATTERN`** (`apps/web/src/lib/utils/hid-detection.ts`): An item reference needs the full 64-digit hex id, because Margonem always writes item ids that way.

### NPC identity and derived ids

- **`NpcIdentityNamespace`** (`packages/schema/src/npc-identity.ts`): `template` (`npc.tpl`, catalog identity for search and rules), `runtime` (`npc.id`, one spawn; timers, `npcs_del`, battle `originalId`), and `legacy` (old clients' overloaded `id`) are separate; equal numbers in different namespaces are unrelated.
- **`hashNpcKey`** (`packages/domain/src/npc-identity.ts`): Java's string hash over at most 256 characters is stored in kill tables, timer keys, event records, and mutes, so `getKillNpcId`, `getTimerNpcId`, and the hash cannot change without a data migration.
- **`getKillNpcId`** (`packages/domain/src/npc-identity.ts`): Lootlog-derived NPC ids are negative so they never collide with runtime ids. A colossus is hashed by name because every spawn gets a new runtime id; `getHeroTrackerNpcId` uses the normalized name because a tracker changes runtime id per hiding place while one exists per name and world; `getEventHeroNpcId` falls back to the configured event hero because it precedes any reported runtime id.
- **`getStableNpcId`** (`apps/game-client/src/features/notifications/utils/notification-mutes.ts`): Colossus and Hero Tracker mutes are keyed by a hash of the bare name; stored mutes depend on this exact key, which deliberately differs from the timer key.
- **`getNotificationSettingsKey`** (`apps/game-client/src/features/notifications/utils/get-notification-settings-key.ts`): A Hero Tracker is recognised by name before weight, because trackers carry no weight and would otherwise be a plain message.
- **`isHeroTrackerName`** (`packages/domain/src/npc-type.ts`): Trackers are names ending in `Tropiciel Herosów` or `Hero Hunter`, because their templates have no weight, profession, or type and the `detector` flag marks every special NPC; the anchored pattern keeps `Tropicielka Albiona` out.
- **`isEventHero`** (`packages/domain/src/npc-type.ts`): A hero-weight NPC whose graphic is under `hev/` is an event hero, because battles report only weight and graphic and regular heroes never live there; event colossi stay colossi. `BOSS_ORIGINS` likewise tell titans and colossi apart by graphic directory, because each kind has one weight.
- **`normalizeNpcIcon`** (`packages/domain/src/npc-icon.ts`): Icons are stored relative to the NPC image directory, stripping prefixes as the game's `fixSrc` does, because NI keeps the relative form while SI reports the rendered URL.
- **`comparableNpcName`** (`apps/api/src/events/kills/find-active-event-heroes-by-npc.ts`): Event heroes match by folded, normalized name until they learn the NPC id, because Margonem renamed NPCs mid-event; a hero that knows a different id is another NPC. `findHeroTimerKeys` in `apps/api/src/events/respawn/event-timer.repository.ts` then follows the NPC id, because a rename gives the same NPC a new timer key.
- **`withoutEvents`** (`apps/api/src/loots/item-revisions.ts`): The `etiquette` stat is ignored when comparing revisions, because Margonem writes the event name and year onto an event item without changing the item.

### Strongest NPC ordering

- **`compareNpcsStrongestFirst`** (`packages/domain/src/npc-type.ts`): A fight's NPCs are ordered by type, weight, level, then id, so a boss names the loot over a higher-level escort.
- **`strongestNpcFirst`** (`apps/api/src/loots/strongest-npc-order.ts`): SQL orders snapshots exactly like the comparator, with the snapshot id last, so SQL and in-memory views name the same NPC. `npcTypeStrengthRank` inlines the type order with `sql.raw` because it is a code constant, never input, and the planner sees one fixed expression.
- **Feed strongest NPC** (`apps/api/src/users/user-feed.ts`): The strongest loot NPC names a feed loot, decides its NPC filter group, and links it to that NPC's kill.
- **`ACTIVITY_FEED_LOOT_BEFORE_KILL_MS`** (`packages/domain/src/activity-feed.ts`): A loot attaches to the kill of its strongest NPC on the same world when recorded from 30 s before to 120 s after, because kill and loot arrive separately without a shared id and party distribution can finish late.

### Battle log interpretation

- **`splitPair`** (`packages/battle-processor/src/battle-log.ts`): A row value is the text between the first and second `=`, matching `BattleMessages.js`, and indexed item stat values follow the same rule.
- **`CombatTotals`** (`packages/battle-processor/src/combat-totals.ts`): `heal` reports lost life as negative, so only positive values count as healing (also in `packages/battle-processor/src/timeline.ts`); `energy` reports spent as positive and `mana` received as negative, so regeneration subtracts the signed value. `TWO_FOLLOW_UP_SKILL_IDS` (97 and 239) expect two attack rows after their cast.
- **`recordOtherDamage`** (`packages/battle-processor/src/combat-totals.ts`): `+oth_dmg` to the actor or its team is reflected by the target, while damage to an opponent is an extra hit credited to the actor, matching the game's renderer; `analyzeOtherDamage` in the timeline agrees.
- **`analyzeDamage`** (`packages/battle-processor/src/timeline.ts`): A row's rolled attack (`+dmg`) counts only when the row reports no damage taken after defence, so one attack is never counted twice.
- **`findFinishingBlows`** (`packages/battle-processor/src/finishing-blows.ts`): A target falling is credited to the actor, an actor falling to the target's counter or reflection, and a death in a target-less damage-over-time row to the last opponent that acted on the victim; revived warriors can die again.
- **`resolveOutcome`** (`packages/battle-processor/src/outcome.ts`): A capture without the end packet or outcome lines is `unfinished` with no winner, because a dying group member may close it first. `winner=?` is a draw with no teams unless it was a flee, which keeps its inferred teams; `isBattleDraw` in `apps/web/src/components/battle/utils/battle-result-presentation.ts` reads it the same way.
- **`calculateBattleStatistics`** (`packages/battle-processor/src/statistics.ts`): Award ties go to the warrior listed first, so callers pass warriors by ascending numeric `originalId`, the order Margonem introduces them (`apps/battlelog/src/battles/battlelog-operations.ts`). `createBattle` in `apps/battlelog/src/battles/submission/create-battle.ts` rejects warriors whose key differs from `originalId`.
- **`BattleProcessor`** (`packages/battle-processor/src/battle-processor.ts`): Honor points (`ph`) are signed by the outcome, because Margonem reports them unsigned.
- **`BATTLE_DAMAGE_SEGMENTS`** (`apps/web/src/components/battle/utils/battle-team-summary.ts`): Rage, third-attack, stigma, and reflected damage are omitted, because Margonem reports them overlapping other types or outside the dealt total.

### Item rules

- **`elasticItemLevel`** (`packages/domain/src/elastic-level.ts`): Elastic levels (`lvladjust`) follow pomoc.margonem.pl/index/view,372: the looter's level snaps down in steps of five between 40 and 300, with weapons on 0/5, armor on 2/7, and jewelry on 1/6. `MAX_FIXED_LEVELS` is 4 because a rebalanced fixed item is seen at a few levels; more means elastic.
- **`upgradedItemLevel`** (`packages/domain/src/item-upgrade.ts`): Upgrades raise the virtual level by `round(lvl * 0.03) * N` and stats are recomputed there. `statRules` adds the `hp` base of 8 once and rounds only the total, deviating from the published table because real items behave that way, and `itemUpgradeCost` rounds points, essence, and gold to whole numbers because the rules do not say.
- **`SYMBOL_RECIPES`** (`packages/domain/src/item-socket.ts`): Recipes come from Margonem's forum list and are the same across level ranges; any other three components give a random symbol, and a socketed symbol carries its legendary bonus at the item's upgraded level. `OWN_ELEMENT_CHANCE` is 0.5 per the post-update chest rules, newer than the help page.
- **`parseItemStatEntries`** (`packages/domain/src/item-stat.ts`): Each `;` entry splits at its first `=` and the last repeated key wins, matching the game's `parseItemStat`.
- **`NON_LEGEND_ITEM_TYPES`** (`packages/domain/src/item-type.ts`): Legend lists and rankings exclude bless, upgrade, and consume items, because those drop as legendary consumables; legendary counters still count them.
- **`characterStats`** (`apps/wiki/src/lib/character-stats.ts`): `poison=a,b` is a slow of `a / 100` attack speed and `b` damage, as the game's `SkillsParser` renders it and like `frost`; it is not a chance. A quiver's `pdmg` adds to the physical attack, because it is the quiver's weapon damage under the help page's item formula (`8 * 0.0303 * power`).
- **`itemAttackSpeed`** (`packages/domain/src/attack-speed.ts`): Agility and all-attribute bonuses are valued at 0.002 per point, the rate past 100 agility, which trackers and hunters pass early.

### Events, worlds, and loot rolls

- **`EVENT_ENDS`** (`packages/domain/src/item-events.ts`): Each yearly event ends at the latest morning-end of its 2025 and 2026 editions, because the game shifts events by a few days. `latestItemEvent` takes the highest year because event years are listed in no order, and `itemEventEditionEnd` treats an unscheduled event as ending with its year so its items show.
- **`isEventEditionAvailableSince`** (`packages/domain/src/item-events.ts`): An edition must end strictly after the world's opening day, because events end in the morning and worlds open later.
- **`MARGONEM_WORLDS`** (`packages/domain/src/margonem-worlds.ts`): Public world opening days come from announcements so item search can hide editions that ended before a world opened; pre-2019 dates are approximate.
- **`getKillLootRolls`** (`packages/domain/src/loot-rolls.ts`): Multi-roll types roll `min(10, 1 + floor((survivors - 1) / 2 + rng))` per the help page; colossi summoned by Hero Trackers count as heroes because Lootlog's loots show it, and other colossi give each member one roll. `getLevelSpreadFactor` uses 0.2 for public worlds and 0.4 for private, treating unlisted worlds as private.

### Catalog identity and search

- **`npcCatalogKey`** (`apps/catalog/src/npcs/npcs.service.ts`): NPC entries are keyed by edition, namespace, id, and type, because worlds share ids while other namespaces or editions are different NPCs; legacy keys omit the namespace.
- **`npcMonsterKey`** (`apps/catalog/src/npcs/npcs.service.ts`): A monster groups its identities by edition, name, and type, because older clients left runtime or legacy entries beside the template one. `NAMESPACE_PREFERENCE` picks template, then legacy, then runtime for a suggestion, because a template selects every spawn.
- **`currentRevisions`** (`apps/catalog/src/npcs/npcs.service.ts`): The identity with the latest loot is current, so the catalog shows a monster at its level now, not its highest.
- **`getNpcs`** (`apps/catalog/src/catalog/catalog.service.ts`): Listings filter `current != false` and use Meilisearch `distinct: monsterKey`, so pages count monsters. `npcsByKeys` loads every identity of the listed monsters, so old links resolve to the current identity, and `getItems` resolves `droppedBy` to the monster key.
- **`earliestSeenByMonster`** (`apps/catalog/src/projection/catalog-indexes.ts`): A monster is dated by its earliest identity, because a newer identity dates a client release. `saveNpcs` in `apps/catalog/src/database/catalog-store.ts` therefore re-projects every identity of an affected monster.
- **`collapseByNameAndType`** (`apps/catalog/src/catalog/catalog.service.ts`): Drop sources collapse by name and type so each monster is listed once. `MAX_DROP_MONSTERS` in `apps/catalog/src/items/item-drops.ts` caps sources at 20 monsters, because dialog NPCs stand in many places, and `toItemDropFields` ignores sources from another edition.
- **`itemCatalogKey`** (`apps/catalog/src/items/items.service.ts`): Items are keyed by edition, id, and name hash, so translated or renamed items stay searchable by every name. Listing by ids sorts by `firstSeenAt:desc` (`itemNames` in `apps/catalog/src/database/catalog-store.ts`) because Margonem reuses item ids and the latest names the item now.
- **`levelFilter`** (`apps/catalog/src/catalog/catalog.service.ts`): An elastic item matches every level range reaching its observed levels, and `npcLevelFilter` leaves out level-0 NPCs, whose level follows the player's.
- **`availabilityFilter`** (`apps/catalog/src/catalog/catalog.service.ts`): The filter names editions to keep, because a returning item keeps every edition it saw. Attack-speed sorts compute elastic items at the search's level cap and merge them in Meilisearch's order, so relevance ranks first.
- **`catalogIndexes`** (`apps/catalog/src/projection/catalog-indexes.ts`): `maxValuesPerFacet` is 1000 because the default 100 drops old event slugs, and faceting is written exactly as Meilisearch returns it so startup sees no change.

### Catalog publication and reports

- **Catalog replay** (`apps/api/src/loots/catalog-replay/replay-catalog.ts`): Replay publishes item, NPC, and player observations on dedicated routing keys, one at a time in live order, so live loots are not held up and replaying into a full catalog changes nothing.
- **`buildItemReplayQuery`** (`apps/api/src/loots/catalog-replay/item-replay-query.ts`): Snapshots are ordered by their latest loot link, as live indexing merges them. `buildItemDropSourceQuery` attributes drops to a dialog's or fight's only NPC, or a group fight's only boss, by the same rule as live indexing.
- **`buildNpcReplayQuery`** (`apps/api/src/loots/catalog-replay/npc-replay-query.ts`): Revision chronology comes from each revision's latest loot, because hash order and level do not show recency. `buildItemRevisionsQuery` in `apps/api/src/loots/item-revisions.ts` dates revisions by first and last loot, because backfills created most rows at once.
- **`buildPlayerReplayQuery`** (`apps/api/src/loots/catalog-replay/player-replay-query.ts`): Only loot participants are replayed, as live indexing sees, and the highest recorded level is current because levels only rise.
- **`makeItemRevisionsPublisher`** (`apps/api/src/loots/item-revisions-publisher.ts`): Revision histories and monster statistics (`makeMonsterStatisticsPublisher` in `apps/api/src/loots/monster-statistics.ts`) are published as complete lists so redelivery changes nothing, with an advisory lock for one run across replicas.
- **`catalogReportTable`** (`apps/catalog/src/database/schema.ts`): Reports key their subject by edition and item or NPC id, as the wiki links pages, so they outlive rebuilds; a User keeps one open report per page, which `ensureReopenable` enforces on reopen.
- **`isOpen`** (`apps/catalog/src/reports/reports.service.ts`): Open-report queries spell `status = 'OPEN'` as a literal, because PostgreSQL matches a partial index only by the same constant; the `npcId` expression is shared because `DISTINCT ON` and `ORDER BY` must match.

### Monster statistics

- **`buildDropRatesQuery`** (`apps/api/src/loots/drop-rates.ts`): Boss drop rates divide by boss kills, because the Game client records a loot only above common rarity. Each kill counts once across Organizations, and only where a recording Organization keeps that rarity for the boss type, using current settings.
- **`buildMonsterFights`** (`apps/api/src/loots/monster-fights.ts`): A monster is edition, name, and type, so a rework with a new id keeps its fights; recorded fights are a sample of kills. `dropsByMonster` in `apps/web/src/features/user/statistics/statistics-monsters.tsx` joins kills to loots by world and boss name for the same reason.
- **`toMonsterFormerLevels`** (`apps/api/src/loots/monster-levels.ts`): A level version ends when the next is first fought, because older clients reported a former level for months.
- **`isRetiredDrop`** (`apps/api/src/loots/retired-drops.ts`): Drops are modelled as evenly spread, so all drops within the first `lastDropFight` fights has likelihood `(lastDropFight / fights) ^ drops`; any new drop clears retirement. `RETIREMENT_LIKELIHOOD` is 1e-6 because tens of thousands of drops are tested per run, and `MIN_FIGHTS_SINCE_LAST_DROP` requires 500 fights.
- **`toRetiredDrops`** (`apps/api/src/loots/retired-drops.ts`): A namesake monster such as a Hero Tracker retires an item with its hero, because it is fought too rarely to judge alone. `buildDropStatisticsQuery` joins only snapshots of the fight's edition.

### Wiki formulas and derivations

- **Wiki calculators** (`apps/wiki/src/lib/calculators.ts`): Formulas are Margonem's own from the help page unless marked as players' findings, and each `source` says which. The documented upgrade formula wins over its contradicting +5 example; stacked legendary bonuses weaken before halving, which is Lootlog's interpretation; `holyTouchHeal` rounds to nearest; `questExperience` multiplies whole percents to avoid floating-point loss.
- **Character stats** (`apps/wiki/src/lib/character-stats.ts`): Character window stats follow the documentation and the openmargo engine, which reproduce the game's numbers.
- **`useNewBosses`** (`apps/wiki/src/hooks/use-new-bosses.ts`): New bosses come from the newest boss items, because Margonem adds items in id order; event items and level-0 chests are excluded. `useLatestEvents` reads pages until an older event starts, because one large event can fill a page.
- **`npcPageQuery`** (`apps/wiki/src/lib/catalog-page-queries.ts`): NPC query keys include the identity kind, because identities of different kinds can share a numeric id.
- **`simulateFight`** (`apps/wiki/src/lib/fight/fight-simulator.ts`): Turn order, evade, block, armor, absorption, poison, deep wound, slow, and healing follow sections 2.1 and 3.1 of pomoc.margonem.pl/index/view,372. Lootlog's own readings: the armor formula is capped at its parabola vertex so more armor never adds damage; a mage's attack cannot be evaded, which battle logs confirm; a skill cast on an enemy also shoots, as production battle logs show for buffs such as Dziki zapał and Krytyczne wzmocnienie, while a skill cast on oneself takes the whole turn: in production logs its `tspell` row targets the caster and is never followed by the caster's strike, so the skill trees mark those skills `selfCast` (Kamienna skóra, Tarcza słońca, the energy restores and the rest observed that way); healing decays by exactly 5% of the first heal per trigger. A combo finisher needs at least one combo point and spends up to its `combo-max`. Legendary bonuses take their values, stacking and weakening from `wornLegendaryBonusItems`; Fasada opieki and Krytyczna osłona multiply, Dotyk anioła can trigger on every attack, Krwawa udręka uses the highest anguish item level at +0, and Ostatni ratunek is checked after every hit and damage-over-time tick. Production logs confirm the 13/20, 25/38 and 12/18 bonus values, a 6% Dotyk anioła heal, and a lost turn after Klątwa. Active skills whose effects are not modelled are left out and named on the page. The simulated battle log follows the game's rows: a `+dmg…` key carries the strike's strength before the defender's block, armor, absorption, resistance and legendary reductions, the matching `-dmg…` key carries the damage actually taken, and `-blok` is 30% of the main weapon's strength, as production logs show (`+dmg=6648;…;-blok=1994`).
- **Battle mastery** (`apps/wiki/src/lib/skills/battle-mastery.ts`, `takeAction` in `apps/wiki/src/lib/fight/fight-skills.ts`): A set carries the game's Mistrzostwo walk queue of up to 20 skill ids, `-1` for a normal attack as in the game's `SkillsData.NORMAL_ATTACK_ID`, and the `rpt` repeat flag, shared in the set link as an `mb` part. Each turn the fighter resumes after the slot it last used and takes the first slot it can perform, skipping a cooldown, a missing resource, a combo finisher without points, and a skill that is not learned, not worn for, or not modelled; with repeat the scan wraps once around the list, without it the fighter only attacks after the last slot. Step forward is not offered because the simulator has no positions. Skills are used only through this queue, so an empty queue only attacks, as in the game. A turn lost to Klątwa or Oślepienie does not advance the queue: the help page says only that the cursed turn is abandoned, so the slot waits for the next turn until battle logs show otherwise.
- **Skill weapon requirements** (`wornSkillWeapons` in `apps/wiki/src/lib/skills/skill-tree.ts`): A one-and-a-half-handed weapon meets one-handed requirements beside a shield and two-handed requirements without one.
- **`fightBattlePayload`** (`apps/wiki/src/lib/fight/fight-battle-log.ts`): A simulated fight is written as Margonem battle rows and read by `BattleProcessor`, so it renders with the same log and summary as a recorded battle. Rows carry damage after defence on both the `+` and `-` keys, combo-finisher damage adds to the physical key, and a block reports the damage the 30% cut removed.

## Consequences

- Derived NPC ids, hashes, mute keys, and reservation spot folding are persisted; changing them needs a data migration.
- Every query or key involving a character must carry its world, and every NPC id must carry its namespace.
- The SQL strongest-NPC order and the TypeScript comparator, and the replay and live indexing rules, are pairs that must change together.
- Game rule formulas cite their source; a change needs new evidence from Margonem or real loots, not a cleaner reading.
- Statistics are samples biased by what the Game client records, so new metrics must state their denominator.
