import { describe, expect, it, vi } from "#test/bun-test";
import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeDiscordBotClient } from "./discord-bot-client.js";

vi.mock("#src/config/api.config", () => ({
  apiConfig: { discordBotServiceUrl: new URL("http://discord-bot") },
}));

describe("DiscordBotClientService", () => {
  it("preserves the internal channel refresh request", async () => {
    const payload = { channels: [], syncState: { status: "READY" } };
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
        makeDiscordBotClient({
          post,
        } as unknown as HttpClientValue).refreshGuildChannels("guild-a"),
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
        makeDiscordBotClient({
          get,
        } as unknown as HttpClientValue).getGuildSyncStatus("guild-a"),
      ),
    ).rejects.toThrow("Discord Bot request failed: 503");
  });
});
