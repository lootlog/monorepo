import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import {
  useBattlesControllerGetBattleDuration,
  useBattlesControllerGetCombatProfile,
  useBattlesControllerGetCurrentStreak,
  useBattlesControllerGetHeadToHead,
  useBattlesControllerGetPhGrowth,
  useBattlesControllerGetProfessionWinRate,
  useBattlesControllerGetRatingGrowth,
} from "@lootlog/client/battlelog";
import { LEADERBOARD_SIZE } from "@/components/common/stats-leaderboard-section";
import type { LinkProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BattleOpponentsSection } from "./battle-opponents-section";
import { BattleRecordsSection } from "./battle-records-section";
import { CombatProfileOverview } from "./combat-profile-overview";
import { PhGrowthChart } from "./ph-growth-chart";
import { ProfessionWinRateChart } from "./profession-win-rate";
import { RatingGrowthChart } from "./rating-growth-chart";
import { StatisticsQueryPanel } from "./statistics-query-panel";

export type BattleAnalyticsParams = {
  characterId: string;
  period: Period;
  minLevel: number;
  maxLevel: number;
  startDate?: string;
  endDate?: string;
  ph?: boolean;
  /** Abyss battles, which change the rating instead of earning honor points. */
  matchmaking: boolean;
};

type BattleAnalyticsOverviewProps = {
  params: BattleAnalyticsParams;
  /** The full list of opponents for the same battles. */
  allOpponentsLink: LinkProps;
};

/**
 * What a character's battles add up to, edge to edge: the headline numbers,
 * streaks and durations, the opponents fought most and how each profession
 * goes, and the honor points or rating over time.
 */
export function BattleAnalyticsOverview({
  params,
  allOpponentsLink,
}: BattleAnalyticsOverviewProps) {
  const { t } = useTranslation();
  const rated = params.matchmaking;

  const combatProfileQuery = useBattlesControllerGetCombatProfile(params);
  const streakQuery = useBattlesControllerGetCurrentStreak(params);
  const durationQuery = useBattlesControllerGetBattleDuration(params);
  const professionQuery = useBattlesControllerGetProfessionWinRate(params);

  const opponentsQuery = useBattlesControllerGetHeadToHead({
    ...params,
    size: LEADERBOARD_SIZE,
  });

  const phGrowthQuery = useBattlesControllerGetPhGrowth(params, {
    query: { enabled: !rated },
  });

  const ratingGrowthQuery = useBattlesControllerGetRatingGrowth(params, {
    query: { enabled: rated },
  });

  // The streak and durations share a section, so it fails and retries as one.
  const recordsQuery = {
    isError: streakQuery.isError || durationQuery.isError,
    isFetching: streakQuery.isFetching || durationQuery.isFetching,
    data:
      streakQuery.data && durationQuery.data
        ? [streakQuery.data, durationQuery.data]
        : undefined,
    refetch: () => {
      void streakQuery.refetch();
      void durationQuery.refetch();
    },
  };

  const getOpponentLink = (opponentId: string): LinkProps => ({
    to: "/@me/battle-panel/statistics/player-vs-player/$myId/$opponentId",
    params: { myId: params.characterId, opponentId },
    search: params,
  });

  return (
    <>
      <StatisticsQueryPanel query={combatProfileQuery}>
        <CombatProfileOverview
          data={combatProfileQuery.data}
          isLoading={combatProfileQuery.isLoading}
          rated={rated}
        />
      </StatisticsQueryPanel>
      <StatisticsQueryPanel
        query={recordsQuery}
        title={t("battlePanel.statistics.records.title")}
      >
        <BattleRecordsSection
          streak={streakQuery.data}
          duration={durationQuery.data}
          isLoading={streakQuery.isLoading || durationQuery.isLoading}
        />
      </StatisticsQueryPanel>
      <StatsSectionColumns className="xl:grid-cols-3 xl:*:first:col-span-2">
        <div>
          <StatisticsQueryPanel
            query={opponentsQuery}
            title={t("battlePanel.statistics.opponents.title")}
          >
            <BattleOpponentsSection
              records={opponentsQuery.data?.records ?? []}
              isLoading={opponentsQuery.isLoading}
              allOpponentsLink={allOpponentsLink}
              getOpponentLink={getOpponentLink}
              rated={rated}
            />
          </StatisticsQueryPanel>
        </div>
        <div>
          <StatisticsQueryPanel
            query={professionQuery}
            title={t("battlePanel.statistics.professionWinRate.title")}
          >
            <ProfessionWinRateChart
              data={professionQuery.data ?? []}
              isLoading={professionQuery.isLoading}
            />
          </StatisticsQueryPanel>
        </div>
      </StatsSectionColumns>
      {rated ? (
        <StatisticsQueryPanel
          query={ratingGrowthQuery}
          title={t("battlePanel.statistics.ratingGrowth.title")}
        >
          <RatingGrowthChart
            data={ratingGrowthQuery.data ?? []}
            isLoading={ratingGrowthQuery.isLoading}
          />
        </StatisticsQueryPanel>
      ) : (
        <StatisticsQueryPanel
          query={phGrowthQuery}
          title={t("battlePanel.statistics.phGrowth.title")}
        >
          <PhGrowthChart
            data={phGrowthQuery.data ?? []}
            isLoading={phGrowthQuery.isLoading}
          />
        </StatisticsQueryPanel>
      )}
    </>
  );
}
