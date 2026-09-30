import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { pruneByRecency } from "@/lib/prune-by-recency";

export type ReadyRoomCharacterIdentity = {
  accountId: string;
  characterId: string;
};

type ReadyRoomVersion = {
  observedAtMs: number;
  observedSequence: number;
  revision: number;
  presence: "PRESENT" | "REMOVED";
};

export const READY_ROOM_TOMBSTONE_TTL_MS = 120_000;

export const READY_ROOM_TOMBSTONE_CAP = 512;

/**
 * Ready Rooms arrive from the list endpoint, from socket updates and from the
 * responses of the room's own mutations, in any order. The collection keeps
 * the highest revision seen per room and remembers removals as tombstones so
 * a late response cannot resurrect a room that was already closed.
 */
export type ReadyRoomProjections = {
  projections: Record<string, PartyReadyRoomProjection>;
  roomVersions: Record<string, ReadyRoomVersion>;
};

export type ReadyRoomCache = ReadyRoomProjections & {
  /**
   * When the last authoritative list response was applied, and null while a
   * resynchronization is pending or its request failed. A socket update is not
   * a synchronization: it says nothing about the rooms it does not mention, so
   * it must never make an incomplete collection look current.
   */
  listAppliedAt: number | null;
};

export const EMPTY_READY_ROOM_CACHE: ReadyRoomCache = {
  projections: {},
  roomVersions: {},
  listAppliedAt: null,
};

export type ReadyRoomSyncBaseline = Record<string, ReadyRoomVersion>;

let readyRoomObservationSequence = 0;

function getNextReadyRoomObservationSequence(): number {
  readyRoomObservationSequence += 1;

  return readyRoomObservationSequence;
}

export function resetReadyRoomObservationSequence(): void {
  readyRoomObservationSequence = 0;
}

export function selectOwnedReadyRoom(
  cache: ReadyRoomProjections,
): PartyReadyRoomOrganizerProjection | null {
  return (
    Object.values(cache.projections).find(
      (projection): projection is PartyReadyRoomOrganizerProjection =>
        projection.viewer === "ORGANIZER" && projection.status === "ACTIVE",
    ) ?? null
  );
}

/** Applicants the organizer still has to invite into the party. */
export function selectParticipantsOutsideParty(
  projection: PartyReadyRoomProjection,
): PartyReadyRoomParticipant[] {
  return Object.values(projection.participants).filter(
    (participant) => participant.partyPresence === "OUTSIDE",
  );
}

export function selectReadyRoomParticipantForCharacter(
  projection: PartyReadyRoomProjection,
  identity: ReadyRoomCharacterIdentity | null,
): PartyReadyRoomParticipant | null {
  if (!identity) return null;

  const ownedParticipantIds =
    projection.viewer === "ORGANIZER"
      ? new Set(projection.ownedParticipantIds)
      : null;

  return (
    Object.values(projection.participants).find(
      (participant) =>
        (ownedParticipantIds === null ||
          ownedParticipantIds.has(participant.participantId)) &&
        participant.character.accountId === identity.accountId &&
        participant.character.characterId === identity.characterId,
    ) ?? null
  );
}

export function selectReadyRoomForCharacter(
  cache: ReadyRoomProjections,
  identity: ReadyRoomCharacterIdentity | null,
): PartyReadyRoomProjection | null {
  if (!identity) return null;
  const ownedReadyRoom = selectOwnedReadyRoom(cache);

  const isOrganizerCharacter =
    ownedReadyRoom !== null &&
    identity.accountId === ownedReadyRoom.organizerCharacter.accountId &&
    identity.characterId === ownedReadyRoom.organizerCharacter.characterId;

  if (isOrganizerCharacter) return ownedReadyRoom;

  return (
    Object.values(cache.projections).find(
      (projection) =>
        projection.status === "ACTIVE" &&
        selectReadyRoomParticipantForCharacter(projection, identity) !== null,
    ) ?? null
  );
}

export function captureReadyRoomSyncBaseline(
  cache: ReadyRoomProjections,
): ReadyRoomSyncBaseline {
  return structuredClone(cache.roomVersions);
}

function isSchemaVersionThree(
  projection: PartyReadyRoomProjection,
): projection is PartyReadyRoomProjection {
  return projection.schemaVersion === 3;
}

function pruneExpiredRoomTombstones(
  roomVersions: Record<string, ReadyRoomVersion>,
  now: number,
): Record<string, ReadyRoomVersion> {
  const roomVersionEntries = Object.entries(roomVersions);

  const presentVersions = roomVersionEntries.filter(
    ([, version]) => version.presence === "PRESENT",
  );

  const { retained: retainedTombstones } = pruneByRecency({
    entries: roomVersionEntries.filter(
      ([, version]) => version.presence === "REMOVED",
    ),
    now,
    ttlMs: READY_ROOM_TOMBSTONE_TTL_MS,
    cap: READY_ROOM_TOMBSTONE_CAP,
    timestampOf: ([, version]) => version.observedAtMs,
    tiebreakOf: ([, version]) => version.observedSequence,
  });

  const retainedVersions = [...presentVersions, ...retainedTombstones];

  if (retainedVersions.length === roomVersionEntries.length) {
    return roomVersions;
  }

  return Object.fromEntries(retainedVersions);
}

export function mergeReadyRoomProjection(
  cache: ReadyRoomProjections,
  projection: PartyReadyRoomProjection,
): ReadyRoomProjections {
  const { projections, roomVersions } = cache;
  const observedAtMs = Date.now();

  const retainedRoomVersions = pruneExpiredRoomTombstones(
    roomVersions,
    observedAtMs,
  );

  if (!isSchemaVersionThree(projection)) {
    return { projections, roomVersions: retainedRoomVersions };
  }

  const notificationId = projection.notificationId;
  const currentVersion = retainedRoomVersions[notificationId];

  if (currentVersion && currentVersion.revision > projection.revision) {
    return { projections, roomVersions: retainedRoomVersions };
  }

  if (
    currentVersion?.revision === projection.revision &&
    currentVersion.presence === "REMOVED"
  ) {
    return { projections, roomVersions: retainedRoomVersions };
  }

  const current = projections[notificationId];

  if (
    current?.revision === projection.revision &&
    (current.viewer === "ORGANIZER" || projection.viewer !== "ORGANIZER")
  ) {
    return { projections, roomVersions: retainedRoomVersions };
  }

  return {
    projections: { ...projections, [notificationId]: projection },
    roomVersions: {
      ...retainedRoomVersions,
      [notificationId]: {
        observedAtMs,
        observedSequence: getNextReadyRoomObservationSequence(),
        revision: projection.revision,
        presence: "PRESENT",
      },
    },
  };
}

function removeReadyRoomAtRevision(
  cache: ReadyRoomProjections,
  notificationId: string,
  revision: number,
): ReadyRoomProjections {
  const { projections, roomVersions } = cache;
  const observedAtMs = Date.now();

  const retainedRoomVersions = pruneExpiredRoomTombstones(
    roomVersions,
    observedAtMs,
  );

  const currentVersion = retainedRoomVersions[notificationId];

  if (currentVersion && currentVersion.revision > revision) {
    return { projections, roomVersions: retainedRoomVersions };
  }

  const { [notificationId]: _removed, ...remainingProjections } = projections;

  return {
    projections: remainingProjections,
    roomVersions: pruneExpiredRoomTombstones(
      {
        ...retainedRoomVersions,
        [notificationId]: {
          observedAtMs,
          observedSequence: getNextReadyRoomObservationSequence(),
          revision,
          presence: "REMOVED",
        },
      },
      observedAtMs,
    ),
  };
}

export function isReadyRoomExpired(
  projection: PartyReadyRoomProjection,
  now = Date.now(),
): boolean {
  return (
    projection.status !== "ACTIVE" || Date.parse(projection.expiresAt) <= now
  );
}

export function mergeReadyRoomProjections(
  cache: ReadyRoomProjections,
  incomingProjections: PartyReadyRoomProjection[],
): ReadyRoomProjections {
  return incomingProjections.reduce(mergeReadyRoomProjection, {
    projections: cache.projections,
    roomVersions: pruneExpiredRoomTombstones(cache.roomVersions, Date.now()),
  });
}

export function applyReadyRoomUpdate(
  cache: ReadyRoomProjections,
  update: PartyReadyRoomClientUpdate,
): ReadyRoomProjections {
  if (update.schemaVersion !== 3) return cache;

  if (update.type === "UPSERT") {
    return mergeReadyRoomProjection(cache, update.projection);
  }

  return removeReadyRoomAtRevision(
    cache,
    update.notificationId,
    update.revision,
  );
}

export function removeReadyRoom(
  cache: ReadyRoomProjections,
  notificationId: string,
): ReadyRoomProjections {
  const revision =
    cache.roomVersions[notificationId]?.revision ??
    cache.projections[notificationId]?.revision;

  if (revision === undefined) return cache;

  return removeReadyRoomAtRevision(cache, notificationId, revision);
}

/**
 * The list endpoint is authoritative, but only for the rooms that were already
 * known when the request left: a room created while it was in flight must not
 * be dropped just because the response predates it.
 */
export function applyAuthoritativeReadyRoomSync(
  cache: ReadyRoomProjections,
  incomingProjections: PartyReadyRoomProjection[],
  baseline: ReadyRoomSyncBaseline,
): ReadyRoomProjections {
  const validIncomingProjections =
    incomingProjections.filter(isSchemaVersionThree);

  const incomingIds = new Set(
    validIncomingProjections.map(({ notificationId }) => notificationId),
  );

  let nextCache = validIncomingProjections.reduce(mergeReadyRoomProjection, {
    projections: Object.fromEntries(
      Object.entries(cache.projections).filter(([, projection]) =>
        isSchemaVersionThree(projection),
      ),
    ),
    roomVersions: cache.roomVersions,
  });

  for (const [notificationId, baselineVersion] of Object.entries(baseline)) {
    if (
      baselineVersion.presence !== "PRESENT" ||
      incomingIds.has(notificationId)
    ) {
      continue;
    }

    const currentVersion = nextCache.roomVersions[notificationId];

    if (
      currentVersion?.revision === baselineVersion.revision &&
      currentVersion.presence === "PRESENT"
    ) {
      nextCache = removeReadyRoomAtRevision(
        nextCache,
        notificationId,
        baselineVersion.revision,
      );
    }
  }

  return nextCache;
}
