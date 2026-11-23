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
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { makeAuthService } from "#src/auth/auth.service";
import { makeDiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { makeDiscordRateLimiter } from "#src/discord/discord-rate-limiter.service";
import { makeDiscordRestClients } from "#src/discord/discord-rest-client.factory";
import { makeDiscordSyncDiagnostics } from "#src/discord/discord-sync-diagnostics.service";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";

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
    redis = makeRedisService(await redisRuntime.runPromise(Redis.Redis));
  });

  afterEach(() => queueRequest.mockReset());

  afterAll(async () => {
    queueRequest.mockRestore();
    await redisRuntime.dispose();
  });

  const setUp = () => {
    const identity = {
      guildId: "guild-1",
      userId: crypto.randomUUID(),
      discordId: "discord-1",
    };

    const auth = { accessToken: "first-token" };

    const authService = makeAuthService({
      redis,
      authRpc: {
        getIdpToken: () =>
          Effect.sync(() => ({
            accessToken: auth.accessToken,
            expiresIn: 3_600,
            scopes: DISCORD_AUTH_SCOPES,
          })),
      },
    });

    const members = makeDiscordGuildMemberClient({
      redis,
      rateLimiter: makeDiscordRateLimiter(redis),
      diagnostics: makeDiscordSyncDiagnostics(redis),
      restClients: makeDiscordRestClients(authService),
      environment: RuntimeEnvironment.PROD,
    });

    const client = {
      getGuildMember: (options: typeof identity) =>
        Effect.runPromise(members.getGuildMember(options)),
    };

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
