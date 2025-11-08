import { useEffect } from "react";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useProfessionWinRate } from "@/hooks/api/battle-log/use-profession-win-rate";
import { useHeadToHead } from "@/hooks/api/battle-log/use-head-to-head";
import { useBattleStreak } from "@/hooks/api/battle-log/use-battle-streak";
import { useBattleDuration } from "@/hooks/api/battle-log/use-battle-duration";
import { usePhGrowth } from "@/hooks/api/battle-log/use-ph-growth";
import { StatisticsFilters } from "./components/statistics-filters";
import { ProfessionWinRateChart } from "./components/profession-win-rate";
import { HeadToHeadTable } from "./components/head-to-head-table";
import { CurrentStreakCard } from "./components/current-streak-card";
import { BattleDurationStatsCard } from "./components/battle-duration-stats";
import { PhGrowthChart } from "./components/ph-growth-chart";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";

export function BattlePanelStatistics() {
  const { data: characters, isLoading: isLoadingCharacters } =
    useBattleCharacters();

  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );

  useEffect(() => {
    if (!isLoadingCharacters && characters?.length && !currentCharacterId) {
      const firstCharacterId = characters[0]?.id;
      if (firstCharacterId) {
        setCurrentCharacterId(firstCharacterId);
      }
    }
  }, [
    characters,
    currentCharacterId,
    setCurrentCharacterId,
    isLoadingCharacters,
  ]);

  const period = useBattleFiltersStore(
    (state) => state.getFilters(currentCharacterId).period ?? "30d",
  );
  const minLevel = useBattleFiltersStore(
    (state) => state.getFilters(currentCharacterId).minLevel ?? 1,
  );
  const maxLevel = useBattleFiltersStore(
    (state) => state.getFilters(currentCharacterId).maxLevel ?? 500,
  );

  const { data: professionData, isLoading: isProfessionLoading } =
    useProfessionWinRate({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useHeadToHead({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
      size: 5,
    });

  const { data: streakData, isLoading: isStreakLoading } = useBattleStreak({
    characterId: currentCharacterId ?? characters?.[0]?.id,
    period,
    minLevel,
    maxLevel,
  });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattleDuration({
      characterId: currentCharacterId ?? characters?.[0]?.id,
      period,
      minLevel,
      maxLevel,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } = usePhGrowth({
    characterId: currentCharacterId ?? characters?.[0]?.id,
    period,
    minLevel,
    maxLevel,
  });

  const handleCharacterChange = (newCharacterId: string | undefined) => {
    setCurrentCharacterId(newCharacterId);
  };

  const handlePeriodChange = (newPeriod: Period) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { period: newPeriod });
  };

  const handleMinLevelChange = (newMinLevel: number | undefined) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { minLevel: newMinLevel ?? 1 });
  };

  const handleMaxLevelChange = (newMaxLevel: number | undefined) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { maxLevel: newMaxLevel ?? 500 });
  };

  if (isLoadingCharacters) {
    return null;
  }

  return (
    <div>
      <div className="p-4 pb-0 bg-background">
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
        onCharacterChange={handleCharacterChange}
        onPeriodChange={handlePeriodChange}
        onMinLevelChange={handleMinLevelChange}
        onMaxLevelChange={handleMaxLevelChange}
      />

      <div className="p-4 space-y-6">
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
      </div>
    </div>
  );
}
