import type {
  PartyReadyRoomInvitationBatch,
  PartyReadyRoomInvitationTarget,
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import {
  partyReadyRoomControllerAcknowledgeInvitation,
  partyReadyRoomControllerReserveInvitations,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";
import {
  isReadyRoomExpired,
  selectOwnedReadyRoom,
  type ReadyRoomCharacterIdentity,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { inviteCharacterToParty } from "@/utils/game/character-actions";

type InvitationIntent = {
  notificationId: string;
  organizerCharacter: ReadyRoomCharacterIdentity;
  targets: PartyReadyRoomInvitationTarget[];
};

const ACKNOWLEDGEMENT_ATTEMPTS = 3;

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

function getInvitableTargets(
  room: PartyReadyRoomOrganizerProjection,
  participantIds?: string[],
): PartyReadyRoomInvitationTarget[] {
  const requestedParticipantIds = participantIds
    ? new Set(participantIds)
    : null;

  return Object.values(room.participants)
    .filter(
      (participant) =>
        (requestedParticipantIds === null ||
          requestedParticipantIds.has(participant.participantId)) &&
        participant.application === "ACCEPTED" &&
        participant.partyPresence === "OUTSIDE",
    )
    .map(({ participantId, applicationVersion }) => ({
      participantId,
      applicationVersion,
    }));
}

function captureInvitationIntent(
  participantIds?: string[],
): InvitationIntent | null {
  const room = selectOwnedReadyRoom(usePartyFinderStore.getState());
  if (!room || !hasReadyRoomGameContext(room)) return null;

  const targets = getInvitableTargets(room, participantIds);
  if (targets.length === 0) return null;

  return {
    notificationId: room.notificationId,
    organizerCharacter: getOrganizerCharacterIdentity(room),
    targets,
  };
}

function getApiErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }
  const data = error.data;
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return null;
  }
  return typeof data.code === "string" ? data.code : null;
}

async function acknowledgeInvitation(
  notificationId: string,
  participantId: string,
  commandId: string,
  outcome: "SENT" | "FAILED",
  attempt = 1,
): Promise<void> {
  try {
    const projection = await partyReadyRoomControllerAcknowledgeInvitation(
      { notificationId },
      { participantId, commandId, outcome },
    );
    usePartyFinderStore
      .getState()
      .mergeProjection(projection as unknown as PartyReadyRoomProjection);
  } catch (error) {
    if (getApiErrorCode(error) === "STALE_COMMAND") return;
    if (attempt < ACKNOWLEDGEMENT_ATTEMPTS) {
      return acknowledgeInvitation(
        notificationId,
        participantId,
        commandId,
        outcome,
        attempt + 1,
      );
    }
    console.warn("Failed to acknowledge a party invitation command", error);
  }
}

function getExecutableTargets(
  room: PartyReadyRoomOrganizerProjection,
  intent: InvitationIntent,
): PartyReadyRoomInvitationTarget[] {
  const capturedTargets = new Map(
    intent.targets.map((target) => [target.participantId, target]),
  );

  return Object.values(room.participants).flatMap((participant) => {
    const capturedTarget = capturedTargets.get(participant.participantId);
    if (
      !capturedTarget ||
      capturedTarget.applicationVersion !== participant.applicationVersion ||
      participant.application !== "ACCEPTED" ||
      participant.partyPresence !== "OUTSIDE"
    ) {
      return [];
    }
    return [capturedTarget];
  });
}

async function executeInvitationIntent(
  intent: InvitationIntent,
): Promise<PartyReadyRoomInvitationBatch> {
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
    throw new Error("Ready Room invitation intent is stale");
  }

  const targets = getExecutableTargets(projection, intent);
  if (targets.length === 0) {
    return { batchId: "", reservations: [] };
  }

  const reservation = await partyReadyRoomControllerReserveInvitations(
    { notificationId: intent.notificationId },
    { targets },
  );
  usePartyFinderStore
    .getState()
    .mergeProjection(
      reservation.projection as unknown as PartyReadyRoomProjection,
    );

  for (const target of reservation.batch.reservations) {
    let outcome: "SENT" | "FAILED" = "FAILED";
    const latestProjection =
      usePartyFinderStore.getState().projections[intent.notificationId];
    const canIssueGameCommand =
      latestProjection?.viewer === "ORGANIZER" &&
      characterIdentitiesMatch(
        getOrganizerCharacterIdentity(latestProjection),
        intent.organizerCharacter,
      ) &&
      hasReadyRoomGameContext(latestProjection);
    if (canIssueGameCommand) {
      try {
        inviteCharacterToParty(target.characterId);
        outcome = "SENT";
      } catch {
        outcome = "FAILED";
      }
    }

    void acknowledgeInvitation(
      intent.notificationId,
      target.participantId,
      target.commandId,
      outcome,
    );
  }

  return reservation.batch as PartyReadyRoomInvitationBatch;
}

export function canEnqueueReadyRoomInvitations(
  participantIds?: string[],
): boolean {
  return captureInvitationIntent(participantIds) !== null;
}

export function enqueueReadyRoomInvitations(
  participantIds?: string[],
): Promise<PartyReadyRoomInvitationBatch> {
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
