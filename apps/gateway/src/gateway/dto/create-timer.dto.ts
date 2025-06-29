import { NpcType } from 'src/gateway/enums/npc-type.enum';

export class CreateTimerDto {
  guildId: string;
  minSpawnTime: number;
  maxSpawnTime: number;
  name: string;
  type: NpcType;
  location: string;
  lvl?: number;
}
