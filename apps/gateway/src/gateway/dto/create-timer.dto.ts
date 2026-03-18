import type { Npc } from "src/gateway/types/npc.type";

export class CreateTimerDto {
  guildId: string;
  world: string;
  minSpawnTime: number;
  maxSpawnTime: number;
  npc: Npc;
  location: string;
}
