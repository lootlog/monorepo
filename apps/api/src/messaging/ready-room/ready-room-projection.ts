import type {
  PartyReadyRoomCharacter,
  PartyGatheringCharacter,
  PartyGatheringSummary,
  PartyGatheringVolunteer,
  PartyGatheringUpdateEnvelope,
  PartyReadyRoomClientUpdate,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
  PartyReadyRoomProjectionBase,
} from "@lootlog/schema/party-ready-room";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

function cloneCharacter(
  character: PartyReadyRoomCharacter,
): PartyReadyRoomCharacter {
  const cloned = { ...character };

  if (character.clan) cloned.clan = { ...character.clan };

  return cloned;
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
  const projection: PartyReadyRoomProjectionBase = {
    schemaVersion: 3,
    notificationId: aggregate.notificationId,
    organizerDiscordId: aggregate.organizerDiscordId,
    organizerCharacter: cloneCharacter(aggregate.organizerCharacter),
    guildIds: [...aggregate.guildIds],
    world: aggregate.world,
    status: "ACTIVE",
    revision: aggregate.revision,
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
    expiresAt: aggregate.expiresAt,
    volunteers: createGatheringVolunteers(aggregate),
    partyState: structuredClone(aggregate.partyState ?? { status: "UNKNOWN" }),
  };

  if (aggregate.partyMemberCount !== undefined)
    projection.partyMemberCount = aggregate.partyMemberCount;

  if (aggregate.npc) projection.npc = { ...aggregate.npc };

  if (aggregate.description !== undefined)
    projection.description = aggregate.description;

  if (aggregate.minLvl !== undefined) projection.minLvl = aggregate.minLvl;

  if (aggregate.maxLvl !== undefined) projection.maxLvl = aggregate.maxLvl;

  return projection;
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
  visibleGuildIds: ReadonlyArray<string> = aggregate.guildIds,
): PartyReadyRoomProjection | null {
  if (aggregate.status !== "ACTIVE") return null;
  const base = createProjectionBase(aggregate);
  base.guildIds = base.guildIds.filter((id) => visibleGuildIds.includes(id));

  if (base.guildIds.length === 0) return null;

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
  visibleGuildIds: ReadonlyArray<string> = aggregate.guildIds,
): PartyReadyRoomClientUpdate {
  const projection = createReadyRoomProjection(
    aggregate,
    viewerDiscordId,
    visibleGuildIds,
  );

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

export function createGatheringCharacter(
  character: PartyReadyRoomCharacter,
): PartyGatheringCharacter {
  return {
    characterId: character.characterId,
    nick: character.nick,
    icon: character.icon,
    lvl: character.lvl,
    prof: character.prof,
  };
}

function createGatheringVolunteers(
  aggregate: ReadyRoomAggregate,
): PartyGatheringVolunteer[] {
  return Object.values(aggregate.participants)
    .filter(
      ({ character }) =>
        character.characterId !== aggregate.organizerCharacter.characterId,
    )
    .map(({ character, partyPresence }) => ({
      ...createGatheringCharacter(character),
      partyPresence,
    }));
}

export function createPartyGatheringSummary(
  aggregate: ReadyRoomAggregate,
  visibleGuildIds: ReadonlyArray<string> = aggregate.guildIds,
): PartyGatheringSummary {
  const volunteers = createGatheringVolunteers(aggregate);

  return {
    notificationId: aggregate.notificationId,
    organizerName: aggregate.organizerCharacter.nick,
    organizerDiscordId: aggregate.organizerDiscordId,
    organizerLvl: aggregate.organizerCharacter.lvl,
    organizerProf: aggregate.organizerCharacter.prof,
    applicantCount: volunteers.length,
    inPartyCount: volunteers.filter(
      ({ partyPresence }) => partyPresence === "IN_PARTY",
    ).length,
    ...(aggregate.partyMemberCount !== undefined && {
      partyMemberCount: aggregate.partyMemberCount,
    }),
    revision: aggregate.revision,
    volunteers,
    partyState: structuredClone(aggregate.partyState ?? { status: "UNKNOWN" }),
    guildIds: aggregate.guildIds.filter((id) => visibleGuildIds.includes(id)),
    world: aggregate.world,
    ...(aggregate.description !== undefined && {
      description: aggregate.description,
    }),
    ...(aggregate.minLvl !== undefined && { minLvl: aggregate.minLvl }),
    ...(aggregate.maxLvl !== undefined && { maxLvl: aggregate.maxLvl }),
    ...(aggregate.npc && { npc: { ...aggregate.npc } }),
    createdAt: aggregate.createdAt,
    expiresAt: aggregate.expiresAt,
  };
}

export function createPartyGatheringUpdateEnvelope(
  aggregate: ReadyRoomAggregate,
  guildId: string,
): PartyGatheringUpdateEnvelope {
  return {
    guildId,
    guildIds: [...aggregate.guildIds],
    organizerDiscordId: aggregate.organizerDiscordId,
    ...(aggregate.npc && { npc: { ...aggregate.npc } }),
    world: aggregate.world,
    notificationId: aggregate.notificationId,
    revision: aggregate.revision,
    update:
      aggregate.status === "ACTIVE"
        ? {
            type: "UPSERT",
            gathering: createPartyGatheringSummary(aggregate, [guildId]),
          }
        : {
            type: "REMOVE",
            notificationId: aggregate.notificationId,
            revision: aggregate.revision,
          },
  };
}
