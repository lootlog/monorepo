import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { Effect } from "effect";
import { DiscordRestClientFactory } from "./discord-rest-client.factory.js";

const authService = (accessToken: string) => ({
  getIdpToken: () =>
    Effect.succeed({
      accessToken,
      expiresIn: 3_600,
      scopes: [...DISCORD_AUTH_SCOPES],
    }),
  rejectIdpToken: () => Effect.void,
});

describe("DiscordRestClientFactory", () => {
  const setInterval = spyOn(globalThis, "setInterval");

  afterEach(() => {
    setInterval.mockClear();
  });

  test("creates per-user REST clients without process-lifetime sweeper timers", async () => {
    // Each REST constructor would otherwise register two unreferenced
    // intervals that keep the instance and its bearer token reachable forever.
    const factory = new DiscordRestClientFactory(authService("token-1"));

    const client = (userId: string, discordId: string) =>
      factory.withRestClient(userId, discordId, async (rest) => rest);

    const first = await client("user-1", "discord-1");
    const second = await client("user-1", "discord-1");
    const other = await client("user-2", "discord-2");

    expect(second).toBe(first);
    expect(other).not.toBe(first);
    expect(setInterval).not.toHaveBeenCalled();
  });
});
