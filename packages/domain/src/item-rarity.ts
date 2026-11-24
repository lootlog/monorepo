import { ItemRarityEnum } from "@lootlog/schema/item-rarity";

export const DisplayItemRarity = {
  ...ItemRarityEnum,
  COMMON: "COMMON",
} as const;

export type DisplayItemRarity =
  (typeof DisplayItemRarity)[keyof typeof DisplayItemRarity];

export const ITEM_RARITIES_BY_VALUE = [
  DisplayItemRarity.LEGENDARY,
  DisplayItemRarity.HEROIC,
  DisplayItemRarity.UNIQUE,
  DisplayItemRarity.UPGRADED,
  DisplayItemRarity.COMMON,
] as const satisfies readonly DisplayItemRarity[];

export const resolveItemRarity = (
  value: string | null | undefined,
): DisplayItemRarity =>
  Object.values(DisplayItemRarity).find((rarity) => rarity === value) ??
  DisplayItemRarity.COMMON;

export const itemRarityRank = (value: string | null | undefined) =>
  ITEM_RARITIES_BY_VALUE.indexOf(resolveItemRarity(value));
