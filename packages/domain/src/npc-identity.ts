import { normalizeNpcName } from "@lootlog/schema/npc-identity";
import { NpcTypeEnum as NpcTypeValues } from "@lootlog/schema/npc-type";
import { isHeroTrackerName } from "./npc-type.js";

type NpcType = (typeof NpcTypeValues)[keyof typeof NpcTypeValues];

/**
 * Every NPC id Lootlog derives instead of taking it from Margonem. Derived ids
 * are negative so they never collide with a runtime id, and manual timers use
 * a positive range above every runtime id.
 */

const MAX_HASHED_KEY_LENGTH = 256;

/**
 * A negative id derived from a key with Java's string hash. Kill tables, timer
 * keys, event records and notification mutes store these ids.
 */
export const hashNpcKey = (key: string): number => {
  const length = Math.min(key.length, MAX_HASHED_KEY_LENGTH);
  let hash = 0;

  for (let i = 0; i < length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  return -Math.abs(hash || 1);
};

/**
 * A Hero Tracker moves to another hiding place each round and may get another
 * runtime id there, but only one tracker of each name exists on a world.
 */
const getHeroTrackerNpcId = (name: string): number =>
  hashNpcKey(`hero-tracker:${normalizeNpcName(name)}`);

/** The id kills of an NPC are counted under. */
export const getKillNpcId = (
  npc: { readonly id: number; readonly name: string },
  npcType: NpcType,
): number => {
  // Every colossus spawn gets its own runtime id.
  if (npcType === NpcTypeValues.COLOSSUS) return hashNpcKey(npc.name);

  if (isHeroTrackerName(npc.name)) return getHeroTrackerNpcId(npc.name);

  return Math.abs(npc.id);
};

/** The id a timer of a Margonem NPC is stored under. */
export const getTimerNpcId = (npc: {
  readonly id: number;
  readonly name: string;
}): number =>
  isHeroTrackerName(npc.name) ? getHeroTrackerNpcId(npc.name) : npc.id;

/**
 * An event hero is configured before anyone reports its runtime id; until
 * then its timers and kills use an id derived from the hero.
 */
export const getEventHeroNpcId = (hero: {
  readonly id: string;
  readonly npcId: number | null;
}): number => hero.npcId ?? getEventHeroSyntheticNpcId(hero.id);

export const getEventHeroSyntheticNpcId = (heroId: string): number =>
  hashNpcKey(heroId);

/** The `margonemType` a manual timer's NPC carries; no Margonem NPC has it. */
export const TIMER_TYPES = {
  CUSTOM_MANUAL: 999,
} as const;
