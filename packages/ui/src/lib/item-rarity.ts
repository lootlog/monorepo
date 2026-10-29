export const ItemRarity = {
  COMMON: "COMMON",
  HEROIC: "HEROIC",
  LEGENDARY: "LEGENDARY",
  UNIQUE: "UNIQUE",
  UPGRADED: "UPGRADED",
} as const;

export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

/** Rarities from the most to the least valuable, as lists order items. */
export const ITEM_RARITIES_BY_VALUE = [
  ItemRarity.LEGENDARY,
  ItemRarity.HEROIC,
  ItemRarity.UNIQUE,
  ItemRarity.UPGRADED,
  ItemRarity.COMMON,
] as const satisfies readonly ItemRarity[];

export const resolveItemRarity = (
  value: string | null | undefined,
): ItemRarity =>
  Object.values(ItemRarity).find((rarity) => rarity === value) ??
  ItemRarity.COMMON;
