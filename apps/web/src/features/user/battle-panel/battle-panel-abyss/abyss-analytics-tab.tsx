import { BattleDurationStatsCard } from "@/features/user/battle-panel/battle-panel-statistics/components/battle-duration-stats";
import { CombatProfileOverview } from "@/features/user/battle-panel/battle-panel-statistics/components/combat-profile-overview";
import { CurrentStreakCard } from "@/features/user/battle-panel/battle-panel-statistics/components/current-streak-card";
import { ProfessionWinRateChart } from "@/features/user/battle-panel/battle-panel-statistics/components/profession-win-rate";
import { RatingDeltaByOpponentCard } from "@/features/user/battle-panel/battle-panel-statistics/components/rating-delta-by-opponent-card";
import { RatingGrowthChart } from "@/features/user/battle-panel/battle-panel-statistics/components/rating-growth-chart";
import type { Period } from "@/store/battle-filters.store";
import type { ComponentProps } from "react";

type AbyssAnalyticsSearch = {
  characterId?: string;
  period?: Period;
  minLevel: number;
  maxLevel: number;
  startDate?: string;
  endDate?: string;
  matchmaking?: boolean;
};

type AbyssAnalyticsTabProps = {
  combatProfile?: ComponentProps<typeof CombatProfileOverview>["data"];
  durationData?: ComponentProps<typeof BattleDurationStatsCard>["data"];
  isCombatProfileLoading: boolean;
  isDurationLoading: boolean;
  isProfessionLoading: boolean;
  isRatingDeltaLoading: boolean;
  isRatingGrowthLoading: boolean;
  isStreakLoading: boolean;
  professionData?: ComponentProps<typeof ProfessionWinRateChart>["data"];
  ratingDeltaData?: ComponentProps<typeof RatingDeltaByOpponentCard>["data"];
  ratingGrowthData?: ComponentProps<typeof RatingGrowthChart>["data"];
  search: AbyssAnalyticsSearch;
  streakData?: ComponentProps<typeof CurrentStreakCard>["data"];
};

export function AbyssAnalyticsTab({
  combatProfile,
  durationData,
  isCombatProfileLoading,
  isDurationLoading,
  isProfessionLoading,
  isRatingDeltaLoading,
  isRatingGrowthLoading,
  isStreakLoading,
  professionData,
  ratingDeltaData,
  ratingGrowthData,
  search,
  streakData,
}: AbyssAnalyticsTabProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CombatProfileOverview
        data={combatProfile}
        isLoading={isCombatProfileLoading}
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <CurrentStreakCard
          data={
            streakData ?? {
              current: { type: "none", count: 0 },
              longest: { wins: 0, losses: 0 },
            }
          }
          isLoading={isStreakLoading}
        />
        <BattleDurationStatsCard
          data={
            durationData ?? {
              avgWinDuration: 0,
              avgLossDuration: 0,
              fastest: null,
              longest: null,
            }
          }
          isLoading={isDurationLoading}
        />
        <RatingGrowthChart
          data={ratingGrowthData ?? []}
          isLoading={isRatingGrowthLoading}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
        <ProfessionWinRateChart
          data={professionData ?? []}
          isLoading={isProfessionLoading}
        />
        <RatingDeltaByOpponentCard
          data={ratingDeltaData ?? []}
          search={search}
          isLoading={isRatingDeltaLoading}
        />
      </div>
    </div>
  );
}
