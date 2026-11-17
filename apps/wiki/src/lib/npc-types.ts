import { CatalogNpcDtoOutputType } from "@lootlog/client/catalog";

/** Rank of each kind of NPC the catalog lists, strongest first. */
const NPC_TYPE_RANK: Record<CatalogNpcDtoOutputType, number> = {
  TITAN: 0,
  COLOSSUS: 1,
  HERO: 2,
  EVENT_HERO: 3,
  HERO_TRACKER: 4,
  ELITE3: 5,
  ELITE2: 6,
  ELITE: 7,
  COMMON: 8,
  NPC: 9,
};

export const NPC_TYPE_OPTIONS = Object.values(CatalogNpcDtoOutputType).sort(
  (left, right) => NPC_TYPE_RANK[left] - NPC_TYPE_RANK[right],
);

export const isNpcType = (value: string): value is CatalogNpcDtoOutputType =>
  NPC_TYPE_OPTIONS.some((type) => type === value);
