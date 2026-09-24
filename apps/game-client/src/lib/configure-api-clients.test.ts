import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@lootlog/client/transport";
import { createPageTransport } from "@/extension/page-transport";
import {
  decodeMessage,
  ExtensionRequestSchema,
  type ExtensionRequest,
} from "@/extension/protocol";
import {
  configureGameApiClients,
  GAME_API_REQUEST_TIMEOUT_MS,
} from "./configure-api-clients";
import { configureGameClientPlatform } from "./game-client-platform";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("game API request deadlines", () => {
  it("aborts stalled native HTTP used by the userscript and in-game addon", async () => {
    vi.useFakeTimers();

    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise(() => {}));

    const restore = configureGameApiClients();

    try {
      const request = createApiClient("main")
        .post("/timers/auto", {})
        .catch((error: Error) => error);

      await vi.advanceTimersByTimeAsync(GAME_API_REQUEST_TIMEOUT_MS);
      expect(await request).toMatchObject({
        cause: expect.objectContaining({ name: "TimeoutError" }),
      });
      expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    } finally {
      restore();
    }
  });

  it("cancels stalled extension HTTP through the page bridge at the same deadline", async () => {
    vi.useFakeTimers();
    const channel = new MessageChannel();
    const messages: ExtensionRequest[] = [];
    channel.port2.onmessage = (event: MessageEvent<unknown>) => {
      messages.push(ExtensionRequestSchema.parse(decodeMessage(event.data)));
    };

    channel.port2.start();
    const platform = createPageTransport(channel.port1, () => {});
    const restorePlatform = configureGameClientPlatform(platform);
    const restoreClients = configureGameApiClients();

    try {
      const request = createApiClient("main")
        .post("/timers/auto", {})
        .catch((error: Error) => error);

      await vi.waitFor(() => expect(messages).toHaveLength(1));
      await vi.advanceTimersByTimeAsync(GAME_API_REQUEST_TIMEOUT_MS);
      expect(await request).toMatchObject({
        cause: expect.objectContaining({ name: "TimeoutError" }),
      });
      await vi.waitFor(() => expect(messages).toHaveLength(2));
      expect(messages[0]).toMatchObject({
        type: "http",
        request: { method: "POST" },
      });
      expect(messages[1]).toEqual({ type: "cancel", id: messages[0]?.id });
    } finally {
      restoreClients();
      restorePlatform();
      platform.dispose();
      channel.port2.close();
    }
  });
});
