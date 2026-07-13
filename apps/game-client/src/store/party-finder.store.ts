import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { create } from "zustand";

export type ReadyRoomCharacterIdentity = {
  accountId: string;
  characterId: string;
};

export type ReadyRoomSyncBaseline = Record<string, number>;

export interface PartyFinderState {
  projections: Record<string, PartyReadyRoomProjection>;
  readyRoomsSynchronized: boolean;
  selectedRoomId: string | null;
  mergeProjection: (projection: PartyReadyRoomProjection) => void;
  mergeProjections: (projections: PartyReadyRoomProjection[]) => void;
  applyAuthoritativeSync: (
    projections: PartyReadyRoomProjection[],
    baseline: ReadyRoomSyncBaseline,
  ) => void;
  setReadyRoomsSynchronized: (synchronized: boolean) => void;
  removeProjection: (notificationId: string) => void;
  selectRoom: (notificationId: string | null) => void;
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

export function selectPendingReadyRoomIds(
  state: PartyFinderState,
  identity: ReadyRoomCharacterIdentity | null,
): string[] {
  return Object.values(state.projections)
    .filter(
      (projection) =>
        projection.status === "ACTIVE" &&
        selectReadyRoomParticipantForCharacter(projection, identity)
          ?.application === "APPLIED",
    )
    .map(({ notificationId }) => notificationId);
}

export function selectAcceptedReadyRoomId(
  state: PartyFinderState,
  identity: ReadyRoomCharacterIdentity | null,
): string | null {
  return (
    Object.values(state.projections).find(
      (projection) =>
        projection.status === "ACTIVE" &&
        selectReadyRoomParticipantForCharacter(projection, identity)
          ?.application === "ACCEPTED",
    )?.notificationId ?? null
  );
}

export function selectReadyRoomForCharacter(
  state: PartyFinderState,
  identity: ReadyRoomCharacterIdentity | null,
): PartyReadyRoomProjection | null {
  const ownedReadyRoom = selectOwnedReadyRoom(state);
  const isOrganizerCharacter =
    identity !== null &&
    ownedReadyRoom !== null &&
    identity.accountId === ownedReadyRoom.organizerCharacter.accountId &&
    identity.characterId === ownedReadyRoom.organizerCharacter.characterId;

  if (isOrganizerCharacter) return ownedReadyRoom;

  const acceptedReadyRoomId = selectAcceptedReadyRoomId(state, identity);
  if (acceptedReadyRoomId) {
    return state.projections[acceptedReadyRoomId] ?? null;
  }

  const selectedReadyRoom = state.selectedRoomId
    ? state.projections[state.selectedRoomId]
    : undefined;
  if (selectedReadyRoom?.status === "ACTIVE") return selectedReadyRoom;

  return (
    ownedReadyRoom ??
    Object.values(state.projections).find(
      (projection) => projection.status === "ACTIVE",
    ) ??
    null
  );
}

export function captureReadyRoomSyncBaseline(
  state: PartyFinderState,
): ReadyRoomSyncBaseline {
  return Object.fromEntries(
    Object.values(state.projections).map(({ notificationId, revision }) => [
      notificationId,
      revision,
    ]),
  );
}

function isSchemaVersionTwo(
  projection: PartyReadyRoomProjection,
): projection is PartyReadyRoomProjection {
  return (projection as { schemaVersion?: number }).schemaVersion === 2;
}

function mergeProjectionIntoState(
  projections: Record<string, PartyReadyRoomProjection>,
  projection: PartyReadyRoomProjection,
): Record<string, PartyReadyRoomProjection> {
  if (!isSchemaVersionTwo(projection)) return projections;

  const current = projections[projection.notificationId];
  if (current && current.revision > projection.revision) return projections;
  if (
    current &&
    current.revision === projection.revision &&
    (current.viewer === "ORGANIZER" || projection.viewer !== "ORGANIZER")
  ) {
    return projections;
  }

  return { ...projections, [projection.notificationId]: projection };
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
  readyRoomsSynchronized: false,
  selectedRoomId: null,
  mergeProjection: (projection) =>
    set((state) => ({
      projections: mergeProjectionIntoState(state.projections, projection),
    })),
  mergeProjections: (incomingProjections) =>
    set((state) => ({
      projections: incomingProjections.reduce(
        mergeProjectionIntoState,
        state.projections,
      ),
    })),
  applyAuthoritativeSync: (incomingProjections, baseline) =>
    set((state) => {
      const validIncomingProjections =
        incomingProjections.filter(isSchemaVersionTwo);
      const incomingIds = new Set(
        validIncomingProjections.map(({ notificationId }) => notificationId),
      );
      let projections = validIncomingProjections.reduce(
        mergeProjectionIntoState,
        state.projections,
      );

      projections = Object.fromEntries(
        Object.entries(projections).filter(([notificationId, projection]) => {
          if (!isSchemaVersionTwo(projection)) return false;
          if (incomingIds.has(notificationId)) return true;

          const baselineRevision = baseline[notificationId];
          return (
            baselineRevision === undefined ||
            projection.revision > baselineRevision
          );
        }),
      );

      const selectedRoomId =
        state.selectedRoomId && projections[state.selectedRoomId]
          ? state.selectedRoomId
          : null;

      return {
        projections,
        readyRoomsSynchronized: true,
        selectedRoomId,
      };
    }),
  setReadyRoomsSynchronized: (readyRoomsSynchronized) =>
    set({ readyRoomsSynchronized }),
  removeProjection: (notificationId) =>
    set((state) => {
      const { [notificationId]: _removed, ...projections } = state.projections;
      return {
        projections,
        selectedRoomId:
          state.selectedRoomId === notificationId ? null : state.selectedRoomId,
      };
    }),
  selectRoom: (selectedRoomId) => set({ selectedRoomId }),
  clearReadyRooms: () =>
    set({
      projections: {},
      readyRoomsSynchronized: false,
      selectedRoomId: null,
    }),
}));
