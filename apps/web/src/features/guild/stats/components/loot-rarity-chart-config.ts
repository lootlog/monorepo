import type { ChartConfig } from "@lootlog/ui/components/chart";
import type { TFunction } from "i18next";

export const LOOT_RARITY_COLORS = {
  LEGENDARY: "#ef4444",
  HEROIC: "#3b82f6",
} as const;

export const getLootRarityChartConfig = (t: TFunction): ChartConfig => ({
  LEGENDARY: {
    label: t("loots.stats.rarity.legendary"),
    color: LOOT_RARITY_COLORS.LEGENDARY,
  },
  HEROIC: {
    label: t("loots.stats.rarity.heroic"),
    color: LOOT_RARITY_COLORS.HEROIC,
  },
});
