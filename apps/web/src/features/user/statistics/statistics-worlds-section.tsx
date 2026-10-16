import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";
import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { StatsLeaderboardRow } from "@/components/common/stats-leaderboard-row";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import type { StatisticsSearch } from "./statistics-search";
import { StatisticsDelta } from "./statistics-delta";

const shareFormatter = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 1,
});

type StatisticsWorldsSectionProps = {
  worlds: UserKillAnalyticsResponseDtoOutput["worlds"];
  search: StatisticsSearch;
};

/** Kills on each world; picking one narrows the statistics to it. */
export function StatisticsWorldsSection({
  worlds,
  search,
}: StatisticsWorldsSectionProps) {
  const { t } = useTranslation();
  const played = worlds.filter((world) => world.totalKills > 0);

  return (
    <StatsLeaderboardSection
      title={t("statistics.worlds")}
      emptyMessage={played.length ? undefined : t("statistics.noData")}
    >
      {played.map((world, index) => (
        <StatsLeaderboardRow
          key={world.world}
          rank={index + 1}
          title={upperFirst(world.world)}
          subtitle={
            <span className="flex items-center gap-2">
              {shareFormatter.format(world.share / 100)}
              <StatisticsDelta
                delta={world.deltaKills}
                percent={world.deltaPercent}
              />
            </span>
          }
          value={world.totalKills}
          maxValue={played[0]?.totalKills ?? 0}
          link={{
            to: "/@me/statistics",
            search: { ...search, world: world.world },
          }}
        />
      ))}
    </StatsLeaderboardSection>
  );
}
