import { afterEach, expect, test, vi } from "bun:test";
import { RealtimeEventListeners } from "./event-listeners.js";

afterEach(() => vi.restoreAllMocks());

test("listeners retain set ordering, duplicate suppression and removal", () => {
  const events = new RealtimeEventListeners<"changed">();
  const received: (number | undefined)[] = [];
  const listener = (value?: number) => received.push(value);
  events.add("changed", listener);
  events.add("changed", listener);
  events.emit("changed", 42);
  expect(received).toEqual([42]);
  events.delete("changed", listener);
  events.emit("changed", 43);
  expect(received).toEqual([42]);
  events.clear();
  expect(() => events.emit("changed")).not.toThrow();
});

test.each([false, true])(
  "reports failed listeners and continues delivery when diagnostics throw: %s",
  (diagnosticsThrow) => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {
      if (diagnosticsThrow) throw new Error("diagnostics failed");
    });

    const failure = new Error("listener failed");
    const events = new RealtimeEventListeners<"changed">();
    const received: number[] = [];
    events.add("changed", () => {
      throw failure;
    });
    events.add("changed", (value: number) => received.push(value));

    expect(() => events.emit("changed", 42)).not.toThrow();
    expect(received).toEqual([42]);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("changed"),
      failure,
    );
  },
);
