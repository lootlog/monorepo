import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
  PartyReadyRoomReadyCheck,
  PartyReadyRoomStatus,
} from "@lootlog/types";

export interface ReadyRoomAggregate {
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
  readyCheck: PartyReadyRoomReadyCheck | null;
  participants: Record<string, PartyReadyRoomParticipant>;
}
