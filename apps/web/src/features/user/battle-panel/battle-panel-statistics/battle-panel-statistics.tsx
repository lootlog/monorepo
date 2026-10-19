import { isLevelRangeActive } from "@/features/user/battle-panel/components/battle-panel-filter-state";
import { startTransition, useEffect } from "react";
import { useBattlesControllerGetUserCharacters } from "@lootlog/client/battlelog";
import { StatisticsFilterToolbar } from "./components/statistics-filter-toolbar";
import { StatisticsStackedFilters } from "./components/statistics-stacked-filters";
import { FilterBar } from "@/components/common/filter-bar";
import { useQueryStates } from "nuqs";
import {
  battlePanelStatisticsSearchParsers,
  normalizeBattlePanelCharacterId,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import { BattleCharacterSelect } from "@/features/user/battle-panel/components/battle-character-select";
import { StatisticsQueryPanel } from "./components/statistics-query-panel";
import { BattleAnalyticsOverview } from "./components/battle-analytics-overview";
import { useTranslation } from "react-i18next";
import { BattlePanelStatisticsSkeleton } from "./battle-panel-statistics-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { Swords } from "lucide-react";

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

  // Filters apply in a transition, so the sections keep their data while the
  // next statistics load.
  const setFilters = (values: Parameters<typeof setQueryState>[0]) => {
    startTransition(() => {
      void setQueryState(values);
    });
  };

  const filterProps = {
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

    return (
      <div className="p-3">
        <EmptyState
          fill
          icon={Swords}
          title={t("battlePanel.statistics.empty.title")}
        />
      </div>
    );
  }

  const params = {
    characterId: selectedCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate: queryState.startDate ?? undefined,
    endDate: queryState.endDate ?? undefined,
    ph,
    matchmaking: false,
  };

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t("battlePanel.statistics.title")}</h1>
      <FilterBar
        ariaLabel={t("battlePanel.filters.title")}
        search={
          <BattleCharacterSelect
            characterId={selectedCharacterId}
            onCharacterChange={(characterId) =>
              setFilters({ characterId: characterId ?? null })
            }
          />
        }
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
      <BattleAnalyticsOverview
        params={params}
        allOpponentsLink={{
          to: "/@me/battle-panel/opponents",
          search: {
            characterId: selectedCharacterId,
            period,
            minLevel,
            maxLevel,
            ph,
          },
        }}
      />
    </div>
  );
}
