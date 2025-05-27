export class CreateTimerDto {
  guildId: string;
  minSpawnTime: number;
  maxSpawnTime: number;
  name: string;
  type: string;
  location: string;
}
