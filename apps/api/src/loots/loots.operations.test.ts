import { describe, expect, it } from "bun:test";
import { Effect, Exit } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { makeLootsOperations } from "#src/loots/loots.operations";
import {
  LootQueryError,
  type LootQueryOperations,
} from "#src/loots/query/loot-query.operations";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";
import { applicationLogger } from "#src/shared/application-logger";

type Guild = Parameters<LootQueryOperations["fetchLootById"]>[0];

type Role = Parameters<LootQueryOperations["fetchLootById"]>[2][number];

const guild: Guild = {
  id: "organization-one",
  name: "One",
  ownerId: "owner",
  icon: null,
  vanityUrl: null,
  notificationRuleLimit: 20,
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
  documentLimit: 50,
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const role: Role = {
  id: "role",
  guildId: guild.id,
  name: "Readers",
  color: null,
  position: null,
  permissions: [Permission.LOOTLOG_LOOTS_READ],
  lvlRangeFrom: 0,
  lvlRangeTo: 500,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const policy = createAccessPolicy({
  capabilities: [Permission.LOOTLOG_LOOTS_READ],
});

const loot: LootQueryResult = {
  id: 42,
  uniqueId: "loot",
  world: "world",
  source: "FIGHT",
  location: "Map",
  lootShare: {},
  mapPlayersSnapshot: null,
  items: [],
  players: [],
  npcs: [],
  submissions: [],
  commentsCount: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const makeOperations = (fetchLootById: LootQueryOperations["fetchLootById"]) =>
  makeLootsOperations({
    query: {
      fetchLootById,
      fetchLootsByGuildId: () => Effect.die("Unexpected list read"),
      countLootsByGuildId: () => Effect.die("Unexpected count read"),
      resolveLootItemByHid: () => Effect.die("Unexpected item read"),
    },
    persistence: {
      archive: () => Effect.succeed(true),
      listComments: () => Effect.succeed([]),
      createComment: () => Effect.succeed({}),
    },
    stats: { invalidateCache: () => Effect.void },
    redis: {
      deleteByPattern: async () => 0,
      getOrSetJsonEffect: () => Effect.die("Unexpected Redis cache read"),
    },
    logger: applicationLogger,
  });

describe("loot detail concurrent reads", () => {
  it("hydrates once for hundreds of concurrent equivalent visibility scopes and refreshes the next read", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;
    let current: LootQueryResult | null = loot;

    const operations = makeOperations(() =>
      Effect.promise(async () => {
        reads += 1;
        await finish.promise;

        return current;
      }),
    );

    const roles = [role, { ...role, id: "second" }];

    const requests = Array.from({ length: 300 }, (_, index) =>
      Effect.runPromise(
        operations.fetchLootById(
          guild,
          policy,
          index % 2 ? roles : [...roles].reverse(),
          42,
        ),
      ),
    );

    expect(reads).toBe(1);
    finish.resolve();
    expect(await Promise.all(requests)).toEqual(
      Array.from({ length: 300 }, () => loot),
    );
    current = null;
    expect(
      await Effect.runPromise(
        operations.fetchLootById(guild, policy, roles, 42),
      ),
    ).toBeNull();
    expect(reads).toBe(2);
  });

  it("separates organizations, loot IDs, capabilities, level ranges and role permissions", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.promise(async () => {
        reads += 1;
        await finish.promise;

        return null;
      }),
    );

    const inputs: Parameters<typeof operations.fetchLootById>[] = [
      [guild, policy, [role], 42],
      [{ ...guild, id: "organization-two" }, policy, [role], 42],
      [guild, policy, [role], 43],
      [guild, createAccessPolicy({ capabilities: [] }), [role], 42],
      [guild, policy, [{ ...role, lvlRangeTo: 100 }], 42],
      [guild, policy, [{ ...role, lvlRangeFrom: 100 }], 42],
      [guild, policy, [{ ...role, permissions: [] }], 42],
    ];

    const requests = inputs.map((input) =>
      Effect.runPromise(operations.fetchLootById(...input)),
    );

    expect(reads).toBe(inputs.length);
    finish.resolve();
    await Promise.all(requests);
  });

  it("releases failed reads so a later request can recover", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.gen(function* () {
        reads += 1;
        yield* Effect.promise(() => finish.promise);

        if (reads === 1)
          return yield* new LootQueryError({
            operation: "detail",
            cause: "database unavailable",
          });

        return loot;
      }),
    );

    const requests = Array.from({ length: 100 }, () =>
      Effect.runPromise(
        Effect.exit(operations.fetchLootById(guild, policy, [role], 42)),
      ),
    );

    expect(reads).toBe(1);
    finish.resolve();
    expect((await Promise.all(requests)).every(Exit.isFailure)).toBe(true);
    expect(
      await Effect.runPromise(
        operations.fetchLootById(guild, policy, [role], 42),
      ),
    ).toEqual(loot);
    expect(reads).toBe(2);
  });

  it("releases an interrupted owner while healthy waiters retry independently", async () => {
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.suspend(() => {
        reads += 1;

        return reads === 1 ? Effect.never : Effect.succeed(loot);
      }),
    );

    const controller = new AbortController();

    const first = Effect.runPromiseExit(
      operations.fetchLootById(guild, policy, [role], 42),
      { signal: controller.signal },
    );

    const waiter = Effect.runPromiseExit(
      operations.fetchLootById(guild, policy, [role], 42),
    );

    controller.abort();
    expect((await first)._tag).toBe("Failure");
    expect(Exit.isSuccess(await waiter)).toBe(true);
    expect(
      await Effect.runPromise(
        operations.fetchLootById(guild, policy, [role], 42),
      ),
    ).toEqual(loot);
    expect(reads).toBe(3);
  });

  it("does not cancel or evict shared work when a waiting request disconnects", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.promise(async () => {
        reads += 1;
        await finish.promise;

        return loot;
      }),
    );

    const first = Effect.runPromise(
      operations.fetchLootById(guild, policy, [role], 42),
    );

    const controller = new AbortController();

    const waiter = Effect.runPromiseExit(
      operations.fetchLootById(guild, policy, [role], 42),
      { signal: controller.signal },
    );

    controller.abort();
    expect(Exit.isFailure(await waiter)).toBe(true);

    const next = Effect.runPromise(
      operations.fetchLootById(guild, policy, [role], 42),
    );

    expect(reads).toBe(1);
    finish.resolve();
    expect(await first).toEqual(loot);
    expect(await next).toEqual(loot);
  });

  it("keeps mutation visibility checks independent of an in-flight public read", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.suspend(() => {
        reads += 1;

        return reads === 1
          ? Effect.promise(async () => {
              await finish.promise;

              return loot;
            })
          : Effect.succeed(null);
      }),
    );

    const pending = Effect.runPromise(
      operations.fetchLootById(guild, policy, [role], 42),
    );

    await expect(
      Effect.runPromise(
        operations.archiveLoot({
          guild,
          accessPolicy: policy,
          roles: [role],
          discordId: "owner",
          lootId: 42,
        }),
      ),
    ).rejects.toThrow();
    expect(reads).toBe(2);
    finish.resolve();
    await pending;
  });

  it("falls back to independent reads when the pending-key bound is reached", async () => {
    const finish = Promise.withResolvers<void>();
    let reads = 0;

    const operations = makeOperations(() =>
      Effect.promise(async () => {
        reads += 1;
        await finish.promise;

        return loot;
      }),
    );

    const requests = Array.from({ length: 1_024 }, (_, id) =>
      Effect.runPromise(operations.fetchLootById(guild, policy, [role], id)),
    );

    requests.push(
      Effect.runPromise(operations.fetchLootById(guild, policy, [role], 2_000)),
    );
    requests.push(
      Effect.runPromise(operations.fetchLootById(guild, policy, [role], 2_000)),
    );
    expect(reads).toBe(1_026);
    finish.resolve();
    await Promise.all(requests);
    expect(
      await Effect.runPromise(
        operations.fetchLootById(guild, policy, [role], 2_000),
      ),
    ).toEqual(loot);
    expect(reads).toBe(1_027);
  });
});
