import { Npc } from 'src/gateway/types/npc.type';

export class CreateTimerDto {
  guildId: string;
  minSpawnTime: number;
  maxSpawnTime: number;
  npc: Npc;
  location: string;
}
