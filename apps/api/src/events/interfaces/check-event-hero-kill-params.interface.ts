import type { KillTimerData } from "./kill-timer-data.interface.js";

export interface CheckEventHeroKillParams {
  guildId: string;
  world: string;
  npcId: number;
  npcName: string;
  npcIcon: string;
  npcLvl?: number;
  timerData: KillTimerData;
}

export interface SerializedKillTimerData {
  minSpawnTime: string;
  maxSpawnTime: string;
  memberId: number;
  previousMinSpawnTime: string | null;
  previousMaxSpawnTime: string | null;
  windowOpenedAt: string | null;
}

export interface EventHeroKillJobData extends Omit<
  CheckEventHeroKillParams,
  "timerData"
> {
  timerData: SerializedKillTimerData;
  isManualClose: boolean;
}
