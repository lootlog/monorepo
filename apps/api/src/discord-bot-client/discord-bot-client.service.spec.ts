import { DiscordGuildSyncStatus } from "@lootlog/schema/notifications";
import { describe, expect, it, vi } from "bun:test";
import { Effect } from "effect";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { makeDiscordBotClient } from "./discord-bot-client.js";

describe("DiscordBotClientService", () => {
  it("preserves the internal channel refresh request", async () => {
    const payload = {
      channels: [],
      syncState: {
        guildId: "guild-a",
        status: DiscordGuildSyncStatus.SYNCED,
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
    const post = vi.fn(() => Effect.succeed(Response.json(payload)));

    await expect(
      Effect.runPromise(
        makeDiscordBotClient(
          httpClientFromResponses(post),
          new URL("http://discord-bot"),
        ).refreshGuildChannels("guild-a"),
      ),
    ).resolves.toEqual(payload);
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://discord-bot/internal/guilds/guild-a/channels/refresh",
        method: "POST",
        body: expect.anything(),
      }),
    );
  });

  it("fails closed on a non-success response", async () => {
    const get = vi.fn(() =>
      Effect.succeed(new Response(null, { status: 503 })),
    );

    await expect(
      Effect.runPromise(
        makeDiscordBotClient(
          httpClientFromResponses(get),
          new URL("http://discord-bot"),
        ).getGuildSyncStatus("guild-a"),
      ),
    ).rejects.toThrow("Discord Bot request failed: 503");
  });
});
