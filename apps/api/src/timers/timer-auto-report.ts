import {
  getNpcType,
  isHeroTrackerName,
  MIN_TIMER_NPC_WT,
} from "@lootlog/domain/npc-type";
import {
  DEFAULT_RESPAWN_RANDOMNESS,
  HERO_TRACKER_RESP_BASE_SECONDS,
  isSameHeroTrackerEntrance,
  spawnWindowFromRespawn,
} from "@lootlog/domain/timers";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { timerTable } from "#src/database/drizzle/timer.schema";
import { getProfByShortname } from "@lootlog/domain/profession";
import { InvalidRequestError } from "@lootlog/protocol/http/errors";
import { TIMER_LIMITS } from "#src/timers/timer-limits";
import { ErrorKey } from "#src/timers/error-key";
import type { CreateAutoTimerRequest } from "#src/contracts/timers/schemas";

// A Hero Tracker template has no weight; its name alone admits it.
export const hasTimerWeight = (payload: CreateAutoTimerRequest) =>
  payload.npc.wt >= MIN_TIMER_NPC_WT || isHeroTrackerName(payload.npc.name);

/**
 * When a reported Hero Tracker entrance closes. The countdown is placed on the
 * server clock, so a reporter's clock cannot shift the window; deployed Game
 * clients still send their own close time.
 */
export const getReportedEntranceClosesAt = (
  payload: CreateAutoTimerRequest,
  now: Date,
): Date | null => {
  if (payload.entranceSecondsLeft !== undefined)
    return new Date(now.getTime() + payload.entranceSecondsLeft * 1000);

  return payload.entranceClosesAt ? new Date(payload.entranceClosesAt) : null;
};

/**
 * The respawn an entrance report counts. A base observed when a tracker left
 * this world stays authoritative for the following entrances: clients older
 * than the world's respawn multiplier report the public default on every
 * world. A stored public default is no observation, so the report replaces it.
 */
export const getEntranceRespBaseSeconds = (
  payload: CreateAutoTimerRequest,
  previousTimer: typeof timerTable.$inferSelect | null,
) =>
  previousTimer &&
  previousTimer.latestRespBaseSeconds > 0 &&
  previousTimer.latestRespBaseSeconds !== HERO_TRACKER_RESP_BASE_SECONDS
    ? previousTimer.latestRespBaseSeconds
    : payload.respBaseSeconds;

/**
 * The stored timer when a report repeats the entrance it already counts:
 * every player near a tracker sees the same countdown.
 */
export const findSameEntranceTimer = (
  timer: typeof timerTable.$inferSelect | null,
  entranceClosesAt: Date | null,
) =>
  timer &&
  entranceClosesAt &&
  timer.deletedAt === null &&
  timer.entranceClosesAt !== null &&
  isSameHeroTrackerEntrance(
    timer.entranceClosesAt.getTime(),
    entranceClosesAt.getTime(),
  )
    ? timer
    : null;

/** A tracker respawns after its entrance closes, not when it is reported. */
const getRespawnStart = (payload: CreateAutoTimerRequest, now: Date) => {
  const entranceClosesAt = getReportedEntranceClosesAt(payload, now);

  if (!entranceClosesAt) return now;

  const offsetSeconds = (entranceClosesAt.getTime() - now.getTime()) / 1000;

  if (
    !isHeroTrackerName(payload.npc.name) ||
    offsetSeconds > TIMER_LIMITS.MAX_HERO_TRACKER_ENTRANCE_SECONDS ||
    offsetSeconds < -TIMER_LIMITS.MAX_HERO_TRACKER_ENTRANCE_PAST_SECONDS
  ) {
    throw new InvalidRequestError({
      code: ErrorKey.INVALID_ENTRANCE_CLOSE_TIME,
    });
  }

  return entranceClosesAt;
};

export const calculateSpawnWindow = (
  payload: CreateAutoTimerRequest,
  now: Date,
  respBaseSeconds = payload.respBaseSeconds,
) => {
  if (payload.customMinSpawnTime && payload.customMaxSpawnTime) {
    const minSpawnTime = new Date(payload.customMinSpawnTime);
    const maxSpawnTime = new Date(payload.customMaxSpawnTime);

    if (maxSpawnTime <= minSpawnTime) {
      throw new InvalidRequestError({
        code: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
      });
    }

    if (minSpawnTime < now) {
      throw new InvalidRequestError({ code: ErrorKey.SPAWN_TIME_IN_PAST });
    }

    if (
      maxSpawnTime.getTime() - minSpawnTime.getTime() >
      TIMER_LIMITS.MAX_SPAWN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ) {
      throw new InvalidRequestError({
        code: ErrorKey.SPAWN_WINDOW_TOO_LARGE,
      });
    }

    return { minSpawnTime, maxSpawnTime };
  }

  const start = getRespawnStart(payload, now).getTime();

  const { minOffsetMs, maxOffsetMs } = spawnWindowFromRespawn({
    respBaseSeconds,
    respawnRandomness: payload.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
  });

  return {
    minSpawnTime: new Date(start + minOffsetMs),
    maxSpawnTime: new Date(start + maxOffsetMs),
  };
};

export const makeNpc = (
  payload: CreateAutoTimerRequest,
  knownTemplateId: number | null = null,
) => ({
  id: payload.npc.id,
  // Older clients omit the template; keep the one observed for this spawn.
  templateId: payload.npc.templateId ?? knownTemplateId,
  name: payload.npc.name,
  prof: getProfByShortname(payload.npc.prof ?? ""),
  location: payload.npc.location,
  wt: String(payload.npc.wt),
  lvl: payload.npc.lvl,
  type: getNpcType(NpcType, {
    wt: payload.npc.wt,
    prof: payload.npc.prof ?? "",
    type: payload.npc.type,
    icon: payload.npc.icon,
    isHeroFromEvent: payload.npc.isHeroFromEvent,
    name: payload.npc.name,
  }),
  icon: normalizeNpcIcon(payload.npc.icon),
  margonemType: String(payload.npc.type),
});
