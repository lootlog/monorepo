import { ItemRarityEnum } from "@lootlog/schema/item-rarity";

/**
 * The rarity an item is shown with: the stored rarities plus `COMMON` for
 * items Margonem gives no rarity.
 */
export const DisplayItemRarity = {
  ...ItemRarityEnum,
  COMMON: "COMMON",
} as const;

export type DisplayItemRarity =
  (typeof DisplayItemRarity)[keyof typeof DisplayItemRarity];

/** Rarities from the most to the least valuable, as lists order items. */
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
