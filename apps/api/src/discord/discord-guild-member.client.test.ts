import { describe, expect, mock, spyOn, test } from "bun:test";
import { DiscordAPIError, REST } from "@discordjs/rest";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect } from "effect";
import { getTransientMemberSyncStatus } from "#src/members/member-discord-sync-status";
import { makeDiscordGuildMemberClient } from "./discord-guild-member.client.js";
import type { DiscordRestClients } from "./discord-rest-client.factory.js";

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

  const recordInvalidDiscordRequest = mock(() => Effect.void);

  const rest = new REST({ handlerSweepInterval: 0, hashSweepInterval: 0 });
  spyOn(rest, "queueRequest").mockImplementation(queueRequest);

  const restClients: DiscordRestClients = {
    withRestClient: (_userId, _discordId, request) => request(rest),
  };

  const client = makeDiscordGuildMemberClient({
    redis: {
      get: (key) => Effect.sync(() => cache.get(key) ?? null),
      set: (key, value) =>
        Effect.sync(() => {
          cache.set(key, value);
        }),
      del: (key) => Effect.sync(() => Number(cache.delete(key))),
    },
    rateLimiter: {
      checkRateLimitForUser: () => Effect.succeed(false),
      getNextAvailableAtForUser: () => Effect.succeed(null),
      updateRateLimitFromHeaders: () => Effect.void,
      setRateLimitForUser: () => Effect.void,
    },
    diagnostics: { recordInvalidDiscordRequest },
    restClients,
    environment: RuntimeEnvironment.PROD,
  });

  return { client, queueRequest, recordInvalidDiscordRequest };
};

describe("DiscordGuildMemberClient", () => {
  test("asks Discord once while it keeps refusing a member with 403", async () => {
    // Every member read used to re-ask Discord, so one refused member added an
    // invalid request (which Discord bans an IP for) on every page request.
    const { client, queueRequest, recordInvalidDiscordRequest } = makeClient();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const error = await Effect.runPromise(
        Effect.flip(client.getGuildMember(member)),
      );

      expect(getTransientMemberSyncStatus(error)).toBe("DISCORD_HTTP_403");
    }

    expect(queueRequest).toHaveBeenCalledTimes(1);
    expect(recordInvalidDiscordRequest).toHaveBeenCalledTimes(1);

    await Effect.runPromise(client.clearGuildMemberCache(member));
    await Effect.runPromise(Effect.ignore(client.getGuildMember(member)));

    expect(queueRequest).toHaveBeenCalledTimes(2);
  });
});
