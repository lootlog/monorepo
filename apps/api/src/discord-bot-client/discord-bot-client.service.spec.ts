import { afterEach, describe, expect, it, vi } from "#test/bun-test";
import { DiscordBotClientService } from "./discord-bot-client.service.js";

vi.mock("#src/config/discord-bot.config", () => ({
  discordBotConfig: { serviceUrl: "http://discord-bot" },
}));

describe("DiscordBotClientService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves the internal channel refresh request", async () => {
    const payload = { channels: [], syncState: { status: "READY" } };
    const fetchMock = vi.fn(async () => Response.json(payload));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new DiscordBotClientService().refreshGuildChannels("guild-a"),
    ).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://discord-bot/internal/guilds/guild-a/channels/refresh",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
  });

  it("fails closed on a non-success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    await expect(
      new DiscordBotClientService().getGuildSyncStatus("guild-a"),
    ).rejects.toThrow("Discord Bot request failed: 503");
  });
});
