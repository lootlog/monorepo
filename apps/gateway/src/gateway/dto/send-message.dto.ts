import { Npc } from '../types/npc.type';

export class SendMessageDto {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
  type: MessageType;
  npc?: Npc;
}

export enum MessageType {
  NORMAL,
  NOTIFICATION,
  NPC,
}
