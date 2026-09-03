import type {
  PartyReadyRoomInvitationTarget,
  PartyReadyRoomOrganizerProjection,
} from "@lootlog/schema/party-ready-room";
import { partyReadyRoomControllerResolveInvitationTargets } from "@lootlog/client/main";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useGlobalStore } from "@/store/global.store";
import {
  isReadyRoomExpired,
  selectOwnedReadyRoom,
  type ReadyRoomCharacterIdentity,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { inviteCharacterToParty } from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";

type InvitationIntent = {
  notificationId: string;
  organizerCharacter: ReadyRoomCharacterIdentity;
  participantIds: string[];
};

type InvitationResult = { targets: PartyReadyRoomInvitationTarget[] };

type PendingInvitation = {
  intent: InvitationIntent;
  promise: Promise<InvitationResult>;
  reject: (reason?: unknown) => void;
  resolve: (result: InvitationResult) => void;
};

export const READY_ROOM_INVITATION_PARTICIPANT_CAP = 100;
export const READY_ROOM_INVITATION_TIMEOUT_MS = 5_000;

let activeInvitation: Promise<InvitationResult> | null = null;
let activeAbortController: AbortController | null = null;
let pendingInvitation: PendingInvitation | null = null;
let coordinatorGeneration = 0;

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
    .map(({ participantId }) => participantId)
    .slice(0, READY_ROOM_INVITATION_PARTICIPANT_CAP);
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
    .members.some(({ characterId }) => characterId === target.characterId);
}

async function executeInvitationIntent(
  intent: InvitationIntent,
): Promise<InvitationResult> {
  const room = getCurrentIntentRoom(intent);
  if (!room) throw new Error("Ready Room invitation intent is stale");
  const participantIds = getInvitableParticipantIds(
    room,
    intent.participantIds,
  );
  if (participantIds.length === 0) return { targets: [] };

  const abortController = new AbortController();
  activeAbortController = abortController;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      abortController.abort();
      reject(new Error("Ready Room invitation request timed out"));
    }, READY_ROOM_INVITATION_TIMEOUT_MS);
  });
  let response: Awaited<
    ReturnType<typeof partyReadyRoomControllerResolveInvitationTargets>
  >;

  try {
    response = await Promise.race([
      partyReadyRoomControllerResolveInvitationTargets(
        { notificationId: intent.notificationId },
        { participantIds },
        { signal: abortController.signal },
      ),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
  }
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

function invitationIntentsMatch(
  first: InvitationIntent,
  second: InvitationIntent,
): boolean {
  return (
    first.notificationId === second.notificationId &&
    characterIdentitiesMatch(
      first.organizerCharacter,
      second.organizerCharacter,
    )
  );
}

function mergeInvitationIntents(
  current: InvitationIntent,
  incoming: InvitationIntent,
): InvitationIntent {
  if (!invitationIntentsMatch(current, incoming)) {
    return incoming;
  }

  return {
    ...current,
    participantIds: [
      ...new Set([...current.participantIds, ...incoming.participantIds]),
    ].slice(0, READY_ROOM_INVITATION_PARTICIPANT_CAP),
  };
}

function createPendingInvitation(intent: InvitationIntent): PendingInvitation {
  let resolve!: (result: InvitationResult) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<InvitationResult>(
    (promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    },
  );

  return { intent, promise, reject, resolve };
}

function startInvitation(
  intent: InvitationIntent,
  generation: number,
): Promise<InvitationResult> {
  const invitation = executeInvitationIntent(intent);
  activeInvitation = invitation;

  const settleInvitation = () => {
    if (generation !== coordinatorGeneration) {
      return;
    }

    activeInvitation = null;
    const pending = pendingInvitation;
    pendingInvitation = null;
    if (!pending) {
      return;
    }

    const nextInvitation = startInvitation(pending.intent, generation);
    void nextInvitation.then(pending.resolve, pending.reject);
  };
  void invitation.then(settleInvitation, settleInvitation);

  return invitation;
}

export function canEnqueueReadyRoomInvitations(
  participantIds?: string[],
): boolean {
  return captureInvitationIntent(participantIds) !== null;
}

export function enqueueReadyRoomInvitations(
  participantIds?: string[],
): Promise<InvitationResult> {
  const intent = captureInvitationIntent(participantIds);
  if (!intent) {
    return Promise.reject(new Error("Ready Room invitation is unavailable"));
  }
  if (!activeInvitation) {
    return startInvitation(intent, coordinatorGeneration);
  }

  if (!pendingInvitation) {
    pendingInvitation = createPendingInvitation(intent);
  } else {
    pendingInvitation.intent = mergeInvitationIntents(
      pendingInvitation.intent,
      intent,
    );
  }

  return pendingInvitation.promise;
}

export function disposeReadyRoomInvitationCoordinator(): void {
  coordinatorGeneration += 1;
  activeAbortController?.abort();
  activeAbortController = null;
  activeInvitation = null;
  pendingInvitation?.resolve({ targets: [] });
  pendingInvitation = null;
}

export const resetReadyRoomInvitationCoordinatorForTests =
  disposeReadyRoomInvitationCoordinator;
