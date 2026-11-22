import { normalizeNpcName } from "@lootlog/schema/npc-identity";
import { NpcTypeEnum as NpcTypeValues } from "@lootlog/schema/npc-type";
import { isHeroTrackerName } from "./npc-type.js";

type NpcType = (typeof NpcTypeValues)[keyof typeof NpcTypeValues];

const MAX_HASHED_KEY_LENGTH = 256;

export const hashNpcKey = (key: string): number => {
  const length = Math.min(key.length, MAX_HASHED_KEY_LENGTH);
  let hash = 0;

  for (let i = 0; i < length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  return -Math.abs(hash || 1);
};

const getHeroTrackerNpcId = (name: string): number =>
  hashNpcKey(`hero-tracker:${normalizeNpcName(name)}`);

export const getKillNpcId = (
  npc: { readonly id: number; readonly name: string },
  npcType: NpcType,
): number => {
  if (npcType === NpcTypeValues.COLOSSUS) return hashNpcKey(npc.name);

  if (isHeroTrackerName(npc.name)) return getHeroTrackerNpcId(npc.name);

  return Math.abs(npc.id);
};

export const getTimerNpcId = (npc: {
  readonly id: number;
  readonly name: string;
}): number =>
  isHeroTrackerName(npc.name) ? getHeroTrackerNpcId(npc.name) : npc.id;

export const getEventHeroNpcId = (hero: {
  readonly id: string;
  readonly npcId: number | null;
}): number => hero.npcId ?? getEventHeroSyntheticNpcId(hero.id);

export const getEventHeroSyntheticNpcId = (heroId: string): number =>
  hashNpcKey(heroId);

export const TIMER_TYPES = {
  CUSTOM_MANUAL: 999,
} as const;
