import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";
import { TimerResponse } from "#src/contracts/timers/schemas";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import {
  RabbitMessaging,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import { Permission } from "@lootlog/schema/permissions";
import { BunRedis, BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/http";
import { Redis } from "effect/persistence";
import {
  getCompleteUserGuildsCacheKey,
  getGuildMemberCacheKeys,
} from "#src/discord/discord-cache.util";
import { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import { RedisService } from "#src/redis/redis.service";
import { getPermissionsCacheKey } from "#src/shared/cache";
import { LootlogApiRouter } from "../src/runtime/application/http-routes.js";
import { ApiRedis } from "../src/runtime/infrastructure/api-redis.js";
import { ApiRuntimeConfig } from "../src/runtime/infrastructure/api-runtime-config.js";
import { count, eq, sql } from "drizzle-orm";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  eventTable,
  eventHeroNpcTable,
  eventHeroKillTable,
  eventKillPointTable,
  itemSnapshotTable,
  notificationTargetTable,
  watchedItemTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  userSettingDocumentTable,
} from "../src/database/drizzle/schema.js";

const caller = {
  userId: "user-1",
  discordId: "discord-1",
} as const;

const authorizedGuildId = "guild-authorized";

const forbiddenGuildId = "guild-forbidden";

const world = "Aldous";

const publishedMessages: Parameters<RabbitMessagingService["publish"]>[0][] =
  [];

const rabbitBoundary: RabbitMessagingService = {
  publish: (message) =>
    Effect.sync(() => {
      publishedMessages.push(message);
    }),
  consume: () => Effect.never,
  ack: () => Effect.void,
  nack: () => Effect.void,
};

const RuntimeBoundaries = Layer.mergeAll(
  ApiRuntimeConfig.layer,
  ApiRedis.layer.pipe(Layer.provide(ApiRuntimeConfig.layer)),
  Layer.succeed(RabbitMessaging, RabbitMessaging.of(rabbitBoundary)),
  FetchHttpClient.layer,
);

const boundary = HttpRouter.toWebHandler(
  LootlogApiRouter.pipe(
    Layer.provide(RuntimeBoundaries),
    Layer.provide(BunHttpServer.layerHttpServices),
  ),
  { disableLogger: true },
);

const headers = {
  authorization: "Bearer validated-by-forward-auth",
  "content-type": "application/json",
  "x-auth-user-id": caller.userId,
  "x-auth-discord-id": caller.discordId,
};

const request = (path: string, init?: RequestInit) =>
  boundary.handler(
    new Request(`http://api.test${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    }),
  );

describe("API HTTP boundary", () => {
  const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);
  let database: ApiDatabaseValue;

  const countTimers = async () =>
    (
      await databaseRuntime.runPromise(
        database.select({ value: count() }).from(timerTable),
      )
    )[0]?.value;

  let redis: RedisService;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  beforeAll(async () => {
    database = await databaseRuntime.runPromise(ApiDatabase);
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = new RedisService(
      await redisRuntime.runPromise(Redis.Redis),
      {},
      (effect) => redisRuntime.runPromise(effect),
    );
  });

  beforeEach(async () => {
    publishedMessages.length = 0;
    await redis.flushall();
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.execute(
          sql`TRUNCATE TABLE "Guild" RESTART IDENTITY CASCADE`,
        );
        const updatedAt = new Date();
        yield* database.insert(guildTable).values([
          {
            id: authorizedGuildId,
            name: "Authorized Organization",
            ownerId: "different-owner",
            updatedAt,
          },
          {
            id: forbiddenGuildId,
            name: "Forbidden Organization",
            ownerId: "different-owner",
            updatedAt,
          },
        ]);
        yield* database.insert(roleTable).values({
          id: "timer-maintainer",
          guildId: authorizedGuildId,
          name: "Timer maintainer",
          updatedAt,
          permissions: [
            Permission.ADMIN,
            Permission.LOOTLOG_EVENTS_READ,
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_WRITE,
            Permission.LOOTLOG_MANAGE,
          ],
        });

        const members = yield* database
          .insert(memberTable)
          .values([
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: authorizedGuildId,
              name: "Authorized member",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: forbiddenGuildId,
              name: "Member without timer permissions",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
          ])
          .returning();

        const authorizedMember = members.find(
          (member) => member.guildId === authorizedGuildId,
        );

        if (!authorizedMember)
          throw new Error("Authorized member was not created");
        yield* database
          .insert(memberToRoleTable)
          .values({ A: authorizedMember.id, B: "timer-maintainer" });
      }),
    );
  });

  afterAll(async () => {
    await redisRuntime.dispose();
    await databaseRuntime.dispose();
    await boundary.dispose();
  });

  it("resolves notification senders from member summaries using Discord IDs", async () => {
    const notification = await request("/messaging", {
      method: "POST",
      body: JSON.stringify({
        guildIds: [authorizedGuildId],
        world,
        message: "Hej",
      }),
    });

    expect(notification.status).toBe(201);

    const event = publishedMessages.find(
      ({ routingKey }) => routingKey === "guilds.notifications.send",
    );

    expect(event).toBeDefined();

    if (!event) throw new Error("Notification was not published");

    const payload: unknown = JSON.parse(
      new TextDecoder().decode(event.content),
    );

    expect(payload).toEqual(
      expect.objectContaining({ discordId: caller.discordId }),
    );

    const expectSenderSummary = async () => {
      const response = await request(
        `/guilds/${authorizedGuildId}/members/summary`,
      );

      expect(response.status).toBe(200);
      const members = await response.json();
      expect(members).toEqual([
        expect.objectContaining({
          userId: caller.discordId,
          name: "Authorized member",
        }),
      ]);
    };

    await expectSenderSummary();
    await expectSenderSummary();
  });

  it.each([
    {},
    { name: "", world: "   " },
    { name: "  Heroes  " },
    { world: "  Aldous  " },
  ])("round-trips detector rules with optional labels %j", async (labels) => {
    const path = "/users/@me/game-preferences/accounts/routing-test";

    const rule = {
      id: "rule-1",
      minLevel: 0,
      maxLevel: 500,
      guildIds: [authorizedGuildId],
      ...labels,
    };

    const expectedRule: DetectorRoutingRule = {
      id: rule.id,
      minLevel: 0,
      maxLevel: 500,
      guildIds: [authorizedGuildId],
    };

    if (labels.name?.trim()) expectedRule.name = labels.name.trim();

    if (labels.world?.trim()) expectedRule.world = labels.world.trim();

    const updated = await request(path, {
      method: "PATCH",
      body: JSON.stringify({ detector: { routingRules: [rule] } }),
    });

    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      detector: { routingRules: [expectedRule] },
      hasStoredDetector: true,
    });
    const fetched = await request(path);
    expect(fetched.status).toBe(200);
    expect(await fetched.json()).toMatchObject({
      detector: { routingRules: [expectedRule] },
    });
  });

  it("reads existing unnamed detector rules", async () => {
    const accountId = "stored-routing-test";
    const rule = { id: "existing", minLevel: 10, maxLevel: 100, guildIds: [] };
    await databaseRuntime.runPromise(
      database.insert(userSettingDocumentTable).values({
        userId: caller.userId,
        domain: "gameData",
        scopeType: "GAME_ACCOUNT",
        scopeId: accountId,
        overrides: { detector: { routingRules: [rule] } },
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const fetched = await request(
      `/users/@me/game-preferences/accounts/${accountId}`,
    );

    expect(fetched.status).toBe(200);
    expect(await fetched.json()).toMatchObject({
      detector: { routingRules: [rule] },
      hasStoredDetector: true,
    });
  });

  it.each(["", "/permissions"])(
    "returns 404 for missing Organization metadata %s",
    async (suffix) => {
      const response = await request(`/guilds/missing-organization${suffix}`);
      expect(response.status).toBe(404);
    },
  );

  it("serves the Organization list from a cached Discord guild list without deactivating members", async () => {
    await redis.set(
      getCompleteUserGuildsCacheKey(caller),
      JSON.stringify({
        guilds: [{ id: authorizedGuildId, name: "Authorized Organization" }],
        fetchedAt: Date.now() - 10 * 60_000,
      }),
      60,
    );

    const cached = await request("/users/@me/guilds");

    expect(cached.status).toBe(200);
    expect(await cached.json()).toEqual([
      expect.objectContaining({
        id: authorizedGuildId,
        isAccessDataStale: false,
      }),
    ]);
    expect(
      await databaseRuntime.runPromise(
        database
          .select({ active: memberTable.active })
          .from(memberTable)
          .where(eq(memberTable.guildId, forbiddenGuildId)),
      ),
    ).toEqual([{ active: true }]);

    // Discord is unreachable here, so a refresh that skips the cached list fails.
    const refreshed = await request("/users/@me/guilds/refresh", {
      method: "POST",
    });

    expect(refreshed.status).toBe(500);
  });

  it("returns watched item snapshots after create, quick-add and retry", async () => {
    // Watched items accept only a Discord guild list fetched within seconds.
    const seedDiscordGuilds = () =>
      redis.set(
        getCompleteUserGuildsCacheKey(caller),
        JSON.stringify({
          guilds: [{ id: authorizedGuildId, name: "Authorized Organization" }],
          fetchedAt: Date.now(),
        }),
        60,
      );

    const itemId = 990001;
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.insert(notificationTargetTable).values({
          ownerType: "USER",
          ownerId: caller.discordId,
          provider: "DISCORD",
          targetType: "DM",
          externalId: "watched-item-test-dm",
          updatedAt: new Date(),
        });
        yield* database.insert(itemSnapshotTable).values({
          gameVersion: "pl",
          itemId,
          statsHash: "watched-item-test",
          name: "Watched item",
          icon: "item.png",
          statRaw: "lvl=80",
          statsSnapshot: {},
        });
      }),
    );

    for (const [path, scope, expectedSnapshot] of [
      ["/quick-add", { guildId: authorizedGuildId }, null],
      [
        "",
        { guildIds: [authorizedGuildId] },
        { name: "Watched item", icon: "item.png" },
      ],
      [
        "/quick-add",
        { guildId: authorizedGuildId },
        { name: "Watched item", icon: "item.png" },
      ],
    ] as const) {
      // eslint-disable-next-line no-await-in-loop -- Each mutation depends on the previous persisted state.
      await seedDiscordGuilds();

      // eslint-disable-next-line no-await-in-loop -- Each mutation depends on the previous persisted state.
      const response = await request(
        `/users/@me/notifications/watched-items${path}`,
        {
          method: "POST",
          body: JSON.stringify({
            itemId,
            itemName:
              expectedSnapshot === null ? "No snapshot" : "Watched item",
            world,
            ...scope,
          }),
        },
      );

      expect(response.status).toBe(201);
      // eslint-disable-next-line no-await-in-loop -- Validate each response before retrying the mutation.
      expect(await response.json()).toMatchObject({
        itemId,
        itemSnapshot: expectedSnapshot,
      });
    }

    expect(
      await databaseRuntime.runPromise(
        database.select({ value: count() }).from(watchedItemTable),
      ),
    ).toEqual([{ value: 1 }]);
    const listed = await request("/users/@me/notifications/watched-items");
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject([
      { itemId, itemSnapshot: { name: "Watched item" } },
    ]);
  });

  it("creates, reads and deletes a timer through the real router and database", async () => {
    const actorCharacter = {
      accountId: "123",
      characterId: "456",
      name: "Timer reporter",
      prof: "w",
      icon: "reporter.gif",
      lvl: 80,
    };

    const expectedActor = {
      ...actorCharacter,
      accountId: 123,
      characterId: 456,
      prof: "WARRIOR",
    };

    const createdResponse = await request(
      `/guilds/${authorizedGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test boss",
          actorCharacter,
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    const createdBody = await createdResponse.text();
    expect({ status: createdResponse.status, body: createdBody }).toMatchObject(
      {
        status: 201,
      },
    );

    const created = Schema.decodeUnknownSync(Schema.toEncoded(TimerResponse))(
      JSON.parse(createdBody),
    );

    expect(created).toMatchObject({
      guildId: authorizedGuildId,
      world,
      npc: { name: "Test boss" },
      actorCharacter: expectedActor,
    });
    expect(await countTimers()).toBe(1);

    const listedResponse = await request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(listedResponse.status).toBe(200);
    expect(await listedResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const allTimersResponse = await request(`/timers?world=${world}`);
    expect(await allTimersResponse.json()).toEqual([
      expect.objectContaining({
        timerKey: created.timerKey,
        actorCharacter: expectedActor,
      }),
    ]);

    const deletedResponse = await request(
      `/guilds/${authorizedGuildId}/timers/${encodeURIComponent(created.timerKey)}?world=${world}`,
      { method: "DELETE" },
    );

    expect(deletedResponse.status).toBe(200);
    expect(await countTimers()).toBe(0);

    const afterDeleteResponse = await request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );

    expect(await afterDeleteResponse.json()).toEqual([]);
    expect(await (await request(`/timers?world=${world}`)).json()).toEqual([]);
  });

  it("rejects a cross-Organization mutation and leaves persistence unchanged", async () => {
    const response = await request(
      `/guilds/${forbiddenGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Hidden boss",
          minSeconds: 60,
          maxSeconds: 120,
          world,
        }),
      },
    );

    expect(response.status).toBe(403);
    expect(await countTimers()).toBe(0);
  });

  it("searches timed NPCs by identity across the Organization's worlds", async () => {
    const [member] = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const now = new Date();

    const timer = (guildId: string, timerWorld: string, npcId: number) => ({
      guildId,
      world: timerWorld,
      npcId,
      timerKey: `${npcId}:kic`,
      createdById: member?.id ?? 0,
      npc: { id: npcId, templateId: 77, name: "Kic", lvl: 60, type: "ELITE2" },
      minSpawnTime: now,
      maxSpawnTime: new Date(now.getTime() + 60_000),
      updatedAt: now,
    });

    await databaseRuntime.runPromise(
      database
        .insert(timerTable)
        .values([
          timer(authorizedGuildId, world, 1),
          timer(authorizedGuildId, "Other world", 2),
          timer(forbiddenGuildId, world, 3),
        ]),
    );

    const search = (query: string) =>
      request(`/guilds/${authorizedGuildId}/timers/npcs/search?${query}`);

    const byTemplate = await search("templateIds=77");
    expect(byTemplate.status).toBe(200);
    expect(await byTemplate.json()).toEqual([
      expect.objectContaining({ world, npcId: 1, templateId: 77 }),
      expect.objectContaining({ world: "Other world", npcId: 2 }),
    ]);

    const byRuntimeIds = await search(`npcIds=1&npcIds=2&world=${world}`);
    expect(await byRuntimeIds.json()).toEqual([
      expect.objectContaining({ world, npcId: 1 }),
    ]);

    expect((await search(`world=${world}`)).status).toBe(400);
    expect((await search("npcIds=2147483648")).status).toBe(400);
  });

  it("enforces Organization access for events and notifications", async () => {
    const responses = await Promise.all([
      request(`/guilds/${authorizedGuildId}/events`),
      request(`/guilds/${forbiddenGuildId}/events`),
      request(`/guilds/${authorizedGuildId}/notifications/targets`),
      request(`/guilds/${forbiddenGuildId}/notifications/targets`),
      request("/users/@me/notifications/targets"),
      boundary.handler(
        new Request("http://api.test/users/@me/notifications/targets", {
          headers: { authorization: headers.authorization },
        }),
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      200, 403, 200, 403, 200, 401,
    ]);
  });

  const seedKillHistory = async () => {
    const highKill = "eeeeeeee-1111-4111-8111-111111111111";
    const newestLowKill = "ffffffff-1111-4111-8111-111111111111";
    const oldestLowKill = "aaaaaaaa-1111-4111-8111-111111111111";
    const foreignKill = "dddddddd-1111-4111-8111-111111111111";
    const now = new Date();

    const members = await databaseRuntime.runPromise(
      database
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );

    const memberId = members[0]?.id;

    if (memberId === undefined) throw new Error("Expected authorized member");
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database.insert(eventTable).values([
          {
            id: "history",
            guildId: authorizedGuildId,
            name: "History",
            world,
            updatedAt: now,
          },
          {
            id: "foreign-history",
            guildId: forbiddenGuildId,
            name: "Foreign history",
            world,
            updatedAt: now,
          },
        ]);
        yield* database.insert(eventHeroNpcTable).values([
          {
            id: "low-hero",
            eventId: "history",
            npcName: "Low hero",
            npcLvl: 50,
          },
          {
            id: "high-hero",
            eventId: "history",
            npcName: "High hero",
            npcLvl: 300,
          },
          {
            id: "foreign-hero",
            eventId: "foreign-history",
            npcName: "Foreign hero",
            npcLvl: 50,
          },
        ]);
        yield* database.insert(eventHeroKillTable).values(
          [
            {
              id: highKill,
              heroNpcId: "high-hero",
              killedAt: new Date("2026-09-27T12:00:00Z"),
            },
            {
              id: newestLowKill,
              heroNpcId: "low-hero",
              killedAt: new Date("2026-09-27T11:00:00Z"),
            },
            {
              id: oldestLowKill,
              heroNpcId: "low-hero",
              killedAt: new Date("2026-09-27T10:00:00Z"),
            },
            {
              id: foreignKill,
              heroNpcId: "foreign-hero",
              killedAt: new Date("2026-09-27T13:00:00Z"),
            },
          ].map((kill) => ({
            ...kill,
            minSpawnTimeAtKill: new Date("2026-09-27T09:00:00Z"),
            maxSpawnTimeAtKill: new Date("2026-09-27T14:00:00Z"),
          })),
        );
        yield* database.insert(eventKillPointTable).values(
          [highKill, newestLowKill, oldestLowKill].map((killId) => ({
            id: `point-${killId}`,
            killId,
            memberId,
            basePoints: 1,
            points: 4.25,
            timeOnMapSeconds: 60,
            afkPercentage: 0,
            wasPresent: false,
          })),
        );
      }),
    );

    return { memberId, highKill, newestLowKill, oldestLowKill, foreignKill };
  };

  it("serves scoped kill summaries and compatible legacy pages through the deployed HTTP contracts", async () => {
    const { memberId, highKill, newestLowKill, oldestLowKill, foreignKill } =
      await seedKillHistory();

    const base = `/guilds/${authorizedGuildId}/events/history`;
    const first = await request(`${base}/kill-history?limit=1`);
    expect(first.status).toBe(200);
    const firstPage = await first.json();
    expect(firstPage).toMatchObject({
      kind: "event",
      data: [{ id: highKill, participantCount: 1 }],
    });
    expect(firstPage.data[0]).not.toHaveProperty("points");

    const continuation = await request(
      `${base}/kill-history?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    );

    expect(continuation.status).toBe(200);
    expect(await continuation.json()).toMatchObject({
      data: [{ id: newestLowKill }, { id: oldestLowKill }],
      nextCursor: null,
    });

    const member = await request(
      `${base}/kill-history?memberId=${memberId}&heroId=low-hero`,
    );

    expect(member.status).toBe(200);
    expect(await member.json()).toMatchObject({
      kind: "member",
      member: { id: memberId },
      data: [
        { id: newestLowKill, memberPoint: { points: 4.25 } },
        { id: oldestLowKill },
      ],
    });
    const legacy = await request(`${base}/kills?limit=1`);
    expect(legacy.status).toBe(200);
    expect(await legacy.json()).toMatchObject({
      data: [{ id: highKill, points: [{ wasPresent: false }] }],
      nextCursor: highKill,
    });

    for (const path of [
      "kills",
      "heroes/low-hero/kills",
      `members/${memberId}/kills`,
    ]) {
      expect(
        (await request(`${base}/${path}?cursor=${foreignKill}`)).status,
      ).toBe(400);
    }

    for (const query of [
      "limit=0",
      "limit=101",
      "limit=1.5",
      "cursor=invalid",
      `cursor=${encodeURIComponent(firstPage.nextCursor)}&heroId=low-hero`,
    ]) {
      expect((await request(`${base}/kill-history?${query}`)).status).toBe(400);
    }

    expect(
      (await request(`${base}/heroes/low-hero/kills/${foreignKill}`)).status,
    ).toBe(404);
    expect(
      (await request(`${base}/heroes/low-hero/kills/${foreignKill}/timeline`))
        .status,
    ).toBe(404);
  });

  it("rechecks history access after cache warmup, level changes and permission loss", async () => {
    const { highKill, newestLowKill, oldestLowKill } = await seedKillHistory();
    const base = `/guilds/${authorizedGuildId}/events/history`;
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      data: [{ id: highKill }, { id: newestLowKill }, { id: oldestLowKill }],
    });

    const setAccess = async (permissions: Permission[], maximum: number) => {
      await databaseRuntime.runPromise(
        database
          .update(roleTable)
          .set({ permissions, lvlRangeFrom: 1, lvlRangeTo: maximum })
          .where(eq(roleTable.id, "timer-maintainer")),
      );
      await redis.del(getPermissionsCacheKey(caller.userId, authorizedGuildId));
    };

    await setAccess([Permission.LOOTLOG_EVENTS_READ], 100);
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      data: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (await request(`${base}/kill-history?heroId=high-hero`)).status,
    ).toBe(404);
    expect((await request(`${base}/kills?cursor=${highKill}`)).status).toBe(
      400,
    );
    expect(
      (await request(`${base}/heroes/high-hero/kills/${highKill}`)).status,
    ).toBe(404);
    expect(
      (await request(`${base}/heroes/high-hero/kills/${highKill}/timeline`))
        .status,
    ).toBe(404);
    await setAccess([Permission.LOOTLOG_EVENTS_READ], 20);
    expect(await (await request(`${base}/kill-history`)).json()).toMatchObject({
      data: [],
      nextCursor: null,
    });
    await setAccess([], 100);
    expect((await request(`${base}/kill-history`)).status).toBe(403);
  });

  it("keeps read-only API key kill history inside its Organization scope", async () => {
    const { newestLowKill, oldestLowKill } = await seedKillHistory();
    const keyGuildId = "123456789012345678";
    const otherKeyGuildId = "987654321098765432";
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* database
          .update(guildTable)
          .set({ id: keyGuildId })
          .where(eq(guildTable.id, authorizedGuildId));
        yield* database
          .update(guildTable)
          .set({ id: otherKeyGuildId })
          .where(eq(guildTable.id, forbiddenGuildId));
      }),
    );

    const apiKeyHeaders = (organizationIds: string[]) => ({
      "x-auth-api-key-access": JSON.stringify({
        keyId: "history-key",
        organizationIds,
        mode: "read",
        personalData: false,
        expiresAt: null,
      }),
    });

    const allowed = await request(
      `/guilds/${keyGuildId}/events/history/kill-history?heroId=low-hero`,
      { headers: apiKeyHeaders([keyGuildId]) },
    );

    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({
      data: [{ id: newestLowKill }, { id: oldestLowKill }],
    });
    expect(
      (
        await request(`/guilds/${keyGuildId}/events/history/kill-history`, {
          headers: apiKeyHeaders([otherKeyGuildId]),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          `/guilds/${keyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/guilds/${otherKeyGuildId}/events/foreign-history/kill-history`,
          { headers: apiKeyHeaders([keyGuildId]) },
        )
      ).status,
    ).toBe(403);
  });

  it("resolves canonical and current alias loot routes while rejecting a stale alias", async () => {
    const initialAlias = await request(`/guilds/${authorizedGuildId}/config`, {
      method: "PATCH",
      body: JSON.stringify({ vanityUrl: "previous-loot-alias" }),
    });

    expect(initialAlias.status).toBe(200);
    expect((await request("/guilds/previous-loot-alias/loots")).status).toBe(
      200,
    );

    const renamed = await request(`/guilds/${authorizedGuildId}/config`, {
      method: "PATCH",
      body: JSON.stringify({ vanityUrl: "current-loot-alias" }),
    });

    expect(renamed.status).toBe(200);

    for (const guildId of [authorizedGuildId, "current-loot-alias"]) {
      const list = await request(`/guilds/${guildId}/loots`);
      expect(list.status).toBe(200);
      expect(await list.json()).toEqual([]);

      const missingLoot = await request(`/guilds/${guildId}/loots/42`);
      expect(missingLoot.status).toBe(404);
    }

    const staleAlias = await request("/guilds/previous-loot-alias/loots");
    expect(staleAlias.status).toBe(404);
  });

  it("resolves an Organization id to that Organization even when another Organization's vanity URL equals it", async () => {
    // Bypasses validation: rows stored before it existed could collide.
    await databaseRuntime.runPromise(
      database
        .update(guildTable)
        .set({ vanityUrl: authorizedGuildId })
        .where(eq(guildTable.id, forbiddenGuildId)),
    );

    // Resolving the colliding Organization first used to cache its row under
    // the other Organization's id.
    const forbidden = await request(`/guilds/${forbiddenGuildId}`);
    expect(forbidden.status).toBe(403);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const authorized = await request(`/guilds/${authorizedGuildId}`);
      expect(authorized.status).toBe(200);
      expect(await authorized.json()).toMatchObject({
        id: authorizedGuildId,
        name: "Authorized Organization",
      });
      expect((await request(`/guilds/${authorizedGuildId}/loots`)).status).toBe(
        200,
      );
    }
  });

  it("refuses to store a vanity URL that could be an Organization id", async () => {
    const stored = await databaseRuntime.runPromise(
      database
        .update(guildTable)
        .set({ vanityUrl: "123456789012345678" })
        .where(eq(guildTable.id, forbiddenGuildId))
        .pipe(
          Effect.as("stored"),
          Effect.catch(() => Effect.succeed("rejected")),
        ),
    );

    expect(stored).toBe("rejected");
  });

  it.each([
    ["123456789012345678", "errors.guilds.vanityUrlInvalid"],
    ["---", "errors.guilds.vanityUrlInvalid"],
    ["Battles!", "errors.guilds.vanityUrlRestricted"],
  ])(
    "rejects the vanity URL %p with %p without storing it",
    async (vanityUrl, message) => {
      const response = await request(`/guilds/${authorizedGuildId}/config`, {
        method: "PATCH",
        body: JSON.stringify({ vanityUrl }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ message });

      const [guild] = await databaseRuntime.runPromise(
        database
          .select({ vanityUrl: guildTable.vanityUrl })
          .from(guildTable)
          .where(eq(guildTable.id, authorizedGuildId)),
      );

      expect(guild?.vanityUrl).toBeNull();
    },
  );

  it("preserves expected 4xx statuses at the HTTP boundary", async () => {
    const missingTemplate = await request(
      `/guilds/${authorizedGuildId}/map-templates/missing-template`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: "Missing route",
          maps: [{ id: 1, name: "Ithan" }],
        }),
      },
    );

    const forbiddenHistory = await request(
      `/guilds/${forbiddenGuildId}/timers/missing-timer/history?world=${world}`,
    );

    expect(missingTemplate.status).toBe(404);
    expect(forbiddenHistory.status).toBe(403);
  });

  it("asks the caller to sign in again when Discord rejects their member refresh", async () => {
    await databaseRuntime.runPromise(
      database
        .update(memberTable)
        .set({ lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .where(eq(memberTable.guildId, authorizedGuildId)),
    );
    await redis.set(
      getGuildMemberCacheKeys({ guildId: authorizedGuildId, ...caller })
        .unauthorized,
      "1",
      60,
    );

    // Each route declares different own errors (empty 404, none, open 403);
    // none of them may claim the failure. Sequential: a concurrent refresh
    // would wait on the per-user lock.
    for (const path of [
      "/members/@me",
      "/events",
      `/timers/missing-timer/history?world=${world}`,
    ]) {
      const response = await request(`/guilds/${authorizedGuildId}${path}`);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(
        Schema.encodeSync(ReauthenticationRequired)(
          new ReauthenticationRequired({
            code: "DISCORD_UNAUTHORIZED",
            requiresReauth: true,
          }),
        ),
      );
    }
  });

  it("keeps an admin signed in when another member's Discord authorization fails", async () => {
    const other = { userId: "user-2", discordId: "discord-2" };

    await databaseRuntime.runPromise(
      database.insert(memberTable).values({
        userId: other.discordId,
        globalUserId: other.userId,
        guildId: authorizedGuildId,
        name: "Member with expired Discord authorization",
        lastDiscordSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }),
    );
    await redis.set(
      getGuildMemberCacheKeys({ guildId: authorizedGuildId, ...other })
        .unauthorized,
      "1",
      60,
    );

    const response = await request(
      `/guilds/${authorizedGuildId}/members/${other.discordId}/refresh`,
      { method: "POST" },
    );

    expect(response.status).not.toBe(401);
    expect(response.status).toBeLessThan(500);
  });

  it.each([
    { path: "/map-templates", field: "name" },
    { path: "/events", field: "name" },
  ])(
    "rejects an invalid POST $path payload as a validation error regardless of declared errors",
    async ({ path, field }) => {
      const response = await request(`/guilds/${authorizedGuildId}${path}`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "VALIDATION_ERROR",
        message: expect.stringContaining(field),
        issues: expect.arrayContaining([
          expect.objectContaining({ path: [field] }),
        ]),
      });
    },
  );

  it.each([
    { suffix: "/members", method: "GET" },
    { suffix: "/members/references", method: "GET" },
    { suffix: "/members/summary", method: "GET" },
    { suffix: "/members/refresh-all", method: "POST" },
    { suffix: "/members/member-a/refresh", method: "POST" },
    { suffix: "/members/member-a/deactivate", method: "PATCH" },
    { suffix: "/members/member-a/lootlog-config-summary", method: "GET" },
    { suffix: "/members/refresh-jobs/latest", method: "GET" },
    { suffix: "/members/refresh-jobs/1", method: "GET" },
    { suffix: "/chat-messages", method: "GET" },
    { suffix: "/chat-messages", method: "DELETE" },
    { suffix: "/chat-messages/message-a", method: "DELETE" },
    {
      suffix: "/chat-messages",
      method: "POST",
      payload: {
        message: "Hello",
        type: "NORMAL",
        characterData: {
          nick: "Hero",
          id: 1,
          acc: 2,
          lvl: 300,
          prof: "w",
          icon: "hero.gif",
        },
      },
    },
  ])(
    "preserves Organization authorization status for $method $suffix",
    async ({ suffix, method, payload }) => {
      const init = {
        method,
        body: payload ? JSON.stringify(payload) : undefined,
      };

      const missing = await request(
        `/guilds/missing-organization${suffix}`,
        init,
      );

      const forbidden = await request(
        `/guilds/${forbiddenGuildId}${suffix}`,
        init,
      );

      expect(missing.status).toBe(404);
      expect(await missing.text()).toBe("");
      expect(forbidden.status).toBe(403);
      expect(await forbidden.text()).toBe("");
    },
  );
});
