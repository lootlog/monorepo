import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
  PartyReadyRoomProjectionBase,
} from "@lootlog/types";
import type { ReadyRoomAggregate } from "src/messaging/ready-room/ready-room.types";

function cloneCharacter(
  character: PartyReadyRoomCharacter,
): PartyReadyRoomCharacter {
  return {
    ...character,
    ...(character.clan ? { clan: { ...character.clan } } : {}),
  };
}

function cloneParticipant(
  participant: PartyReadyRoomParticipant,
): PartyReadyRoomParticipant {
  return {
    ...participant,
    character: cloneCharacter(participant.character),
    invitation: { ...participant.invitation },
  };
}

function createProjectionBase(
  aggregate: ReadyRoomAggregate,
): PartyReadyRoomProjectionBase {
  return {
    notificationId: aggregate.notificationId,
    organizerDiscordId: aggregate.organizerDiscordId,
    organizerCharacter: cloneCharacter(aggregate.organizerCharacter),
    guildIds: [...aggregate.guildIds],
    world: aggregate.world,
    description: aggregate.description,
    minLvl: aggregate.minLvl,
    maxLvl: aggregate.maxLvl,
    status: aggregate.status,
    revision: aggregate.revision,
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
    expiresAt: aggregate.expiresAt,
    readyCheck: aggregate.readyCheck ? { ...aggregate.readyCheck } : null,
  };
}

export function getReadyRoomActiveRecipientDiscordIds(
  aggregate: ReadyRoomAggregate,
): string[] {
  const participantDiscordIds = Object.values(aggregate.participants)
    .filter(
      ({ application }) =>
        application === "APPLIED" || application === "ACCEPTED",
    )
    .map(({ discordId }) => discordId);

  return [aggregate.organizerDiscordId, ...participantDiscordIds];
}

export function createReadyRoomProjection(
  aggregate: ReadyRoomAggregate,
  viewerDiscordId: string,
): PartyReadyRoomProjection | null {
  const base = createProjectionBase(aggregate);

  if (viewerDiscordId === aggregate.organizerDiscordId) {
    return {
      ...base,
      viewer: "ORGANIZER",
      participants: Object.fromEntries(
        Object.entries(aggregate.participants).map(
          ([discordId, participant]) => [
            discordId,
            cloneParticipant(participant),
          ],
        ),
      ),
    };
  }

  const participant = aggregate.participants[viewerDiscordId];
  if (!participant) {
    return null;
  }

  return {
    ...base,
    viewer: "PARTICIPANT",
    participant: cloneParticipant(participant),
  };
}
