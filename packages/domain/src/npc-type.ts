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
  HERO_TRACKER: TNpcType;
  NPC: TNpcType;
};

/**
 * Weight the strongest NPC of a loot must reach for the API to accept it.
 * Loots from weaker NPCs are rejected for every Organization.
 */
export const MIN_LOOT_NPC_WT = 10;

/**
 * Weight from which an NPC gets an automatic timer: Margonem's elite II
 * (`wt > 19`) and every stronger type. A Hero Tracker has no weight and is
 * admitted by its name instead.
 */
export const MIN_TIMER_NPC_WT = 20;

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

const dropSourceBossTypes: ReadonlySet<string> = new Set(
  DROP_SOURCE_BOSS_TYPES,
);

export const isDropSourceBossType = (type: string | null): boolean =>
  type !== null && dropSourceBossTypes.has(type);

/**
 * Monster types, strongest first; an event hero ranks right after a hero.
 * NPCs and Hero Trackers are not monsters and rank after every type here.
 */
export const NPC_TYPES_STRONGEST_FIRST = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
] as const;

/**
 * Monster types kill statistics break down and filter by, strongest first.
 * Weaker monsters still count toward the totals.
 */
export const TRACKABLE_NPC_TYPES = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
] as const satisfies ReadonlyArray<(typeof NPC_TYPES_STRONGEST_FIRST)[number]>;

/** Position in `NPC_TYPES_STRONGEST_FIRST`; any other type or none ranks last. */
export const getNpcTypeStrengthRank = (type: string | null | undefined) => {
  const rank = NPC_TYPES_STRONGEST_FIRST.findIndex(
    (npcType) => npcType === type,
  );

  return rank === -1 ? NPC_TYPES_STRONGEST_FIRST.length : rank;
};

export type NpcStrength = Readonly<{
  type: string | null | undefined;
  wt: number | null | undefined;
  lvl: number | null | undefined;
  /** The Margonem NPC id; breaks a tie between identical monsters. */
  npcId: number;
}>;

/**
 * Orders the NPCs of one fight strongest first: by type, then weight, then
 * level, then id. The first one names a loot, so a boss always wins over its
 * escort, even an escort of a higher level. SQL orderings mirror this.
 */
export const compareNpcsStrongestFirst = (
  left: NpcStrength,
  right: NpcStrength,
) =>
  getNpcTypeStrengthRank(left.type) - getNpcTypeStrengthRank(right.type) ||
  (right.wt ?? -1) - (left.wt ?? -1) ||
  (right.lvl ?? -1) - (left.lvl ?? -1) ||
  left.npcId - right.npcId;

/** What Margonem tells about an NPC that decides its Lootlog type. */
export type NpcClassification = Readonly<{
  wt: number;
  prof?: string;
  type?: number;
  /** The NPC graphic, relative or as the rendered URL. */
  icon?: string;
  /** Set by Margonem on the NPC template of a hero spawned by an event. */
  isHeroFromEvent?: boolean;
  /** The NPC name; the only signal that identifies a Hero Tracker. */
  name?: string;
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
const isEventHero = (npc: NpcClassification): boolean =>
  isHeroWeight(npc.wt) &&
  (npc.isHeroFromEvent === true ||
    (npc.icon !== undefined &&
      normalizeNpcIcon(npc.icon).startsWith(EVENT_NPC_ICON_DIRECTORY)));

// Margonem gives Hero Tracker templates no weight, profession or type, and
// its `detector` flag marks every special NPC, so only the name identifies
// them: "Tropiciel Herosów", "Wtajemniczony Tropiciel Herosów", and so on,
// or "Hero Hunter", "Initiated Hero Hunter", and so on in the English game.
// "Tropicielka Albiona" in Tuzmer must not match.
const HERO_TRACKER_NAME = /(?:^|\s)(?:Tropiciel Herosów|Hero Hunter)$/u;

export const isHeroTrackerName = (name: string): boolean =>
  HERO_TRACKER_NAME.test(name.trim());

export const getNpcType = <TNpcType extends string>(
  npcTypes: NpcTypeValues<TNpcType>,
  npc: NpcClassification,
): TNpcType => {
  const { wt, prof, type, name } = npc;

  if (name !== undefined && isHeroTrackerName(name)) {
    return npcTypes.HERO_TRACKER;
  }

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

  if (wt >= MIN_TIMER_NPC_WT) return npcTypes.ELITE2;

  if (wt > 9) return npcTypes.ELITE;

  return npcTypes.COMMON;
};

/**
 * The directory Margonem files an NPC graphic under, such as `kol` for the
 * colossi of the regular game; empty for a graphic outside any directory.
 */
export const npcIconDirectory = (icon: string): string => {
  const [directory, ...rest] = normalizeNpcIcon(icon).split("/");

  return rest.length > 0 && directory ? directory : "";
};

/**
 * Where a titan or a colossus comes from. Margonem gives each kind of boss
 * one weight, so the graphic's directory tells them apart: the bosses of the
 * regular game, the heroes fought as colossi in their hideouts during
 * Tropiciele Herosów, which keep the hero's graphic, and the bosses of every
 * other event.
 */
export const BOSS_ORIGINS = ["REGULAR", "HERO_TRACKERS", "EVENT"] as const;

export type BossOrigin = (typeof BOSS_ORIGINS)[number];

/**
 * The graphic directory of each origin that has one of its own, by boss
 * type. A boss drawn from any other directory is an event's.
 */
export const BOSS_ORIGIN_ICON_DIRECTORIES = {
  TITAN: { REGULAR: "tyt" },
  COLOSSUS: { REGULAR: "kol", HERO_TRACKERS: "her" },
} as const satisfies Record<string, Partial<Record<BossOrigin, string>>>;

export type OriginBossType = keyof typeof BOSS_ORIGIN_ICON_DIRECTORIES;

export const bossOrigin = (type: OriginBossType, icon: string): BossOrigin => {
  const directory = npcIconDirectory(icon);

  const own = Object.entries(BOSS_ORIGIN_ICON_DIRECTORIES[type]).find(
    ([, ownDirectory]) => ownDirectory === directory,
  );

  return BOSS_ORIGINS.find((origin) => origin === own?.[0]) ?? "EVENT";
};
