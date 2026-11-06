import type {
  PartyGatheringSummary,
  PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";

/** The organizer character as a gathering card shows it. */
export type GatheringOrganizer = {
  nick: string;
  lvl?: number;
  prof?: string;
  clanName?: string;
};

export const getSummaryOrganizer = (
  gathering: PartyGatheringSummary,
): GatheringOrganizer => ({
  nick: gathering.organizerName,
  lvl: gathering.organizerLvl,
  prof: gathering.organizerProf,
  clanName: gathering.organizerClan?.name,
});

export const getRoomOrganizer = (
  room: PartyReadyRoomProjection,
): GatheringOrganizer => ({
  nick: room.organizerCharacter.nick,
  lvl: room.organizerCharacter.lvl,
  prof: room.organizerCharacter.prof,
  clanName: room.organizerCharacter.clan?.name,
});
