import { Npc } from "../types/npc.type";

export class SendMessageDto {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: Npc;
  partyGathering?: PartyGatheringData;
}

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

export type PartyGatheringData = {
  notificationId: string;
  discordId: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
};

export type ChatCharacterData = {
  nick: string;
  id: number;
  acc: number;
  lvl: number;
  prof: string;
  icon: string;
};
