import { useEffect } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
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
import type { Period } from "@/store/battle-filters.store";

const filtersParser = {
  characterId: parseAsString,
  period: parseAsStringEnum<Period>([
    "24h",
    "3d",
    "7d",
    "14d",
    "30d",
    "90d",
    "180d",
    "all",
  ]).withDefault("30d"),
  minLevel: parseAsInteger.withOptions({ throttleMs: 1000 }),
  maxLevel: parseAsInteger.withOptions({ throttleMs: 1000 }),
};

export function BattlePanelStatistics() {
  const { data: characters } = useBattleCharacters();

  const [filters, setFilters] = useQueryStates(filtersParser, {
    history: "push",
    shallow: false,
  });

  const { characterId, period, minLevel, maxLevel } = filters;

  const normalizedCharacterId = characterId ?? undefined;
  const normalizedMinLevel = minLevel ?? undefined;
  const normalizedMaxLevel = maxLevel ?? undefined;

  useEffect(() => {
    if (characters?.length && !characterId) {
      setFilters({ characterId: characters[0]?.id });
    }
  }, [characters, characterId, setFilters]);

  const handleCharacterChange = (newCharacterId: string | undefined) => {
    setFilters({ characterId: newCharacterId ?? null });
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setFilters({ period: newPeriod });
  };

  const handleMinLevelChange = (newMinLevel: number | undefined) => {
    setFilters({ minLevel: newMinLevel ?? null });
  };

  const handleMaxLevelChange = (newMaxLevel: number | undefined) => {
    setFilters({ maxLevel: newMaxLevel ?? null });
  };

  const { data: professionData, isLoading: isProfessionLoading } =
    useProfessionWinRate({
      characterId: normalizedCharacterId ?? characters?.[0]?.id,
      period,
      minLevel: normalizedMinLevel,
      maxLevel: normalizedMaxLevel,
    });

  const { data: headToHeadData, isLoading: isHeadToHeadLoading } =
    useHeadToHead({
      characterId: normalizedCharacterId ?? characters?.[0]?.id,
      period,
      minLevel: normalizedMinLevel,
      maxLevel: normalizedMaxLevel,
    });

  const { data: streakData, isLoading: isStreakLoading } = useBattleStreak({
    characterId: normalizedCharacterId ?? characters?.[0]?.id,
    period,
    minLevel: normalizedMinLevel,
    maxLevel: normalizedMaxLevel,
  });

  const { data: durationData, isLoading: isDurationLoading } =
    useBattleDuration({
      characterId: normalizedCharacterId ?? characters?.[0]?.id,
      period,
      minLevel: normalizedMinLevel,
      maxLevel: normalizedMaxLevel,
    });

  const { data: phGrowthData, isLoading: isPhGrowthLoading } = usePhGrowth({
    characterId: normalizedCharacterId ?? characters?.[0]?.id,
    period,
    minLevel: normalizedMinLevel,
    maxLevel: normalizedMaxLevel,
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
        characterId={normalizedCharacterId}
        period={period}
        minLevel={normalizedMinLevel}
        maxLevel={normalizedMaxLevel}
        onCharacterChange={handleCharacterChange}
        onPeriodChange={handlePeriodChange}
        onMinLevelChange={handleMinLevelChange}
        onMaxLevelChange={handleMaxLevelChange}
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
          data={headToHeadData?.records ?? []}
          isLoading={isHeadToHeadLoading}
        />
      </div>
    </div>
  );
}
