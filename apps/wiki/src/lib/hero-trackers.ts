import { partition } from "es-toolkit";

const HERO_TRACKERS_EVENT = /^Dzień (?!.*\b\d{4}\b)/;

export const isHeroTrackersEvent = (label: string) =>
  HERO_TRACKERS_EVENT.test(label);

export const eventsByPriority = (events: readonly string[]) => {
  const [editions, others] = partition(events, isHeroTrackersEvent);

  return [...others, ...editions];
};
