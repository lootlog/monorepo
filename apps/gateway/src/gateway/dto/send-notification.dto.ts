import { NpcType } from 'src/gateway/enums/npc-type.enum';

export class SendNotificationDto {
  guildId: string;
  npc: {
    lvl: number;
    type: NpcType;
  };
}
