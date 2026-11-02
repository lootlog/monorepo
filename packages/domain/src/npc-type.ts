import { normalizeNpcIcon } from "./npc-icon.js";

type NpcTypeValues<TNpcType extends string> = {
  COMMON: TNpcType;
  ELITE: TNpcType;
  ELITE2: TNpcType;
  ELITE3: TNpcType;
  HERO: TNpcType;
  EVENT_HERO: TNpcType;
  COLOSSUS: TNpcType;
  TITAN: TNpcType;
  NPC: TNpcType;
};

/**
 * Weight the strongest NPC of a loot must reach for the API to accept it.
 * Loots from weaker NPCs are rejected for every Organization.
 */
export const MIN_LOOT_NPC_WT = 10;

/**
 * NPC types that lead a group fight. A fight's drops come from its only NPC
 * or from the only one of these among a group, never from the escort.
 */
export const DROP_SOURCE_BOSS_TYPES = [
  "ELITE2",
  "ELITE3",
  "HERO",
  "EVENT_HERO",
  "TITAN",
  "COLOSSUS",
] as const;

/** What Margonem tells about an NPC that decides its Lootlog type. */
export type NpcClassification = Readonly<{
  wt: number;
  prof?: string;
  type?: number;
  /** The NPC graphic, relative or as the rendered URL. */
  icon?: string;
  /** Set by Margonem on the NPC template of a hero spawned by an event. */
  isHeroFromEvent?: boolean;
}>;

// Margonem keeps the graphics of every event NPC in this directory, including
// event monsters, elites and colossi; only regular heroes are never there.
const EVENT_NPC_ICON_DIRECTORY = "hev/";

const isHeroWeight = (wt: number) => wt > 79 && wt < 90;

/**
 * A hero spawned by a game event. Margonem flags its template, but a battle
 * only reports the weight and the graphic, so an event graphic identifies it
 * where the flag is unknown. Event colossi stay colossi.
 */
export const isEventHero = (npc: NpcClassification): boolean =>
  isHeroWeight(npc.wt) &&
  (npc.isHeroFromEvent === true ||
    (npc.icon !== undefined &&
      normalizeNpcIcon(npc.icon).startsWith(EVENT_NPC_ICON_DIRECTORY)));

export const getNpcType = <TNpcType extends string>(
  npcTypes: NpcTypeValues<TNpcType>,
  npc: NpcClassification,
): TNpcType => {
  const { wt, prof, type } = npc;

  if (type === 0 && wt > 29 && wt < 80) {
    return npcTypes.ELITE3;
  }

  if ((type === 5 || type === 0) && !prof) {
    return npcTypes.NPC;
  }

  if (wt > 99) return npcTypes.TITAN;

  if (wt > 89) return npcTypes.COLOSSUS;

  if (isHeroWeight(wt)) {
    return isEventHero(npc) ? npcTypes.EVENT_HERO : npcTypes.HERO;
  }

  if (wt > 29) return npcTypes.ELITE3;

  if (wt > 19) return npcTypes.ELITE2;

  if (wt > 9) return npcTypes.ELITE;

  return npcTypes.COMMON;
};
