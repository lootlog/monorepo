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
import { Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import { Redis } from "effect/unstable/persistence";
import { getFreshCompleteUserGuildsHandoffKey } from "#src/discord/discord-cache.util";
import { RedisService } from "#src/redis/redis.service";
import { LootlogApiRouter } from "../src/runtime/application/http-routes.js";
import { ApiRedis } from "../src/runtime/infrastructure/api-redis.js";
import { ApiRuntimeConfig } from "../src/runtime/infrastructure/api-runtime-config.js";
import { count, sql } from "drizzle-orm";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  itemSnapshotTable,
  notificationTargetTable,
  watchedItemTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  userGameAccountSettingsTable,
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
    const expectedRule = {
      id: rule.id,
      minLevel: 0,
      maxLevel: 500,
      guildIds: [authorizedGuildId],
      ...(labels.name?.trim() ? { name: labels.name.trim() } : {}),
      ...(labels.world?.trim() ? { world: labels.world.trim() } : {}),
    };
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
      database.insert(userGameAccountSettingsTable).values({
        userId: caller.userId,
        accountId,
        settings: { detector: { routingRules: [rule] } },
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

  it("returns watched item snapshots after create, quick-add and retry", async () => {
    await redis.set(
      getFreshCompleteUserGuildsHandoffKey(caller),
      JSON.stringify({
        guilds: [{ id: authorizedGuildId, name: "Authorized Organization" }],
        fresh: true,
        complete: true,
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
    const createdResponse = await request(
      `/guilds/${authorizedGuildId}/timers/manual`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test boss",
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
    const created = JSON.parse(createdBody) as {
      timerKey: string;
      guildId: string;
      world: string;
      npc: { name: string };
    };
    expect(created).toMatchObject({
      guildId: authorizedGuildId,
      world,
      npc: { name: "Test boss" },
    });
    expect(await countTimers()).toBe(1);

    const listedResponse = await request(
      `/guilds/${authorizedGuildId}/timers?world=${world}`,
    );
    expect(listedResponse.status).toBe(200);
    expect(await listedResponse.json()).toEqual([
      expect.objectContaining({ timerKey: created.timerKey }),
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
      suffix: "/chat-messages/message-a",
      method: "PATCH",
      payload: { message: "Updated" },
    },
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
