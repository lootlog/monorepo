import type { ActivePartyGatheringSummary } from "@lootlog/schema/party-ready-room";
import {
  applyActiveGatheringUpdate,
  applyActiveGatheringsSnapshot,
  EMPTY_ACTIVE_GATHERINGS,
  removeActiveGathering,
} from "./active-party-gatherings-cache";

const room: ActivePartyGatheringSummary = {
  notificationId: "cancelled",
  organizerName: "Organizer",
  applicantCount: 0,
  inPartyCount: 0,
  guildIds: ["guild-1"],
  world: "luvia",
  createdAt: "2026-09-28T10:00:00.000Z",
  expiresAt: "2026-09-28T11:00:00.000Z",
  revision: 1,
};

const upsert = (summary = room) => ({
  type: "UPSERT" as const,
  guildId: "guild-1",
  revision: summary.revision ?? 1,
  summary,
});

afterEach(() => vi.useRealTimers());

it("does not resurrect a cancelled gathering when its older update arrives after two minutes", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(room.createdAt));

  const loaded = applyActiveGatheringsSnapshot(
    EMPTY_ACTIVE_GATHERINGS,
    [room],
    EMPTY_ACTIVE_GATHERINGS,
  );

  const cancelled = removeActiveGathering(loaded, room.notificationId, 2);
  vi.advanceTimersByTime(121_000);
  const laterCancellation = removeActiveGathering(cancelled, "other", 2);
  const replayed = applyActiveGatheringUpdate(laterCancellation, upsert());
  expect(replayed.rooms).toEqual([]);
});

it("keeps evicted cancellations absent across snapshots and bounds ordering memory", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(room.createdAt));

  const baseline = applyActiveGatheringsSnapshot(
    EMPTY_ACTIVE_GATHERINGS,
    [room],
    EMPTY_ACTIVE_GATHERINGS,
  );

  let cache = removeActiveGathering(baseline, room.notificationId, 2);

  for (let index = 0; index < 512; index++) {
    vi.advanceTimersByTime(1);
    cache = removeActiveGathering(cache, `later-${index}`, 2);
  }

  expect(Object.keys(cache.removals)).toHaveLength(512);
  expect(cache.removals[room.notificationId]).toBeUndefined();
  cache = applyActiveGatheringUpdate(cache, upsert());
  expect(cache.rooms).toEqual([]);
  expect(cache.snapshotAppliedAt).toBeNull();

  // A request started before ordering history was evicted is also ambiguous.
  cache = applyActiveGatheringsSnapshot(cache, [room], baseline);
  expect(cache.rooms).toEqual([]);
  expect(cache.snapshotAppliedAt).toBeNull();
  cache = applyActiveGatheringsSnapshot(cache, [], cache);
  expect(cache.snapshotAppliedAt).not.toBeNull();
  cache = applyActiveGatheringUpdate(cache, upsert());
  expect(cache.rooms).toEqual([]);
  expect(cache.snapshotAppliedAt).toBeNull();

  const newlyDiscovered = { ...room, notificationId: "new-room" };
  cache = applyActiveGatheringsSnapshot(cache, [newlyDiscovered], cache);
  cache = applyActiveGatheringUpdate(
    cache,
    upsert({ ...newlyDiscovered, revision: 2, applicantCount: 3 }),
  );
  expect(cache.rooms).toEqual([
    { ...newlyDiscovered, revision: 2, applicantCount: 3 },
  ]);
  expect(cache.snapshotAppliedAt).not.toBeNull();
});
