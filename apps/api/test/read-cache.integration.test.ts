import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import { UserLootlogConfigData } from "../src/lootlog-config/user-lootlog-config-data.js";
import { MemberReadData } from "../src/members/members-data.js";
import { makeMemberReadDataLayer } from "../src/members/member-read.data-layer.js";
import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { createDatabaseBoundary } from "./database-fixtures.js";
import { randomUUID } from "node:crypto";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/persistence";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { LootStatsService } from "#src/loots/query/loot-stats.service";

import { eq } from "drizzle-orm";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  eventTable,
  eventHeroNpcTable,
  eventMapTable,
  eventMapCoverageGapTable,
} from "#src/database/drizzle/event.schema";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot.repository";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventGapReads } from "#src/events/monitoring/event-gap-reads";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { createOrganizationLootRecordFixture } from "./loot-fixtures.js";

describe("Read cache Dragonfly integration", () => {
  let runtime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let cache: RedisService;

  const codec = makeJsonCodec(
    Schema.NullOr(Schema.Struct({ value: Schema.Number })),
  );

  const organization = randomUUID();
  const prefix = `cache-test-${organization}`;

  const fromPromise = <A>(factory: () => Promise<A>) =>
    Effect.tryPromise({ try: factory, catch: (error) => error });

  const send = <A>(command: string, key: string, ...args: string[]) =>
    runtime.runPromise(
      Effect.flatMap(Redis.Redis, (client) =>
        client.send<A>(command, `${prefix}:${key}`, ...args),
      ),
    );

  const pttl = (key: string) => send<number>("PTTL", key);

  const pexpire = (key: string, milliseconds: number) =>
    send<number>("PEXPIRE", key, String(milliseconds));

  type Entry = { key: string; scopes: readonly string[] };

  const write = (entry: Entry, value: number) =>
    Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: Effect.succeed({ value }),
      }),
    );

  const read = (entry: Entry) =>
    Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: Effect.succeed(null),
      }),
    );

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    runtime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    cache = makeRedisService(await runtime.runPromise(Redis.Redis), { prefix });
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("gives every report after the first the value the first one claimed", async () => {
    const key = `boss-kill-${randomUUID()}`;

    const claims = await Promise.all(
      ["a", "b", "c"].map((value) =>
        Effect.runPromise(cache.setNxGet(key, value, 30)),
      ),
    );

    const first = ["a", "b", "c"][claims.indexOf(null)];

    expect(claims.filter((held) => held === null)).toHaveLength(1);
    expect(claims.filter((held) => held !== null)).toEqual([first!, first!]);
    expect(await Effect.runPromise(cache.setNxGet(key, "d", 30))).toBe(first!);
  });

  it("shares a fill slower than the former two-second deadline across service instances", async () => {
    const second = makeRedisService(await runtime.runPromise(Redis.Redis), {
      prefix,
    });

    const started = Promise.withResolvers<void>();
    let executions = 0;

    const options = {
      key: "slow-fill",
      ttlSeconds: 30,
      codec,
      factory: fromPromise(async () => {
        executions++;
        started.resolve();
        await Bun.sleep(2_150);

        return { value: 1 };
      }),
    };

    const owner = Effect.runPromise(cache.getOrSetJson(options));
    await started.promise;

    const waiters = Array.from({ length: 8 }, () =>
      Effect.runPromise(second.getOrSetJson(options)),
    );

    const values = await Promise.all([owner, ...waiters]);
    expect(executions).toBe(1);

    for (const value of values) expect(value).toEqual({ value: 1 });
  }, 10_000);

  it("fails busy best-effort reads without running SQL and leaves the owner intact", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "busy-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    let executions = 0;

    try {
      const waiters = Array.from({ length: 8 }, () =>
        Effect.runPromise(
          cache.getOrSetJson({
            key: "busy-fill",
            codec,
            ttlSeconds: 30,
            waitTimeoutMs: 20,
            waitIntervalMs: 1,
            factory: fromPromise(async () => {
              executions++;

              return { value: 2 };
            }),
          }),
        ),
      );

      const results = await Promise.allSettled(waiters);
      expect(
        results.every(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof Error &&
            result.reason.message === "Cache fill wait timed out",
        ),
      ).toBe(true);
      expect(executions).toBe(0);
      expect(
        await Effect.runPromise(cache.get("busy-fill:single-flight")),
      ).not.toBeNull();
    } finally {
      finish.resolve();
      await owner;
    }

    expect(await Effect.runPromise(cache.getJson("busy-fill", codec))).toEqual({
      value: 1,
    });
  });

  it("allows a waiting reader to recover after the owner fails", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "failed-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;
          throw new Error("loader failed");
        }),
      }),
    );

    const ownerResult = Promise.allSettled([owner]);
    await started.promise;

    const waiter = Effect.runPromise(
      cache.getOrSetJson({
        key: "failed-fill",
        codec,
        ttlSeconds: 30,
        waitIntervalMs: 1,
        factory: fromPromise(async () => ({ value: 2 })),
      }),
    );

    finish.resolve();
    expect((await ownerResult)[0]?.status).toBe("rejected");
    expect(await waiter).toEqual({ value: 2 });
    expect(
      await Effect.runPromise(cache.getJson("failed-fill", codec)),
    ).toEqual({ value: 2 });
  });

  it("does not let an expired owner overwrite or unlock its successor", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "expired-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;

    try {
      await pexpire("expired-fill:single-flight", 0);
      await Effect.runPromise(
        cache.setNX("expired-fill:single-flight", "successor", 10),
      );
      await Effect.runPromise(cache.setJson("expired-fill", { value: 2 }));
    } finally {
      finish.resolve();
    }

    expect(await owner).toEqual({ value: 1 });
    expect(
      await Effect.runPromise(cache.getJson("expired-fill", codec)),
    ).toEqual({ value: 2 });
    expect(
      await Effect.runPromise(cache.get("expired-fill:single-flight")),
    ).toBe("successor");
  });

  it("cancels a waiting Effect read without invoking its factory after owner failure", async () => {
    await Effect.runPromise(
      cache.setNX("cancelled-fill:single-flight", "owner", 10),
    );
    const controller = new AbortController();
    let executions = 0;

    const result = Effect.runPromiseExit(
      cache.getOrSetJson({
        key: "cancelled-fill",
        codec,
        ttlSeconds: 30,
        waitIntervalMs: 1,
        factory: Effect.sync(() => {
          executions++;

          return { value: 2 };
        }),
      }),
      { signal: controller.signal },
    );

    await Bun.sleep(10);
    controller.abort();
    await result;
    await Effect.runPromise(cache.del("cancelled-fill:single-flight"));
    await Bun.sleep(20);
    expect(executions).toBe(0);
    expect(await Effect.runPromise(cache.get("cancelled-fill"))).toBeNull();
  });

  it("expires idle generations and renews existing generations without evicting cached data", async () => {
    const entry = { key: "ttl:payload", scopes: ["ttl:scope"] };
    const generationKey = "cache-generation:v1:ttl:scope";

    await write(entry, 1);
    expect(await pttl(generationKey)).toBeGreaterThan(0);
    expect(await pttl(generationKey)).toBeLessThanOrEqual(3_600_000);
    const generation = await Effect.runPromise(cache.get(generationKey));

    if (generation === null) throw new Error("Missing generation");

    await Effect.runPromise(cache.set(generationKey, generation));
    expect(await pttl(generationKey)).toBe(-1);
    expect(await read(entry)).toEqual({ value: 1 });
    expect(await Effect.runPromise(cache.get(generationKey))).toBe(generation);
    expect(await pttl(generationKey)).toBeGreaterThan(3_500_000);

    await pexpire(generationKey, 10_000);
    expect(await read(entry)).toEqual({ value: 1 });
    expect(await pttl(generationKey)).toBeGreaterThan(3_500_000);

    await Effect.runPromise(cache.invalidateScopes(...entry.scopes));
    expect(await pttl(generationKey)).toBeGreaterThan(0);
    expect(await pttl(generationKey)).toBeLessThanOrEqual(3_600_000);
    expect(await Effect.runPromise(cache.get(generationKey))).not.toBe(
      generation,
    );
    expect(await read(entry)).toBeNull();

    await Effect.runPromise(cache.invalidateScopes("ttl:unread"));
    expect(await pttl("cache-generation:v1:ttl:unread")).toBeGreaterThan(0);
  });

  it("does not revive an old fill when its generation expires during loading", async () => {
    const entry = { key: "expiry:payload", scopes: ["expiry:scope"] };
    const generationKey = "cache-generation:v1:expiry:scope";
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const stale = Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    const generation = await Effect.runPromise(cache.get(generationKey));

    try {
      await pexpire(generationKey, 0);
      expect(await Effect.runPromise(cache.get(generationKey))).toBeNull();
      expect(await write(entry, 2)).toEqual({ value: 2 });
      expect(await Effect.runPromise(cache.get(generationKey))).not.toBe(
        generation,
      );
    } finally {
      finish.resolve();
    }

    expect(await stale).toEqual({ value: 1 });
    expect(await read(entry)).toEqual({ value: 2 });
  });

  it("invalidates every user/world variant while preserving another organization", async () => {
    const keys = [
      { key: "timer:list:one:user:world", scopes: ["timer:list:one"] },
      { key: "timer:list:one:other:all", scopes: ["timer:list:one"] },
      { key: "timer:list:two:user:world", scopes: ["timer:list:two"] },
    ] as const;

    await Promise.all(keys.map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("timer:list:one"));
    expect(await read(keys[0])).toBeNull();
    expect(await read(keys[1])).toBeNull();
    expect(await read(keys[2])).toEqual({ value: 1 });
    await write(keys[0], 2);
    await Effect.runPromise(cache.invalidateScopes("timer:list:one"));
    expect(await read(keys[0])).toBeNull();
  });

  it("invalidates an event independently and also supports organization-wide invalidation", async () => {
    const first = {
      key: "event-read:v2:one:first:details:e30",
      scopes: ["event-read:v2:one", "event-read:v2:one:first"],
    };

    const second = {
      key: "event-read:v2:one:second:details:e30",
      scopes: ["event-read:v2:one", "event-read:v2:one:second"],
    };

    const other = {
      key: "event-read:v2:two:first:details:e30",
      scopes: ["event-read:v2:two", "event-read:v2:two:first"],
    };

    await Promise.all([first, second, other].map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("event-read:v2:one:first"));
    expect(await read(first)).toBeNull();
    expect(await read(second)).toEqual({ value: 1 });
    await Effect.runPromise(cache.invalidateScopes("event-read:v2:one"));
    expect(await read(second)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
  });

  it("invalidates kill ranking variants without crossing the owner boundary", async () => {
    const overview = {
      key: "kill-stats:guild-overview:one:filters",
      scopes: ["kill-stats:guild:one"],
    };

    const member = {
      key: "kill-stats:member-kills:one:filters",
      scopes: ["kill-stats:guild:one"],
    };

    const other = {
      key: "kill-stats:guild-overview:two:filters",
      scopes: ["kill-stats:guild:two"],
    };

    const user = {
      key: "kill-stats:user-overview:one:filters",
      scopes: ["kill-stats:user:one"],
    };

    await Promise.all(
      [overview, member, other, user].map((key) => write(key, 1)),
    );
    await Effect.runPromise(cache.invalidateScopes("kill-stats:guild:one"));
    expect(await read(overview)).toBeNull();
    expect(await read(member)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
    expect(await read(user)).toEqual({ value: 1 });
    await Effect.runPromise(cache.invalidateScopes("kill-stats:user:one"));
    expect(await read(user)).toBeNull();
  });

  it("never republishes a cache fill started before invalidation", async () => {
    const key = {
      key: "timer:list:race:user:world",
      scopes: ["timer:list:race"],
    };

    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const stale = Effect.runPromise(
      cache.getOrSetJson({
        ...key,
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    await Effect.runPromise(cache.invalidateScopes("timer:list:race"));
    expect(await write(key, 2)).toEqual({ value: 2 });
    finish.resolve();
    expect(await stale).toEqual({ value: 1 });
    expect(await read(key)).toEqual({ value: 2 });
  });

  it("invalidates member variants without evicting another organization", async () => {
    const keys = [
      {
        key: "member-read:members-one:references:active",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:references:all",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:summary",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:lootlog-config:member-one",
        scopes: ["member-read:members-one", "user-lootlog-config:member-one"],
      },
      {
        key: "member-read:members-two:summary",
        scopes: ["member-read:members-two"],
      },
    ];

    await Promise.all(keys.map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("member-read:members-one"));

    for (const key of keys.slice(0, -1)) expect(await read(key)).toBeNull();
    expect(
      await read({
        key: "member-read:members-two:summary",
        scopes: ["member-read:members-two"],
      }),
    ).toEqual({ value: 1 });
  });

  it("refreshes all account and organization summary variants after settings invalidation", async () => {
    const affected = [
      {
        key: "user-lootlog-config:settings-user:account:one",
        scopes: ["user-lootlog-config:settings-user"],
      },
      {
        key: "user-lootlog-config:settings-user:account:two",
        scopes: ["user-lootlog-config:settings-user"],
      },
      {
        key: "member-read:settings-one:lootlog-config:settings-user",
        scopes: [
          "member-read:settings-one",
          "user-lootlog-config:settings-user",
        ],
      },
      {
        key: "member-read:settings-two:lootlog-config:settings-user",
        scopes: [
          "member-read:settings-two",
          "user-lootlog-config:settings-user",
        ],
      },
    ];

    const unaffected = [
      {
        key: "user-lootlog-config:other-user:account:one",
        scopes: ["user-lootlog-config:other-user"],
      },
      {
        key: "member-read:settings-one:lootlog-config:other-user",
        scopes: ["member-read:settings-one", "user-lootlog-config:other-user"],
      },
      {
        key: "member-read:settings-one:summary",
        scopes: ["member-read:settings-one"],
      },
    ];

    await Promise.all([...affected, ...unaffected].map((key) => write(key, 1)));
    await Effect.runPromise(
      cache.invalidateScopes("user-lootlog-config:settings-user"),
    );

    for (const key of affected) expect(await read(key)).toBeNull();

    for (const key of unaffected) expect(await read(key)).toEqual({ value: 1 });
  });

  it.each([
    [
      {
        key: "member-read:member-race:summary",
        scopes: ["member-read:member-race"],
      },
      "member-read:member-race",
    ],
    [
      {
        key: "user-lootlog-config:user-race:account:one",
        scopes: ["user-lootlog-config:user-race"],
      },
      "user-lootlog-config:user-race",
    ],
    [
      {
        key: "member-read:summary-race:lootlog-config:summary-user",
        scopes: [
          "member-read:summary-race",
          "user-lootlog-config:summary-user",
        ],
      },
      "user-lootlog-config:summary-user",
    ],
  ])(
    "keeps invalidated in-flight fills unreachable for %s",
    async (key, scope) => {
      const started = Promise.withResolvers<void>();
      const finish = Promise.withResolvers<void>();

      const stale = Effect.runPromise(
        cache.getOrSetJson({
          ...key,
          codec,
          ttlSeconds: 30,
          factory: fromPromise(async () => {
            started.resolve();
            await finish.promise;

            return { value: 1 };
          }),
        }),
      );

      await started.promise;

      try {
        await Effect.runPromise(cache.invalidateScopes(scope));
        expect(await write(key, 2)).toEqual({ value: 2 });
      } finally {
        finish.resolve();
      }

      await stale;
      expect(await read(key)).toEqual({ value: 2 });
    },
  );

  it("preserves typed factory errors across the Promise cache boundary", async () => {
    const failure = await Effect.runPromise(
      cache
        .getOrSetJson({
          key: "event-read:v2:errors:event:details:e30",
          scopes: ["event-read:v2:errors", "event-read:v2:errors:event"],
          codec,
          ttlSeconds: 10,
          factory: Effect.fail("query failed"),
        })
        .pipe(Effect.flip),
    );

    expect(failure).toBe("query failed");
  });

  it("refreshes real account and member configuration readers after a character settings update", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const discordId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Settings cache integration",
            ownerId: discordId,
            updatedAt: new Date(),
          });
          yield* db.insert(memberTable).values({
            guildId,
            userId: discordId,
            globalUserId: randomUUID(),
            name: "Owner",
            updatedAt: new Date(),
          });

          return yield* Effect.gen(function* () {
            const settings = yield* UserLootlogConfigData;
            const members = yield* MemberReadData;
            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [guildId],
            });

            for (let read = 0; read < 2; read++) {
              expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
                "2": { catchingGuildIds: [guildId] },
              });
              expect(
                yield* members.getLootlogConfigSummary(guildId, discordId),
              ).toMatchObject({
                enabledCharacterCount: 1,
                characters: [{ enabledForGuild: true }],
              });
            }

            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [],
            });
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [] },
            });
            expect(
              yield* members.getLootlogConfigSummary(guildId, discordId),
            ).toMatchObject({
              configuredCharacterCount: 0,
              enabledCharacterCount: 0,
              characters: [],
            });
          }).pipe(
            Effect.provide(makeMemberReadDataLayer(cache)),
            Effect.provide(
              UserLootlogConfigData.layerDatabase({
                getOrSetJsonEffect: cache.getOrSetJson,
                invalidateScopes: cache.invalidateScopes,
              }),
            ),
          );
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("removes lost role access and deactivated members from cached readers", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;
          const guildId = randomUUID();
          const discordId = randomUUID();
          const roleId = randomUUID();
          yield* db.insert(guildTable).values({
            id: guildId,
            name: "Role cache",
            ownerId: "someone-else",
            updatedAt: new Date(),
          });

          const [member] = yield* db
            .insert(memberTable)
            .values({
              guildId,
              userId: discordId,
              globalUserId: randomUUID(),
              name: "Member",
              updatedAt: new Date(),
            })
            .returning();

          if (!member) throw new Error("Missing member fixture");
          yield* db.insert(roleTable).values({
            id: roleId,
            guildId,
            name: "Writer",
            permissions: [
              Permission.LOOTLOG_ACCESS,
              Permission.LOOTLOG_LOOTS_WRITE,
            ],
            updatedAt: new Date(),
          });
          yield* db
            .insert(memberToRoleTable)
            .values({ A: member.id, B: roleId });

          return yield* Effect.gen(function* () {
            const settings = yield* UserLootlogConfigData;
            const members = yield* MemberReadData;

            const invalidate = cache.invalidateScopes(
              `member-read:${guildId}`,
              `user-lootlog-config:${discordId}`,
            );

            yield* settings.upsertCharacter(discordId, "1", {
              characterId: "2",
              catchingGuildIds: [guildId],
            });
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [guildId] },
            });
            expect(
              yield* members.getGuildMembersSummary(guildId),
            ).toMatchObject([{ userId: discordId }]);
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toMatchObject([{ userId: discordId }]);
            yield* db
              .delete(memberToRoleTable)
              .where(eq(memberToRoleTable.A, member.id));
            yield* invalidate;
            expect(yield* settings.getAccount(discordId, "1")).toMatchObject({
              "2": { catchingGuildIds: [] },
            });
            expect(yield* members.getGuildMembersSummary(guildId)).toEqual([]);
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toMatchObject([{ userId: discordId, active: true }]);
            yield* db
              .update(memberTable)
              .set({ active: false })
              .where(eq(memberTable.id, member.id));
            yield* invalidate;
            expect(
              yield* members.getGuildMemberReferences(guildId, false),
            ).toEqual([]);
            expect(
              yield* members.getGuildMemberReferences(guildId, true),
            ).toMatchObject([{ userId: discordId, active: false }]);
          }).pipe(
            Effect.provide(makeMemberReadDataLayer(cache)),
            Effect.provide(
              UserLootlogConfigData.layerDatabase({
                getOrSetJsonEffect: cache.getOrSetJson,
                invalidateScopes: cache.invalidateScopes,
              }),
            ),
          );
        }),
      );
    } finally {
      await databaseRuntime.dispose();
    }
  });

  it("refreshes the real loot-list reader after archiving, with Date values on cache hits", async () => {
    const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);

    try {
      await databaseRuntime.runPromise(
        Effect.gen(function* () {
          const db = yield* ApiDatabase;

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
            globalUserId: randomUUID(),
            name: "Owner",
            updatedAt: new Date(),
          });

          const [loot] = yield* db
            .insert(lootTable)
            .values({
              gameVersion: "pl",
              uniqueId: randomUUID(),
              world: "test",
              source: "FIGHT",
              location: "Test",
              updatedAt: new Date(),
            })
            .returning();

          if (!loot) throw new Error("Missing loot fixture");
          yield* db.insert(organizationLootRecordTable).values(
            createOrganizationLootRecordFixture({
              guildId: guild.id,
              lootId: loot.id,
              updatedAt: new Date(),
            }),
          );

          const operations = makeLootsOperations({
            signalDrawAnnouncements: Effect.void,
            persistence: makeLootPersistence(db),
            query: makeLootQueryOperations(makeLootQueryPersistence(db)),
            redis: cache,
          });

          const policy = createAccessPolicy({
            capabilities: [Permission.OWNER],
          });

          const request = () =>
            operations.fetchLootsByGuildId(guild, policy, [], {});

          expect((yield* request()).items.map((entry) => entry.id)).toEqual([
            loot.id,
          ]);
          const hit = yield* request();
          expect(hit.items[0]?.createdAt).toBeInstanceOf(Date);
          expect(hit.items[0]?.updatedAt).toBeInstanceOf(Date);
          expect(yield* cache.scan(`loots:list:${guild.id}:*`)).toEqual([]);
          expect(
            yield* cache.scan(`read-cache:v1:*:loots:list:${guild.id}:*`),
          ).toHaveLength(1);
          yield* operations.archiveLoot({
            guild,
            accessPolicy: policy,
            roles: [],
            discordId: "owner",
            lootId: loot.id,
          });
          expect(yield* request()).toEqual({ items: [], nextCursor: null });
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
          const catalog = makeEventsCatalogRead(db, cache);
          const gaps = makeEventGapReads(db, cache);

          const policy = createAccessPolicy({
            capabilities: [Permission.OWNER],
          });

          const overview = () =>
            catalog.getEvent({ id: guildId }, eventId, [], policy);

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
          yield* makeEventReadCache(cache).invalidateEvent(guildId, eventId);
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

    const boundary = await createDatabaseBoundary();

    const unsafe = boundary.database.$client.unsafe.bind(
      boundary.database.$client,
    );

    const querySpy = spyOn(
      boundary.database.$client,
      "unsafe",
    ).mockImplementation((...args) => {
      queries++;

      return unsafe(...args);
    });

    const service = new LootStatsService(boundary.database, cache);

    try {
      const policy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });

      const request = () =>
        Effect.runPromise(service.getLootStatsEffect(organization, policy, []));

      const responses = await Promise.all(Array.from({ length: 8 }, request));
      expect(queries).toBe(5);
      expect(
        await Effect.runPromise(cache.scan(`loot-stats:${organization}:*`)),
      ).toHaveLength(1);
      expect(
        responses.every(
          (response) =>
            JSON.stringify(response) === JSON.stringify(responses[0]),
        ),
      ).toBe(true);

      await Effect.runPromise(
        cache.invalidateScopes(`loot-stats:${organization}`),
      );
      expect(await request()).toEqual(responses[0]!);
      expect(queries).toBe(5);
    } finally {
      querySpy.mockRestore();
      await boundary.dispose();
    }
  });
});
