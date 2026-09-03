import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomClientUpdate,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
  PartyReadyRoomProjectionBase,
} from "@lootlog/schema/party-ready-room";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

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
  };
}

function createProjectionBase(
  aggregate: ReadyRoomAggregate,
): PartyReadyRoomProjectionBase {
  return {
    schemaVersion: 3,
    notificationId: aggregate.notificationId,
    organizerDiscordId: aggregate.organizerDiscordId,
    organizerCharacter: cloneCharacter(aggregate.organizerCharacter),
    guildIds: [...aggregate.guildIds],
    world: aggregate.world,
    description: aggregate.description,
    minLvl: aggregate.minLvl,
    maxLvl: aggregate.maxLvl,
    status: "ACTIVE",
    revision: aggregate.revision,
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
    expiresAt: aggregate.expiresAt,
  };
}

export function getReadyRoomActiveRecipientDiscordIds(
  aggregate: ReadyRoomAggregate,
): string[] {
  const participantDiscordIds = Object.values(aggregate.participants).map(
    ({ discordId }) => discordId,
  );

  return [...new Set([aggregate.organizerDiscordId, ...participantDiscordIds])];
}

export function createReadyRoomProjection(
  aggregate: ReadyRoomAggregate,
  viewerDiscordId: string,
): PartyReadyRoomProjection | null {
  if (aggregate.status !== "ACTIVE") return null;
  const base = createProjectionBase(aggregate);

  if (viewerDiscordId === aggregate.organizerDiscordId) {
    return {
      ...base,
      viewer: "ORGANIZER",
      participants: Object.fromEntries(
        Object.entries(aggregate.participants).map(
          ([participantId, participant]) => [
            participantId,
            cloneParticipant(participant),
          ],
        ),
      ),
      ownedParticipantIds: Object.values(aggregate.participants)
        .filter(({ discordId }) => discordId === viewerDiscordId)
        .map(({ participantId }) => participantId),
    };
  }

  const participants = Object.fromEntries(
    Object.values(aggregate.participants)
      .filter(({ discordId }) => discordId === viewerDiscordId)
      .map((participant) => [
        participant.participantId,
        cloneParticipant(participant),
      ]),
  );
  if (Object.keys(participants).length === 0) {
    return null;
  }

  return {
    ...base,
    viewer: "PARTICIPANT",
    participants,
  };
}

export function createReadyRoomClientUpdate(
  aggregate: ReadyRoomAggregate,
  viewerDiscordId: string,
): PartyReadyRoomClientUpdate {
  const projection = createReadyRoomProjection(aggregate, viewerDiscordId);

  if (!projection) {
    return {
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: aggregate.notificationId,
      revision: aggregate.revision,
    };
  }

  return { schemaVersion: 3, type: "UPSERT", projection };
}
