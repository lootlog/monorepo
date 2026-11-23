import { RpcUnavailableError } from "@lootlog/rpc/errors";
import { describe, expect, it, vi } from "bun:test";
import { Effect } from "effect";
import { makeDiscordBotClient } from "./discord-bot-client.js";

describe("DiscordBotClientService", () => {
  it("refreshes guild channels via RPC", async () => {
    const payload = {
      channels: [],
      syncState: {
        guildId: "guild-a",
        status: "SYNCED" as const,
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

    const refreshGuildChannels = vi.fn(() => Effect.succeed(payload));

    await expect(
      Effect.runPromise(
        makeDiscordBotClient({ refreshGuildChannels }).refreshGuildChannels(
          "guild-a",
        ),
      ),
    ).resolves.toEqual(payload);
    expect(refreshGuildChannels).toHaveBeenCalledWith({ guildId: "guild-a" });
  });

  it("fails closed on an unavailable RPC response", async () => {
    const refreshGuildChannels = vi.fn(() =>
      Effect.fail(
        new RpcUnavailableError({ message: "Discord synchronization failed" }),
      ),
    );

    await expect(
      Effect.runPromise(
        makeDiscordBotClient({ refreshGuildChannels }).refreshGuildChannels(
          "guild-a",
        ),
      ),
    ).rejects.toThrow("Discord synchronization failed");
  });
});
