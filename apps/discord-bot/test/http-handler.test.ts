import { describe, expect, mock, test } from "bun:test";
import type { Client } from "discord.js";
import { Effect } from "effect";
import {
  makeBotHttpBoundary,
  type BotServicesValue,
} from "../src/bot-application.js";

const syncState = (guildId: string) => ({
  guildId,
  status: "SYNCED" as const,
  hasRequiredPermissions: true,
  requiredPermissions: [],
  grantedPermissions: [],
  missingPermissions: [],
  channelCount: 0,
  selectableChannelCount: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  updatedAt: "2026-09-03T00:00:00.000Z",
});

const services = (): BotServicesValue => ({
  client: {} as Client,
  delivery: {} as BotServicesValue["delivery"],
  sync: {
    getGuildChannels: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        channels: [],
        syncState: syncState(guildId),
      }),
    ),
    refreshGuildChannels: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        channels: [],
        syncState: syncState(guildId),
      }),
    ),
    getGuildSyncStatus: mock((guildId: string) =>
      Effect.succeed(syncState(guildId)),
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
    expect(await response.json()).toEqual({
      guildId: "guild-1",
      channels: [],
      syncState: syncState("guild-1"),
    });
  });
});
