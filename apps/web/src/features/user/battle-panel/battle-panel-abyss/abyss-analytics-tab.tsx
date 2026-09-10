import { BattleDurationStatsCard } from "@/features/user/battle-panel/battle-panel-statistics/components/battle-duration-stats";
import { CombatProfileOverview } from "@/features/user/battle-panel/battle-panel-statistics/components/combat-profile-overview";
import { CurrentStreakCard } from "@/features/user/battle-panel/battle-panel-statistics/components/current-streak-card";
import { ProfessionWinRateChart } from "@/features/user/battle-panel/battle-panel-statistics/components/profession-win-rate";
import { RatingDeltaByOpponentCard } from "@/features/user/battle-panel/battle-panel-statistics/components/rating-delta-by-opponent-card";
import { RatingGrowthChart } from "@/features/user/battle-panel/battle-panel-statistics/components/rating-growth-chart";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
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

type AnalyticsResult<T> = { data?: T; isLoading: boolean };

type AbyssAnalyticsTabProps = {
  combatProfile: AnalyticsResult<
    ComponentProps<typeof CombatProfileOverview>["data"]
  >;
  duration: AnalyticsResult<
    ComponentProps<typeof BattleDurationStatsCard>["data"]
  >;
  profession: AnalyticsResult<
    ComponentProps<typeof ProfessionWinRateChart>["data"]
  >;
  ratingDelta: AnalyticsResult<
    ComponentProps<typeof RatingDeltaByOpponentCard>["data"]
  >;
  ratingGrowth: AnalyticsResult<
    ComponentProps<typeof RatingGrowthChart>["data"]
  >;
  streak: AnalyticsResult<ComponentProps<typeof CurrentStreakCard>["data"]>;
  search: AbyssAnalyticsSearch;
};

export function AbyssAnalyticsTab({
  combatProfile,
  duration,
  profession,
  ratingDelta,
  ratingGrowth,
  streak,
  search,
}: AbyssAnalyticsTabProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CombatProfileOverview
        data={combatProfile.data}
        isLoading={combatProfile.isLoading}
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <CurrentStreakCard
          data={
            streak.data ?? {
              current: { type: "none", count: 0 },
              longest: { wins: 0, losses: 0 },
            }
          }
          isLoading={streak.isLoading}
        />
        <BattleDurationStatsCard
          data={
            duration.data ?? {
              avgWinDuration: 0,
              avgLossDuration: 0,
              fastest: null,
              longest: null,
            }
          }
          isLoading={duration.isLoading}
        />
        <RatingGrowthChart
          data={ratingGrowth.data ?? []}
          isLoading={ratingGrowth.isLoading}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
        <ProfessionWinRateChart
          data={profession.data ?? []}
          isLoading={profession.isLoading}
        />
        <RatingDeltaByOpponentCard
          data={ratingDelta.data ?? []}
          search={search}
          isLoading={ratingDelta.isLoading}
        />
      </div>
    </div>
  );
}
