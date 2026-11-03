import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import { useKillsControllerGetGuildKillStats } from "@lootlog/client/main";

import { NPC_TYPES_STRONGEST_FIRST } from "@lootlog/domain/npc-type";
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
    searchDraft,
    hasActiveFilters,
    pageIndex,
    setPageIndex,
    setMinLvl,
    setMaxLvl,
    setPeriod,
    setSearch,
    resetFilters,
  } = useStatsSettings();

  const searchQuery = settings.search;
  const membersMap = useGuildMemberMap(guildId);

  const killStatsParams = buildGuildKillStatsParams(settings);

  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
      },
    },
  );

  const memberRanking = data?.memberRanking ?? [];

  const filteredRanking = searchQuery
    ? memberRanking.filter((member) =>
        member.member.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memberRanking;

  const total = filteredRanking.length;

  const { cursor, hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(pageIndex, total, ITEMS_PER_PAGE, setPageIndex);

  const paginatedData = filteredRanking.slice(cursor, cursor + ITEMS_PER_PAGE);

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

  return {
    t,
    search: searchDraft,
    handleClearFilters: resetFilters,
    handleSearchChange: setSearch,
    settings,
    handleMinLvlChange: setMinLvl,
    handleMaxLvlChange: setMaxLvl,
    handlePeriodChange: setPeriod,
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
