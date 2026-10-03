import type { ChartConfig } from "@lootlog/ui/components/chart";
import type { TFunction } from "i18next";
import { LOOT_RARITY_CHART_COLORS } from "@/features/guild/loots-list/loot-rarity-colors";

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
