import { startTransition, useEffect } from "react";
import {
  battlesControllerGetCombatProfile,
  useBattlesControllerGetBattleDuration,
  useBattlesControllerGetCurrentStreak,
  useBattlesControllerGetHeadToHead,
  useBattlesControllerGetPhGrowth,
  useBattlesControllerGetProfessionWinRate,
  useBattlesControllerGetUserCharacters,
} from "@lootlog/api-client/react-query/battlelog/battles";
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
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BattlePanelStatisticsSkeleton } from "./battle-panel-statistics-skeleton";

export function BattlePanelStatistics() {
  const { t } = useTranslation();
  const { data: charactersResponse, isLoading: isLoadingCharacters } =
    useBattlesControllerGetUserCharacters();
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

  const { data: professionData, isLoading: isProfessionLoading } =
    useBattlesControllerGetProfessionWinRate({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useBattlesControllerGetHeadToHead({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
      size: 5,
    });

  const { data: streakData, isLoading: isStreakLoading } =
    useBattlesControllerGetCurrentStreak({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
    });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattlesControllerGetBattleDuration({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } =
    useBattlesControllerGetPhGrowth({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
    });

  const { data: combatProfile, isLoading: isCombatProfileLoading } = useQuery({
    queryKey: [
      "combat-profile",
      selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      ph,
      matchmaking,
    ],
    queryFn: () =>
      battlesControllerGetCombatProfile({
        characterId: selectedCharacterId,
        period,
        minLevel,
        maxLevel,
        startDate,
        endDate,
        ph,
        matchmaking,
      }),
    enabled: Boolean(selectedCharacterId),
  });

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

  if (isLoadingCharacters) {
    return <BattlePanelStatisticsSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-4 px-3 py-3">
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
            <PhGrowthChart
              data={phGrowthData ?? []}
              isLoading={isPhGrowthLoading}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
            <ProfessionWinRateChart
              data={professionData ?? []}
              isLoading={isProfessionLoading}
            />
            <HeadToHeadTable
              data={headToHeadData?.records ?? []}
              search={statisticsSearch}
              isLoading={isHeadToHeadLoading}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
