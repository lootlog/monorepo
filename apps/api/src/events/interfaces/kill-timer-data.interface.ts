export interface KillTimerData {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  memberId: number;
  previousMinSpawnTime: Date | null;
  previousMaxSpawnTime: Date | null;
  windowOpenedAt: Date | null;
}
