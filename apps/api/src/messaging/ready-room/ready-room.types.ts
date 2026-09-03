import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
  PartyReadyRoomStatus,
} from "@lootlog/schema/party-ready-room";

export interface ReadyRoomAggregate {
  schemaVersion: 3;
  notificationId: string;
  organizerDiscordId: string;
  organizerCharacter: PartyReadyRoomCharacter;
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  status: PartyReadyRoomStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  participants: Record<string, PartyReadyRoomParticipant>;
}
