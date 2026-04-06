import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gameEventsManager } from "./game-events-manager";
import type { GameEvent } from "@lootlog/margonem/game-events";

type TestWindow = Window & {
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

    expect(eventProcessor).toHaveBeenCalledTimes(1);
    expect(eventProcessor).toHaveBeenCalledWith(event);
    expect(originalSuccessData).toHaveBeenCalledWith(event);
  });

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
});
