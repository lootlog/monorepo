import { describe, expect, it, vi } from "vitest";
import { PerformanceCollector } from "./performance-collector";
import {
  addMeasuredEventListener,
  createMeasuredCallback,
  measureLootlogCallback,
  type CallbackMeasurement,
} from "./measured-callback";

function createHarness() {
  let currentTimeMs = 0;
  const collector = new PerformanceCollector({
    now: () => currentTimeMs,
    scheduler: {
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(() => 1),
    },
  });
  collector.start();
  const measurement: CallbackMeasurement = {
    measure: (name, category, data, callback) =>
      collector.measure(name, category, data, callback),
  };

  return {
    advanceBy(durationMs: number) {
      currentTimeMs += durationMs;
    },
    collector,
    measurement,
  };
}

describe("measured callbacks", () => {
  it("returns the original callback reference when monitoring is disabled", () => {
    const callback = vi.fn();

    expect(measureLootlogCallback("callback.disabled", callback)).toBe(
      callback,
    );
  });

  it("preserves this, arguments and return values", () => {
    const harness = createHarness();
    const receiver = { prefix: "lootlog" };
    const callback = function (this: typeof receiver, suffix: string) {
      harness.advanceBy(7);
      return `${this.prefix}:${suffix}`;
    };
    const measured = createMeasuredCallback(
      harness.measurement,
      "callback.hotkey",
      callback,
    );

    expect(Reflect.apply(measured, receiver, ["map-ping"])).toBe(
      "lootlog:map-ping",
    );
    expect(harness.collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        durationMs: 7,
        name: "callback.hotkey",
      }),
    );
  });

  it("propagates the original exception after recording the callback", () => {
    const harness = createHarness();
    const originalError = new Error("callback failure");
    const measured = createMeasuredCallback(
      harness.measurement,
      "callback.throwing",
      () => {
        harness.advanceBy(3);
        throw originalError;
      },
    );

    expect(() => measured()).toThrow(originalError);
    expect(harness.collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        durationMs: 3,
        name: "callback.throwing",
      }),
    );
  });

  it("registers and removes the exact measured DOM listener", () => {
    const harness = createHarness();
    const target = new EventTarget();
    const calls: unknown[] = [];
    const listener = function (this: EventTarget, event: Event) {
      calls.push(this, event.type);
      harness.advanceBy(2);
    };

    const cleanup = addMeasuredEventListener(
      target,
      "lootlog-test",
      listener,
      "listener.test",
      undefined,
      harness.measurement,
    );
    target.dispatchEvent(new Event("lootlog-test"));
    cleanup();
    target.dispatchEvent(new Event("lootlog-test"));

    expect(calls).toEqual([target, "lootlog-test"]);
    expect(
      harness.collector
        .getReport()
        .timeline.filter((entry) => entry.name === "listener.test"),
    ).toHaveLength(1);
  });
});
