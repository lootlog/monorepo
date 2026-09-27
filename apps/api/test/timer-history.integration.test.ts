import { afterAll, beforeAll, expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import {
  RabbitMessaging,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import { and, eq } from "drizzle-orm";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import {
  TimerHistoryListResponse,
  TimerResponse,
} from "#src/contracts/timers/schemas";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  guildTable,
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { LootlogApiRouter } from "#src/runtime/application/http-routes";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

requireIsolatedTestDatabase();

const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

const publishedMessages: Parameters<RabbitMessagingService["publish"]>[0][] =
  [];

const boundary = HttpRouter.toWebHandler(
  LootlogApiRouter.pipe(
    Layer.provide(
      Layer.mergeAll(
        ApiRuntimeConfig.layer,
        ApiRedis.layer.pipe(Layer.provide(ApiRuntimeConfig.layer)),
        Layer.succeed(
          RabbitMessaging,
          RabbitMessaging.of({
            publish: (message) =>
              Effect.sync(() => {
                publishedMessages.push(message);
              }),
            consume: () => Effect.never,
            ack: () => Effect.void,
            nack: () => Effect.void,
          }),
        ),
        FetchHttpClient.layer,
      ),
    ),
    Layer.provide(BunHttpServer.layerHttpServices),
  ),
  { disableLogger: true },
);

let database: ApiDatabaseValue;

beforeAll(async () => {
  database = await databaseRuntime.runPromise(ApiDatabase);
});

afterAll(async () => {
  await boundary.dispose();
  await databaseRuntime.dispose();
});

it("serves history and restores deleted or reset timers through HTTP without repeating mutations", async () => {
  const guildId = `timer-history-${crypto.randomUUID()}`;

  const caller = {
    userId: `user-${crypto.randomUUID()}`,
    discordId: `discord-${crypto.randomUUID()}`,
  };

  const reader = {
    userId: `reader-${crypto.randomUUID()}`,
    discordId: `reader-discord-${crypto.randomUUID()}`,
  };

  const world = "timer-history";
  const timerKey = "300:history hero";
  const now = new Date();
  const npc = { id: 300, name: "History hero", lvl: 300, type: "HERO" };

  const actorCharacter = {
    name: "Timer actor",
    prof: "WARRIOR" as const,
    icon: null,
    characterId: 300,
    accountId: 301,
  };

  const minSpawnTime = new Date(now.getTime() + 60_000);
  const maxSpawnTime = new Date(now.getTime() + 120_000);

  await databaseRuntime.runPromise(
    Effect.gen(function* () {
      yield* database.insert(guildTable).values({
        id: guildId,
        name: "Timer history organization",
        ownerId: "different-owner",
        updatedAt: now,
      });
      yield* database.insert(eventTable).values({
        id: guildId,
        guildId,
        world,
        name: "Scheduled timer event",
        startsAt: new Date(now.getTime() + 3_600_000),
        updatedAt: now,
      });
      yield* database.insert(eventHeroNpcTable).values({
        id: guildId,
        eventId: guildId,
        npcId: npc.id,
        npcName: npc.name,
      });
      yield* database.insert(roleTable).values({
        id: guildId,
        guildId,
        name: "Timer maintainer",
        permissions: [Permission.ADMIN],
        updatedAt: now,
      });
      yield* database.insert(roleTable).values({
        id: `${guildId}-reader`,
        guildId,
        name: "Timer reader",
        permissions: [
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_TIMERS_HEROES_READ,
        ],
        lvlRangeFrom: 1,
        lvlRangeTo: 500,
        updatedAt: now,
      });

      const [member] = yield* database
        .insert(memberTable)
        .values({
          userId: caller.discordId,
          globalUserId: caller.userId,
          guildId,
          name: "Timer maintainer",
          lastDiscordSyncAt: now,
          updatedAt: now,
        })
        .returning();

      const [character] = yield* database
        .insert(playerSnapshotTable)
        .values({
          ...actorCharacter,
          world,
          snapshotHash: guildId,
        })
        .returning();

      const [readerMember] = yield* database
        .insert(memberTable)
        .values({
          userId: reader.discordId,
          globalUserId: reader.userId,
          guildId,
          name: "Timer reader",
          lastDiscordSyncAt: now,
          updatedAt: now,
        })
        .returning();

      if (!member || !character || !readerMember)
        throw new Error("Timer actors were not created");

      yield* database.insert(memberToRoleTable).values([
        { A: member.id, B: guildId },
        { A: readerMember.id, B: `${guildId}-reader` },
      ]);
      yield* database.insert(timerTable).values({
        guildId,
        world,
        timerKey,
        npcId: npc.id,
        npc,
        createdById: member.id,
        actorCharacterSnapshotId: character.id,
        actorCharacterLvl: 300,
        minSpawnTime,
        maxSpawnTime,
        latestRespBaseSeconds: 120,
        latestRespawnRandomness: 10,
        updatedAt: now,
      });
      yield* database.insert(timerHistoryEntryTable).values({
        guildId,
        world,
        timerKey,
        npcId: npc.id,
        npc,
        action: "CREATE",
        actorMemberId: member.id,
        actorCharacterSnapshotId: character.id,
        actorCharacterLvl: 300,
        minSpawnTime,
        maxSpawnTime,
        createdAt: now,
      });
    }),
  );

  const request = (path: string, init: RequestInit = {}, identity = caller) =>
    boundary.handler(
      new Request(`http://api.test${path}`, {
        ...init,
        headers: {
          authorization: "Bearer validated-by-forward-auth",
          "content-type": "application/json",
          "x-auth-user-id": identity.userId,
          "x-auth-discord-id": identity.discordId,
        },
      }),
    );

  const timerPath = `/guilds/${guildId}/timers/${encodeURIComponent(timerKey)}`;

  const historyPaths = [
    `/timers/history?guildId=${guildId}&world=${world}`,
    `${timerPath}/history?world=${world}`,
  ];

  const readHistories = async (limit?: number, identity = caller) => {
    const histories = [];

    for (const path of historyPaths) {
      const response = await request(
        limit === undefined ? path : `${path}&limit=${limit}`,
        {},
        identity,
      );

      expect(response.status).toBe(200);
      histories.push(
        Schema.decodeUnknownSync(TimerHistoryListResponse)(
          await response.json(),
        ),
      );
    }

    return histories;
  };

  const deletion = await request(`${timerPath}?world=${world}`, {
    method: "DELETE",
  });

  expect(deletion.status).toBe(200);

  const deletedHistories = await readHistories();

  for (const history of deletedHistories) {
    expect(history.map((entry) => entry.action)).toEqual(["DELETE", "CREATE"]);
    expect(history[0]).toMatchObject({
      canRestore: true,
      minSpawnTime: minSpawnTime.toISOString(),
      maxSpawnTime: maxSpawnTime.toISOString(),
    });
    expect(history[0]).not.toHaveProperty("actorCharacter");
    expect(history[1]?.actorCharacter).toEqual({ ...actorCharacter, lvl: 300 });
  }

  const deletedEntry = deletedHistories[0]?.[0];

  if (!deletedEntry) throw new Error("Deletion history was not returned");

  const restoration = await request(
    `/guilds/${guildId}/timers/history/${deletedEntry.id}/restore`,
    { method: "POST" },
  );

  expect(restoration.status).toBe(201);

  const restored = Schema.decodeUnknownSync(TimerResponse)(
    await restoration.json(),
  );

  expect(restored.actorCharacter).toEqual({ ...actorCharacter, lvl: 300 });
  expect(restored.minSpawnTime).toBe(minSpawnTime.toISOString());
  expect(restored.maxSpawnTime).toBe(maxSpawnTime.toISOString());

  for (const history of await readHistories()) {
    expect(history.map((entry) => entry.action)).toEqual([
      "RESTORE",
      "DELETE",
      "CREATE",
    ]);
    expect(history[0]).not.toHaveProperty("actorCharacter");
    expect(history[1]).not.toHaveProperty("actorCharacter");
    expect(history[2]?.actorCharacter).toEqual({ ...actorCharacter, lvl: 300 });
  }

  const reset = await request(`${timerPath}/reset`, {
    method: "PATCH",
    body: JSON.stringify({ world }),
  });

  expect(reset.status).toBe(200);

  const resetTimer = Schema.decodeUnknownSync(TimerResponse)(
    await reset.json(),
  );

  expect(resetTimer.wasReset).toBe(true);
  expect(resetTimer.minSpawnTime).not.toBe(minSpawnTime.toISOString());
  expect(resetTimer.maxSpawnTime).not.toBe(maxSpawnTime.toISOString());
  expect(resetTimer).not.toHaveProperty("actorCharacter");

  await databaseRuntime.runPromise(
    database
      .update(timerHistoryEntryTable)
      .set({ createdAt: new Date(now.getTime() - 60_000) })
      .where(
        and(
          eq(timerHistoryEntryTable.guildId, guildId),
          eq(timerHistoryEntryTable.world, world),
          eq(timerHistoryEntryTable.timerKey, timerKey),
          eq(timerHistoryEntryTable.action, "RESET"),
        ),
      ),
  );

  const resetHistories = await readHistories(1);

  for (const history of resetHistories) {
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      action: "RESET",
      canRestore: true,
      minSpawnTime: resetTimer.minSpawnTime,
      maxSpawnTime: resetTimer.maxSpawnTime,
    });
    expect(history[0]).not.toHaveProperty("actorCharacter");
  }

  const resetEntry = resetHistories[0]?.[0];

  if (!resetEntry) throw new Error("Reset history was not returned");

  const rollbackPath = `/guilds/${guildId}/timers/history/${resetEntry.id}/restore`;

  for (const history of await readHistories(1, reader)) {
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: resetEntry.id,
      action: "RESET",
      canRestore: false,
    });
  }

  const publishedBeforeUnauthorizedRollback = publishedMessages.length;

  const unauthorizedRollback = await request(
    rollbackPath,
    { method: "POST" },
    reader,
  );

  expect(unauthorizedRollback.status).toBe(403);
  expect(publishedMessages).toHaveLength(publishedBeforeUnauthorizedRollback);

  await databaseRuntime.runPromise(
    database
      .update(eventTable)
      .set({ startsAt: new Date(now.getTime() - 120_000) })
      .where(eq(eventTable.id, guildId)),
  );

  const activeEventHistories = await readHistories(1);

  for (const history of activeEventHistories) {
    expect(history[0]).toMatchObject({
      id: resetEntry.id,
      action: "RESET",
      canRestore: false,
    });
  }

  const eventRollback = await request(rollbackPath, { method: "POST" });
  expect(eventRollback.status).toBe(400);
  expect(publishedMessages).toHaveLength(publishedBeforeUnauthorizedRollback);
  expect(await readHistories(1)).toEqual(activeEventHistories);

  const [eventTimer] = await databaseRuntime.runPromise(
    database.select().from(timerTable).where(eq(timerTable.guildId, guildId)),
  );

  expect(eventTimer?.minSpawnTime.toISOString()).toBe(resetTimer.minSpawnTime);
  expect(eventTimer?.maxSpawnTime.toISOString()).toBe(resetTimer.maxSpawnTime);
  expect(eventTimer?.wasReset).toBe(true);

  await databaseRuntime.runPromise(
    database
      .update(eventTable)
      .set({ endsAt: new Date(now.getTime() - 60_000) })
      .where(eq(eventTable.id, guildId)),
  );

  for (const history of await readHistories(1)) {
    expect(history[0]?.canRestore).toBe(true);
  }

  const rollback = await request(rollbackPath, { method: "POST" });
  expect(rollback.status).toBe(201);

  const rolledBack = Schema.decodeUnknownSync(TimerResponse)(
    await rollback.json(),
  );

  expect(rolledBack.minSpawnTime).toBe(minSpawnTime.toISOString());
  expect(rolledBack.maxSpawnTime).toBe(maxSpawnTime.toISOString());
  expect(rolledBack.wasReset).toBe(false);
  expect(rolledBack.actorCharacter).toEqual({ ...actorCharacter, lvl: 300 });

  const rolledBackHistories = await readHistories();

  for (const history of rolledBackHistories) {
    expect(history.map((entry) => entry.action)).toEqual([
      "RESTORE",
      "RESET",
      "RESTORE",
      "DELETE",
      "CREATE",
    ]);
    expect(history[0]).toMatchObject({
      minSpawnTime: minSpawnTime.toISOString(),
      maxSpawnTime: maxSpawnTime.toISOString(),
    });
    expect(history[1]?.canRestore).toBe(false);
  }

  const publishedBeforeRetry = publishedMessages.length;
  const repeatedRollback = await request(rollbackPath, { method: "POST" });
  expect(repeatedRollback.status).toBe(409);
  expect(publishedMessages).toHaveLength(publishedBeforeRetry);
  expect(await readHistories()).toEqual(rolledBackHistories);
});
