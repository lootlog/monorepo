import { useEffect } from "react";
import {
  battlesControllerGetCombatProfile,
  useBattlesControllerGetBattleDuration,
  useBattlesControllerGetCurrentStreak,
  useBattlesControllerGetHeadToHead,
  useBattlesControllerGetPhGrowth,
  useBattlesControllerGetProfessionWinRate,
  useBattlesControllerGetRatingDeltaByOpponent,
  useBattlesControllerGetRatingGrowth,
  useBattlesControllerGetUserCharacters,
} from "@/lib/api/generated/battlelog/battles/battles";
import { StatisticsFilters } from "./components/statistics-filters";
import { ProfessionWinRateChart } from "./components/profession-win-rate";
import { HeadToHeadTable } from "./components/head-to-head-table";
import { CurrentStreakCard } from "./components/current-streak-card";
import { BattleDurationStatsCard } from "./components/battle-duration-stats";
import { PhGrowthChart } from "./components/ph-growth-chart";
import { RatingGrowthChart } from "./components/rating-growth-chart";
import { RatingDeltaByOpponentCard } from "./components/rating-delta-by-opponent-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { SectionHeader } from "@/components/layout/section-header";
import { BarChart3 } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  battlePanelStatisticsSearchParsers,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { CombatProfileOverview } from "./components/combat-profile-overview";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

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
  const ph = queryState.ph ?? undefined;
  const matchmaking = queryState.matchmaking ?? undefined;
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
      ph,
      matchmaking,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useBattlesControllerGetHeadToHead({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
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
      ph,
      matchmaking,
    });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattlesControllerGetBattleDuration({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } =
    useBattlesControllerGetPhGrowth({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });

  const { data: ratingGrowthData, isLoading: isRatingGrowthLoading } =
    useBattlesControllerGetRatingGrowth({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
    });

  const { data: ratingDeltaData, isLoading: isRatingDeltaLoading } =
    useBattlesControllerGetRatingDeltaByOpponent({
      characterId: selectedCharacterId,
      period,
      minLevel,
      maxLevel,
    });
  const { data: combatProfile, isLoading: isCombatProfileLoading } = useQuery({
    queryKey: [
      "combat-profile",
      selectedCharacterId,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    ],
    queryFn: () =>
      battlesControllerGetCombatProfile({
        characterId: selectedCharacterId,
        period,
        minLevel,
        maxLevel,
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
    ph,
    matchmaking,
  };

  if (isLoadingCharacters) {
    return null;
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        <SectionHeader
          icon={BarChart3}
          title={t("battlePanel.statistics.title")}
          subtitle={t("battlePanel.statistics.subtitle")}
        />
        <Card className="gap-3 border-border bg-card/60 p-3 backdrop-blur-sm">
          <StatisticsFilters
            characterId={currentCharacterId}
            period={period}
            minLevel={minLevel}
            maxLevel={maxLevel}
            ph={ph}
            matchmaking={matchmaking}
            onCharacterChange={(characterId) => {
              void setQueryState({
                characterId: characterId ?? null,
              });
            }}
            onPeriodChange={(newPeriod) => {
              void setQueryState({
                period: newPeriod,
              });
            }}
            onMinLevelChange={(newMinLevel) => {
              void setQueryState({
                minLevel: newMinLevel ?? 1,
              });
            }}
            onMaxLevelChange={(newMaxLevel) => {
              void setQueryState({
                maxLevel: newMaxLevel ?? 500,
              });
            }}
            onPhChange={(newPh) => {
              void setQueryState({
                ph: newPh ? true : null,
              });
            }}
            onMatchmakingChange={(newMatchmaking) => {
              void setQueryState({
                matchmaking: newMatchmaking ? true : null,
              });
            }}
          />
        </Card>

        <CombatProfileOverview
          data={combatProfile}
          isLoading={isCombatProfileLoading}
        />

        {matchmaking ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              <ProfessionWinRateChart
                data={professionData ?? []}
                isLoading={isProfessionLoading}
              />
              <RatingDeltaByOpponentCard
                data={ratingDeltaData ?? []}
                search={{
                  characterId: statisticsSearch.characterId,
                  period: statisticsSearch.period,
                  minLevel: statisticsSearch.minLevel,
                  maxLevel: statisticsSearch.maxLevel,
                }}
                isLoading={isRatingDeltaLoading}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
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
          </>
        )}
      </div>
    </ScrollArea>
  );
}
