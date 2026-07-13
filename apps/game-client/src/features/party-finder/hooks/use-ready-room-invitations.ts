import {
  canEnqueueReadyRoomInvitations,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

export function useReadyRoomInvitations() {
  usePartyFinderStore((state) => state.projections);
  usePartyFinderStore((state) => state.readyRoomsSynchronized);
  useGlobalStore((state) => state.socketState);

  const inviteParticipants = (participantIds?: string[]) =>
    enqueueReadyRoomInvitations(participantIds);

  const canInviteParticipants = (participantIds?: string[]) =>
    canEnqueueReadyRoomInvitations(participantIds);

  return { inviteParticipants, canInviteParticipants };
}
