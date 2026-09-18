import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useTranslation } from "react-i18next";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { StatsFilterBarSkeleton } from "./components/stats-filter-bar-skeleton";
import { StatsLeaderboardCard } from "./components/stats-leaderboard-card";

export const KillStatsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <StatsFilterBarSkeleton />
      <KillStatsOverview isLoading />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <StatsLeaderboardCard title={t("kills.memberRanking.title")} isLoading>
          {null}
        </StatsLeaderboardCard>
        <StatsLeaderboardCard title={t("kills.topNpcs.title")} isLoading>
          {null}
        </StatsLeaderboardCard>
      </div>
    </div>
  );
};
