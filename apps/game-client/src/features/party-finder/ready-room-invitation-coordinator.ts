import type {
  PartyReadyRoomInvitationTarget,
  PartyReadyRoomOrganizerProjection,
} from "@lootlog/types";
import { partyReadyRoomControllerResolveInvitationTargets } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";
import {
  isReadyRoomExpired,
  selectOwnedReadyRoom,
  type ReadyRoomCharacterIdentity,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { inviteCharacterToParty } from "@/utils/game/character-actions";

type InvitationIntent = {
  notificationId: string;
  organizerCharacter: ReadyRoomCharacterIdentity;
  participantIds: string[];
};

let invitationQueue = Promise.resolve();

function characterIdentitiesMatch(
  first: ReadyRoomCharacterIdentity | null,
  second: ReadyRoomCharacterIdentity,
): boolean {
  return (
    first?.accountId === second.accountId &&
    first.characterId === second.characterId
  );
}

function getOrganizerCharacterIdentity(
  room: PartyReadyRoomOrganizerProjection,
): ReadyRoomCharacterIdentity {
  return {
    accountId: room.organizerCharacter.accountId,
    characterId: room.organizerCharacter.characterId,
  };
}

function hasReadyRoomGameContext(
  room: PartyReadyRoomOrganizerProjection,
): boolean {
  const { connected, joined } = useGlobalStore.getState().socketState;
  const { readyRoomsSynchronized } = usePartyFinderStore.getState();
  return (
    connected &&
    joined &&
    readyRoomsSynchronized &&
    !isReadyRoomExpired(room) &&
    characterIdentitiesMatch(
      getCurrentReadyRoomCharacterIdentity(),
      getOrganizerCharacterIdentity(room),
    )
  );
}

function getInvitableParticipantIds(
  room: PartyReadyRoomOrganizerProjection,
  participantIds?: string[],
): string[] {
  const requestedParticipantIds = participantIds
    ? new Set(participantIds)
    : null;
  return Object.values(room.participants)
    .filter(
      (participant) =>
        (requestedParticipantIds === null ||
          requestedParticipantIds.has(participant.participantId)) &&
        participant.partyPresence === "OUTSIDE",
    )
    .map(({ participantId }) => participantId);
}

function captureInvitationIntent(
  participantIds?: string[],
): InvitationIntent | null {
  const room = selectOwnedReadyRoom(usePartyFinderStore.getState());
  if (!room || !hasReadyRoomGameContext(room)) return null;
  const capturedParticipantIds = getInvitableParticipantIds(
    room,
    participantIds,
  );
  if (capturedParticipantIds.length === 0) return null;
  return {
    notificationId: room.notificationId,
    organizerCharacter: getOrganizerCharacterIdentity(room),
    participantIds: capturedParticipantIds,
  };
}

function getCurrentIntentRoom(
  intent: InvitationIntent,
): PartyReadyRoomOrganizerProjection | null {
  const projection =
    usePartyFinderStore.getState().projections[intent.notificationId];
  if (
    !projection ||
    projection.viewer !== "ORGANIZER" ||
    !characterIdentitiesMatch(
      getOrganizerCharacterIdentity(projection),
      intent.organizerCharacter,
    ) ||
    !hasReadyRoomGameContext(projection)
  ) {
    return null;
  }
  return projection;
}

function canIssueInvitationTarget(
  intent: InvitationIntent,
  target: PartyReadyRoomInvitationTarget,
): boolean {
  const room = getCurrentIntentRoom(intent);
  const participant = room?.participants[target.participantId];
  if (
    !participant ||
    participant.character.characterId !== target.characterId ||
    participant.partyPresence !== "OUTSIDE"
  ) {
    return false;
  }
  return !usePartyStore
    .getState()
    .members.some(({ id }) => String(id) === target.characterId);
}

async function executeInvitationIntent(
  intent: InvitationIntent,
): Promise<{ targets: PartyReadyRoomInvitationTarget[] }> {
  const room = getCurrentIntentRoom(intent);
  if (!room) throw new Error("Ready Room invitation intent is stale");
  const participantIds = getInvitableParticipantIds(
    room,
    intent.participantIds,
  );
  if (participantIds.length === 0) return { targets: [] };

  const response = await partyReadyRoomControllerResolveInvitationTargets(
    { notificationId: intent.notificationId },
    { participantIds },
  );
  for (const target of response.targets) {
    if (!canIssueInvitationTarget(intent, target)) continue;
    try {
      inviteCharacterToParty(target.characterId);
    } catch (error) {
      console.warn("Failed to invite a Ready Room participant", error);
    }
  }
  return response as { targets: PartyReadyRoomInvitationTarget[] };
}

export function canEnqueueReadyRoomInvitations(
  participantIds?: string[],
): boolean {
  return captureInvitationIntent(participantIds) !== null;
}

export function enqueueReadyRoomInvitations(
  participantIds?: string[],
): Promise<{ targets: PartyReadyRoomInvitationTarget[] }> {
  const intent = captureInvitationIntent(participantIds);
  if (!intent) {
    return Promise.reject(new Error("Ready Room invitation is unavailable"));
  }
  const result = invitationQueue.then(() => executeInvitationIntent(intent));
  invitationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function resetReadyRoomInvitationCoordinatorForTests(): void {
  invitationQueue = Promise.resolve();
}
