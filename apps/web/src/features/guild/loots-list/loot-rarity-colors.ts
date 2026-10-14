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

/**
 * Rarity filter pills: the label in the frame color, and once pressed the
 * frame itself with a faint glow, as the item frames draw it.
 */
export const LOOT_RARITY_PILL_CLASS: Record<ItemRarity, string> = {
  LEGENDARY:
    "text-orange-500 hover:text-orange-400 aria-pressed:border-orange-600/80 aria-pressed:bg-orange-600/15 aria-pressed:text-orange-400 aria-pressed:shadow-[0_0_12px_rgba(234,88,12,0.28)]",
  HEROIC:
    "text-blue-400 hover:text-blue-300 aria-pressed:border-blue-500/80 aria-pressed:bg-blue-500/15 aria-pressed:text-blue-300 aria-pressed:shadow-[0_0_12px_rgba(59,130,246,0.28)]",
  UNIQUE:
    "text-amber-300 hover:text-amber-200 aria-pressed:border-amber-300/80 aria-pressed:bg-amber-300/12 aria-pressed:text-amber-200 aria-pressed:shadow-[0_0_12px_rgba(252,211,77,0.22)]",
  UPGRADED: "",
  COMMON: "",
};
