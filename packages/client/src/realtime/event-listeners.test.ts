import { expect, test } from "bun:test";
import { RealtimeEventListeners } from "./event-listeners.js";

test("listeners retain set ordering, duplicate suppression, removal and synchronous failures", () => {
  const events = new RealtimeEventListeners<"changed">();
  const received: unknown[] = [];
  const listener = (value: unknown) => received.push(value);
  events.add("changed", listener);
  events.add("changed", listener);
  events.emit("changed", 42);
  expect(received).toEqual([42]);
  events.delete("changed", listener);
  events.emit("changed", 43);
  expect(received).toEqual([42]);
  events.add("changed", () => {
    throw new Error("listener failed");
  });
  expect(() => events.emit("changed")).toThrow("listener failed");
  events.clear();
  expect(() => events.emit("changed")).not.toThrow();
});
