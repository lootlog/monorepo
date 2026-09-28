import type {
  PartyGatheringClientUpdate,
  PartyGatheringSummary,
} from "@lootlog/schema/party-ready-room";

type GatheringVersion = {
  revision: number;
  expiresAt: number;
  gathering?: PartyGatheringSummary;
  terminal: boolean;
};

export type ActivePartyGatheringsCache = Record<string, GatheringVersion>;

const REMOVAL_RETENTION_MS = 30 * 60_000;

export function applyGatheringUpdate(
  cache: ActivePartyGatheringsCache,
  update: PartyGatheringClientUpdate,
): ActivePartyGatheringsCache {
  const gathering = update.type === "UPSERT" ? update.gathering : undefined;

  const notificationId =
    update.type === "UPSERT"
      ? update.gathering.notificationId
      : update.notificationId;

  const revision =
    update.type === "UPSERT"
      ? (update.gathering.revision ?? 0)
      : update.revision;

  const previous = cache[notificationId];

  if (
    previous &&
    (previous.revision > revision ||
      (previous.revision === revision && previous.gathering === undefined))
  ) {
    return cache;
  }

  const next = Object.fromEntries(
    Object.entries(cache).filter(([, entry]) => entry.expiresAt > Date.now()),
  );

  next[notificationId] = {
    revision,
    terminal: update.type === "REMOVE",
    expiresAt: gathering
      ? Date.parse(gathering.expiresAt)
      : Math.max(previous?.expiresAt ?? 0, Date.now() + REMOVAL_RETENTION_MS),
    gathering: gathering && {
      ...gathering,
      // A room may arrive through several authorized Organizations. Each push
      // carries only the receiving Organization, even at the same revision.
      guildIds: [
        ...new Set([
          ...(previous?.gathering?.guildIds ?? []),
          ...gathering.guildIds,
        ]),
      ],
    },
  };

  return next;
}

export function reconcileGatherings(
  current: ActivePartyGatheringsCache,
  snapshot: readonly PartyGatheringSummary[],
  baseline: ActivePartyGatheringsCache,
): ActivePartyGatheringsCache {
  const incomingIds = new Set(snapshot.map((room) => room.notificationId));
  let next = { ...current };

  for (const gathering of snapshot) {
    const previous = next[gathering.notificationId];

    // Absence in discovery may mean lost source access, whereas a REMOVE
    // event terminates the room. Restored access can reveal the same revision.
    if (
      previous &&
      !previous.gathering &&
      !previous.terminal &&
      previous.revision <= (gathering.revision ?? 0)
    ) {
      delete next[gathering.notificationId];
    }

    next = applyGatheringUpdate(next, { type: "UPSERT", gathering });
    const merged = next[gathering.notificationId];

    if (merged?.gathering) {
      next[gathering.notificationId] = {
        ...merged,
        gathering: { ...merged.gathering, guildIds: gathering.guildIds },
      };
    }
  }

  for (const [notificationId, previous] of Object.entries(baseline)) {
    if (!previous.gathering || incomingIds.has(notificationId)) continue;

    if (current[notificationId] !== previous) continue;
    next[notificationId] = {
      revision: previous.revision,
      expiresAt: previous.expiresAt,
      terminal: false,
    };
  }

  return next;
}
