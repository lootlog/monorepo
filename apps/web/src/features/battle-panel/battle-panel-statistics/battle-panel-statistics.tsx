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
  const [period, setPeriod] = useState<Period>("30d");

  const { data: characters } = useBattleCharacters();
  const selectedCharacterId = useStatisticsStore(
    (state) => state.selectedCharacterId,
  );
  const setSelectedCharacterId = useStatisticsStore(
    (state) => state.setSelectedCharacterId,
  );
  const sameLevelOnly = useStatisticsStore((state) => state.sameLevelOnly);
  const setSameLevelOnly = useStatisticsStore(
    (state) => state.setSameLevelOnly,
  );

  useEffect(() => {
    if (characters && characters.length > 0) {
      const firstCharId = characters[0]?.id;
      if (!selectedCharacterId) {
        setSelectedCharacterId(firstCharId);
      }
    }
  }, [characters, selectedCharacterId, setSelectedCharacterId]);

  const { data: professionData, isLoading: isProfessionLoading } =
    useProfessionWinRate({
      characterId: selectedCharacterId ?? characters?.[0]?.id,
      period,
      sameLevelOnly,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useHeadToHead({
      characterId: selectedCharacterId ?? characters?.[0]?.id,
      period,
      sameLevelOnly,
    });

  const { data: streakData, isLoading: isStreakLoading } = useBattleStreak({
    characterId: selectedCharacterId ?? characters?.[0]?.id,
    period,
    sameLevelOnly,
  });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattleDuration({
      characterId: selectedCharacterId ?? characters?.[0]?.id,
      period,
      sameLevelOnly,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } = usePhGrowth({
    characterId: selectedCharacterId ?? characters?.[0]?.id,
    period,
    sameLevelOnly,
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
        characterId={selectedCharacterId}
        period={period}
        sameLevelOnly={sameLevelOnly}
        onCharacterChange={setSelectedCharacterId}
        onPeriodChange={setPeriod}
        onSameLevelOnlyChange={setSameLevelOnly}
      />

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
          data={headToHeadData ?? []}
          isLoading={isHeadToHeadLoading}
        />
      </div>
    </div>
  );
}
