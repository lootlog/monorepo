import { describe, expect, mock, spyOn, test } from "bun:test";
import { DiscordAPIError, REST } from "@discordjs/rest";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { getTransientMemberSyncStatus } from "#src/members/member-discord-sync-status";
import { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger } from "#src/shared/application-logger";
import { DiscordGuildMemberClient } from "./discord-guild-member.client.js";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service.js";
import { DiscordRestClientFactory } from "./discord-rest-client.factory.js";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service.js";

const member = { guildId: "guild-1", userId: "user-1", discordId: "discord-1" };

const makeClient = () => {
  const cache = new Map<string, string>();

  const queueRequest = mock(() =>
    Promise.reject(
      new DiscordAPIError(
        { code: 50001, message: "Missing Access" },
        50001,
        403,
        "GET",
        "/users/@me/guilds/guild-1/member",
        {},
      ),
    ),
  );

  const recordInvalidDiscordRequest = mock(() => Promise.resolve());

  const rest = new REST({ handlerSweepInterval: 0, hashSweepInterval: 0 });
  spyOn(rest, "queueRequest").mockImplementation(queueRequest);

  const logger: ApplicationLogger = {
    log: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  };

  const redis: RedisService = Object.assign(
    Object.create(RedisService.prototype),
    {
      get: (key: string) => Promise.resolve(cache.get(key) ?? null),
      set: async (key: string, value: string) => {
        cache.set(key, value);
      },
      del: async (key: string) => {
        cache.delete(key);
      },
    },
  );

  const rateLimiter: DiscordRateLimiterService = Object.assign(
    Object.create(DiscordRateLimiterService.prototype),
    { checkRateLimitForUser: () => Promise.resolve(false) },
  );

  const diagnostics: DiscordSyncDiagnosticsService = Object.assign(
    Object.create(DiscordSyncDiagnosticsService.prototype),
    { recordInvalidDiscordRequest },
  );

  const restClients: DiscordRestClientFactory = Object.assign(
    Object.create(DiscordRestClientFactory.prototype),
    {
      withRestClient: <A>(
        _userId: string,
        _discordId: string,
        request: (client: REST) => Promise<A>,
      ) => request(rest),
    },
  );

  const client = new DiscordGuildMemberClient(
    logger,
    redis,
    rateLimiter,
    diagnostics,
    restClients,
    RuntimeEnvironment.PROD,
  );

  return { client, queueRequest, recordInvalidDiscordRequest };
};

describe("DiscordGuildMemberClient", () => {
  test("asks Discord once while it keeps refusing a member with 403", async () => {
    // Every member read used to re-ask Discord, so one refused member added an
    // invalid request (which Discord bans an IP for) on every page request.
    const { client, queueRequest, recordInvalidDiscordRequest } = makeClient();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const error = await client.getGuildMember(member).catch((cause) => cause);

      expect(getTransientMemberSyncStatus(error)).toBe("DISCORD_HTTP_403");
    }

    expect(queueRequest).toHaveBeenCalledTimes(1);
    expect(recordInvalidDiscordRequest).toHaveBeenCalledTimes(1);

    await client.clearGuildMemberCache(member);
    await client.getGuildMember(member).catch(() => undefined);

    expect(queueRequest).toHaveBeenCalledTimes(2);
  });
});
