import { NpcType } from 'src/gateway/enums/npc-type.enum';
import { Npc } from 'src/gateway/types/npc.type';

export class SendNotificationDto {
  guildId: string;
  npc: Npc;
}
