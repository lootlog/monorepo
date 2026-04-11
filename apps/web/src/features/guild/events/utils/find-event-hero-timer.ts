import type { EventTimer } from "../types/api";

interface FindEventHeroTimerOptions {
  heroNpcId?: number | null;
  heroName?: string | null;
}

export const findEventHeroTimer = (
  timers: EventTimer[] | undefined,
  { heroNpcId, heroName }: FindEventHeroTimerOptions,
) => {
  if (!timers || timers.length === 0) {
    return undefined;
  }

  if (heroNpcId !== null && heroNpcId !== undefined && heroName) {
    const exactMatch = timers.find(
      (timer) => timer.npcId === heroNpcId && timer.npc?.name === heroName,
    );

    if (exactMatch) {
      return exactMatch;
    }
  }

  if (heroName) {
    const byName = timers.find((timer) => timer.npc?.name === heroName);

    if (byName) {
      return byName;
    }
  }

  if (heroNpcId !== null && heroNpcId !== undefined) {
    return timers.find((timer) => timer.npcId === heroNpcId);
  }

  return undefined;
};
