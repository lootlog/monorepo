import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { useReadyRooms } from "@/features/party-finder/hooks/use-ready-rooms";

export function useReadyRoomInvitations() {
  // canEnqueueReadyRoomInvitations reads the Ready Room cache, the socket and
  // the active character directly, so the component has to re-render whenever
  // any of them changes — switching character alone can enable or disable it.
  const { data: readyRooms } = useReadyRooms();
  const socketState = useGlobalStore((state) => state.socketState);
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  // The coordinator re-reads every source itself; the subscribed values gate
  // it as well so the check changes with them. React Compiler keys a caller's
  // `canInviteParticipants()` on this function, and a stable one would keep
  // the answer from the first render.
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
