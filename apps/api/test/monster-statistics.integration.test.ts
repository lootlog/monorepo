import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import type { PublishOptions } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, ManagedRuntime } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { makeMonsterStatisticsPublisher } from "#src/loots/monster-statistics";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

let database: typeof ApiDatabase.Service;

beforeAll(async () => {
  database = await runtime.runPromise(ApiDatabase);
});

afterAll(async () => {
  await runtime.dispose();
});

/** Fights 1–200 on the old map, then 895 on the new one and 5 by the exit. */
const mapOfFight = (fight: number) =>
  fight <= 200 ? "Stara grota" : fight <= 1095 ? "Nowa grota" : "Wyjście";

/** The titan was rebalanced from 110 to 100 ten days after its 300th fight. */
const REBALANCED_AFTER = 300;

const REBALANCE_DELAY = 10 * 24 * 60 * 60_000;

it("publishes a monster's maps from its latest fights, the drops it no longer gives and the level it had before", async () => {
  // Other suites share the database; a unique name keeps this monster apart.
  const name = `Tytan ${randomUUID()}`;
  const startedAt = Date.UTC(2026, 0, 1);

  await runtime.runPromise(
    Effect.gen(function* () {
      const [former, npc] = yield* database
        .insert(npcSnapshotTable)
        .values([
          { npcId: 1, gameVersion: "pl", name, type: "TITAN", lvl: 110 },
          { npcId: 1, gameVersion: "pl", name, type: "TITAN", lvl: 100 },
        ])
        .returning({ id: npcSnapshotTable.id });

      const [item] = yield* database
        .insert(itemSnapshotTable)
        .values({
          itemId: 1,
          gameVersion: "pl",
          statsHash: randomUUID(),
          name: "Dawny łup",
          icon: "item.gif",
          statRaw: "",
          statsSnapshot: {},
        })
        .returning({ id: itemSnapshotTable.id });

      const loots = yield* database
        .insert(lootTable)
        .values(
          Array.from({ length: 1100 }, (_, index) => {
            const foughtAt = new Date(
              startedAt +
                index * 60_000 +
                (index < REBALANCED_AFTER ? 0 : REBALANCE_DELAY),
            );

            return {
              uniqueId: randomUUID(),
              world: "test",
              gameVersion: "pl" as const,
              source: "FIGHT" as const,
              location: mapOfFight(index + 1),
              createdAt: foughtAt,
              updatedAt: foughtAt,
            };
          }),
        )
        .returning({ id: lootTable.id });

      yield* database.insert(lootNpcTable).values(
        loots.map(({ id }, index) => ({
          lootId: id,
          npcSnapshotId: index < REBALANCED_AFTER ? former!.id : npc!.id,
        })),
      );
      // The item dropped in the first 100 fights only.
      yield* database.insert(lootItemTable).values(
        loots.slice(0, 100).map(({ id }) => ({
          lootId: id,
          itemSnapshotId: item!.id,
          hid: randomUUID(),
        })),
      );
    }),
  );

  const published: PublishOptions[] = [];

  await runtime.runPromise(
    makeMonsterStatisticsPublisher(database, {
      publish: (message) => Effect.sync(() => void published.push(message)),
    }),
  );

  // Both publications name each monster; the rest is what the test asserts.
  type PublishedMonster = {
    gameVersion: string;
    name: string;
    type: string | null;
    locations?: Array<{ map: string; share: number }>;
    formerLevels?: Array<{ lvl: number; until: string }>;
    retiredItemIds?: number[];
  };

  const monster = (routingKey: string) =>
    published
      .filter((message) => message.routingKey === routingKey)
      .flatMap((message): PublishedMonster[] =>
        JSON.parse(new TextDecoder().decode(message.content)),
      )
      .find((entry) => entry.name === name);

  // The old map is in the latest 1000 fights; the exit holds under 1% of them.
  expect(monster(RabbitRoutingKey.SEARCH_NPCS_LOCATIONS)).toEqual({
    gameVersion: "pl",
    name,
    type: "TITAN",
    locations: [
      { map: "Nowa grota", share: 0.9 },
      { map: "Stara grota", share: 0.1 },
    ],
    // The day the titan was first fought at its new level.
    formerLevels: [{ lvl: 110, until: "2026-01-11" }],
  });
  expect(monster(RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS)).toEqual({
    gameVersion: "pl",
    name,
    type: "TITAN",
    retiredItemIds: [1],
  });
});
