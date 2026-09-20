import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import {
  EMPTY_READY_ROOM_CACHE,
  mergeReadyRoomProjections,
  type ReadyRoomCache,
} from "@/features/party-finder/ready-room-cache";

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

/**
 * Seeds the Ready Room query entry the way a completed synchronization would,
 * so a test can start from a known collection without stubbing the list call.
 */
export function seedReadyRoomCache(
  client: QueryClient,
  projections: PartyReadyRoomProjection[],
): void {
  client.setQueryData<ReadyRoomCache>(queryKeys.readyRooms(), {
    ...mergeReadyRoomProjections(EMPTY_READY_ROOM_CACHE, projections),
    listAppliedAt: Date.now(),
  });
}

export function readSeededReadyRoomCache(client: QueryClient): ReadyRoomCache {
  return (
    client.getQueryData<ReadyRoomCache>(queryKeys.readyRooms()) ??
    EMPTY_READY_ROOM_CACHE
  );
}
