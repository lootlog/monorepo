import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { create } from "zustand";

export type ReadyRoomCharacterIdentity = {
  accountId: string;
  characterId: string;
};

type ReadyRoomVersion = {
  revision: number;
  presence: "PRESENT" | "REMOVED";
};

export type ReadyRoomSyncBaseline = Record<string, ReadyRoomVersion>;

export interface PartyFinderState {
  projections: Record<string, PartyReadyRoomProjection>;
  roomVersions: Record<string, ReadyRoomVersion>;
  readyRoomsSynchronized: boolean;
  mergeProjection: (projection: PartyReadyRoomProjection) => void;
  mergeProjections: (projections: PartyReadyRoomProjection[]) => void;
  applyUpdate: (update: PartyReadyRoomClientUpdate) => void;
  applyAuthoritativeSync: (
    projections: PartyReadyRoomProjection[],
    baseline: ReadyRoomSyncBaseline,
  ) => void;
  setReadyRoomsSynchronized: (synchronized: boolean) => void;
  removeProjection: (notificationId: string) => void;
  clearReadyRooms: () => void;
}

export function selectOwnedReadyRoom(
  state: PartyFinderState,
): PartyReadyRoomOrganizerProjection | null {
  return (
    Object.values(state.projections).find(
      (projection): projection is PartyReadyRoomOrganizerProjection =>
        projection.viewer === "ORGANIZER" && projection.status === "ACTIVE",
    ) ?? null
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
  state: PartyFinderState,
  identity: ReadyRoomCharacterIdentity | null,
): PartyReadyRoomProjection | null {
  if (!identity) return null;
  const ownedReadyRoom = selectOwnedReadyRoom(state);
  const isOrganizerCharacter =
    ownedReadyRoom !== null &&
    identity.accountId === ownedReadyRoom.organizerCharacter.accountId &&
    identity.characterId === ownedReadyRoom.organizerCharacter.characterId;
  if (isOrganizerCharacter) return ownedReadyRoom;

  return (
    Object.values(state.projections).find(
      (projection) =>
        projection.status === "ACTIVE" &&
        selectReadyRoomParticipantForCharacter(projection, identity) !== null,
    ) ?? null
  );
}

export function captureReadyRoomSyncBaseline(
  state: PartyFinderState,
): ReadyRoomSyncBaseline {
  return structuredClone(state.roomVersions);
}

function isSchemaVersionThree(
  projection: PartyReadyRoomProjection,
): projection is PartyReadyRoomProjection {
  return (projection as { schemaVersion?: number }).schemaVersion === 3;
}

function mergeProjectionIntoState(
  projections: Record<string, PartyReadyRoomProjection>,
  roomVersions: Record<string, ReadyRoomVersion>,
  projection: PartyReadyRoomProjection,
): {
  projections: Record<string, PartyReadyRoomProjection>;
  roomVersions: Record<string, ReadyRoomVersion>;
} {
  if (!isSchemaVersionThree(projection)) return { projections, roomVersions };
  const notificationId = projection.notificationId;
  const currentVersion = roomVersions[notificationId];
  if (currentVersion && currentVersion.revision > projection.revision) {
    return { projections, roomVersions };
  }
  if (
    currentVersion?.revision === projection.revision &&
    currentVersion.presence === "REMOVED"
  ) {
    return { projections, roomVersions };
  }

  const current = projections[notificationId];
  if (
    current?.revision === projection.revision &&
    (current.viewer === "ORGANIZER" || projection.viewer !== "ORGANIZER")
  ) {
    return { projections, roomVersions };
  }
  return {
    projections: { ...projections, [notificationId]: projection },
    roomVersions: {
      ...roomVersions,
      [notificationId]: {
        revision: projection.revision,
        presence: "PRESENT",
      },
    },
  };
}

function removeProjectionFromState(
  projections: Record<string, PartyReadyRoomProjection>,
  roomVersions: Record<string, ReadyRoomVersion>,
  notificationId: string,
  revision: number,
): {
  projections: Record<string, PartyReadyRoomProjection>;
  roomVersions: Record<string, ReadyRoomVersion>;
} {
  const currentVersion = roomVersions[notificationId];
  if (currentVersion && currentVersion.revision > revision) {
    return { projections, roomVersions };
  }
  const { [notificationId]: _removed, ...remainingProjections } = projections;
  return {
    projections: remainingProjections,
    roomVersions: {
      ...roomVersions,
      [notificationId]: { revision, presence: "REMOVED" },
    },
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

export const usePartyFinderStore = create<PartyFinderState>((set) => ({
  projections: {},
  roomVersions: {},
  readyRoomsSynchronized: false,
  mergeProjection: (projection) =>
    set((state) =>
      mergeProjectionIntoState(
        state.projections,
        state.roomVersions,
        projection,
      ),
    ),
  mergeProjections: (incomingProjections) =>
    set((state) =>
      incomingProjections.reduce(
        (currentState, projection) =>
          mergeProjectionIntoState(
            currentState.projections,
            currentState.roomVersions,
            projection,
          ),
        {
          projections: state.projections,
          roomVersions: state.roomVersions,
        },
      ),
    ),
  applyUpdate: (update) =>
    set((state) => {
      if (update.schemaVersion !== 3) return state;
      if (update.type === "UPSERT") {
        return mergeProjectionIntoState(
          state.projections,
          state.roomVersions,
          update.projection,
        );
      }
      return removeProjectionFromState(
        state.projections,
        state.roomVersions,
        update.notificationId,
        update.revision,
      );
    }),
  applyAuthoritativeSync: (incomingProjections, baseline) =>
    set((state) => {
      const validIncomingProjections =
        incomingProjections.filter(isSchemaVersionThree);
      const incomingIds = new Set(
        validIncomingProjections.map(({ notificationId }) => notificationId),
      );
      let nextState = validIncomingProjections.reduce(
        (currentState, projection) =>
          mergeProjectionIntoState(
            currentState.projections,
            currentState.roomVersions,
            projection,
          ),
        {
          projections: Object.fromEntries(
            Object.entries(state.projections).filter(([, projection]) =>
              isSchemaVersionThree(projection),
            ),
          ),
          roomVersions: state.roomVersions,
        },
      );

      for (const [notificationId, baselineVersion] of Object.entries(
        baseline,
      )) {
        if (
          baselineVersion.presence !== "PRESENT" ||
          incomingIds.has(notificationId)
        ) {
          continue;
        }
        const currentVersion = nextState.roomVersions[notificationId];
        if (
          currentVersion?.revision === baselineVersion.revision &&
          currentVersion.presence === "PRESENT"
        ) {
          nextState = removeProjectionFromState(
            nextState.projections,
            nextState.roomVersions,
            notificationId,
            baselineVersion.revision,
          );
        }
      }
      return { ...nextState, readyRoomsSynchronized: true };
    }),
  setReadyRoomsSynchronized: (readyRoomsSynchronized) =>
    set({ readyRoomsSynchronized }),
  removeProjection: (notificationId) =>
    set((state) => {
      const revision =
        state.roomVersions[notificationId]?.revision ??
        state.projections[notificationId]?.revision;
      if (revision === undefined) return state;
      return removeProjectionFromState(
        state.projections,
        state.roomVersions,
        notificationId,
        revision,
      );
    }),
  clearReadyRooms: () =>
    set({
      projections: {},
      roomVersions: {},
      readyRoomsSynchronized: false,
    }),
}));
