import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestWindow = Window & {
  successData?: (...args: unknown[]) => unknown;
  __lootlog_early_events?: unknown[];
  Engine?: {
    communication?: {
      successData?: (...args: unknown[]) => unknown;
    };
  };
};

const testWindow = window as TestWindow;

describe("entrypoint", () => {
  const originalWindowSuccessData = testWindow.successData;
  const originalEngine = testWindow.Engine;

  beforeEach(() => {
    vi.resetModules();
    delete testWindow.__lootlog_early_events;
    delete testWindow.successData;
    delete testWindow.Engine;
    document.head.innerHTML = "";
  });

  afterEach(() => {
    delete testWindow.__lootlog_early_events;
    delete testWindow.successData;
    delete testWindow.Engine;

    if (originalWindowSuccessData) {
      testWindow.successData = originalWindowSuccessData;
    }

    if (originalEngine) {
      testWindow.Engine = originalEngine;
    }
  });

  it("should preserve an existing window.successData handler", async () => {
    const originalSuccessData = vi.fn();
    const event = { f: { init: "1" } };

    testWindow.successData = originalSuccessData;

    await import("./entrypoint.js");

    testWindow.successData?.(event);

    expect(originalSuccessData).toHaveBeenCalledTimes(1);
    expect(originalSuccessData).toHaveBeenCalledWith(event);
    expect(testWindow.__lootlog_early_events).toEqual([event]);
  });

  it("should preserve an existing Engine.communication.successData handler", async () => {
    const originalSuccessData = vi.fn();
    const event = { f: { init: "1" } };

    testWindow.Engine = {
      communication: {
        successData: originalSuccessData,
      },
    };

    await import("./entrypoint.js");

    testWindow.Engine?.communication?.successData?.(event);

    expect(originalSuccessData).toHaveBeenCalledTimes(1);
    expect(originalSuccessData).toHaveBeenCalledWith(event);
    expect(testWindow.__lootlog_early_events).toEqual([event]);
  });
});