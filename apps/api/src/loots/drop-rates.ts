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
import { groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildKillBucketTable } from "#src/database/drizzle/kill-statistics.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootlogConfigNpcTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { buildFightSources } from "./monster-fights.js";

/**
 * Kills a share needs before it says anything: below this, one lucky drop
 * moves it by more than a percentage point.
 */
export const MIN_DROP_RATE_KILLS = 100;

/**
 * How often each boss dropped each item, counted per Organization. The game
 * client records a loot only when it drops something above common, so the
 * loots alone cannot tell how many kills dropped nothing; an Organization's
 * hourly kill buckets can. Each Organization pairs its kills of a boss with
 * the loots it recorded from them, counted from the first kill bucket on and
 * only where its loot settings keep the item's rarity for the boss's type:
 * elsewhere a kill could not have recorded the drop. A kill several
 * Organizations recorded counts in each of them, its drops too, so shared
 * kills weigh the share without skewing it. Settings are read as they are
 * now; an Organization that changed them counts its earlier kills by today's.
 */
export const buildDropRatesQuery = (database: ApiDatabaseValue) =>
  Effect.gen(function* () {
    const [window] = yield* database
      .select({
        start:
          sql<Date | null>`min(${guildKillBucketTable.periodStart})`.mapWith(
            (value: string | Date | null) =>
              value === null ? null : new Date(value),
          ),
      })
      .from(guildKillBucketTable);

    const since = window?.start;

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
          kills: sql<number>`sum(${guildKillBucketTable.kills})::int`.as(
            "guild_kills",
          ),
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
          drops: sql<number>`count(distinct ${fightSources.lootId})::int`.as(
            "guild_drops",
          ),
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
          kills: sql<number>`sum(${guildKills.kills})::int`.as(
            "eligible_kills",
          ),
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
        .groupBy(drops.gameVersion, drops.name, drops.type, drops.itemId),
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
        drops: sql<number>`coalesce(${eligibleDrops.drops}, 0)`,
        kills: eligibleKills.kills,
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

/** One boss's drops of one item over the kills that could record it. */
export type ItemDropRate = {
  readonly gameVersion: string;
  readonly name: string;
  readonly type: string | null;
  readonly itemId: number;
  readonly drops: number;
  readonly kills: number;
};

/**
 * Each boss's drop rates that say something: enough kills, and no more
 * drops than kills, which only a kill the API never heard of could leave.
 */
export const toMonsterDropRates = (rows: ReadonlyArray<ItemDropRate>) =>
  Object.values(
    groupBy(
      rows.filter(
        ({ drops, kills }) => kills >= MIN_DROP_RATE_KILLS && drops <= kills,
      ),
      ({ gameVersion, name, type }) =>
        JSON.stringify([gameVersion, name, type]),
    ),
  ).flatMap((rates) => {
    const [first] = rates;

    return first
      ? [
          {
            gameVersion: first.gameVersion,
            name: first.name,
            type: first.type,
            dropRates: rates.map(({ itemId, drops, kills }) => ({
              itemId,
              drops,
              kills,
            })),
          },
        ]
      : [];
  });
