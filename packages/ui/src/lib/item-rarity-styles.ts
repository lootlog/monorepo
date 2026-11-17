import { ItemRarity } from "@lootlog/ui/lib/item-rarity";

/**
 * Each rarity tints the tooltip frame and the ornament under the header
 * through `--item-rarity`, and colours the rarity label.
 */
export const ITEM_RARITY_STYLES: Record<
  ItemRarity,
  { accent: string; label: string }
> = {
  [ItemRarity.COMMON]: {
    accent: "[--item-rarity:var(--muted-foreground)]",
    label: "text-muted-foreground",
  },
  [ItemRarity.HEROIC]: {
    accent: "[--item-rarity:#3b82f6]",
    label: "text-blue-400",
  },
  [ItemRarity.LEGENDARY]: {
    accent: "[--item-rarity:#f97316]",
    label: "text-orange-400",
  },
  [ItemRarity.UNIQUE]: {
    accent: "[--item-rarity:#fcd34d]",
    label: "text-amber-300",
  },
  [ItemRarity.UPGRADED]: {
    accent: "[--item-rarity:var(--primary)]",
    label: "text-primary",
  },
};
