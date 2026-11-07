import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import type { PublishOptions } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, ManagedRuntime } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { guildKillBucketTable } from "#src/database/drizzle/kill-statistics.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
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
    dropRates?: Array<{ itemId: number; drops: number; kills: number }>;
  };

  const monster = (routingKey: string) =>
    published
      .filter((message) => message.routingKey === routingKey)
      .flatMap((message): PublishedMonster[] =>
        JSON.parse(new TextDecoder().decode(message.content)),
      )
      .find((entry) => entry.name === name);

  // The old map is in the latest 1000 fights; the exit holds under 1% of them.
  expect(monster(RabbitRoutingKey.CATALOG_NPCS_LOCATIONS)).toEqual({
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
  expect(monster(RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS)).toEqual({
    gameVersion: "pl",
    name,
    type: "TITAN",
    retiredItemIds: [1],
    // No Organization counted the titan's kills.
    dropRates: [],
  });
});

it("publishes how often a boss's kills drop each item, over the kills of the Organizations that could record it", async () => {
  const name = `Heros ${randomUUID()}`;
  const world = `rates-${randomUUID()}`;
  // Kill buckets begin long before other suites' data, so they set the window.
  const bucketsBegin = new Date(Date.UTC(2001, 0, 1));
  const killedAt = new Date(Date.UTC(2001, 0, 2));
  const [everything, legendsOnly] = [randomUUID(), randomUUID()];

  const published: PublishOptions[] = [];

  await runtime.runPromise(
    Effect.gen(function* () {
      const now = new Date();

      yield* database.insert(guildTable).values(
        [everything, legendsOnly].map((id) => ({
          id,
          name: "Drop rates",
          ownerId: "owner",
          updatedAt: now,
        })),
      );
      yield* database
        .insert(lootlogConfigTable)
        .values(
          [everything, legendsOnly].map((id) => ({ id, updatedAt: now })),
        );
      yield* database.insert(lootlogConfigNpcTable).values([
        {
          lootlogConfigId: everything,
          npcType: "HERO",
          allowedRarities: ["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED"],
          updatedAt: now,
        },
        {
          lootlogConfigId: legendsOnly,
          npcType: "HERO",
          allowedRarities: ["LEGENDARY"],
          updatedAt: now,
        },
      ]);
      yield* database.insert(guildKillBucketTable).values(
        [
          { guildId: everything, kills: 200 },
          { guildId: legendsOnly, kills: 300 },
        ].map(({ guildId, kills }) => ({
          periodStart: bucketsBegin,
          guildId,
          world,
          npcId: 1,
          npcName: name,
          npcType: "HERO" as const,
          npcLvl: 100,
          kills,
          lastKilledAt: killedAt,
        })),
      );

      const [npc] = yield* database
        .insert(npcSnapshotTable)
        .values({ npcId: 1, gameVersion: "pl", name, type: "HERO", lvl: 100 })
        .returning({ id: npcSnapshotTable.id });

      const [unique, legendary] = yield* database
        .insert(itemSnapshotTable)
        .values(
          (["UNIQUE", "LEGENDARY"] as const).map((rarity, index) => ({
            itemId: 900_001 + index,
            gameVersion: "pl" as const,
            statsHash: randomUUID(),
            name: `Łup ${rarity}`,
            icon: "item.gif",
            rarity,
            statRaw: "",
            statsSnapshot: {},
          })),
        )
        .returning({ id: itemSnapshotTable.id });

      const record = (
        count: number,
        itemSnapshotId: number,
        guildIds: ReadonlyArray<string>,
        foughtAt = killedAt,
      ) =>
        Effect.gen(function* () {
          const loots = yield* database
            .insert(lootTable)
            .values(
              Array.from({ length: count }, () => ({
                uniqueId: randomUUID(),
                world,
                gameVersion: "pl" as const,
                source: "FIGHT" as const,
                location: "Grota",
                createdAt: foughtAt,
                updatedAt: foughtAt,
              })),
            )
            .returning({ id: lootTable.id });

          yield* database
            .insert(lootNpcTable)
            .values(
              loots.map(({ id }) => ({ lootId: id, npcSnapshotId: npc!.id })),
            );
          yield* database.insert(lootItemTable).values(
            loots.map(({ id }) => ({
              lootId: id,
              itemSnapshotId,
              hid: randomUUID(),
            })),
          );
          yield* database.insert(organizationLootRecordTable).values(
            loots.flatMap(({ id }) =>
              guildIds.map((guildId) => ({
                lootId: id,
                guildId,
                updatedAt: now,
              })),
            ),
          );
        });

      yield* record(20, unique!.id, [everything]);
      // A kill both Organizations recorded counts in each.
      yield* record(5, legendary!.id, [everything, legendsOnly]);
      // Kept by an Organization whose settings now skip uniques.
      yield* record(3, unique!.id, [legendsOnly]);
      // Before the first kill bucket, so no kill pairs with it.
      yield* record(
        4,
        unique!.id,
        [everything],
        new Date(Date.UTC(2000, 5, 1)),
      );

      yield* makeMonsterStatisticsPublisher(database, {
        publish: (message) => Effect.sync(() => void published.push(message)),
      });
    }),
  );

  const rates = published
    .filter(
      ({ routingKey }) =>
        routingKey === RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS,
    )
    .flatMap(
      (
        message,
      ): Array<{
        name: string;
        dropRates: Array<{ itemId: number; drops: number; kills: number }>;
      }> => JSON.parse(new TextDecoder().decode(message.content)),
    )
    .find((monster) => monster.name === name)?.dropRates;

  expect(rates?.toSorted((a, b) => a.itemId - b.itemId)).toEqual([
    // Only the Organization that keeps uniques could have recorded one.
    { itemId: 900_001, drops: 20, kills: 200 },
    { itemId: 900_002, drops: 10, kills: 500 },
  ]);
});
