import { useWorldScopedCursor } from "./hooks/use-world-scoped-cursor";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { getOffsetPagination } from "./utils/offset-pagination";

import { useKillsControllerGetGuildKillStats } from "@lootlog/client/main";

import { NPC_TYPES_STRONGEST_FIRST } from "@lootlog/domain/npc-type";
import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = 20;

export const useStatsRankingModel = () => {
  const { t } = useTranslation();

  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/ranking",
  });

  const navigate = useNavigate();

  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setMinLvl,
    setMaxLvl,
    setPeriod,
    resetFilters,
  } = useStatsSettings("ranking");

  const [cursor, setCursor] = useWorldScopedCursor(settings.world);

  const [search, setSearch] = useState("");
  const searchQuery = useDebounce(search, 500).trim();
  const membersMap = useGuildMemberMap(guildId);

  const killStatsParams = buildGuildKillStatsParams({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
      },
    },
  );

  const handleMinLvlChange = (value: string) => {
    setMinLvl(value);
    setCursor(0);
  };

  const handleMaxLvlChange = (value: string) => {
    setMaxLvl(value);
    setCursor(0);
  };

  const handlePeriodChange = (value: KillStatsPeriod) => {
    setPeriod(value);
    setCursor(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCursor(0);
  };

  const memberRanking = data?.memberRanking ?? [];

  const filteredRanking = searchQuery
    ? memberRanking.filter((member) =>
        member.member.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memberRanking;

  const hasActiveFilters =
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all" ||
    Boolean(searchQuery);

  const total = filteredRanking.length;
  const paginatedData = filteredRanking.slice(cursor, cursor + ITEMS_PER_PAGE);

  const { hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(cursor, total, ITEMS_PER_PAGE, setCursor);

  const activeNpcTypes = NPC_TYPES_STRONGEST_FIRST.filter((type) =>
    memberRanking.some(
      (member) => (member.participationsByType[type] ?? 0) > 0,
    ),
  );

  const handleRowClick = (memberId: number) => {
    navigate({
      to: "/$guildId/stats/members/$memberId",
      params: {
        guildId,
        memberId: memberId.toString(),
      },
    });
  };

  const handleClearFilters = () => {
    resetFilters();
    setSearch("");
    setCursor(0);
  };

  return {
    t,
    search,
    handleClearFilters,
    handleSearchChange,
    settings,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    paginatedData,
    hasActiveFilters,
    cursor,
    handleRowClick,
    activeNpcTypes,
    guildId,
    membersMap,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
};
