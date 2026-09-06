import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { feedKill } from "./live-feed-test-data";
import {
  groupFeedItems,
  initialLiveFeedState,
  liveFeedReducer,
} from "./live-feed-state";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
});
afterEach(() => vi.useRealTimers());

it("buffers increased counts in the same minute group without changing the reading snapshot", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [feedKill],
  });
  state = liveFeedReducer(state, { type: "position", atTop: false });
  const original = state.items;
  state = liveFeedReducer(state, {
    type: "entry",
    item: { ...feedKill, count: 3, version: 3 },
  });
  expect(state.items).toBe(original);
  expect(state.pending).toEqual([{ ...feedKill, count: 3, version: 3 }]);
  state = liveFeedReducer(state, { type: "apply" });
  expect(state.items).toEqual([{ ...feedKill, count: 3, version: 3 }]);
  expect(state.pending).toBeUndefined();
});
it("does not buffer identical snapshots and immediately clears restricted current and pending data", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [feedKill],
  });
  state = liveFeedReducer(state, { type: "position", atTop: false });
  state = liveFeedReducer(state, {
    type: "received",
    items: [{ ...feedKill }],
  });
  expect(state.pending).toBeUndefined();
  state = liveFeedReducer(state, {
    type: "received",
    items: [{ ...feedKill, count: 2, version: 2 }],
  });
  state = liveFeedReducer(state, { type: "clear" });
  state = liveFeedReducer(state, { type: "failed" });
  expect(state.items).toEqual([]);
  expect(state.pending).toBeUndefined();
});

it("uses absolute counts and ignores duplicate or out-of-order live updates", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [feedKill],
  });
  for (const version of [4, 4, 2, 3]) {
    state = liveFeedReducer(state, {
      type: "entry",
      item: { ...feedKill, count: version, version },
    });
  }
  expect(state.items).toEqual([{ ...feedKill, count: 4, version: 4 }]);
  expect(state.pending).toBeUndefined();
});

it("limits live entries to the newest twenty and rejects records older than 24 hours", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [],
  });
  for (let index = 0; index < 25; index += 1) {
    state = liveFeedReducer(state, {
      type: "entry",
      item: {
        ...feedKill,
        id: `kill:${index}`,
        occurredAt: new Date(
          Date.parse(feedKill.occurredAt) + index * 1000,
        ).toISOString(),
      },
    });
  }
  state = liveFeedReducer(state, {
    type: "entry",
    item: { ...feedKill, id: "expired", occurredAt: "2026-09-05T12:00:59Z" },
  });
  expect(state.items).toHaveLength(20);
  expect(state.items?.[0]?.id).toBe("kill:24");
  expect(state.items?.[19]?.id).toBe("kill:5");
});

it("groups copies of one source event and keeps all its organizations within the twenty-entry limit", () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({
    ...feedKill,
    id: `copy:${index}`,
    groupKey: "same-event",
    guild: { ...feedKill.guild, id: `org:${index}` },
  }));
  const state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: entries,
  });
  const groups = groupFeedItems(state.items ?? []);
  expect(groups).toHaveLength(1);
  expect(groups[0]?.organizations).toHaveLength(25);
  expect(groups[0]?.item.type === "kill" && groups[0].item.count).toBe(1);
});

it("does not group unrelated kills in the same minute and removes organizations on snapshot replacement", () => {
  const original = { ...feedKill, groupKey: "event-a" };
  const copy = {
    ...original,
    id: "copy",
    guild: { ...feedKill.guild, id: "other-org" },
  };
  const unrelated = { ...original, id: "other-kill", groupKey: "event-b" };
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [original, copy, unrelated],
  });
  expect(groupFeedItems(state.items ?? [])).toHaveLength(2);
  state = liveFeedReducer(state, { type: "received", items: [original] });
  expect(groupFeedItems(state.items ?? [])[0]?.organizations).toEqual([
    original.guild,
  ]);
});

it("removes records missing from the refreshed authorized snapshot even while scrolled", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [feedKill],
  });
  state = liveFeedReducer(state, { type: "position", atTop: false });
  state = liveFeedReducer(state, { type: "received", items: [] });
  expect(state.items).toEqual([]);
  expect(state.pending).toBeUndefined();
});

it("animates only new websocket groups, including several arriving during an HTTP refresh", () => {
  let state = liveFeedReducer(initialLiveFeedState, {
    type: "received",
    items: [feedKill],
  });
  expect(state.animatedKeys).toEqual([]);
  const httpItem = { ...feedKill, id: "http" };
  state = liveFeedReducer(state, {
    type: "received",
    items: [feedKill, httpItem],
  });
  expect(state.animatedKeys).toEqual([]);
  const first = { ...feedKill, id: "live-1" };
  const second = { ...feedKill, id: "live-2" };
  state = liveFeedReducer(state, {
    type: "received",
    items: [feedKill, httpItem, first],
    liveItems: [first, second],
  });
  expect(state.animatedKeys.sort()).toEqual(["live-1", "live-2"]);
  state = liveFeedReducer(state, {
    type: "entry",
    item: { ...httpItem, version: 2 },
  });
  expect(state.animatedKeys).not.toContain("http");
});
