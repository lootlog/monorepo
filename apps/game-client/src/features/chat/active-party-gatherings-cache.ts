import type {
  ActivePartyGatheringSummary,
  ActivePartyGatheringUpdate,
} from "@lootlog/schema/party-ready-room";
import { pruneByRecency } from "@/lib/prune-by-recency";

type Removal = { revision: number; observedAt: number };

export type ActiveGatheringsCache = {
  snapshotAppliedAt: number | null;
  orderingEpoch: number;
  rooms: readonly ActivePartyGatheringSummary[];
  removals: Record<string, Removal>;
};

export const EMPTY_ACTIVE_GATHERINGS: ActiveGatheringsCache = {
  snapshotAppliedAt: null,
  orderingEpoch: 0,
  rooms: [],
  removals: {},
};

function mergeSummary(
  cache: ActiveGatheringsCache,
  summary: ActivePartyGatheringSummary,
  mergeOrganizations = true,
): ActiveGatheringsCache {
  const revision = summary.revision ?? 0;

  if ((cache.removals[summary.notificationId]?.revision ?? -1) >= revision)
    return cache;

  const current = cache.rooms.find(
    (room) => room.notificationId === summary.notificationId,
  );

  if ((current?.revision ?? -1) > revision) return cache;

  // After eviction an unknown ID may be a cancelled room's delayed replay.
  // Only an authoritative snapshot may introduce unknown rooms from then on.
  if (mergeOrganizations && cache.orderingEpoch > 0 && !current)
    return { ...cache, snapshotAppliedAt: null };

  const guildIds = mergeOrganizations
    ? [...new Set([...(current?.guildIds ?? []), ...summary.guildIds])]
    : [...summary.guildIds];

  const room = { ...summary, guildIds };

  return {
    ...cache,
    rooms: current
      ? cache.rooms.map((entry) =>
          entry.notificationId === room.notificationId ? room : entry,
        )
      : [...cache.rooms, room].sort((first, second) =>
          second.createdAt.localeCompare(first.createdAt),
        ),
  };
}

export function applyActiveGatheringUpdate(
  cache: ActiveGatheringsCache,
  update: ActivePartyGatheringUpdate,
): ActiveGatheringsCache {
  if (update.type === "UPSERT")
    return mergeSummary(cache, {
      ...update.summary,
      revision: update.revision,
    });

  return removeActiveGathering(cache, update.notificationId, update.revision);
}

export function removeActiveGathering(
  cache: ActiveGatheringsCache,
  notificationId: string,
  revision: number,
): ActiveGatheringsCache {
  const current = cache.rooms.find(
    (room) => room.notificationId === notificationId,
  );

  if (
    (current?.revision ?? -1) > revision ||
    (cache.removals[notificationId]?.revision ?? -1) > revision
  )
    return cache;
  const now = Date.now();

  const removals = {
    ...cache.removals,
    [notificationId]: { revision, observedAt: now },
  };

  const { retained, evicted } = pruneByRecency({
    entries: Object.entries(removals),
    now,
    cap: 512,
    timestampOf: ([, removal]) => removal.observedAt,
  });

  return {
    ...cache,
    orderingEpoch: cache.orderingEpoch + (evicted.length > 0 ? 1 : 0),
    snapshotAppliedAt: evicted.length > 0 ? null : cache.snapshotAppliedAt,
    rooms: cache.rooms.filter((room) => room.notificationId !== notificationId),
    removals: Object.fromEntries(retained),
  };
}

/** A snapshot cannot replace newer events or erase rooms created while it was in flight. */
export function applyActiveGatheringsSnapshot(
  cache: ActiveGatheringsCache,
  rooms: readonly ActivePartyGatheringSummary[],
  baseline: ActiveGatheringsCache,
): ActiveGatheringsCache {
  // A removal made during the request must not be forgotten before it returns.
  if (cache.orderingEpoch !== baseline.orderingEpoch)
    return { ...cache, snapshotAppliedAt: null };

  const ids = new Set(rooms.map((room) => room.notificationId));
  let next = cache;

  for (const room of cache.rooms) {
    if (!ids.has(room.notificationId) && baseline.rooms.includes(room))
      next = removeActiveGathering(
        next,
        room.notificationId,
        room.revision ?? 0,
      );
  }

  const merged = rooms.reduce(
    (current, room) => mergeSummary(current, room, false),
    next,
  );

  const byId = new Map(merged.rooms.map((room) => [room.notificationId, room]));

  return {
    ...merged,
    snapshotAppliedAt: Date.now(),
    rooms: [
      ...merged.rooms.filter((room) => !ids.has(room.notificationId)),
      ...rooms.flatMap((room) => {
        const current = byId.get(room.notificationId);

        return current ? [current] : [];
      }),
    ],
  };
}
