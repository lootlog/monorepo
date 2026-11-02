import { randomInt } from "node:crypto";
import { isHeroTrackerName } from "@lootlog/domain/npc-type";
import { NpcTypeEnum as NpcTypeValues } from "@lootlog/schema/npc-type";

type NpcType = (typeof NpcTypeValues)[keyof typeof NpcTypeValues];

/**
 * Every NPC id the API derives instead of taking it from Margonem. Derived ids
 * are negative so they never collide with a runtime id, and manual timers use
 * a positive range above every runtime id.
 */

const MAX_HASHED_KEY_LENGTH = 256;

const hashNpcKey = (key: string): number => {
  const length = Math.min(key.length, MAX_HASHED_KEY_LENGTH);
  let hash = 0;

  for (let i = 0; i < length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  return -Math.abs(hash || 1);
};

export const normalizeNpcName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

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

// Margonem runtime ids stay far below this bound.
const MIN_MANUAL_TIMER_NPC_ID = 1_000_000_000;

const MAX_INTEGER_COLUMN = 2_147_483_647;

/** A new id for a manual timer, which has no Margonem NPC behind it. */
export const newManualTimerNpcId = (): number =>
  randomInt(MIN_MANUAL_TIMER_NPC_ID, MAX_INTEGER_COLUMN);
