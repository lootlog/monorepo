import { eventMessage, type RabbitMessaging } from "@lootlog/messaging";
import type {
  CatalogMonsterDrops,
  CatalogMonsterLocations,
} from "@lootlog/protocol/rabbit/catalog";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import { tryAdvisoryTransactionLock } from "#src/shared/advisory-lock";
import { chunk } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  buildMonsterLevelsQuery,
  toMonsterFormerLevels,
} from "./monster-levels.js";
import {
  buildMonsterLocationsQuery,
  buildMonsterSpawnTilesQuery,
  toMonsterLocations,
} from "./monster-locations.js";
import {
  buildDropRatesQuery,
  buildLootPartiesQuery,
  toMonsterDropRates,
} from "./drop-rates.js";
import { buildDropStatisticsQuery, toRetiredDrops } from "./retired-drops.js";

const MONSTERS_PER_MESSAGE = 200;

const MONSTER_STATISTICS_LOCK = 7_316_204;

export const makeMonsterStatisticsPublisher = (
  database: ApiDatabaseValue,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.gen(function* () {
    const statistics = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        if (
          !(yield* tryAdvisoryTransactionLock(
            transaction,
            MONSTER_STATISTICS_LOCK,
          ))
        ) {
          return null;
        }

        return {
          drops: yield* buildDropStatisticsQuery(transaction),
          dropRates: yield* buildDropRatesQuery(transaction),
          lootParties: yield* buildLootPartiesQuery(transaction),
          locations: yield* buildMonsterLocationsQuery(transaction),
          spawnTiles: yield* buildMonsterSpawnTilesQuery(transaction),
          levels: yield* buildMonsterLevelsQuery(transaction),
        };
      }),
    );

    if (statistics === null) return;

    const dropRates = new Map(
      toMonsterDropRates(statistics.dropRates, statistics.lootParties).map(
        (monster) => [
          JSON.stringify([monster.gameVersion, monster.name, monster.type]),
          monster,
        ],
      ),
    );

    const monsterDrops = toRetiredDrops(statistics.drops).map(
      (monster): CatalogMonsterDrops => {
        const rated = dropRates.get(
          JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        );

        return {
          ...monster,
          lootMode: rated?.lootMode ?? "SHARED",
          dropRates: rated?.dropRates ?? [],
        };
      },
    );

    const formerLevels = new Map(
      toMonsterFormerLevels(statistics.levels).map((monster) => [
        JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        monster.formerLevels,
      ]),
    );

    const locations = toMonsterLocations(
      statistics.locations,
      statistics.spawnTiles,
    ).map((monster): CatalogMonsterLocations => ({
      ...monster,
      formerLevels:
        formerLevels.get(
          JSON.stringify([monster.gameVersion, monster.name, monster.type]),
        ) ?? [],
    }));

    for (const batch of chunk(monsterDrops, MONSTERS_PER_MESSAGE))
      yield* rabbit.publish(
        eventMessage(RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS, batch),
      );

    for (const batch of chunk(locations, MONSTERS_PER_MESSAGE))
      yield* rabbit.publish(
        eventMessage(RabbitRoutingKey.CATALOG_NPCS_LOCATIONS, batch),
      );

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
