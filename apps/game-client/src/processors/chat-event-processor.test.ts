import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLootStore } from "@/store/game-store/loot.store";
import { ChatEventProcessor } from "./chat-event-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";

const mockUpdateLoot = vi.fn();

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@/api")>();

  return {
    ...originalModule,
    updateLoot: (...args: unknown[]) => mockUpdateLoot(...args),
  };
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createChatEvent = (message: string): GameEvent =>
  ({
    chat: {
      channels: {
        system: {
          msg: [
            {
              id: 1,
              ts: Date.now(),
              msg: message,
            },
          ],
        },
      },
    },
  }) as GameEvent;

describe("ChatEventProcessor", () => {
  let processor: ChatEventProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ChatEventProcessor();
    useLootStore.setState({
      lastLootId: null,
    });
  });

  it("ignores events without loot distribution message", () => {
    processor.handle({});
    processor.handle(createChatEvent("Brak podzialu"));

    expect(mockUpdateLoot).not.toHaveBeenCalled();
  });

  it("does not update loot when there is no tracked loot id", () => {
    processor.handle(createChatEvent("Podział łupów: test"));

    expect(mockUpdateLoot).not.toHaveBeenCalled();
  });

  it("updates loot and clears tracked id after success", async () => {
    useLootStore.setState({
      lastLootId: 55,
    });
    mockUpdateLoot.mockResolvedValue(undefined);

    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdateLoot).toHaveBeenCalledWith({
      msg: "Podział łupów: zwycięstwo",
      id: 55,
    });
    expect(useLootStore.getState().lastLootId).toBeNull();
  });

  it("does not clear tracked id when another loot replaces it before update resolves", async () => {
    const deferred = createDeferred<void>();
    useLootStore.setState({
      lastLootId: 55,
    });
    mockUpdateLoot.mockReturnValue(deferred.promise);

    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));

    useLootStore.getState().setLastLootId(99);
    deferred.resolve();

    await Promise.resolve();
    await Promise.resolve();

    expect(useLootStore.getState().lastLootId).toBe(99);
  });

  it("logs warning when update fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    useLootStore.setState({
      lastLootId: 55,
    });
    mockUpdateLoot.mockRejectedValue(new Error("request failed"));

    processor.handle(createChatEvent("Podział łupów: zwycięstwo"));

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[ChatEventProcessor] Failed to update loot:",
      expect.any(Error),
    );
  });
});
