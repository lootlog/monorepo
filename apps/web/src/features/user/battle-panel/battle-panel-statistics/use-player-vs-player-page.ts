import {
  battlePanelPlayerVsPlayerSearchParsers,
  getBattlePanelPageIndex,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  buildPlayerVsPlayerFilterLabels,
  getResetPlayerVsPlayerFilters,
  removePlayerVsPlayerFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import {
  useBattlesControllerGetPlayerVsPlayerBattles,
  type PlayerVsPlayerPaginatedResponseDtoOutput,
} from "@lootlog/client/battlelog";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { createBattlePanelCursorActions } from "../components/battle-panel-cursor-actions";

import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { playerVsPlayerColumns } from "./components/player-vs-player-columns";

const getPlayerVsPlayerRequestIds = (
  currentCharacterId: string | undefined,
  ownCharacterId: string | undefined,
  opponentId: string | undefined,
) => ({
  characterId: currentCharacterId ?? ownCharacterId,
  opponentId: opponentId ?? "",
});

const getPlayerVsPlayerTableView = (
  data: PlayerVsPlayerPaginatedResponseDtoOutput | undefined,
  opponentNameCandidate: string | undefined,
  opponentNameFallback: string,
) => ({
  opponentName: opponentNameCandidate ?? opponentNameFallback,
  battles: data?.battles ?? [],
  totalCount: data?.pagination?.total ?? 0,
  visibleCount: data?.battles.length ?? 0,
});

export function usePlayerVsPlayerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const params = useParams({ strict: false });

  const opponentId = params.opponentId ?? params.myId;
  const [queryState, setQueryState] = useQueryStates(
    battlePanelPlayerVsPlayerSearchParsers,
  );
  const resolvePageState = () => ({
    pageIndex: getBattlePanelPageIndex(queryState.page),
    currentCharacterId:
      normalizeBattlePanelCharacterId(queryState.characterId) ?? params.myId,
    period: queryState.period ?? "30d",
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
    startDate: queryState.startDate ?? undefined,
    endDate: queryState.endDate ?? undefined,
    ph: queryState.ph ?? undefined,
    matchmaking: queryState.matchmaking ?? undefined,
    cursor: queryState.cursor ?? undefined,
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
    matchmaking,
    cursor,
  } = resolvePageState();
  const pageSize = 20;
  const requestIds = getPlayerVsPlayerRequestIds(
    currentCharacterId,
    params.myId,
    opponentId,
  );

  const applyFilterState = ({
    matchmaking: nextMatchmaking,
    maxLevel: nextMaxLevel,
    minLevel: nextMinLevel,
    period: nextPeriod,
    ph: nextPh,
  }: {
    matchmaking?: boolean;
    maxLevel?: number;
    minLevel?: number;
    period: Period;
    ph?: boolean;
  }) => {
    void setQueryState({
      ...resetBattlePanelCursorPagination(),
      period: nextPeriod,
      minLevel: nextMinLevel ?? 1,
      maxLevel: nextMaxLevel ?? 500,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      ph: nextPh ?? null,
      matchmaking: nextMatchmaking ?? null,
    });
  };

  const handlePeriodChange = (newPeriod: Period) => {
    applyFilterState({
      period: newPeriod,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    applyFilterState({
      period,
      minLevel: value,
      maxLevel,
      ph,
      matchmaking,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    applyFilterState({
      period,
      minLevel,
      maxLevel: value,
      ph,
      matchmaking,
    });
  };

  const { data, isLoading, isError, error } =
    useBattlesControllerGetPlayerVsPlayerBattles({
      cursor,
      size: pageSize,
      characterId: requestIds.characterId,
      period,
      startDate,
      endDate,
      opponentId: requestIds.opponentId,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      includeTotal: true,
    });

  const { handleNextPage, handlePreviousPage } = createBattlePanelCursorActions(
    data?.pagination,
    queryState.page,
    setQueryState,
  );

  const handleBattleOpen = (battleId: string) => {
    void navigate({
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId },
    });
  };

  const handleBattleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    battleId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== "") {
      return;
    }

    event.preventDefault();
    handleBattleOpen(battleId);
  };

  const opponentNameCandidate = data?.battles[0]?.opponentWarrior.name;
  const opponentNameFallback = t(
    "battlePanel.statistics.playerVsPlayer.opponentFallback",
  );
  const { opponentName, battles, totalCount, visibleCount } =
    getPlayerVsPlayerTableView(
      data,
      opponentNameCandidate,
      opponentNameFallback,
    );
  const myCharacter = data?.battles[0]?.userWarrior;

  const table = useTable({
    features: coreTableFeatures,
    data: battles,
    columns: playerVsPlayerColumns,
  });

  const filterState = {
    period,
    minLevel,
    maxLevel,
    ph,
    matchmaking,
  };
  const activeFilterChips = buildPlayerVsPlayerFilterLabels({
    ...filterState,
    translate: t,
  }).map((chip) => ({
    ...chip,
    onRemove: () =>
      applyFilterState(removePlayerVsPlayerFilter(filterState, chip.id)),
  }));

  const handleClearFilters = () => {
    applyFilterState(getResetPlayerVsPlayerFilters());
  };

  return {
    t,
    period,
    handlePeriodChange,
    minLevel,
    maxLevel,
    handleMinLevelChange,
    handleMaxLevelChange,
    isMobile,
    setIsMobileFiltersOpen,
    data,
    handlePreviousPage,
    handleNextPage,
    pageIndex,
    pageSize,
    totalCount,
    visibleCount,
    isLoading,
    isError,
    error,
    battles,
    handleBattleOpen,
    table,
    handleBattleRowKeyDown,
    isMobileFiltersOpen,
    myCharacter,
    opponentName,
    activeFilterChips,
    handleClearFilters,
  };
}
