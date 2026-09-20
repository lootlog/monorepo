import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { useReadyRooms } from "@/features/party-finder/hooks/use-ready-rooms";

export function useReadyRoomInvitations() {
  // canInviteParticipants reads the Ready Room cache, the socket and the
  // active character directly, so the component has to re-render whenever any
  // of them changes — switching character alone can enable or disable it.
  useReadyRooms();
  useGlobalStore((state) => state.socketState);
  useGameStore((state) => state.game?.hero.accountId);
  useGameStore((state) => state.game?.hero.characterId);

  return {
    inviteParticipants: enqueueReadyRoomInvitations,
    canInviteParticipants: canEnqueueReadyRoomInvitations,
  };
}
