import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { lootTable } from "#src/database/drizzle/schema";
import {
  buildMonsterLocationsQuery,
  toMonsterLocations,
} from "./monster-locations.js";
import { buildDropStatisticsQuery, toRetiredDrops } from "./retired-drops.js";

const MONSTERS_PER_MESSAGE = 200;

// One run at a time across API replicas; the key is arbitrary but fixed.
const MONSTER_STATISTICS_LOCK = 7_316_204;

/**
 * Publishes, for every monster with recorded fights, the items it no longer
 * drops and the maps it is fought on. Each monster's lists are complete, so
 * search replaces what it held and a redelivery changes nothing.
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
          locations: yield* buildMonsterLocationsQuery(transaction),
        };
      }),
    );

    if (statistics === null) return;

    const retiredDrops = toRetiredDrops(statistics.drops);
    const locations = toMonsterLocations(statistics.locations);

    const publish = (
      routingKey:
        | typeof RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS
        | typeof RabbitRoutingKey.SEARCH_NPCS_LOCATIONS,
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

    yield* publish(RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS, retiredDrops);
    yield* publish(RabbitRoutingKey.SEARCH_NPCS_LOCATIONS, locations);

    yield* Effect.logInfo("Monster statistics published").pipe(
      Effect.annotateLogs({
        monsters: retiredDrops.length,
        retired: retiredDrops.reduce(
          (total, { retiredItemIds }) => total + retiredItemIds.length,
          0,
        ),
        located: locations.length,
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
