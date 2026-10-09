import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { DiscordAPIError, REST, type ResponseLike } from "@discordjs/rest";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { Redis } from "effect/persistence";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { AuthService } from "#src/auth/auth.service";
import { DiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { RedisService } from "#src/redis/redis.service";
import { applicationLogger } from "#src/shared/application-logger";
import { httpClientFromResponses } from "./http-fixtures.js";

// Bun's Response body stream is typed apart from the one REST declares.
const memberResponse = (roles: ReadonlyArray<string>): ResponseLike => {
  const response = Response.json({ user: { id: "discord-1" }, roles });

  return {
    arrayBuffer: () => response.arrayBuffer(),
    body: null,
    bodyUsed: false,
    headers: response.headers,
    json: () => response.json(),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: () => response.text(),
  };
};

const discordUnauthorized = () =>
  new DiscordAPIError(
    { code: 0, message: "401: Unauthorized" },
    0,
    401,
    "GET",
    "/users/@me/guilds/guild-1/member",
    {},
  );

const spyOnDiscordRequests = () => spyOn(REST.prototype, "queueRequest");

describe("Discord guild member reads against Dragonfly", () => {
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let redis: RedisService;
  let queueRequest: ReturnType<typeof spyOnDiscordRequests>;

  beforeAll(async () => {
    queueRequest = spyOnDiscordRequests();
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

  afterEach(() => queueRequest.mockReset());

  afterAll(async () => {
    queueRequest.mockRestore();
    await redisRuntime.dispose();
  });

  // Everything but the auth service's and Discord's HTTP answers is the
  // production wiring.
  const setUp = () => {
    const identity = {
      guildId: "guild-1",
      userId: crypto.randomUUID(),
      discordId: "discord-1",
    };

    const auth = { accessToken: "first-token" };

    const authService = new AuthService(
      applicationLogger,
      redis,
      httpClientFromResponses(() =>
        Effect.sync(() =>
          Response.json({
            accessToken: auth.accessToken,
            expiresIn: 3_600,
            scopes: DISCORD_AUTH_SCOPES,
          }),
        ),
      ),
      new URL("http://auth.test"),
      Redacted.make("idp-test-secret"),
    );

    const client = new DiscordGuildMemberClient(
      applicationLogger,
      redis,
      new DiscordRateLimiterService(applicationLogger, redis),
      new DiscordSyncDiagnosticsService(applicationLogger, redis),
      new DiscordRestClientFactory(authService),
      RuntimeEnvironment.PROD,
    );

    return { auth, client, identity };
  };

  it("returns the roles Discord reports on every read, so a refresh never stores old roles", async () => {
    const { client, identity } = setUp();
    let roles = ["old-role"];
    queueRequest.mockImplementation(async () => memberResponse(roles));

    await expect(client.getGuildMember(identity)).resolves.toMatchObject({
      roles: ["old-role"],
    });

    roles = ["new-role"];

    await expect(client.getGuildMember(identity)).resolves.toMatchObject({
      roles: ["new-role"],
    });
  });

  it("stops calling Discord with a token it rejected and uses the token from a new sign-in at once", async () => {
    const { auth, client, identity } = setUp();
    queueRequest.mockImplementation(() =>
      Promise.reject(discordUnauthorized()),
    );

    await expect(client.getGuildMember(identity)).rejects.toMatchObject({
      message: "DISCORD_UNAUTHORIZED",
    });

    // The auth service still returns the rejected token until the user signs
    // in again, and Discord must not count another invalid request.
    await expect(client.getGuildMember(identity)).rejects.toMatchObject({
      message: "DISCORD_UNAUTHORIZED",
    });
    expect(queueRequest).toHaveBeenCalledTimes(1);

    auth.accessToken = "token-after-sign-in";
    queueRequest.mockImplementation(async () => memberResponse(["member"]));

    await expect(client.getGuildMember(identity)).resolves.toMatchObject({
      roles: ["member"],
    });
  });
});
