import { describe, expect, mock, test } from "bun:test";
import type { Client } from "discord.js";
import {
  makeBotHandler,
  type BotServicesValue,
} from "../src/bot-application.js";

const services = (): BotServicesValue => ({
  client: {} as Client,
  delivery: {} as BotServicesValue["delivery"],
  sync: {
    getGuildChannels: mock(async (guildId: string) => ({
      guildId,
      channels: [],
    })),
    refreshGuildChannels: mock(async (guildId: string) => ({
      guildId,
      channels: [],
    })),
    getGuildSyncStatus: mock(async (guildId: string) => ({
      guildId,
      status: "SYNCED",
    })),
  } as unknown as BotServicesValue["sync"],
});

describe("Discord bot HTTP contract", () => {
  test("serves health", async () => {
    const response = await makeBotHandler(services())(
      new Request("http://localhost/healthz"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  test("preserves internal guild channel route", async () => {
    const response = await makeBotHandler(services())(
      new Request("http://localhost/internal/guilds/guild-1/channels"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ guildId: "guild-1", channels: [] });
  });
});
