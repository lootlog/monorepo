import { isLevelRangeActive } from "@/features/user/battle-panel/components/battle-panel-filter-state";
import { startTransition, useEffect } from "react";
import {
  useBattlesControllerGetCombatProfile,
  useBattlesControllerGetBattleDuration,
  useBattlesControllerGetCurrentStreak,
  useBattlesControllerGetHeadToHead,
  useBattlesControllerGetPhGrowth,
  useBattlesControllerGetProfessionWinRate,
  useBattlesControllerGetUserCharacters,
} from "@lootlog/client/battlelog";
import { StatisticsFilterToolbar } from "./components/statistics-filter-toolbar";
import { StatisticsStackedFilters } from "./components/statistics-stacked-filters";
import { ProfessionWinRateChart } from "./components/profession-win-rate";
import { HeadToHeadTable } from "./components/head-to-head-table";
import { CurrentStreakCard } from "./components/current-streak-card";
import { BattleDurationStatsCard } from "./components/battle-duration-stats";
import { PhGrowthChart } from "./components/ph-growth-chart";
import { FilterBar } from "@/components/common/filter-bar";
import { useQueryStates } from "nuqs";
import {
  battlePanelStatisticsSearchParsers,
  normalizeBattlePanelCharacterId,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import { CombatProfileOverview } from "./components/combat-profile-overview";
import { StatisticsQueryPanel } from "./components/statistics-query-panel";
import { useTranslation } from "react-i18next";
import { BattlePanelStatisticsSkeleton } from "./battle-panel-statistics-skeleton";

export function BattlePanelStatistics() {
  const { t } = useTranslation();
  const charactersQuery = useBattlesControllerGetUserCharacters();

  const { data: charactersResponse, isLoading: isLoadingCharacters } =
    charactersQuery;

  const characters = charactersResponse?.characters;

  const [queryState, setQueryState] = useQueryStates(
    battlePanelStatisticsSearchParsers,
  );

  const currentCharacterId = normalizeBattlePanelCharacterId(
    queryState.characterId,
  );

  const period = queryState.period ?? "30d";
  const minLevel = queryState.minLevel;
  const maxLevel = queryState.maxLevel;
  const startDate = queryState.startDate ?? undefined;
  const endDate = queryState.endDate ?? undefined;
  const ph = queryState.ph ?? undefined;
  const selectedCharacterId = currentCharacterId ?? characters?.[0]?.id;

  useEffect(() => {
    if (!isLoadingCharacters && characters?.length && !currentCharacterId) {
      const firstCharacterId = characters[0]?.id;

      if (firstCharacterId) {
        void setQueryState({
          characterId: firstCharacterId,
        });
      }
    }
  }, [characters, currentCharacterId, isLoadingCharacters, setQueryState]);

  const statisticsParams = {
    characterId: selectedCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    matchmaking: false,
  };

  const queryOptions = { query: { enabled: Boolean(selectedCharacterId) } };

  const professionQuery = useBattlesControllerGetProfessionWinRate(
    statisticsParams,
    queryOptions,
  );

  const headToHeadQuery = useBattlesControllerGetHeadToHead(
    { ...statisticsParams, size: 5 },
    queryOptions,
  );

  const streakQuery = useBattlesControllerGetCurrentStreak(
    statisticsParams,
    queryOptions,
  );

  const durationQuery = useBattlesControllerGetBattleDuration(
    statisticsParams,
    queryOptions,
  );

  const phGrowthQuery = useBattlesControllerGetPhGrowth(
    statisticsParams,
    queryOptions,
  );

  const combatProfileQuery = useBattlesControllerGetCombatProfile(
    statisticsParams,
    queryOptions,
  );

  const { data: professionData, isLoading: isProfessionLoading } =
    professionQuery;

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    headToHeadQuery;

  const { data: streakData, isLoading: isStreakLoading } = streakQuery;
  const { data: durationData, isLoading: isDurationLoading } = durationQuery;
  const { data: phGrowthData, isLoading: isPhGrowthLoading } = phGrowthQuery;

  const { data: combatProfile, isLoading: isCombatProfileLoading } =
    combatProfileQuery;

  const statisticsSearch = {
    characterId: selectedCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    matchmaking: false,
  };

  // Filters apply in a transition, so the cards keep their data while the
  // next statistics load.
  const setFilters = (values: Parameters<typeof setQueryState>[0]) => {
    startTransition(() => {
      void setQueryState(values);
    });
  };

  const filterProps = {
    characterId: currentCharacterId,
    onCharacterChange: (characterId: string | undefined) =>
      setFilters({ characterId: characterId ?? null }),
    period,
    onPeriodChange: (newPeriod: Period) => setFilters({ period: newPeriod }),
    minLevel,
    maxLevel,
    onMinLevelChange: (newMinLevel: number | undefined) =>
      setFilters({ minLevel: newMinLevel ?? 1 }),
    onMaxLevelChange: (newMaxLevel: number | undefined) =>
      setFilters({ maxLevel: newMaxLevel ?? 500 }),
    ph,
    onPhChange: (newPh: boolean) => setFilters({ ph: newPh ? true : null }),
  };

  if (!selectedCharacterId) {
    if (charactersQuery.isError) {
      return <StatisticsQueryPanel query={charactersQuery} />;
    }

    if (isLoadingCharacters) {
      return <BattlePanelStatisticsSkeleton />;
    }

    return <p className="p-3">{t("battlePanel.statistics.empty.title")}</p>;
  }

  return (
    <div>
      <h1 className="sr-only">{t("battlePanel.statistics.title")}</h1>
      <FilterBar
        ariaLabel={t("battlePanel.filters.title")}
        stackedFilters={<StatisticsStackedFilters {...filterProps} />}
        activeFilterCount={
          [
            period !== "30d",
            isLevelRangeActive({ minLevel, maxLevel }),
            ph === true,
          ].filter(Boolean).length
        }
      >
        <StatisticsFilterToolbar {...filterProps} />
      </FilterBar>

      <div className="flex flex-col gap-3 p-3">
        {charactersQuery.isError && (
          <StatisticsQueryPanel query={charactersQuery} />
        )}
        <StatisticsQueryPanel query={combatProfileQuery}>
          <CombatProfileOverview
            data={combatProfile}
            isLoading={isCombatProfileLoading}
          />
        </StatisticsQueryPanel>

        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          <StatisticsQueryPanel query={streakQuery}>
            <CurrentStreakCard
              data={
                streakData ?? {
                  current: { type: "none", count: 0 },
                  longest: { wins: 0, losses: 0 },
                }
              }
              isLoading={isStreakLoading}
            />
          </StatisticsQueryPanel>
          <StatisticsQueryPanel query={durationQuery}>
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
          </StatisticsQueryPanel>
          <StatisticsQueryPanel query={phGrowthQuery} className="lg:col-span-2">
            <PhGrowthChart
              data={phGrowthData ?? []}
              isLoading={isPhGrowthLoading}
            />
          </StatisticsQueryPanel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
          <StatisticsQueryPanel query={professionQuery}>
            <ProfessionWinRateChart
              data={professionData ?? []}
              isLoading={isProfessionLoading}
            />
          </StatisticsQueryPanel>
          <StatisticsQueryPanel query={headToHeadQuery}>
            <HeadToHeadTable
              data={headToHeadData?.records ?? []}
              search={statisticsSearch}
              isLoading={isHeadToHeadLoading}
            />
          </StatisticsQueryPanel>
        </div>
      </div>
    </div>
  );
}
