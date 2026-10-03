import type { ItemRarity } from "@lootlog/ui/lib/item-rarity";

/**
 * Rarity accents, matching the frame colors of `ItemImage` in `@lootlog/ui`:
 * legendary orange-600, heroic blue-500 and unique amber-300.
 */
export const LOOT_RARITY_CHART_COLORS = {
  LEGENDARY: "#ea580c",
  HEROIC: "#3b82f6",
} as const satisfies Partial<Record<ItemRarity, string>>;

export const LOOT_RARITY_TEXT_CLASS: Record<ItemRarity, string> = {
  LEGENDARY: "text-orange-600",
  HEROIC: "text-blue-500",
  UNIQUE: "text-amber-300",
  UPGRADED: "text-primary",
  COMMON: "text-muted-foreground",
};
