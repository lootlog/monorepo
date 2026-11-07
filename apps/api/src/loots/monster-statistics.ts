import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { lootTable } from "#src/database/drizzle/loot.schema";
import {
  buildMonsterLevelsQuery,
  toMonsterFormerLevels,
} from "./monster-levels.js";
import {
  buildMonsterLocationsQuery,
  toMonsterLocations,
} from "./monster-locations.js";
import { buildDropRatesQuery, toMonsterDropRates } from "./drop-rates.js";
import { buildDropStatisticsQuery, toRetiredDrops } from "./retired-drops.js";

const MONSTERS_PER_MESSAGE = 200;

// One run at a time across API replicas; the key is arbitrary but fixed.
const MONSTER_STATISTICS_LOCK = 7_316_204;

/**
 * Publishes, for every monster with recorded fights, the items it no longer
 * drops and how often its kills drop each item, the maps it is fought on and
 * the levels it had before. Each monster's lists are complete, so the catalog
 * replaces what it held and a redelivery changes nothing.
 */
export const makeMonsterStatisticsPublisher = (
  database: ApiDatabaseValue,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.gen(function* () {
    const statistics = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const [lock] = yield* transaction
          .select({
            acquired: sql<boolean>`pg_try_advisory_xact_lock(${MONSTER_STATISTICS_LOCK})`,
          })
          // The builder needs a source; one row runs the lock function once.
          .from(lootTable)
          .limit(1);

        if (!lock?.acquired) return null;

        return {
          drops: yield* buildDropStatisticsQuery(transaction),
          dropRates: yield* buildDropRatesQuery(transaction),
          locations: yield* buildMonsterLocationsQuery(transaction),
          levels: yield* buildMonsterLevelsQuery(transaction),
        };
      }),
    );

    if (statistics === null) return;

    const dropRates = new Map(
      toMonsterDropRates(statistics.dropRates).map((monster) => [
        JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        monster.dropRates,
      ]),
    );

    // The retired drops message carries each monster's drop rates too.
    const monsterDrops = toRetiredDrops(statistics.drops).map((monster) => ({
      ...monster,
      dropRates:
        dropRates.get(
          JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        ) ?? [],
    }));

    const formerLevels = new Map(
      toMonsterFormerLevels(statistics.levels).map((monster) => [
        JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        monster.formerLevels,
      ]),
    );

    // The locations message carries each monster's former levels too.
    const locations = toMonsterLocations(statistics.locations).map(
      (monster) => ({
        ...monster,
        formerLevels:
          formerLevels.get(
            JSON.stringify([monster.gameVersion, monster.name, monster.type]),
          ) ?? [],
      }),
    );

    const publish = (
      routingKey:
        | typeof RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS
        | typeof RabbitRoutingKey.CATALOG_NPCS_LOCATIONS,
      monsters: ReadonlyArray<unknown>,
    ) =>
      Effect.forEach(
        chunk(monsters, MONSTERS_PER_MESSAGE),
        (batch) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(batch)),
          }),
        { discard: true },
      );

    yield* publish(RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS, monsterDrops);
    yield* publish(RabbitRoutingKey.CATALOG_NPCS_LOCATIONS, locations);

    yield* Effect.logInfo("Monster statistics published").pipe(
      Effect.annotateLogs({
        monsters: monsterDrops.length,
        retired: monsterDrops.reduce(
          (total, { retiredItemIds }) => total + retiredItemIds.length,
          0,
        ),
        rated: monsterDrops.filter((monster) => monster.dropRates.length > 0)
          .length,
        located: locations.length,
        rebalanced: locations.filter(
          (monster) => monster.formerLevels.length > 0,
        ).length,
      }),
    );
  }).pipe(
    Effect.withSpan("loots.monsterStatistics.publish"),
    Effect.catch((error) =>
      Effect.logError("Monster statistics publication failed").pipe(
        Effect.annotateLogs({ cause: error }),
      ),
    ),
  );
