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

export const MIN_LOOT_NPC_WT = 10;

export const MIN_TIMER_NPC_WT = 20;

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

export const TRACKABLE_NPC_TYPES = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
] as const satisfies ReadonlyArray<(typeof NPC_TYPES_STRONGEST_FIRST)[number]>;

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
  npcId: number;
}>;

export const compareNpcsStrongestFirst = (
  left: NpcStrength,
  right: NpcStrength,
) =>
  getNpcTypeStrengthRank(left.type) - getNpcTypeStrengthRank(right.type) ||
  (right.wt ?? -1) - (left.wt ?? -1) ||
  (right.lvl ?? -1) - (left.lvl ?? -1) ||
  left.npcId - right.npcId;

export type NpcClassification = Readonly<{
  wt: number;
  prof?: string;
  type?: number;
  icon?: string;
  isHeroFromEvent?: boolean;
  name?: string;
}>;

const EVENT_NPC_ICON_DIRECTORY = "hev/";

const isHeroWeight = (wt: number) => wt > 79 && wt < 90;

const isEventHero = (npc: NpcClassification): boolean =>
  isHeroWeight(npc.wt) &&
  (npc.isHeroFromEvent === true ||
    (npc.icon !== undefined &&
      normalizeNpcIcon(npc.icon).startsWith(EVENT_NPC_ICON_DIRECTORY)));

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

export const npcIconDirectory = (icon: string): string => {
  const [directory, ...rest] = normalizeNpcIcon(icon).split("/");

  return rest.length > 0 && directory ? directory : "";
};

export const BOSS_ORIGINS = ["REGULAR", "HERO_TRACKERS", "EVENT"] as const;

export type BossOrigin = (typeof BOSS_ORIGINS)[number];

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
