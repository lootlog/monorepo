import {
  battlePanelHeadToHeadSearchParsers,
  getBattlePanelPageIndex,
  getSelectedWarriorsFromSearch,
  HEAD_TO_HEAD_SORT_BY_VALUES,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  buildHeadToHeadFilterLabels,
  removeHeadToHeadFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import type {
  HeadToHeadRecord,
  SearchWarrior,
} from "@/lib/api/battlelog-types";
import { sortingTableFeatures } from "@/lib/tanstack-table-features";
import { useBattlesControllerGetHeadToHead } from "@lootlog/client/battlelog";
import { useNavigate } from "@tanstack/react-router";
import {
  functionalUpdate,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { createBattlePanelCursorActions } from "../components/battle-panel-cursor-actions";

/** The battles of one Abyss season, which fix the character and dates. */
export type HeadToHeadSeasonScope = {
  characterId: string;
  startDate: string;
  endDate: string;
};

export type HeadToHeadPageVariantProps = {
  columns: ColumnDef<typeof sortingTableFeatures, HeadToHeadRecord>[];
  emptyDescriptionKey: string;
  emptyTitleKey: string;
  matchmaking: boolean;
  showPhFilter: boolean;
  showRatingDelta?: boolean;
  titleKey: string;
  trailingSkeletonColumns?: number;
  season?: HeadToHeadSeasonScope;
};

type HeadToHeadFilterPatch = {
  characterId?: string;
  maxLevel?: number;
  minLevel?: number;
  period: Period;
  ph?: boolean;
  search?: string;
};

export function useHeadToHeadPage({
  columns,
  matchmaking,
  showPhFilter,
  season,
}: Pick<
  HeadToHeadPageVariantProps,
  "columns" | "matchmaking" | "showPhFilter" | "season"
>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [queryState, setQueryState] = useQueryStates(
    battlePanelHeadToHeadSearchParsers,
  );

  const resolvePageState = () => ({
    pageIndex: getBattlePanelPageIndex(queryState.page),
    currentCharacterId:
      season?.characterId ??
      normalizeBattlePanelCharacterId(queryState.characterId),
    period: season ? ("all" as const) : (queryState.period ?? "30d"),
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
    startDate: season?.startDate ?? queryState.startDate ?? undefined,
    endDate: season?.endDate ?? queryState.endDate ?? undefined,
    ph: showPhFilter ? (queryState.ph ?? undefined) : undefined,
    cursor: queryState.cursor ?? undefined,
    search: queryState.search ?? undefined,
    sortBy: queryState.sortBy ?? "totalBattles",
    sortOrder: queryState.sortOrder ?? "desc",
  });

  const {
    pageIndex,
    currentCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    cursor,
    search,
    sortBy,
    sortOrder,
  } = resolvePageState();

  const selectedWarriors = getSelectedWarriorsFromSearch(search);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const pageSize = 20;

  const handleRowClick = (opponentId: string) => {
    if (!currentCharacterId) return;

    void navigate({
      to: "/@me/battle-panel/statistics/player-vs-player/$myId/$opponentId",
      params: {
        myId: currentCharacterId,
        opponentId,
      },
      search: {
        characterId: currentCharacterId,
        period,
        minLevel,
        maxLevel,
        startDate,
        endDate,
        ph,
        matchmaking,
      },
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    opponentId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== "") {
      return;
    }

    event.preventDefault();
    handleRowClick(opponentId);
  };

  const { data, isLoading, isError, error } = useBattlesControllerGetHeadToHead(
    {
      cursor,
      size: pageSize,
      sortBy,
      sortOrder,
      characterId: currentCharacterId,
      period,
      startDate,
      endDate,
      search,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      includeTotal: true,
    },
  );

  const applyFilterState = ({
    characterId,
    maxLevel: nextMaxLevel,
    minLevel: nextMinLevel,
    period: nextPeriod,
    ph: nextPh,
    search: nextSearch,
  }: HeadToHeadFilterPatch) => {
    const filters = {
      ...resetBattlePanelCursorPagination(),
      minLevel: nextMinLevel ?? 1,
      maxLevel: nextMaxLevel ?? 500,
      ph: showPhFilter ? (nextPh ?? null) : null,
      matchmaking: null,
      search: nextSearch ?? null,
    };

    // A season keeps its character and dates out of the address.
    if (season) {
      void setQueryState(filters);

      return;
    }

    void setQueryState({
      ...filters,
      characterId: characterId ?? null,
      period: nextPeriod,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });
  };

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const isSelected = selectedWarriors.some(
      (item) => item.name === warrior.name,
    );

    const nextSelectedWarriors = isSelected
      ? selectedWarriors.filter((item) => item.name !== warrior.name)
      : [warrior];

    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel,
      ph,
      search:
        nextSelectedWarriors.length > 0
          ? nextSelectedWarriors.map((item) => item.name).join(",")
          : undefined,
    });
  };

  const { handleNextPage, handlePreviousPage } = createBattlePanelCursorActions(
    data?.pagination,
    queryState.page,
    setQueryState,
  );

  const handlePeriodChange = (value: Period) => {
    applyFilterState({
      characterId: currentCharacterId,
      period: value,
      minLevel,
      maxLevel,
      ph,
      search,
    });
  };

  const handleCharacterChange = (id: string | undefined) => {
    applyFilterState({
      characterId: id,
      period,
      minLevel,
      maxLevel,
      ph,
      search,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel: value,
      maxLevel,
      ph,
      search,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel: value,
      ph,
      search,
    });
  };

  const handlePhChange = (value: boolean) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel,
      ph: value ? true : undefined,
      search,
    });
  };

  const table = useTable({
    features: sortingTableFeatures,
    data: data?.records ?? [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const nextSorting = functionalUpdate(updater, sorting);
      const nextSort = nextSorting[0];

      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        sortBy:
          HEAD_TO_HEAD_SORT_BY_VALUES.find((value) => value === nextSort?.id) ??
          "totalBattles",
        sortOrder: nextSort?.desc ? "desc" : "asc",
      });
    },
    manualSorting: true,
  });

  const filterState = {
    characterId: currentCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    search,
  };

  const activeFilterChips = buildHeadToHeadFilterLabels({
    ...filterState,
    selectedWarriorsCount: selectedWarriors.length,
    translate: t,
  })
    // The character has its own picker in the bar, and a season fixes the
    // dates, so neither is a chip to clear.
    .filter(
      (chip) => chip.id !== "character" && !(season && chip.id === "period"),
    )
    .map((chip) => ({
      ...chip,
      onRemove: () =>
        applyFilterState(removeHeadToHeadFilter(filterState, chip.id)),
    }));

  return {
    currentCharacterId,
    period,
    minLevel,
    maxLevel,
    ph,
    selectedWarriors,
    handleCharacterChange,
    handlePeriodChange,
    handleMinLevelChange,
    handleMaxLevelChange,
    handlePhChange,
    handleWarriorToggle,
    data,
    t,
    handlePreviousPage,
    handleNextPage,
    pageIndex,
    pageSize,
    isLoading,
    isError,
    error,
    handleRowClick,
    table,
    handleRowKeyDown,
    activeFilterChips,
    applyFilterState,
  };
}
