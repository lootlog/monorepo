import type { GameVersion } from "@lootlog/schema/game-version";
import { DROP_SOURCE_BOSS_TYPES } from "@lootlog/domain/npc-type";
import {
  type AnyColumn,
  type SQL,
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { groupBy, sum } from "es-toolkit";
import {
  getExpectedSharedRolls,
  LOOT_ROLL_PROFESSIONS,
  type LootRollProfession,
} from "@lootlog/domain/loot-rolls";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { bossKillTable } from "#src/database/drizzle/kill-statistics.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootlogConfigNpcTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { buildFightSources } from "./monster-fights.js";

/**
 * Kills a share needs before it says anything: below this, one lucky drop
 * moves it by more than a percentage point. Kills that named their party
 * need as many before their rolls replace the estimate from loots.
 */
export const MIN_DROP_RATE_KILLS = 100;

/**
 * Colossi whose loots give at least this many items per party member give
 * every member an item of their own; the rest share a loot, as those summoned
 * by Hero Trackers do.
 */
const PERSONAL_LOOT_ITEMS_PER_MEMBER = 0.9;

const sumOf = (column: AnyColumn | SQL.Aliased, alias: string) =>
  sql<number>`sum(${column})::float8`.as(alias);

/**
 * How often each boss dropped each item, each kill and each drop counted
 * once however many Organizations recorded it. The game client records a
 * loot only when it drops something above common, so the loots alone cannot
 * tell how many kills dropped nothing; boss kills can. A kill counts for an
 * item when an Organization that recorded it keeps the item's rarity for the
 * boss's type: elsewhere it could not have recorded the drop. A drop counts
 * when an Organization that recorded its loot keeps the rarity. Both are
 * counted from the first boss kill on. Settings are read as they are now; an
 * Organization that changed them counts its earlier kills by today's. Alongside the kills come the loot rolls and party
 * members of the kills that named their party, which `toMonsterDropRates`
 * turns into rolls.
 */
export const buildDropRatesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const since = yield* selectBossKillsStart(database);

    if (!since) return [];

    // Boss kills name a world, loots an edition.
    const editions = database.$with("world_editions").as(
      database
        .selectDistinct({
          world: lootTable.world,
          gameVersion: lootTable.gameVersion,
        })
        .from(lootTable)
        .where(gte(lootTable.createdAt, since)),
    );

    // Kills recorded by the same Organizations share their eligibility.
    const killGroups = database.$with("kill_groups").as(
      database
        .select({
          world: bossKillTable.world,
          name: bossKillTable.npcName,
          type: bossKillTable.npcType,
          guildIds: bossKillTable.guildIds,
          kills: sql<number>`count(*)::float8`.as("group_kills"),
          partyKills: sql<number>`count(${bossKillTable.lootRolls})::float8`.as(
            "group_party_kills",
          ),
          lootRolls: sumOf(bossKillTable.lootRolls, "group_loot_rolls"),
          w: sumOf(bossKillTable.partyWarriors, "group_w"),
          p: sumOf(bossKillTable.partyPaladins, "group_p"),
          b: sumOf(bossKillTable.partyBladeDancers, "group_b"),
          m: sumOf(bossKillTable.partyMages, "group_m"),
          t: sumOf(bossKillTable.partyTrackers, "group_t"),
          h: sumOf(bossKillTable.partyHunters, "group_h"),
        })
        .from(bossKillTable)
        .groupBy(
          bossKillTable.world,
          bossKillTable.npcName,
          bossKillTable.npcType,
          bossKillTable.guildIds,
        ),
    );

    const keptRarity = sql<string>`unnest(${lootlogConfigNpcTable.allowedRarities})`;

    const groupGuilds = database.$with("group_guilds").as(
      database
        .select({
          world: killGroups.world,
          name: killGroups.name,
          type: killGroups.type,
          guildIds: killGroups.guildIds,
          guildId: sql<string>`unnest(${killGroups.guildIds})`.as(
            "group_guild_id",
          ),
        })
        .from(killGroups),
    );

    // The rarities at least one of each group's Organizations keeps.
    const groupRarities = database.$with("group_rarities").as(
      database
        .selectDistinct({
          world: groupGuilds.world,
          name: groupGuilds.name,
          type: groupGuilds.type,
          guildIds: groupGuilds.guildIds,
          rarity: keptRarity.as("group_rarity"),
        })
        .from(groupGuilds)
        .innerJoin(
          lootlogConfigNpcTable,
          and(
            eq(lootlogConfigNpcTable.lootlogConfigId, groupGuilds.guildId),
            eq(lootlogConfigNpcTable.npcType, groupGuilds.type),
          ),
        ),
    );

    // Each boss's kills that could record a drop of each rarity.
    const rarityKills = database.$with("rarity_kills").as(
      database
        .select({
          gameVersion: editions.gameVersion,
          name: killGroups.name,
          type: killGroups.type,
          rarity: groupRarities.rarity,
          kills: sumOf(killGroups.kills, "rarity_kills"),
          partyKills: sumOf(killGroups.partyKills, "rarity_party_kills"),
          lootRolls: sumOf(killGroups.lootRolls, "rarity_loot_rolls"),
          w: sumOf(killGroups.w, "rarity_w"),
          p: sumOf(killGroups.p, "rarity_p"),
          b: sumOf(killGroups.b, "rarity_b"),
          m: sumOf(killGroups.m, "rarity_m"),
          t: sumOf(killGroups.t, "rarity_t"),
          h: sumOf(killGroups.h, "rarity_h"),
        })
        .from(killGroups)
        .innerJoin(
          groupRarities,
          and(
            eq(groupRarities.world, killGroups.world),
            eq(groupRarities.name, killGroups.name),
            eq(groupRarities.type, killGroups.type),
            eq(groupRarities.guildIds, killGroups.guildIds),
          ),
        )
        .innerJoin(editions, eq(editions.world, killGroups.world))
        .groupBy(
          editions.gameVersion,
          killGroups.name,
          killGroups.type,
          groupRarities.rarity,
        ),
    );

    const fightSources = buildFightSources(database, since);

    // The rarities each boss loot could be recorded with, by any
    // Organization that recorded it. Loots and kills go to the same
    // Organizations, so each of them also recorded the kill.
    const lootRarities = database.$with("loot_rarities").as(
      database
        .selectDistinct({
          lootId: organizationLootRecordTable.lootId,
          rarity: keptRarity.as("loot_rarity"),
        })
        .from(organizationLootRecordTable)
        .innerJoin(
          lootTable,
          eq(lootTable.id, organizationLootRecordTable.lootId),
        )
        .innerJoin(lootNpcTable, eq(lootNpcTable.lootId, lootTable.id))
        .innerJoin(
          npcSnapshotTable,
          eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
        )
        .innerJoin(
          lootlogConfigNpcTable,
          and(
            eq(
              lootlogConfigNpcTable.lootlogConfigId,
              organizationLootRecordTable.guildId,
            ),
            eq(lootlogConfigNpcTable.npcType, npcSnapshotTable.type),
          ),
        )
        .where(
          and(
            eq(lootTable.source, "FIGHT"),
            gte(lootTable.createdAt, since),
            inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]),
          ),
        ),
    );

    // Every copy of a loot counts once: a kill rolls several times, or once
    // a member, but one loot is one kill whoever recorded it.
    const bossDrops = database.$with("boss_drops").as(
      database
        .select({
          gameVersion: npcSnapshotTable.gameVersion,
          name: npcSnapshotTable.name,
          type: npcSnapshotTable.type,
          itemId: itemSnapshotTable.itemId,
          rarity: sql<string>`max(${itemSnapshotTable.rarity})`.as(
            "item_rarity",
          ),
          professions: sql<
            string | null
          >`max(${itemSnapshotTable.statsSnapshot}->>'reqp')`.as(
            "item_professions",
          ),
          drops:
            sql<number>`count(*) filter (where ${lootRarities.lootId} is not null)::int`.as(
              "item_drops",
            ),
        })
        .from(fightSources)
        .innerJoin(
          npcSnapshotTable,
          eq(npcSnapshotTable.id, fightSources.npcSnapshotId),
        )
        .innerJoin(lootItemTable, eq(lootItemTable.lootId, fightSources.lootId))
        .innerJoin(
          itemSnapshotTable,
          and(
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
            eq(itemSnapshotTable.gameVersion, npcSnapshotTable.gameVersion),
          ),
        )
        .leftJoin(
          lootRarities,
          and(
            eq(lootRarities.lootId, fightSources.lootId),
            eq(lootRarities.rarity, itemSnapshotTable.rarity),
          ),
        )
        .where(
          and(
            // Kills are counted for bosses only.
            inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]),
            isNotNull(itemSnapshotTable.rarity),
          ),
        )
        .groupBy(
          npcSnapshotTable.gameVersion,
          npcSnapshotTable.name,
          npcSnapshotTable.type,
          itemSnapshotTable.itemId,
        ),
    );

    return yield* database
      .with(
        editions,
        killGroups,
        groupGuilds,
        groupRarities,
        rarityKills,
        fightSources,
        lootRarities,
        bossDrops,
      )
      .select({
        gameVersion: bossDrops.gameVersion,
        name: bossDrops.name,
        type: bossDrops.type,
        itemId: bossDrops.itemId,
        professions: bossDrops.professions,
        drops: bossDrops.drops,
        kills: rarityKills.kills,
        partyKills: rarityKills.partyKills,
        lootRolls: rarityKills.lootRolls,
        w: rarityKills.w,
        p: rarityKills.p,
        b: rarityKills.b,
        m: rarityKills.m,
        t: rarityKills.t,
        h: rarityKills.h,
      })
      .from(bossDrops)
      .innerJoin(
        rarityKills,
        and(
          eq(rarityKills.gameVersion, bossDrops.gameVersion),
          eq(rarityKills.name, bossDrops.name),
          eq(rarityKills.type, bossDrops.type),
          eq(rarityKills.rarity, bossDrops.rarity),
        ),
      );
  });

const selectBossKillsStart = (database: ApiDatabaseValue) =>
  database
    .select({
      start: sql<Date | null>`min(${bossKillTable.killedAt})`.mapWith(
        (value: string | Date | null) =>
          value === null ? null : new Date(value),
      ),
    })
    .from(bossKillTable)
    .pipe(Effect.map(([window]) => window?.start ?? null));

/**
 * The parties of each boss's recorded fights since the first boss kill, by
 * party size: how many fights had that many players, the items they recorded
 * and their players of each profession. The game client records a fight only
 * when it drops something above common, so they stand in for the parties of
 * kills that did not name theirs.
 */
export const buildLootPartiesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const since = yield* selectBossKillsStart(database);

    if (!since) return [];

    const fightSources = buildFightSources(database, since);

    const isProfession = (profession: string) =>
      sql<number>`count(*) filter (where ${playerSnapshotTable.prof} = ${profession})::int`;

    const fightParties = database.$with("fight_parties").as(
      database
        .select({
          lootId: fightSources.lootId,
          npcSnapshotId: sql<number>`min(${fightSources.npcSnapshotId})`.as(
            "party_npc_snapshot_id",
          ),
          players: sql<number>`count(*)::int`.as("party_players"),
          w: isProfession("WARRIOR").as("party_w"),
          p: isProfession("PALADIN").as("party_p"),
          b: isProfession("BLADE_DANCER").as("party_b"),
          m: isProfession("MAGE").as("party_m"),
          t: isProfession("TRACKER").as("party_t"),
          h: isProfession("HUNTER").as("party_h"),
        })
        .from(fightSources)
        .innerJoin(
          lootPlayerTable,
          eq(lootPlayerTable.lootId, fightSources.lootId),
        )
        .innerJoin(
          playerSnapshotTable,
          eq(playerSnapshotTable.id, lootPlayerTable.playerSnapshotId),
        )
        .groupBy(fightSources.lootId),
    );

    const fightItems = database.$with("fight_items").as(
      database
        .select({
          lootId: lootItemTable.lootId,
          items: sql<number>`count(*)::int`.as("fight_item_count"),
        })
        .from(lootItemTable)
        .innerJoin(fightParties, eq(fightParties.lootId, lootItemTable.lootId))
        .groupBy(lootItemTable.lootId),
    );

    return yield* database
      .with(fightSources, fightParties, fightItems)
      .select({
        gameVersion: npcSnapshotTable.gameVersion,
        name: npcSnapshotTable.name,
        type: npcSnapshotTable.type,
        players: fightParties.players,
        fights: sql<number>`count(*)::float8`,
        items: sql<number>`coalesce(sum(${fightItems.items}), 0)::float8`,
        w: sql<number>`sum(${fightParties.w})::float8`,
        p: sql<number>`sum(${fightParties.p})::float8`,
        b: sql<number>`sum(${fightParties.b})::float8`,
        m: sql<number>`sum(${fightParties.m})::float8`,
        t: sql<number>`sum(${fightParties.t})::float8`,
        h: sql<number>`sum(${fightParties.h})::float8`,
      })
      .from(fightParties)
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, fightParties.npcSnapshotId),
      )
      .leftJoin(fightItems, eq(fightItems.lootId, fightParties.lootId))
      .where(inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]))
      .groupBy(
        npcSnapshotTable.gameVersion,
        npcSnapshotTable.name,
        npcSnapshotTable.type,
        fightParties.players,
      );
  });

type PartyMembers = Readonly<Record<LootRollProfession, number>>;

/** One boss's drops of one item over the kills that could record it. */
export type ItemDropRate = PartyMembers & {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly itemId: number;
  /** Margonem's `reqp` of the item; null when every profession wears it. */
  readonly professions: string | null;
  readonly drops: number;
  readonly kills: number;
  /** The kills that named their party, and what their parties add up to. */
  readonly partyKills: number;
  readonly lootRolls: number;
};

/** One boss's recorded fights of one party size. */
export type LootParties = PartyMembers & {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly players: number;
  readonly fights: number;
  readonly items: number;
};

/**
 * Whether each member rolls their own loot, read from the boss's type and
 * its recorded fights, or the party shares one.
 */
export type LootMode = "SHARED" | "PERSONAL";

/** Where a boss's loot rolls per kill come from. */
export type LootRollsBasis = "PARTY" | "LOOTS";

const bossKey = ({
  gameVersion,
  name,
  type,
}: Pick<ItemDropRate, "gameVersion" | "name" | "type">) =>
  JSON.stringify([gameVersion, name, type]);

const professionsOf = (reqp: string | null) =>
  LOOT_ROLL_PROFESSIONS.filter((prof) => !reqp || reqp.includes(prof));

/** What a boss's recorded fights say about its parties. */
const describeLootParties = (parties: ReadonlyArray<LootParties>) => {
  const fights = sum(parties.map(({ fights }) => fights));
  const players = sum(parties.map((row) => row.players * row.fights));
  const items = sum(parties.map((row) => row.items));

  const membersPerFight = (prof: LootRollProfession) =>
    sum(parties.map((row) => row[prof])) / fights;

  return {
    fights,
    isPersonal:
      parties[0]?.type === "COLOSSUS" &&
      players > 0 &&
      items / players >= PERSONAL_LOOT_ITEMS_PER_MEMBER,
    // Every member survived and the levels allow it, as far as loots tell.
    rollsPerFight:
      sum(
        parties.map((row) => getExpectedSharedRolls(row.players) * row.fights),
      ) / fights,
    membersPerFight,
  };
};

/**
 * Each boss's drop rates that say something: enough kills, and no more drops
 * than rolls, which only a kill the API never heard of could leave. Rolls are
 * the kills times the rolls a kill gets on average: for a shared loot the
 * rolls its party got, for a personal loot its members who can wear the item.
 * Kills that named their party give that average once there are enough of
 * them; until then the parties of the boss's recorded fights estimate it.
 */
export const toMonsterDropRates = (
  rows: ReadonlyArray<ItemDropRate>,
  lootParties: ReadonlyArray<LootParties>,
) => {
  const partiesByBoss = new Map(
    Object.entries(groupBy(lootParties, bossKey)).map(([key, parties]) => [
      key,
      describeLootParties(parties),
    ]),
  );

  return Object.entries(groupBy(rows, bossKey)).flatMap(([key, rates]) => {
    const [first] = rates;

    if (!first) return [];

    const parties = partiesByBoss.get(key);
    const lootMode: LootMode = parties?.isPersonal ? "PERSONAL" : "SHARED";

    const dropRates = rates.flatMap((rate) => {
      const fromParty = rate.partyKills >= MIN_DROP_RATE_KILLS;
      const professions = professionsOf(rate.professions);

      let rollsPerKill: number | undefined;

      if (fromParty) {
        rollsPerKill =
          (lootMode === "PERSONAL"
            ? sum(professions.map((prof) => rate[prof]))
            : rate.lootRolls) / rate.partyKills;
      } else if (parties) {
        rollsPerKill =
          lootMode === "PERSONAL"
            ? sum(professions.map(parties.membersPerFight))
            : parties.rollsPerFight;
      }

      if (rollsPerKill === undefined || !(rollsPerKill > 0)) return [];

      const rolls = rate.kills * rollsPerKill;
      const basis: LootRollsBasis = fromParty ? "PARTY" : "LOOTS";

      return rate.kills >= MIN_DROP_RATE_KILLS && rate.drops <= rolls
        ? [
            {
              itemId: rate.itemId,
              drops: rate.drops,
              kills: rate.kills,
              rolls,
              basis,
            },
          ]
        : [];
    });

    return dropRates.length > 0
      ? [
          {
            gameVersion: first.gameVersion,
            name: first.name,
            type: first.type,
            lootMode,
            dropRates,
          },
        ]
      : [];
  });
};
