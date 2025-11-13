import { useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useProfessionWinRate } from "@/hooks/api/battle-log/use-profession-win-rate";
import { useHeadToHead } from "@/hooks/api/battle-log/use-head-to-head";
import { useBattleStreak } from "@/hooks/api/battle-log/use-battle-streak";
import { useBattleDuration } from "@/hooks/api/battle-log/use-battle-duration";
import { usePhGrowth } from "@/hooks/api/battle-log/use-ph-growth";
import { useRatingGrowth } from "@/hooks/api/battle-log/use-rating-growth";
import { useRatingDeltaByOpponent } from "@/hooks/api/battle-log/use-rating-delta-by-opponent";
import { StatisticsFilters } from "./components/statistics-filters";
import { ProfessionWinRateChart } from "./components/profession-win-rate";
import { HeadToHeadTable } from "./components/head-to-head-table";
import { CurrentStreakCard } from "./components/current-streak-card";
import { BattleDurationStatsCard } from "./components/battle-duration-stats";
import { PhGrowthChart } from "./components/ph-growth-chart";
import { RatingGrowthChart } from "./components/rating-growth-chart";
import { RatingDeltaByOpponentCard } from "./components/rating-delta-by-opponent-card";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";

export function BattlePanelStatistics() {
  const { data: characters, isLoading: isLoadingCharacters } =
    useBattleCharacters();

  const { currentCharacterId, period, minLevel, maxLevel, ph, matchmaking } =
    useBattleFiltersStore(
      useShallow((state) => {
        const charId = state.currentCharacterId;
        const filters = state.getFilters(charId);
        return {
          currentCharacterId: charId,
          period: filters.period ?? "30d",
          minLevel: filters.minLevel ?? 1,
          maxLevel: filters.maxLevel ?? 500,
          ph: filters.ph,
          matchmaking: filters.matchmaking,
        };
      }),
    );

  useEffect(() => {
    if (!isLoadingCharacters && characters?.length && !currentCharacterId) {
      const firstCharacterId = characters[0]?.id;
      if (firstCharacterId) {
        useBattleFiltersStore
          .getState()
          .setCurrentCharacterId(firstCharacterId);
      }
    }
  }, [characters, currentCharacterId, isLoadingCharacters]);

  const { data: professionData, isLoading: isProfessionLoading } =
    useProfessionWinRate({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useHeadToHead({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      size: 5,
    });

  const { data: streakData, isLoading: isStreakLoading } = useBattleStreak({
    characterId: currentCharacterId ?? characters?.[0]?.id,
    period,
    minLevel,
    maxLevel,
    ph,
    matchmaking,
  });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattleDuration({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } = usePhGrowth({
    characterId: currentCharacterId ?? characters?.[0]?.id,
    period,
    minLevel,
    maxLevel,
    ph,
    matchmaking,
  });

  const { data: ratingGrowthData, isLoading: isRatingGrowthLoading } =
    useRatingGrowth({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
    });

  const { data: ratingDeltaData, isLoading: isRatingDeltaLoading } =
    useRatingDeltaByOpponent({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
    });

  const handleCharacterChange = useCallback(
    (newCharacterId: string | undefined) => {
      useBattleFiltersStore.getState().setCurrentCharacterId(newCharacterId);
    },
    [],
  );

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { period: newPeriod });
  }, []);

  const handleMinLevelChange = useCallback(
    (newMinLevel: number | undefined) => {
      const currentId = useBattleFiltersStore.getState().currentCharacterId;
      useBattleFiltersStore
        .getState()
        .updateFilters(currentId, { minLevel: newMinLevel ?? 1 });
    },
    [],
  );

  const handleMaxLevelChange = useCallback(
    (newMaxLevel: number | undefined) => {
      const currentId = useBattleFiltersStore.getState().currentCharacterId;
      useBattleFiltersStore
        .getState()
        .updateFilters(currentId, { maxLevel: newMaxLevel ?? 500 });
    },
    [],
  );

  const handlePhChange = useCallback((newPh: boolean) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore.getState().updateFilters(currentId, { ph: newPh });
  }, []);

  const handleMatchmakingChange = useCallback((newMatchmaking: boolean) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { matchmaking: newMatchmaking });
  }, []);

  if (isLoadingCharacters) {
    return null;
  }

  return (
    <div>
      <div className="p-4 pb-4 md:pb-0 bg-background">
        <h1 className="text-xl font-bold">Statystyki walk</h1>
        <p className="text-muted-foreground">
          Szczegółowa analiza i statystyki z historii twoich walk
        </p>
      </div>

      <StatisticsFilters
        characterId={currentCharacterId}
        period={period}
        minLevel={minLevel}
        maxLevel={maxLevel}
        ph={ph}
        matchmaking={matchmaking}
        onCharacterChange={handleCharacterChange}
        onPeriodChange={handlePeriodChange}
        onMinLevelChange={handleMinLevelChange}
        onMaxLevelChange={handleMaxLevelChange}
        onPhChange={handlePhChange}
        onMatchmakingChange={handleMatchmakingChange}
      />

      <div className="p-4 space-y-6">
        {matchmaking ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              <ProfessionWinRateChart
                data={professionData ?? []}
                isLoading={isProfessionLoading}
              />
              <RatingDeltaByOpponentCard
                data={ratingDeltaData ?? []}
                isLoading={isRatingDeltaLoading}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              <ProfessionWinRateChart
                data={professionData ?? []}
                isLoading={isProfessionLoading}
              />
              <HeadToHeadTable
                data={headToHeadData?.records ?? []}
                isLoading={isHeadToHeadLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
