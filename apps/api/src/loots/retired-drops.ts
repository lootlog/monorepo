import { DROP_SOURCE_BOSS_TYPES } from "@lootlog/domain/npc-type";
import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Effect } from "effect";
import { chunk, groupBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "#src/database/drizzle/schema";

/**
 * A drop is retired when its observed drops are this unlikely to all fall
 * before its last one if the monster still dropped the item at a steady rate.
 * Tens of thousands of drops are tested a run, so the bar sits far below
 * one false retirement.
 */
const RETIREMENT_LIKELIHOOD = 1e-6;

// Too few kills since the last drop prove nothing, whatever the likelihood.
const MIN_KILLS_SINCE_LAST_DROP = 500;

const MONSTERS_PER_MESSAGE = 200;

// One run at a time across API replicas; the key is arbitrary but fixed.
const RETIRED_DROPS_LOCK = 7_316_204;

export type DropStatistics = {
  /** Fights the item dropped in. */
  readonly drops: number;
  /** The monster's kill, counted from its first, that last dropped the item. */
  readonly lastDropKill: number;
  /** Every kill of the monster. */
  readonly kills: number;
};

/**
 * Whether a monster no longer drops an item. While it does, its drops spread
 * evenly over the monster's kills, so all `drops` falling within the first
 * `lastDropKill` of `kills` has the likelihood `(lastDropKill / kills) ^ drops`.
 */
export const isRetiredDrop = ({ drops, lastDropKill, kills }: DropStatistics) =>
  kills - lastDropKill >= MIN_KILLS_SINCE_LAST_DROP &&
  drops * Math.log(lastDropKill / kills) < Math.log(RETIREMENT_LIKELIHOOD);

/**
 * Every item each monster dropped, with its drop statistics. A monster is
 * its edition, name and type, as the search catalog names it, so a rework
 * that gives it a new id keeps counting its kills. Fights name their only
 * NPC or the only boss among a group, as drop sources do.
 */
const buildDropStatisticsQuery = (database: ApiDatabaseValue) => {
  const isBoss = inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]);

  const fightSources = database.$with("fight_sources").as(
    database
      .select({
        lootId: lootNpcTable.lootId,
        npcSnapshotId: sql<number | null>`case
          when count(*) = 1 then min(${lootNpcTable.npcSnapshotId})
          when count(*) filter (where ${isBoss}) = 1
            then min(${lootNpcTable.npcSnapshotId}) filter (where ${isBoss})
        end`.as("npc_snapshot_id"),
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
      )
      .where(eq(lootTable.source, "FIGHT"))
      .groupBy(lootNpcTable.lootId),
  );

  const kills = database.$with("kills").as(
    database
      .with(fightSources)
      .select({
        lootId: fightSources.lootId,
        gameVersion: sql<string>`${npcSnapshotTable.gameVersion}`.as(
          "game_version",
        ),
        name: sql<string>`${npcSnapshotTable.name}`.as("name"),
        type: sql<string | null>`${npcSnapshotTable.type}`.as("type"),
        kill: sql<number>`row_number() over (
          partition by ${npcSnapshotTable.gameVersion}, ${npcSnapshotTable.name}, ${npcSnapshotTable.type}
          order by ${lootTable.createdAt}, ${lootTable.id}
        )`.as("kill"),
      })
      .from(fightSources)
      .innerJoin(lootTable, eq(lootTable.id, fightSources.lootId))
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, fightSources.npcSnapshotId),
      ),
  );

  const monsterKills = database.$with("monster_kills").as(
    database
      .with(kills)
      .select({
        gameVersion: kills.gameVersion,
        name: kills.name,
        type: kills.type,
        kills: sql<number>`max(${kills.kill})::int`.as("kills"),
      })
      .from(kills)
      .groupBy(kills.gameVersion, kills.name, kills.type),
  );

  return database
    .with(kills, monsterKills)
    .select({
      gameVersion: kills.gameVersion,
      name: kills.name,
      type: kills.type,
      itemId: itemSnapshotTable.itemId,
      drops: sql<number>`count(distinct ${kills.lootId})::int`,
      lastDropKill: sql<number>`max(${kills.kill})::int`,
      kills: sql<number>`max(${monsterKills.kills})`,
    })
    .from(kills)
    .innerJoin(
      monsterKills,
      and(
        eq(monsterKills.gameVersion, kills.gameVersion),
        eq(monsterKills.name, kills.name),
        sql`${monsterKills.type} is not distinct from ${kills.type}`,
      ),
    )
    .innerJoin(lootItemTable, eq(lootItemTable.lootId, kills.lootId))
    .innerJoin(
      itemSnapshotTable,
      and(
        eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
        // Some older loots name another edition's NPC, as drop sources skip.
        sql`${itemSnapshotTable.gameVersion}::text = ${kills.gameVersion}::text`,
      ),
    )
    .groupBy(
      kills.gameVersion,
      kills.name,
      kills.type,
      itemSnapshotTable.itemId,
    );
};

/**
 * Publishes, for every monster that dropped anything, the items it no longer
 * drops. Each monster's list is complete, so search replaces what it held and
 * a redelivery changes nothing.
 */
export const makeRetiredDropsPublisher = (
  database: ApiDatabaseValue,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.gen(function* () {
    const rows = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const [lock] = yield* transaction
          .select({
            acquired: sql<boolean>`pg_try_advisory_xact_lock(${RETIRED_DROPS_LOCK})`,
          })
          // The builder needs a source; one row runs the lock function once.
          .from(lootTable)
          .limit(1);

        if (!lock?.acquired) return null;

        return yield* buildDropStatisticsQuery(transaction);
      }),
    );

    if (rows === null) return;

    const monsters = Object.values(
      groupBy(rows, ({ gameVersion, name, type }) =>
        JSON.stringify([gameVersion, name, type]),
      ),
    ).flatMap((drops) => {
      const [first] = drops;

      return first
        ? [
            {
              gameVersion: first.gameVersion,
              name: first.name,
              type: first.type,
              retiredItemIds: drops
                .filter(isRetiredDrop)
                .map(({ itemId }) => itemId),
            },
          ]
        : [];
    });

    for (const batch of chunk(monsters, MONSTERS_PER_MESSAGE)) {
      yield* rabbit.publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS,
        content: new TextEncoder().encode(JSON.stringify(batch)),
      });
    }

    yield* Effect.logInfo("Retired drops published").pipe(
      Effect.annotateLogs({
        monsters: monsters.length,
        retired: monsters.reduce(
          (total, { retiredItemIds }) => total + retiredItemIds.length,
          0,
        ),
      }),
    );
  }).pipe(
    Effect.withSpan("loots.retiredDrops.publish"),
    Effect.catch((error) =>
      Effect.logError("Retired drops publication failed").pipe(
        Effect.annotateLogs({ cause: error }),
      ),
    ),
  );
