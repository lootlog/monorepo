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
import { guildKillBucketTable } from "#src/database/drizzle/kill-statistics.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootlogConfigNpcTable,
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
 * How often each boss dropped each item, counted per Organization. The game
 * client records a loot only when it drops something above common, so the
 * loots alone cannot tell how many kills dropped nothing; an Organization's
 * hourly kill buckets can. Each Organization pairs its kills of a boss with
 * the copies of the item it recorded from them, counted from the first kill
 * bucket on and only where its loot settings keep the item's rarity for the
 * boss's type: elsewhere a kill could not have recorded the drop. A kill
 * several Organizations recorded counts in each of them, its drops too, so
 * shared kills weigh the share without skewing it. Settings are read as they
 * are now; an Organization that changed them counts its earlier kills by
 * today's. Alongside the kills come the loot rolls and party members of the
 * kills that named their party, which `toMonsterDropRates` turns into rolls.
 */
export const buildDropRatesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const since = yield* selectKillBucketsStart(database);

    if (!since) return [];

    // Kill buckets name a world, loots an edition.
    const editions = database.$with("world_editions").as(
      database
        .selectDistinct({
          world: lootTable.world,
          gameVersion: lootTable.gameVersion,
        })
        .from(lootTable)
        .where(gte(lootTable.createdAt, since)),
    );

    const guildKills = database.$with("guild_kills").as(
      database
        .select({
          guildId: guildKillBucketTable.guildId,
          gameVersion: editions.gameVersion,
          name: guildKillBucketTable.npcName,
          type: guildKillBucketTable.npcType,
          kills: sumOf(guildKillBucketTable.kills, "guild_kills"),
          partyKills: sumOf(
            guildKillBucketTable.partyKills,
            "guild_party_kills",
          ),
          lootRolls: sumOf(guildKillBucketTable.lootRolls, "guild_loot_rolls"),
          w: sumOf(guildKillBucketTable.partyWarriors, "guild_w"),
          p: sumOf(guildKillBucketTable.partyPaladins, "guild_p"),
          b: sumOf(guildKillBucketTable.partyBladeDancers, "guild_b"),
          m: sumOf(guildKillBucketTable.partyMages, "guild_m"),
          t: sumOf(guildKillBucketTable.partyTrackers, "guild_t"),
          h: sumOf(guildKillBucketTable.partyHunters, "guild_h"),
        })
        .from(guildKillBucketTable)
        .innerJoin(editions, eq(editions.world, guildKillBucketTable.world))
        .groupBy(
          guildKillBucketTable.guildId,
          editions.gameVersion,
          guildKillBucketTable.npcName,
          guildKillBucketTable.npcType,
        ),
    );

    const fightSources = buildFightSources(database, since);

    const guildDrops = database.$with("guild_drops").as(
      database
        .select({
          guildId: organizationLootRecordTable.guildId,
          gameVersion: npcSnapshotTable.gameVersion,
          name: npcSnapshotTable.name,
          type: npcSnapshotTable.type,
          itemId: itemSnapshotTable.itemId,
          rarity: sql<string>`max(${itemSnapshotTable.rarity})`.as(
            "drop_rarity",
          ),
          professions: sql<
            string | null
          >`max(${itemSnapshotTable.statsSnapshot}->>'reqp')`.as(
            "drop_professions",
          ),
          // Every copy counts: a kill rolls several times, or once a member.
          drops: sql<number>`count(*)::int`.as("guild_drops"),
        })
        .from(fightSources)
        .innerJoin(
          npcSnapshotTable,
          eq(npcSnapshotTable.id, fightSources.npcSnapshotId),
        )
        .innerJoin(
          organizationLootRecordTable,
          eq(organizationLootRecordTable.lootId, fightSources.lootId),
        )
        .innerJoin(lootItemTable, eq(lootItemTable.lootId, fightSources.lootId))
        .innerJoin(
          itemSnapshotTable,
          and(
            eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
            eq(itemSnapshotTable.gameVersion, npcSnapshotTable.gameVersion),
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
          organizationLootRecordTable.guildId,
          npcSnapshotTable.gameVersion,
          npcSnapshotTable.name,
          npcSnapshotTable.type,
          itemSnapshotTable.itemId,
        ),
    );

    const drops = database.$with("boss_drops").as(
      database
        .select({
          gameVersion: guildDrops.gameVersion,
          name: guildDrops.name,
          type: guildDrops.type,
          itemId: guildDrops.itemId,
          rarity: sql<string>`max(${guildDrops.rarity})`.as("item_rarity"),
          professions: sql<string | null>`max(${guildDrops.professions})`.as(
            "item_professions",
          ),
        })
        .from(guildDrops)
        .groupBy(
          guildDrops.gameVersion,
          guildDrops.name,
          guildDrops.type,
          guildDrops.itemId,
        ),
    );

    const allowsRarity = (rarity: SQL, guildId: SQL.Aliased | AnyColumn) =>
      and(
        eq(lootlogConfigNpcTable.lootlogConfigId, guildId),
        eq(lootlogConfigNpcTable.npcType, guildKills.type),
        sql`${rarity}::"ItemRarity" = any(${lootlogConfigNpcTable.allowedRarities})`,
      );

    // The kills of every Organization that could have recorded each drop.
    const eligibleKills = database.$with("eligible_kills").as(
      database
        .select({
          gameVersion: drops.gameVersion,
          name: drops.name,
          type: drops.type,
          itemId: drops.itemId,
          professions: drops.professions,
          kills: sumOf(guildKills.kills, "eligible_kills"),
          partyKills: sumOf(guildKills.partyKills, "eligible_party_kills"),
          lootRolls: sumOf(guildKills.lootRolls, "eligible_loot_rolls"),
          w: sumOf(guildKills.w, "eligible_w"),
          p: sumOf(guildKills.p, "eligible_p"),
          b: sumOf(guildKills.b, "eligible_b"),
          m: sumOf(guildKills.m, "eligible_m"),
          t: sumOf(guildKills.t, "eligible_t"),
          h: sumOf(guildKills.h, "eligible_h"),
        })
        .from(drops)
        .innerJoin(
          guildKills,
          and(
            eq(guildKills.gameVersion, drops.gameVersion),
            eq(guildKills.name, drops.name),
            eq(guildKills.type, drops.type),
          ),
        )
        .innerJoin(
          lootlogConfigNpcTable,
          allowsRarity(sql`${drops.rarity}`, guildKills.guildId),
        )
        .groupBy(
          drops.gameVersion,
          drops.name,
          drops.type,
          drops.itemId,
          drops.professions,
        ),
    );

    // Their drops, counting only Organizations whose kills count above.
    const eligibleDrops = database.$with("eligible_drops").as(
      database
        .select({
          gameVersion: guildDrops.gameVersion,
          name: guildDrops.name,
          type: guildDrops.type,
          itemId: guildDrops.itemId,
          drops: sql<number>`sum(${guildDrops.drops})::int`.as(
            "eligible_drops",
          ),
        })
        .from(guildDrops)
        .innerJoin(
          guildKills,
          and(
            eq(guildKills.guildId, guildDrops.guildId),
            eq(guildKills.gameVersion, guildDrops.gameVersion),
            eq(guildKills.name, guildDrops.name),
            eq(guildKills.type, guildDrops.type),
          ),
        )
        .innerJoin(
          lootlogConfigNpcTable,
          allowsRarity(sql`${guildDrops.rarity}`, guildDrops.guildId),
        )
        .groupBy(
          guildDrops.gameVersion,
          guildDrops.name,
          guildDrops.type,
          guildDrops.itemId,
        ),
    );

    return yield* database
      .with(
        editions,
        guildKills,
        fightSources,
        guildDrops,
        drops,
        eligibleKills,
        eligibleDrops,
      )
      .select({
        gameVersion: eligibleKills.gameVersion,
        name: eligibleKills.name,
        type: eligibleKills.type,
        itemId: eligibleKills.itemId,
        professions: eligibleKills.professions,
        drops: sql<number>`coalesce(${eligibleDrops.drops}, 0)`,
        kills: eligibleKills.kills,
        partyKills: eligibleKills.partyKills,
        lootRolls: eligibleKills.lootRolls,
        w: eligibleKills.w,
        p: eligibleKills.p,
        b: eligibleKills.b,
        m: eligibleKills.m,
        t: eligibleKills.t,
        h: eligibleKills.h,
      })
      .from(eligibleKills)
      .leftJoin(
        eligibleDrops,
        and(
          eq(eligibleDrops.gameVersion, eligibleKills.gameVersion),
          eq(eligibleDrops.name, eligibleKills.name),
          eq(eligibleDrops.type, eligibleKills.type),
          eq(eligibleDrops.itemId, eligibleKills.itemId),
        ),
      );
  });

const selectKillBucketsStart = (database: ApiDatabaseValue) =>
  database
    .select({
      start: sql<Date | null>`min(${guildKillBucketTable.periodStart})`.mapWith(
        (value: string | Date | null) =>
          value === null ? null : new Date(value),
      ),
    })
    .from(guildKillBucketTable)
    .pipe(Effect.map(([window]) => window?.start ?? null));

/**
 * The parties of each boss's recorded fights since the first kill bucket, by
 * party size: how many fights had that many players, the items they recorded
 * and their players of each profession. The game client records a fight only
 * when it drops something above common, so they stand in for the parties of
 * kills that did not name theirs.
 */
export const buildLootPartiesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const since = yield* selectKillBucketsStart(database);

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
