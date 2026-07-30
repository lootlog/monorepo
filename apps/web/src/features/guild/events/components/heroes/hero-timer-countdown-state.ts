import type { EventTimer } from "../../types/api";

export type HeroTimerCountdownPhase = "waiting" | "open" | "expired";

export interface HeroTimerCountdownState {
  phase: HeroTimerCountdownPhase;
  timeLeftMilliseconds: number;
}

export const getHeroTimerCountdownState = (
  timer: EventTimer,
  currentTimestamp: number,
): HeroTimerCountdownState => {
  const minSpawnTimestamp = new Date(timer.minSpawnTime).getTime();
  const maxSpawnTimestamp = new Date(timer.maxSpawnTime).getTime();

  if (currentTimestamp < minSpawnTimestamp) {
    return {
      phase: "waiting",
      timeLeftMilliseconds: minSpawnTimestamp - currentTimestamp,
    };
  }

  if (currentTimestamp < maxSpawnTimestamp) {
    return {
      phase: "open",
      timeLeftMilliseconds: maxSpawnTimestamp - currentTimestamp,
    };
  }

  return {
    phase: "expired",
    timeLeftMilliseconds: 0,
  };
};
