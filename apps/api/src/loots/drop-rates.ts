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

const MIN_DROP_RATE_KILLS = 100;

const PERSONAL_LOOT_ITEMS_PER_MEMBER = 0.9;

const sumOf = (column: AnyColumn | SQL.Aliased, alias: string) =>
  sql<number>`sum(${column})::float8`.as(alias);

export const buildDropRatesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const since = yield* selectBossKillsStart(database);

    if (!since) return [];

    const editions = database.$with("world_editions").as(
      database
        .selectDistinct({
          world: lootTable.world,
          gameVersion: lootTable.gameVersion,
        })
        .from(lootTable)
        .where(gte(lootTable.createdAt, since)),
    );

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

export type ItemDropRate = PartyMembers & {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly itemId: number;
  readonly professions: string | null;
  readonly drops: number;
  readonly kills: number;
  readonly partyKills: number;
  readonly lootRolls: number;
};

export type LootParties = PartyMembers & {
  readonly gameVersion: GameVersion;
  readonly name: string;
  readonly type: string | null;
  readonly players: number;
  readonly fights: number;
  readonly items: number;
};

type LootMode = "SHARED" | "PERSONAL";

type LootRollsBasis = "PARTY" | "LOOTS";

const bossKey = ({
  gameVersion,
  name,
  type,
}: Pick<ItemDropRate, "gameVersion" | "name" | "type">) =>
  JSON.stringify([gameVersion, name, type]);

const professionsOf = (reqp: string | null) =>
  LOOT_ROLL_PROFESSIONS.filter((prof) => !reqp || reqp.includes(prof));

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
    rollsPerFight:
      sum(
        parties.map((row) => getExpectedSharedRolls(row.players) * row.fights),
      ) / fights,
    membersPerFight,
  };
};

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
