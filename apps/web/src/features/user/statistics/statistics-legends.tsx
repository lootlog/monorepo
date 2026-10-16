import { upperFirst } from "es-toolkit";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserLootStatsResponseDtoOutputLegendsItem } from "@lootlog/client/main";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { StatisticsLegendItem } from "./statistics-legend-item";

type StatisticsLegendsProps = {
  legends?: UserLootStatsResponseDtoOutputLegendsItem[];
  isLoading: boolean;
  /** Rows shown; all of them unless it is a preview. */
  size?: number;
  actions?: ReactNode;
};

/** Legendary drops the user was present at, and how many their characters caught. */
export function StatisticsLegends({
  legends = [],
  isLoading,
  size,
  actions,
}: StatisticsLegendsProps) {
  const { t } = useTranslation();
  const rows = size === undefined ? legends : legends.slice(0, size);

  return (
    <StatsLeaderboardSection
      title={t("loots.stats.topItems.title")}
      actions={actions}
      isLoading={isLoading}
      loadingRows={size}
      emptyMessage={rows.length ? undefined : t("loots.stats.topItems.noData")}
    >
      {rows.map((legend, index) => (
        <StatsLeaderboardRow
          key={`${legend.itemId}:${legend.world}:${legend.npc.id}`}
          rank={index + 1}
          media={<StatisticsLegendItem legend={legend} />}
          title={legend.name}
          subtitle={[
            t("statistics.legend.caught", { count: legend.caught }),
            legend.npc.name,
            upperFirst(legend.world),
          ].join(" · ")}
          value={legend.count}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
