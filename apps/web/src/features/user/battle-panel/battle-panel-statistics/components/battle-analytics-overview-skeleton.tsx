import { ChartSection } from "@/components/common/chart-section";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import { useTranslation } from "react-i18next";
import { BattleRecordsSection } from "./battle-records-section";
import { CombatProfileOverview } from "./combat-profile-overview";

type BattleAnalyticsOverviewSkeletonProps = {
  rated?: boolean;
};

/** `BattleAnalyticsOverview`'s sections while their numbers load. */
export function BattleAnalyticsOverviewSkeleton({
  rated = false,
}: BattleAnalyticsOverviewSkeletonProps) {
  const { t } = useTranslation();

  return (
    <>
      <CombatProfileOverview data={undefined} isLoading rated={rated} />
      <BattleRecordsSection streak={undefined} duration={undefined} isLoading />
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <StatsLeaderboardSection
          title={t("battlePanel.statistics.opponents.title")}
          isLoading
        >
          {null}
        </StatsLeaderboardSection>
        <StatsLeaderboardSection
          title={t("battlePanel.statistics.professionWinRate.title")}
          isLoading
          loadingRows={6}
        >
          {null}
        </StatsLeaderboardSection>
      </StatsSectionColumns>
      <ChartSection
        title={t(
          rated
            ? "battlePanel.statistics.ratingGrowth.title"
            : "battlePanel.statistics.phGrowth.title",
        )}
        isLoading
      >
        {null}
      </ChartSection>
    </>
  );
}
