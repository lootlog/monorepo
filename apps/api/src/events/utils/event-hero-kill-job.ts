import type {
  EventHeroKillJobData,
  SerializedKillTimerData,
} from '../interfaces/check-event-hero-kill-params.interface';
import type { KillTimerData } from '../interfaces/kill-timer-data.interface';

export const EVENT_HERO_KILL_JOB_NAME = 'process-event-hero-kill';
const MANUAL_CLOSE_SUFFIX = 'manual';
const TIMER_UPDATE_SUFFIX = 'timer';

function toRequiredDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field} in event hero kill job payload`);
  }
  return parsed;
}

function toOptionalDate(value: string | null, field: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field} in event hero kill job payload`);
  }
  return parsed;
}

export function serializeKillTimerData(
  timerData: KillTimerData,
): SerializedKillTimerData {
  return {
    minSpawnTime: timerData.minSpawnTime.toISOString(),
    maxSpawnTime: timerData.maxSpawnTime.toISOString(),
    memberId: timerData.memberId,
    previousMinSpawnTime: timerData.previousMinSpawnTime?.toISOString() ?? null,
    previousMaxSpawnTime: timerData.previousMaxSpawnTime?.toISOString() ?? null,
    windowOpenedAt: timerData.windowOpenedAt?.toISOString() ?? null,
  };
}

export function deserializeKillTimerData(
  timerData: SerializedKillTimerData,
): KillTimerData {
  return {
    minSpawnTime: toRequiredDate(timerData.minSpawnTime, 'minSpawnTime'),
    maxSpawnTime: toRequiredDate(timerData.maxSpawnTime, 'maxSpawnTime'),
    memberId: timerData.memberId,
    previousMinSpawnTime: toOptionalDate(
      timerData.previousMinSpawnTime,
      'previousMinSpawnTime',
    ),
    previousMaxSpawnTime: toOptionalDate(
      timerData.previousMaxSpawnTime,
      'previousMaxSpawnTime',
    ),
    windowOpenedAt: toOptionalDate(timerData.windowOpenedAt, 'windowOpenedAt'),
  };
}

export function getEventHeroKillWindowKey(timerData: KillTimerData): string {
  const windowDate =
    timerData.windowOpenedAt ??
    timerData.previousMinSpawnTime ??
    timerData.minSpawnTime;
  return String(windowDate.getTime());
}

export function buildEventHeroKillJobId(data: {
  guildId: string;
  world: string;
  npcId: number;
  windowKey: string;
  isManualClose: boolean;
}): string {
  const mode = data.isManualClose ? MANUAL_CLOSE_SUFFIX : TIMER_UPDATE_SUFFIX;
  return `event-hero-kill:${data.guildId}:${data.world}:${data.npcId}:${data.windowKey}:${mode}`;
}

export function buildEventHeroKillDedupKey(data: {
  guildId: string;
  world: string;
  npcId: number;
  windowKey: string;
  isManualClose: boolean;
}): string {
  const mode = data.isManualClose ? MANUAL_CLOSE_SUFFIX : TIMER_UPDATE_SUFFIX;
  return `event:hero:kill:dedup:${data.guildId}:${data.world}:${data.npcId}:${data.windowKey}:${mode}`;
}

export function buildEventHeroKillHeroDedupKey(data: {
  guildId: string;
  world: string;
  npcId: number;
  heroId: string;
  windowKey: string;
  isManualClose: boolean;
}): string {
  const mode = data.isManualClose ? MANUAL_CLOSE_SUFFIX : TIMER_UPDATE_SUFFIX;
  return `event:hero:kill:dedup:${data.guildId}:${data.world}:${data.npcId}:${data.heroId}:${data.windowKey}:${mode}`;
}

export function createEventHeroKillJobData(
  params: {
    guildId: string;
    world: string;
    npcId: number;
    npcName: string;
    npcIcon: string;
    npcLvl?: number;
    timerData: KillTimerData;
  },
  isManualClose = false,
): EventHeroKillJobData {
  return {
    ...params,
    timerData: serializeKillTimerData(params.timerData),
    isManualClose,
  };
}
