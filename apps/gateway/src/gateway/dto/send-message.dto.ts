import { Npc } from '../types/npc.type';

export class SendMessageDto {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: Npc;
}

export enum MessageType {
  NORMAL = 'NORMAL',
  NOTIFICATION = 'NOTIFICATION',
  NPC = 'NPC',
}

export type ChatCharacterData = {
  nick: string;
  id: number;
  acc: number;
  lvl: number;
  prof: string;
  icon: string;
};
