import { partition } from "es-toolkit";

// Tropiciele Herosów is an event the game runs every few months: trackers
// open the hideouts of a few heroes, who are fought there as colossi that
// keep the hero's own sprite. Each edition's items name it after the hero,
// without a year, such as `Dzień Młodego Smoka`.
const HERO_TRACKERS_EVENT = /^Dzień (?!.*\b\d{4}\b)/;

const HERO_SPRITES = "her/";

/** Whether an item's event is an edition of Tropiciele Herosów. */
export const isHeroTrackersEvent = (label: string) =>
  HERO_TRACKERS_EVENT.test(label);

/**
 * Whether the monster is a hero fought in its hideout during Tropiciele
 * Herosów, a colossus apart from the hero itself.
 */
export const isHeroTrackersMonster = (npc: {
  type: string | null;
  icon: string | null;
}) => npc.type === "COLOSSUS" && npc.icon?.startsWith(HERO_SPRITES) === true;

/**
 * Events with the game's own events ahead of Tropiciele Herosów editions,
 * which return every few months; each group keeps its order.
 */
export const eventsByPriority = (events: readonly string[]) => {
  const [editions, others] = partition(events, isHeroTrackersEvent);

  return [...others, ...editions];
};
