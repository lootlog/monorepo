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
import { StatisticsFilters } from "./components/statistics-filters";
import { ProfessionWinRateChart } from "./components/profession-win-rate";
import { HeadToHeadTable } from "./components/head-to-head-table";
import { CurrentStreakCard } from "./components/current-streak-card";
import { BattleDurationStatsCard } from "./components/battle-duration-stats";
import { PhGrowthChart } from "./components/ph-growth-chart";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionHeader } from "@/components/layout/section-header";
import { BarChart3 } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  battlePanelStatisticsSearchParsers,
  normalizeBattlePanelCharacterId,
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
  const matchmaking = false;
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
    matchmaking,
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
    characterId: currentCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    matchmaking,
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-4 px-3 py-3">
          {charactersQuery.isError && (
            <StatisticsQueryPanel query={charactersQuery} />
          )}
          <SectionHeader
            icon={BarChart3}
            title={t("battlePanel.statistics.title")}
            subtitle={t("battlePanel.statistics.subtitle")}
          >
            <StatisticsFilters
              characterId={currentCharacterId}
              period={period}
              minLevel={minLevel}
              maxLevel={maxLevel}
              ph={ph}
              matchmaking={matchmaking}
              showMatchmakingFilter={false}
              onCharacterChange={(characterId) => {
                startTransition(() => {
                  void setQueryState({
                    characterId: characterId ?? null,
                  });
                });
              }}
              onPeriodChange={(newPeriod) => {
                startTransition(() => {
                  void setQueryState({
                    period: newPeriod,
                  });
                });
              }}
              onMinLevelChange={(newMinLevel) => {
                startTransition(() => {
                  void setQueryState({
                    minLevel: newMinLevel ?? 1,
                  });
                });
              }}
              onMaxLevelChange={(newMaxLevel) => {
                startTransition(() => {
                  void setQueryState({
                    maxLevel: newMaxLevel ?? 500,
                  });
                });
              }}
              onPhChange={(newPh) => {
                startTransition(() => {
                  void setQueryState({
                    ph: newPh ? true : null,
                  });
                });
              }}
              onMatchmakingChange={(newMatchmaking) => {
                startTransition(() => {
                  void setQueryState({
                    matchmaking: newMatchmaking ? true : null,
                  });
                });
              }}
            />
          </SectionHeader>

          <StatisticsQueryPanel query={combatProfileQuery}>
            <CombatProfileOverview
              data={combatProfile}
              isLoading={isCombatProfileLoading}
            />
          </StatisticsQueryPanel>

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
            <StatisticsQueryPanel query={phGrowthQuery}>
              <PhGrowthChart
                data={phGrowthData ?? []}
                isLoading={isPhGrowthLoading}
              />
            </StatisticsQueryPanel>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
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
      </ScrollArea>
    </div>
  );
}
