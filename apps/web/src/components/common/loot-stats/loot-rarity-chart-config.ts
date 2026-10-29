import type { ChartConfig } from "@lootlog/ui/components/chart";
import type { TFunction } from "i18next";
import { LOOT_RARITY_CHART_COLORS } from "@lootlog/ui/lib/item-rarity-colors";

export const getLootRarityChartConfig = (t: TFunction): ChartConfig => ({
  LEGENDARY: {
    label: t("loots.stats.rarity.legendary"),
    color: LOOT_RARITY_CHART_COLORS.LEGENDARY,
  },
  HEROIC: {
    label: t("loots.stats.rarity.heroic"),
    color: LOOT_RARITY_CHART_COLORS.HEROIC,
  },
});
