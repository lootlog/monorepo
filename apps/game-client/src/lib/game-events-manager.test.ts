import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  gameEventsManager,
  MAX_QUEUED_GAME_EVENT_RAW_BYTES,
  MAX_QUEUED_GAME_EVENTS,
} from "./game-events-manager";
import type { GameEvent } from "@lootlog/margonem/game-events";

type TestWindow = Window & {
  __lootlogGameClientRuntime?: { dispose: () => void };
  successData?: (...args: unknown[]) => unknown;
};
type SuccessDataContainer = {
  successData?: (...args: unknown[]) => unknown;
};

const testWindow = window as TestWindow;

describe("gameEventsManager", () => {
  const originalWindowSuccessData = testWindow.successData;
  const originalEngine = testWindow.Engine;

  beforeEach(() => {
    gameEventsManager.cleanup();
  });

  afterEach(() => {
    gameEventsManager.cleanup();
    testWindow.successData = originalWindowSuccessData;
    testWindow.Engine = originalEngine;
    delete testWindow.__lootlogGameClientRuntime;
    vi.restoreAllMocks();
  });

  it("should process event payload when successData receives JSON string", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const event: GameEvent = {
      f: {
        init: "1",
      },
    };

    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);

    testWindow.successData?.(JSON.stringify(event));

    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledWith(event);
    expect(originalSuccessData).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it("should process event payload when successData receives object", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const event: GameEvent = {
      f: {
        init: "1",
      },
    };

    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);

    testWindow.successData?.(event);

    // Object payloads are processed synchronously
    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledWith(event);
    expect(originalSuccessData).toHaveBeenCalledWith(event);
  });

  it.each(["object", "string"] as const)(
    "golden-replays a combined %s payload around the game handler",
    (payloadType) => {
      const calls: string[] = [];
      const receiver = { name: "game-handler-receiver" };
      const event = {
        chat: { channels: [] },
        d: {},
        f: { m: ["turn"] },
        friends: [],
        h: {},
        item: {},
        loot: { source: "fight" },
        npcs: [],
        npcs_del: [],
        other: {},
        party: {},
        town: { id: 1 },
      } as unknown as GameEvent;
      const payload = payloadType === "string" ? JSON.stringify(event) : event;
      const originalSuccessData = vi.fn(function (this: typeof receiver) {
        expect(this).toBe(receiver);
        calls.push("game");
        return "game-result";
      });
      const eventProcessor = vi.fn((processedEvent: GameEvent) => {
        calls.push("processor");
        expect(processedEvent).toEqual(event);
      });
      const afterGameEventHandler = vi.fn((processedEvent: GameEvent) => {
        calls.push("after");
        expect(processedEvent).toEqual(event);
      });
      testWindow.successData = originalSuccessData;
      gameEventsManager.setupProxies();
      gameEventsManager.setProcessor(eventProcessor);
      gameEventsManager.setReady(true);
      gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

      const result = testWindow.successData?.call(
        receiver,
        payload,
        "unchanged-argument",
      );

      expect(result).toBe("game-result");
      expect(calls).toEqual(["processor", "game", "after"]);
      expect(originalSuccessData).toHaveBeenCalledWith(
        payload,
        "unchanged-argument",
      );
      expect(eventProcessor).toHaveBeenCalledOnce();
      expect(afterGameEventHandler).toHaveBeenCalledOnce();
    },
  );

  it("should strip friends keys for object payload passed to original successData", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const event: GameEvent = {
      f: {
        init: "1",
      },
      friends: ["friend-1"],
      friends_max: 50,
    };

    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    gameEventsManager.markStripFriendsFromNextEvent();

    testWindow.successData?.(event);

    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledWith(event);

    const forwardedEvent = originalSuccessData.mock.calls[0][0] as GameEvent;
    expect(forwardedEvent.friends).toBeUndefined();
    expect(forwardedEvent.friends_max).toBeUndefined();
    expect(forwardedEvent.f).toEqual(event.f);
  });

  it("notifies after-game subscribers after original successData runs", () => {
    const calls: string[] = [];
    const event: GameEvent = {
      other: {
        1: {
          action: "CREATE",
          account: 1,
          nick: "Other",
          icon: "other.gif",
          x: 1,
          y: 1,
          dir: 0,
          stasis: 0,
          stasis_incoming_seconds: 0,
          rights: 0,
          lvl: 300,
          oplvl: 0,
          prof: "w",
          attr: 0,
          is_blessed: 0,
          relation: 0,
        },
      },
    };

    testWindow.successData = vi.fn(() => {
      calls.push("original");
    });

    gameEventsManager.setupProxies();
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent((payload) => {
      calls.push("after");
      expect(payload).toEqual(event);
    });

    testWindow.successData?.(event);

    expect(calls).toEqual(["original", "after"]);
  });

  it("installs one proxy per target and restores the original handler once", () => {
    const receiver = { name: "window-receiver" };
    const event = { h: { id: 1 } } as GameEvent;
    const originalSuccessData = vi.fn(function (
      this: typeof receiver,
      ...args: unknown[]
    ) {
      expect(this).toBe(receiver);
      expect(args).toEqual([event, "unchanged"]);
      return "original-result";
    });
    const eventProcessor = vi.fn();
    const afterGameEventHandler = vi.fn();

    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    const installedProxy = testWindow.successData;
    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

    const result = testWindow.successData?.call(receiver, event, "unchanged");

    expect(testWindow.successData).toBe(installedProxy);
    expect(result).toBe("original-result");
    expect(originalSuccessData).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(afterGameEventHandler).toHaveBeenCalledTimes(1);

    gameEventsManager.cleanup();
    gameEventsManager.cleanup();

    expect(testWindow.successData).toBe(originalSuccessData);
  });

  it("processes a chained window and Engine successData call only once", () => {
    const calls: string[] = [];
    const event = { h: { id: 1 } } as GameEvent;
    const engineReceiver = { name: "engine-receiver" };
    const windowReceiver = { name: "window-receiver" };
    const engineSuccessData = vi.fn(function (this: typeof engineReceiver) {
      expect(this).toBe(engineReceiver);
      calls.push("engine");
      return "engine-result";
    });
    const engineContainer: SuccessDataContainer = {
      successData: engineSuccessData,
    };
    const windowSuccessData = vi.fn(function (
      this: typeof windowReceiver,
      ...args: unknown[]
    ) {
      expect(this).toBe(windowReceiver);
      calls.push("window");
      return engineContainer.successData?.call(engineReceiver, args[0]);
    });
    const eventProcessor = vi.fn(() => calls.push("processor"));
    const afterGameEventHandler = vi.fn(() => calls.push("after"));

    testWindow.successData = windowSuccessData;
    testWindow.Engine = {
      communication: engineContainer,
    } as unknown as typeof testWindow.Engine;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

    const result = testWindow.successData?.call(
      windowReceiver,
      event,
      "unchanged",
    );

    expect(result).toBe("engine-result");
    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(afterGameEventHandler).toHaveBeenCalledTimes(1);
    expect(windowSuccessData).toHaveBeenCalledWith(event, "unchanged");
    expect(engineContainer.successData).toHaveBeenCalledWith(event);
    expect(calls).toEqual(["processor", "window", "engine", "after"]);

    gameEventsManager.cleanup();

    expect(testWindow.successData).toBe(windowSuccessData);
    expect(engineContainer.successData).toBe(engineSuccessData);
  });

  it("keeps an externally replaced handler during cleanup", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const afterGameEventHandler = vi.fn();
    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    const ownedProxy = testWindow.successData;
    const externalSuccessData = vi.fn((...args: unknown[]) =>
      ownedProxy?.(...args),
    );
    testWindow.successData = externalSuccessData;
    gameEventsManager.cleanup();

    expect(testWindow.successData).toBe(externalSuccessData);

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);
    testWindow.successData?.({ h: { id: 1 } });

    expect(externalSuccessData).toHaveBeenCalledTimes(1);
    expect(originalSuccessData).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(afterGameEventHandler).toHaveBeenCalledTimes(1);
  });

  it("disables the addon pipeline on queue overflow without affecting the game handler", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const afterGameEventHandler = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

    for (let index = 0; index <= MAX_QUEUED_GAME_EVENTS; index += 1) {
      testWindow.successData?.({ h: { id: index } });
    }

    expect(testWindow.successData).toBe(originalSuccessData);

    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    testWindow.successData?.({ h: { id: "after-overflow" } });

    expect(originalSuccessData).toHaveBeenCalledTimes(
      MAX_QUEUED_GAME_EVENTS + 2,
    );
    expect(eventProcessor).not.toHaveBeenCalled();
    expect(afterGameEventHandler).toHaveBeenCalledTimes(MAX_QUEUED_GAME_EVENTS);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("disabled"),
      expect.anything(),
    );
  });

  it("tears down the complete active runtime after forwarding the overflow event", async () => {
    const callOrder: string[] = [];
    const dispose = vi.fn(() => callOrder.push("dispose"));
    testWindow.__lootlogGameClientRuntime = { dispose };
    testWindow.successData = vi.fn(() => callOrder.push("game-handler"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    gameEventsManager.setupProxies();

    for (let index = 0; index <= MAX_QUEUED_GAME_EVENTS; index += 1) {
      testWindow.successData?.({ h: { id: index } });
    }

    expect(dispose).not.toHaveBeenCalled();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledOnce();
    expect(callOrder.at(-2)).toBe("game-handler");
    expect(callOrder.at(-1)).toBe("dispose");
  });

  it("disables the addon pipeline when queued raw strings exceed 2 MiB", () => {
    const originalSuccessData = vi.fn();
    const eventProcessor = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testWindow.successData = originalSuccessData;
    const oversizedPayload = JSON.stringify({
      h: { id: 1 },
      padding: "x".repeat(MAX_QUEUED_GAME_EVENT_RAW_BYTES),
    });

    gameEventsManager.setupProxies();
    testWindow.successData?.(oversizedPayload);

    expect(testWindow.successData).toBe(originalSuccessData);
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    testWindow.successData?.({ h: { id: 2 } });

    expect(originalSuccessData).toHaveBeenCalledTimes(2);
    expect(eventProcessor).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("preserves queued event ordering when processing is reentrant", () => {
    const processedIds: number[] = [];
    const reentrantEvent = { h: { id: 3 } } as GameEvent;
    const firstEvent = { h: { id: 1 } } as GameEvent;
    const secondEvent = { h: { id: 2 } } as GameEvent;

    gameEventsManager.queueEvent(firstEvent);
    gameEventsManager.queueEvent(secondEvent);
    gameEventsManager.setProcessor((event) => {
      processedIds.push(event.h?.id as number);
      if (event === firstEvent) {
        gameEventsManager.queueEvent(reentrantEvent);
      }
    });

    gameEventsManager.setReady(true);

    expect(processedIds).toEqual([1, 3, 2]);
  });

  it("processes a distinct event emitted reentrantly by the game handler", () => {
    const processedIds: number[] = [];
    const afterGameEventIds: number[] = [];
    const outerEvent = { h: { id: 1 } } as GameEvent;
    const innerEvent = { h: { id: 2 } } as GameEvent;
    const originalSuccessData = vi.fn((...args: unknown[]) => {
      const event = args[0] as GameEvent;

      if (event === outerEvent) {
        testWindow.successData?.(innerEvent);
      }
    });
    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor((event) => {
      processedIds.push(event.h?.id as number);
    });
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent((event) => {
      afterGameEventIds.push(event.h?.id as number);
    });

    testWindow.successData?.(outerEvent);

    expect(originalSuccessData).toHaveBeenCalledTimes(2);
    expect(processedIds).toEqual([1, 2]);
    expect(afterGameEventIds).toEqual([2, 1]);
  });

  it("preserves repeated same-target calls with the same payload", () => {
    const event = { h: { id: 1 } } as GameEvent;
    const eventProcessor = vi.fn();
    const afterGameEventHandler = vi.fn();
    let repeated = false;
    const originalSuccessData = vi.fn(() => {
      if (!repeated) {
        repeated = true;
        testWindow.successData?.(event);
      }
    });
    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    gameEventsManager.setProcessor(eventProcessor);
    gameEventsManager.setReady(true);
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

    testWindow.successData?.(event);

    expect(originalSuccessData).toHaveBeenCalledTimes(2);
    expect(eventProcessor).toHaveBeenCalledTimes(2);
    expect(afterGameEventHandler).toHaveBeenCalledTimes(2);
  });

  it("does not emit an after-game event when the game handler throws", () => {
    const error = new Error("game failure");
    const afterGameEventHandler = vi.fn();
    testWindow.successData = vi.fn(() => {
      throw error;
    });

    gameEventsManager.setupProxies();
    gameEventsManager.subscribeAfterGameEvent(afterGameEventHandler);

    expect(() => testWindow.successData?.({ h: { id: 1 } })).toThrow(error);
    expect(afterGameEventHandler).not.toHaveBeenCalled();
  });

  it("rate limits malformed-payload warnings and forwards every payload unchanged", () => {
    const originalSuccessData = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testWindow.successData = originalSuccessData;

    gameEventsManager.setupProxies();
    testWindow.successData?.("not-json");
    testWindow.successData?.("still-not-json");

    expect(originalSuccessData).toHaveBeenNthCalledWith(1, "not-json");
    expect(originalSuccessData).toHaveBeenNthCalledWith(2, "still-not-json");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("forwards the event when addon initialization throws", () => {
    const error = new Error("initialization failure");
    const originalSuccessData = vi.fn(() => "original-result");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    testWindow.successData = originalSuccessData;

    gameEventsManager.setGameInitCallback(() => {
      throw error;
    });
    gameEventsManager.setupProxies();

    const result = testWindow.successData?.({ h: { id: 1 } });

    expect(result).toBe("original-result");
    expect(originalSuccessData).toHaveBeenCalledWith({ h: { id: 1 } });
    expect(warn).toHaveBeenCalledWith(
      "Failed to prepare a game event; forwarding it unchanged",
      error,
    );
  });
});
