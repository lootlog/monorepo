import { describe, expect, it, vi } from "#test/bun-test";
import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeDiscordBotClient } from "./discord-bot-client.js";

describe("DiscordBotClientService", () => {
  it("preserves the internal channel refresh request", async () => {
    const payload = {
      channels: [],
      syncState: {
        guildId: "guild-a",
        status: "SYNCED",
        hasRequiredPermissions: true,
        requiredPermissions: [],
        grantedPermissions: [],
        missingPermissions: [],
        channelCount: 0,
        selectableChannelCount: 0,
        lastAttemptAt: "2026-09-03T00:00:00.000Z",
        lastSuccessAt: "2026-09-03T00:00:00.000Z",
        lastError: null,
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    };
    const post = vi.fn(() =>
      Effect.succeed({
        status: 200,
        headers: {},
        arrayBuffer: Effect.succeed(
          new TextEncoder().encode(JSON.stringify(payload)).buffer,
        ),
      }),
    );

    await expect(
      Effect.runPromise(
        makeDiscordBotClient(
          { post } as unknown as HttpClientValue,
          new URL("http://discord-bot"),
        ).refreshGuildChannels("guild-a"),
      ),
    ).resolves.toEqual(payload);
    expect(post).toHaveBeenCalledWith(
      "http://discord-bot/internal/guilds/guild-a/channels/refresh",
      expect.objectContaining({ body: expect.anything() }),
    );
  });

  it("fails closed on a non-success response", async () => {
    const get = vi.fn(() =>
      Effect.succeed({
        status: 503,
        headers: {},
        arrayBuffer: Effect.succeed(new ArrayBuffer(0)),
      }),
    );

    await expect(
      Effect.runPromise(
        makeDiscordBotClient(
          { get } as unknown as HttpClientValue,
          new URL("http://discord-bot"),
        ).getGuildSyncStatus("guild-a"),
      ),
    ).rejects.toThrow("Discord Bot request failed: 503");
  });
});
