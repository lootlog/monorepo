import { useTranslation } from "react-i18next";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BandSection } from "@/components/common/band-section";
import { KillStatsOverview } from "@/components/common/kill-analytics/kill-stats-overview";
import { KillAnalyticsTrendSkeleton } from "@/components/common/kill-analytics/kill-analytics-trend-skeleton";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { STATISTICS_RANKINGS } from "./statistics-search";

/** StatisticsOverview's layout while the numbers load. */
export function StatisticsOverviewSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t("common.loading")}>
      <KillStatsOverview
        isLoading
        types={TRACKABLE_NPC_TYPES.flatMap((type) =>
          type === "ELITE3" ? [] : [{ type, kills: 0 }],
        )}
      />
      <BandSection
        id="statistics-records-loading"
        title={t("kills.records.title")}
        tiled
      >
        <StatsTileGrid className="sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <StatsTile
              key={index}
              media={<Skeleton className="size-10 shrink-0 rounded-lg" />}
              label=""
              value={<Skeleton className="h-7 w-24" />}
              detail={<Skeleton className="h-4 w-16" />}
            />
          ))}
        </StatsTileGrid>
      </BandSection>
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <KillAnalyticsTrendSkeleton title={t("statistics.daily")} />
        <StatsLeaderboardSection
          title={t("statistics.worlds")}
          isLoading
          loadingRows={3}
        >
          {null}
        </StatsLeaderboardSection>
      </StatsSectionColumns>
      <StatsSectionColumns className="xl:grid-cols-2">
        {STATISTICS_RANKINGS.map((ranking) => (
          <StatsLeaderboardSection
            key={ranking}
            title={t(`statistics.rankings.${ranking}`)}
            isLoading
            loadingRows={5}
          >
            {null}
          </StatsLeaderboardSection>
        ))}
      </StatsSectionColumns>
    </div>
  );
}
