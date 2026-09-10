export const ItemRarity = {
  COMMON: "COMMON",
  HEROIC: "HEROIC",
  LEGENDARY: "LEGENDARY",
  UNIQUE: "UNIQUE",
  UPGRADED: "UPGRADED",
} as const;

export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

export const resolveItemRarity = (
  value: string | null | undefined,
): ItemRarity =>
  Object.values(ItemRarity).find((rarity) => rarity === value) ??
  ItemRarity.COMMON;
