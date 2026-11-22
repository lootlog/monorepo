import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { useReadyRooms } from "@/features/party-finder/hooks/use-ready-rooms";

export function useReadyRoomInvitations() {
  const { data: readyRooms } = useReadyRooms();
  const socketState = useGlobalStore((state) => state.socketState);
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  const canInviteParticipants = (participantIds?: string[]) =>
    readyRooms !== undefined &&
    socketState.connected &&
    socketState.joined &&
    accountId !== undefined &&
    characterId !== undefined &&
    canEnqueueReadyRoomInvitations(participantIds);

  return {
    inviteParticipants: enqueueReadyRoomInvitations,
    canInviteParticipants,
  };
}
