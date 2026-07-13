import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { create } from "zustand";

export interface PartyFinderState {
  projections: Record<string, PartyReadyRoomProjection>;
  selectedRoomId: string | null;
  mergeProjection: (projection: PartyReadyRoomProjection) => void;
  mergeProjections: (projections: PartyReadyRoomProjection[]) => void;
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

export function selectPendingReadyRoomIds(state: PartyFinderState): string[] {
  return Object.values(state.projections)
    .filter(
      (projection) =>
        projection.viewer === "PARTICIPANT" &&
        projection.status === "ACTIVE" &&
        projection.participant.application === "APPLIED",
    )
    .map(({ notificationId }) => notificationId);
}

export function selectAcceptedReadyRoomId(
  state: PartyFinderState,
): string | null {
  return (
    Object.values(state.projections).find(
      (projection) =>
        projection.viewer === "PARTICIPANT" &&
        projection.status === "ACTIVE" &&
        projection.participant.application === "ACCEPTED",
    )?.notificationId ?? null
  );
}

function mergeProjectionIntoState(
  projections: Record<string, PartyReadyRoomProjection>,
  projection: PartyReadyRoomProjection,
): Record<string, PartyReadyRoomProjection> {
  const current = projections[projection.notificationId];
  if (current && current.revision >= projection.revision) return projections;
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
  clearReadyRooms: () => set({ projections: {}, selectedRoomId: null }),
}));
