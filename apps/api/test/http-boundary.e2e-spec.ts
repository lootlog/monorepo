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
import { BunRedis } from "@effect/platform-bun";
import { Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import { Redis } from "effect/unstable/persistence";
import { RedisService } from "#src/redis/redis.service";
import { LootlogApiRouter } from "../src/http-api/runtime/application/http-routes.js";
import { ApiRedis } from "../src/http-api/runtime/infrastructure/api-redis.js";
import { ApiRuntimeConfig } from "../src/http-api/runtime/infrastructure/api-runtime-config.js";
import { TestDatabase } from "./test-database.js";

const caller = {
  userId: "user-1",
  discordId: "discord-1",
} as const;
const authorizedGuildId = "guild-authorized";
const forbiddenGuildId = "guild-forbidden";
const world = "Aldous";

const rabbitBoundary: RabbitMessagingService = {
  publish: () => Effect.void,
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
  LootlogApiRouter.pipe(Layer.provide(RuntimeBoundaries)),
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
  let database: TestDatabase;
  let redis: RedisService;
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;

  beforeAll(async () => {
    database = await new TestDatabase().initialize();
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
    await redis.flushall();
    await database.truncate("Guild");

    const updatedAt = new Date();
    await database.guild.create({
      data: {
        id: authorizedGuildId,
        name: "Authorized Organization",
        ownerId: "different-owner",
        updatedAt,
      },
    });
    await database.guild.create({
      data: {
        id: forbiddenGuildId,
        name: "Forbidden Organization",
        ownerId: "different-owner",
        updatedAt,
      },
    });
    await database.role.create({
      data: {
        id: "timer-maintainer",
        guildId: authorizedGuildId,
        name: "Timer maintainer",
        permissions: [
          Permission.ADMIN,
          Permission.LOOTLOG_EVENTS_READ,
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_TIMERS_WRITE,
          Permission.LOOTLOG_MANAGE,
        ],
        updatedAt,
      },
    });
    await database.member.create({
      data: {
        userId: caller.discordId,
        globalUserId: caller.userId,
        guildId: authorizedGuildId,
        name: "Authorized member",
        lastDiscordSyncAt: updatedAt,
        updatedAt,
        roles: { connect: { id: "timer-maintainer" } },
      },
    });
    await database.member.create({
      data: {
        userId: caller.discordId,
        globalUserId: caller.userId,
        guildId: forbiddenGuildId,
        name: "Member without timer permissions",
        lastDiscordSyncAt: updatedAt,
        updatedAt,
      },
    });
  });

  afterAll(async () => {
    await redisRuntime.dispose();
    await database.dispose();
    await boundary.dispose();
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
    expect(await database.timer.count()).toBe(1);

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
    expect(await database.timer.count()).toBe(0);

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
    expect(await database.timer.count()).toBe(0);
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
});
