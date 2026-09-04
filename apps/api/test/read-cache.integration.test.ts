import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/unstable/persistence";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { makeLootStatsQuery } from "#src/loots/query/loot-stats-query";

import { PgClient } from "@effect/sql-pg";
import { eq } from "drizzle-orm";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  lootTable,
  organizationLootRecordTable,
  eventTable,
  eventHeroNpcTable,
  eventMapTable,
  eventMapCoverageGapTable,
} from "#src/database/drizzle/schema";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventGapReads } from "#src/events/monitoring/event-gap-reads";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { applicationLogger } from "#src/shared/application-logger";

describe("Read cache Dragonfly integration", () => {
  let runtime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let cache: RedisService;
  const codec = makeJsonCodec(
    Schema.NullOr(Schema.Struct({ value: Schema.Number })),
  );
  const organization = randomUUID();

  const write = (key: string, value: number) =>
    cache.getOrSetJson({
      key,
      codec,
      ttlSeconds: 30,
      factory: () => Promise.resolve({ value }),
    });
  const read = (key: string) =>
    cache.getOrSetJson({
      key,
      codec,
      ttlSeconds: 30,
      factory: () => Promise.resolve(null),
    });

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    runtime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    cache = new RedisService(
      await runtime.runPromise(Redis.Redis),
      { prefix: `cache-test-${organization}` },
      (effect) => runtime.runPromise(effect),
    );
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("invalidates every user/world variant while preserving another organization", async () => {
    const keys = [
      "timer:list:one:user:world",
      "timer:list:one:other:all",
      "timer:list:two:user:world",
    ] as const;
    await Promise.all(keys.map((key) => write(key, 1)));
    await cache.deleteByPattern("timer:list:one:*");
    expect(await read(keys[0])).toBeNull();
    expect(await read(keys[1])).toBeNull();
    expect(await read(keys[2])).toEqual({ value: 1 });
    await write(keys[0], 2);
    await cache.deleteByPattern("timer:list:one:*");
    expect(await read(keys[0])).toBeNull();
  });

  it("invalidates an event independently and also supports organization-wide invalidation", async () => {
    const first = "event-read:v2:one:first:details:e30";
    const second = "event-read:v2:one:second:details:e30";
    const other = "event-read:v2:two:first:details:e30";
    await Promise.all([first, second, other].map((key) => write(key, 1)));
    await cache.deleteByPattern("event-read:v2:one:first:*");
    expect(await read(first)).toBeNull();
    expect(await read(second)).toEqual({ value: 1 });
    await cache.deleteByPattern("event-read:v2:one:*");
    expect(await read(second)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
  });

  it("invalidates kill ranking variants without crossing the owner boundary", async () => {
    const overview = "kill-stats:guild-overview:one:filters";
    const member = "kill-stats:member-kills:one:filters";
    const other = "kill-stats:guild-overview:two:filters";
    const user = "kill-stats:user-overview:one:filters";
    await Promise.all(
      [overview, member, other, user].map((key) => write(key, 1)),
    );
    await cache.deleteByPattern("kill-stats:guild-*:one:*");
    expect(await read(overview)).toBeNull();
    expect(await read(member)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
    expect(await read(user)).toEqual({ value: 1 });
    await cache.deleteByPattern("kill-stats:user-*:one:*");
    expect(await read(user)).toBeNull();
  });

  it("never republishes a cache fill started before invalidation", async () => {
    const key = "timer:list:race:user:world";
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    const stale = cache.getOrSetJson({
      key,
      codec,
      ttlSeconds: 30,
      factory: async () => {
        started.resolve();
        await finish.promise;
        return { value: 1 };
      },
    });
    await started.promise;
    await cache.deleteByPattern("timer:list:race:*");
    expect(await write(key, 2)).toEqual({ value: 2 });
    finish.resolve();
    expect(await stale).toEqual({ value: 1 });
    expect(await read(key)).toEqual({ value: 2 });
  });

  it("preserves typed factory errors across the Promise cache boundary", async () => {
    const failure = await Effect.runPromise(
      cache
        .getOrSetJsonEffect({
          key: "event-read:v2:errors:event:details:e30",
          codec,
          ttlSeconds: 10,
          factory: Effect.fail("query failed"),
        })
        .pipe(Effect.flip),
    );
    expect(failure).toBe("query failed");
  });

  it("refreshes the real loot-list reader after archiving, with Date values on cache hits", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);
    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const pg = yield* PgClient.PgClient;
          const [guild] = yield* db
            .insert(guildTable)
            .values({
              id: randomUUID(),
              name: "Cache integration",
              ownerId: "owner",
              updatedAt: new Date(),
            })
            .returning();
          if (!guild) throw new Error("Missing guild fixture");
          yield* db.insert(memberTable).values({
            guildId: guild.id,
            userId: "owner",
            name: "Owner",
            updatedAt: new Date(),
          });
          const [loot] = yield* db
            .insert(lootTable)
            .values({
              uniqueId: randomUUID(),
              world: "test",
              source: "FIGHT",
              location: "Test",
              updatedAt: new Date(),
            })
            .returning();
          if (!loot) throw new Error("Missing loot fixture");
          yield* db.insert(organizationLootRecordTable).values({
            guildId: guild.id,
            lootId: loot.id,
            updatedAt: new Date(),
          });
          const operations = makeLootsOperations({
            persistence: makeLootPersistence(db),
            query: makeLootQueryOperations(makeLootQueryPersistence(db)),
            stats: new LootStatsService(makeLootStatsQuery(pg), cache),
            redis: cache,
            logger: applicationLogger,
          });
          const policy = createAccessPolicy({
            capabilities: [Permission.OWNER],
          });
          const request = () =>
            operations.fetchLootsByGuildId(guild, policy, [], {});
          expect((yield* request()).map((entry) => entry.id)).toEqual([
            loot.id,
          ]);
          const hit = yield* request();
          expect(hit[0]?.createdAt).toBeInstanceOf(Date);
          expect(hit[0]?.updatedAt).toBeInstanceOf(Date);
          expect(
            yield* Effect.promise(() => cache.scan(`loots:list:${guild.id}:*`)),
          ).toEqual([]);
          expect(
            yield* Effect.promise(() =>
              cache.scan(`read-cache:v1:*:loots:list:${guild.id}:*`),
            ),
          ).toHaveLength(1);
          yield* operations.archiveLoot({
            guild,
            accessPolicy: policy,
            roles: [],
            discordId: "owner",
            lootId: loot.id,
          });
          expect(yield* request()).toEqual([]);
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("refreshes catalog and coverage readers after event invalidation and revives Dates", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);
    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const eventId = randomUUID();
          const heroId = randomUUID();
          const mapId = randomUUID();
          const gapId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Cache integration",
            ownerId: "owner",
            updatedAt: new Date(),
          });
          yield* db.insert(eventTable).values({
            id: eventId,
            guildId,
            name: "Before",
            world: "test",
            updatedAt: new Date(),
          });
          yield* db
            .insert(eventHeroNpcTable)
            .values({ id: heroId, eventId, npcName: "Hero" });
          yield* db.insert(eventMapTable).values({
            id: mapId,
            heroNpcId: heroId,
            mapId: 1,
            mapName: "Map",
            updatedAt: new Date(),
          });
          yield* db.insert(eventMapCoverageGapTable).values({
            id: gapId,
            mapId,
            heroNpcId: heroId,
            gapType: "UNCOVERED",
            startedAt: new Date(),
          });
          const catalog = makeEventsCatalogRead(db, cache, applicationLogger);
          const gaps = makeEventGapReads(db, cache, applicationLogger);
          const policy = createAccessPolicy({
            capabilities: [Permission.OWNER],
          });
          const overview = () =>
            catalog.getEventOverview({ id: guildId }, eventId, [], policy);
          const history = () =>
            gaps.getMapCoverageGaps({ id: guildId }, eventId, mapId);
          expect((yield* overview()).name).toBe("Before");
          expect((yield* history())[0]?.endedAt).toBeNull();
          expect((yield* overview()).createdAt).toBeInstanceOf(Date);
          expect((yield* history())[0]?.startedAt).toBeInstanceOf(Date);
          const endedAt = new Date();
          yield* db
            .update(eventTable)
            .set({ name: "After" })
            .where(eq(eventTable.id, eventId));
          yield* db
            .update(eventMapCoverageGapTable)
            .set({ endedAt })
            .where(eq(eventMapCoverageGapTable.id, gapId));
          yield* Effect.promise(() =>
            makeEventReadCache(cache).invalidateEvent(guildId, eventId),
          );
          expect((yield* overview()).name).toBe("After");
          expect((yield* history())[0]?.endedAt).toEqual(endedAt);
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("coalesces concurrent cold loot statistics requests at the SQL boundary", async () => {
    let queries = 0;
    const query = makeLootStatsQuery({
      unsafe: () =>
        Effect.gen(function* () {
          queries++;
          yield* Effect.sleep("80 millis");
          return [];
        }),
    });
    const service = new LootStatsService(query, cache);
    const policy = createAccessPolicy({
      capabilities: [Permission.LOOTLOG_LOOTS_READ],
    });
    const request = () =>
      Effect.runPromise(service.getLootStatsEffect(organization, policy, []));
    const responses = await Promise.all(Array.from({ length: 8 }, request));
    expect(queries).toBe(6);
    expect(await cache.scan(`loot-stats:${organization}:*`)).toEqual([]);
    const firstGenerationKeys = await cache.scan(
      `read-cache:v1:*:loot-stats:${organization}:*`,
    );
    expect(firstGenerationKeys).toHaveLength(1);
    expect(
      responses.every(
        (response) => JSON.stringify(response) === JSON.stringify(responses[0]),
      ),
    ).toBe(true);
    await cache.deleteByPattern(`loot-stats:${organization}:*`);
    await request();
    expect(queries).toBe(12);
    const nextGenerationKeys = await cache.scan(
      `read-cache:v1:*:loot-stats:${organization}:*`,
    );
    expect(nextGenerationKeys).toHaveLength(2);
    expect(nextGenerationKeys).toEqual(
      expect.arrayContaining(firstGenerationKeys),
    );
  });
});
