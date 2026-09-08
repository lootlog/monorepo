import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
} from "@lootlog/schema/party-ready-room";
export function createReadyRoomParticipant(
  participantId: string,
  characterId: string,
): PartyReadyRoomParticipant {
  return {
    participantId,
    discordId: `discord-${participantId}`,
    character: {
      accountId: `account-${participantId}`,
      characterId,
      icon: "participant.gif",
      lvl: 190,
      nick: participantId,
      prof: "m",
    },
    partyPresence: "OUTSIDE",
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
  };
}

const participant = createReadyRoomParticipant(
  "participant-1",
  "participant-character",
);

export const readyRoomOrganizerFixture = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2999-07-13T10:30:00.000Z",
  viewer: "ORGANIZER",
  organizerCharacter: {
    accountId: "organizer-account",
    characterId: "organizer-character",
    icon: "character.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  participants: { "participant-1": participant },
  ownedParticipantIds: [],
} satisfies PartyReadyRoomOrganizerProjection;
