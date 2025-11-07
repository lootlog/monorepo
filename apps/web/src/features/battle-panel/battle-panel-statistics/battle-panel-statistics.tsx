import { useState, useEffect } from "react";
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
import { useStatisticsStore } from "@/store/statistics.store";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";

export function BattlePanelStatistics() {
  const [characterId, setCharacterId] = useState<string | undefined>(undefined);
  const [world, setWorld] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<Period>("30d");

  const { data: characters } = useBattleCharacters();
  const selectedCharacterId = useStatisticsStore(
    (state) => state.selectedCharacterId,
  );
  const setSelectedCharacterId = useStatisticsStore(
    (state) => state.setSelectedCharacterId,
  );
  const headToHeadCharacterId = useStatisticsStore(
    (state) => state.headToHeadCharacterId,
  );
  const setHeadToHeadCharacterId = useStatisticsStore(
    (state) => state.setHeadToHeadCharacterId,
  );
  const streakCharacterId = useStatisticsStore(
    (state) => state.streakCharacterId,
  );
  const setStreakCharacterId = useStatisticsStore(
    (state) => state.setStreakCharacterId,
  );
  const durationCharacterId = useStatisticsStore(
    (state) => state.durationCharacterId,
  );
  const setDurationCharacterId = useStatisticsStore(
    (state) => state.setDurationCharacterId,
  );
  const phGrowthCharacterId = useStatisticsStore(
    (state) => state.phGrowthCharacterId,
  );
  const setPhGrowthCharacterId = useStatisticsStore(
    (state) => state.setPhGrowthCharacterId,
  );

  useEffect(() => {
    if (characters && characters.length > 0) {
      const firstCharId = characters[0]?.id;
      if (!selectedCharacterId) {
        setSelectedCharacterId(firstCharId);
      }
      if (!streakCharacterId) {
        setStreakCharacterId(firstCharId);
      }
      if (!durationCharacterId) {
        setDurationCharacterId(firstCharId);
      }
      if (!phGrowthCharacterId) {
        setPhGrowthCharacterId(firstCharId);
      }
    }
  }, [
    characters,
    selectedCharacterId,
    setSelectedCharacterId,
    streakCharacterId,
    setStreakCharacterId,
    durationCharacterId,
    setDurationCharacterId,
    phGrowthCharacterId,
    setPhGrowthCharacterId,
  ]);

  const professionCharacterId = selectedCharacterId || characters?.[0]?.id;
  const streakCharIdToUse = streakCharacterId || characters?.[0]?.id;
  const durationCharIdToUse = durationCharacterId || characters?.[0]?.id;
  const phGrowthCharIdToUse = phGrowthCharacterId || characters?.[0]?.id;

  const { data: professionData, isLoading: isProfessionLoading } =
    useProfessionWinRate({
      characterId: professionCharacterId,
      world,
      period,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useHeadToHead({
      characterId: headToHeadCharacterId,
      world,
      period,
    });

  const { data: streakData, isLoading: isStreakLoading } = useBattleStreak({
    characterId: streakCharIdToUse,
    world,
    period,
  });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattleDuration({
      characterId: durationCharIdToUse,
      world,
      period,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } = usePhGrowth({
    characterId: phGrowthCharIdToUse,
    world,
    period,
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Statystyki walk</h1>
        <p className="text-muted-foreground">
          Szczegółowa analiza i statystyki z historii twoich walk
        </p>
      </div>

      <StatisticsFilters
        characterId={characterId}
        world={world}
        period={period}
        onCharacterChange={setCharacterId}
        onWorldChange={setWorld}
        onPeriodChange={setPeriod}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CurrentStreakCard
          data={
            streakData ?? {
              current: { type: "none", count: 0 },
              longest: { wins: 0, losses: 0 },
            }
          }
          isLoading={isStreakLoading}
          characterId={streakCharIdToUse}
          onCharacterChange={setStreakCharacterId}
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
          characterId={durationCharIdToUse}
          onCharacterChange={setDurationCharacterId}
        />
        <PhGrowthChart
          data={phGrowthData ?? []}
          isLoading={isPhGrowthLoading}
          characterId={phGrowthCharIdToUse}
          onCharacterChange={setPhGrowthCharacterId}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ProfessionWinRateChart
          data={professionData ?? []}
          isLoading={isProfessionLoading}
          characterId={professionCharacterId}
          onCharacterChange={setSelectedCharacterId}
        />
        <HeadToHeadTable
          data={headToHeadData ?? []}
          isLoading={isHeadToHeadLoading}
          characterId={headToHeadCharacterId}
          onCharacterChange={setHeadToHeadCharacterId}
        />
      </div>
    </div>
  );
}
