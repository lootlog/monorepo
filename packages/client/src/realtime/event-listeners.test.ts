import { expect, test } from "bun:test";
import { RealtimeEventListeners } from "./event-listeners.js";

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

test("one failing listener does not prevent later listeners from receiving the event", () => {
  const events = new RealtimeEventListeners<"changed">();
  const received: number[] = [];
  events.add("changed", () => {
    throw new Error("listener failed");
  });
  events.add("changed", (value: number) => received.push(value));

  expect(() => events.emit("changed", 42)).not.toThrow();
  expect(received).toEqual([42]);
});
