import type { Mock } from "vitest";
import { createApp } from "../src/app.js";

describe("discord-bot HTTP contract", () => {
  let discordSyncService: {
    getGuildChannels: Mock;
    refreshGuildChannels: Mock;
    getGuildSyncStatus: Mock;
  };

  beforeEach(() => {
    discordSyncService = {
      getGuildChannels: vi.fn().mockResolvedValue({
        channels: [{ channelId: "channel-1" }],
        syncState: { status: "SYNCED" },
      }),
      refreshGuildChannels: vi.fn().mockResolvedValue({
        channels: [{ channelId: "channel-2" }],
        syncState: { status: "SYNCED" },
      }),
      getGuildSyncStatus: vi.fn().mockResolvedValue({
        guildId: "guild-123",
        status: "SYNCED",
      }),
    };
  });

  it("returns health status", async () => {
    const app = createApp({
      discordSyncService: discordSyncService as never,
    });

    const response = await app.request("/healthz");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("returns guild channels", async () => {
    const app = createApp({
      discordSyncService: discordSyncService as never,
    });

    const response = await app.request("/internal/guilds/guild-123/channels");

    expect(response.status).toBe(200);
    expect(discordSyncService.getGuildChannels).toHaveBeenCalledWith(
      "guild-123",
    );
    expect(await response.json()).toEqual({
      channels: [{ channelId: "channel-1" }],
      syncState: { status: "SYNCED" },
    });
  });

  it("refreshes guild channels", async () => {
    const app = createApp({
      discordSyncService: discordSyncService as never,
    });

    const response = await app.request(
      "/internal/guilds/guild-123/channels/refresh",
      {
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(discordSyncService.refreshGuildChannels).toHaveBeenCalledWith(
      "guild-123",
    );
    expect(await response.json()).toEqual({
      channels: [{ channelId: "channel-2" }],
      syncState: { status: "SYNCED" },
    });
  });

  it("returns guild sync status", async () => {
    const app = createApp({
      discordSyncService: discordSyncService as never,
    });

    const response = await app.request(
      "/internal/guilds/guild-123/sync-status",
    );

    expect(response.status).toBe(200);
    expect(discordSyncService.getGuildSyncStatus).toHaveBeenCalledWith(
      "guild-123",
    );
    expect(await response.json()).toEqual({
      guildId: "guild-123",
      status: "SYNCED",
    });
  });
});
