import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { useLootStore } from "@/store/game-store/loot.store";
import { useLogsStore } from "@/store/logs.store";
import { ChatEventProcessor } from "./chat-event-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";

const fetchImplementation = vi.fn<typeof globalThis.fetch>();

const createChatEvent = (message: string): GameEvent => ({
  chat: {
    channels: {
      system: {
        archivedIds: [],
        msg: [{ id: 1, ts: Date.now(), msg: message }],
      },
    },
  },
});

describe("ChatEventProcessor", () => {
  let processor: ChatEventProcessor;
  let restoreApi: () => void;

  beforeEach(() => {
    fetchImplementation.mockReset();
    fetchImplementation.mockResolvedValue(new Response(null, { status: 204 }));
    restoreApi = configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch: fetchImplementation },
    });
    processor = new ChatEventProcessor();
    useLootStore.setState({ lastLootId: null });
    useLogsStore.setState({ actions: [] });
  });

  afterEach(() => {
    restoreApi();
    vi.restoreAllMocks();
  });

  it("ignores events without loot distribution message", () => {
    processor.handle({});
    processor.handle(createChatEvent("Brak podzialu"));
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("does not update loot when there is no tracked loot id", () => {
    processor.handle(createChatEvent("Podział łupów: test"));
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("updates loot and clears tracked id after success", async () => {
    useLootStore.setState({ lastLootId: 55 });
    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));

    await vi.waitFor(() =>
      expect(useLootStore.getState().lastLootId).toBeNull(),
    );
    const [url, options] = fetchImplementation.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.example.test/loots/55");
    expect(options?.method).toBe("PATCH");
    expect(options?.body).toBe(
      JSON.stringify({ msg: "Podział łupów: zwycięstwo" }),
    );
  });

  it("does not clear tracked id when another loot replaces it before update resolves", async () => {
    const deferred = Promise.withResolvers<Response>();
    fetchImplementation.mockReturnValue(deferred.promise);
    useLootStore.setState({ lastLootId: 55 });
    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));
    useLootStore.getState().setLastLootId(99);
    deferred.resolve(new Response(null, { status: 204 }));

    await vi.waitFor(() =>
      expect(useLogsStore.getState().actions[0]?.status).toBe("success"),
    );
    expect(useLootStore.getState().lastLootId).toBe(99);
  });

  it("logs warning and retains tracked loot when update fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    useLootStore.setState({ lastLootId: 55 });
    fetchImplementation.mockRejectedValue(new Error("request failed"));
    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));

    await vi.waitFor(() =>
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[ChatEventProcessor] Failed to update loot:",
        expect.any(Error),
      ),
    );
    expect(useLootStore.getState().lastLootId).toBe(55);
  });
});
