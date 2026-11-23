import { makeRpcClient } from "@lootlog/rpc/client";
import { DiscordBotRpcGroup } from "@lootlog/rpc/discord-bot";
import { makeRpcTestHttpClient } from "@lootlog/rpc/testing";
import { describe, expect, mock, test } from "bun:test";
import { Client } from "discord.js";
import { Effect, Layer } from "effect";
import {
  BotRpcHandlers,
  BotServices,
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
  client: new Client({ intents: [] }),
  delivery: {
    sendNotification: () =>
      Effect.die(new Error("Unexpected notification send in HTTP test")),
  },
  sync: {
    handleClientReady: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildCreate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildUpdate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildDelete: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildRoleCreate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildRoleUpdate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleGuildRoleDelete: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleChannelCreate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleChannelUpdate: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    handleChannelDelete: () =>
      Effect.die(new Error("Unexpected Discord event in HTTP test")),
    refreshGuildChannels: mock((guildId: string) =>
      Effect.succeed({
        guildId,
        channels: [],
        syncState: syncState(guildId),
      }),
    ),
  },
});

describe("Discord bot HTTP & RPC contracts", () => {
  test("serves health over HTTP", async () => {
    const boundary = makeBotHttpBoundary(services());

    const response = await boundary.handler(
      new Request("http://localhost/healthz"),
    );

    await boundary.dispose();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  test("serves guild channel refresh over RPC", async () => {
    const handlers = BotRpcHandlers.pipe(
      Layer.provide(Layer.succeed(BotServices, services())),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* makeRpcClient(DiscordBotRpcGroup, {
          url: "http://discord-bot.internal:4001",
        });

        return yield* client.refreshGuildChannels({ guildId: "guild-1" });
      }).pipe(
        Effect.scoped,
        Effect.provide(makeRpcTestHttpClient(DiscordBotRpcGroup, handlers)),
      ),
    );

    expect(result).toEqual({
      guildId: "guild-1",
      channels: [],
      syncState: syncState("guild-1"),
    });
  });
});
