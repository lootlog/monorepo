import { describe, expect, mock, test } from "bun:test";
import type { Client } from "discord.js";
import { Effect } from "effect";
import {
  makeBotHttpBoundary,
  type BotServicesValue,
} from "../src/bot-application.js";

const services = (): BotServicesValue => ({
  client: {} as Client,
  delivery: {} as BotServicesValue["delivery"],
  sync: {
    getGuildChannels: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        channels: [],
      }),
    ),
    refreshGuildChannels: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        channels: [],
      }),
    ),
    getGuildSyncStatus: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        status: "SYNCED",
      }),
    ),
  } as unknown as BotServicesValue["sync"],
});

describe("Discord bot HTTP contract", () => {
  test("serves health", async () => {
    const boundary = makeBotHttpBoundary(services());
    const response = await boundary.handler(
      new Request("http://localhost/healthz"),
    );
    await boundary.dispose();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  test("preserves internal guild channel route", async () => {
    const boundary = makeBotHttpBoundary(services());
    const response = await boundary.handler(
      new Request("http://localhost/internal/guilds/guild-1/channels"),
    );
    await boundary.dispose();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ guildId: "guild-1", channels: [] });
  });
});
