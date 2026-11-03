import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import { useKillsControllerGetNpcKillers } from "@lootlog/client/main";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useStatsSettings } from "./hooks/use-stats-settings";
import {
  buildNpcKillersParams,
  NPC_KILLERS_LIMIT,
} from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = 20;

export function useNpcKillersPage() {
  const { t } = useTranslation();

  const { npcId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/$npcId",
  });

  const {
    settings,
    searchDraft,
    hasActiveFilters,
    pageIndex,
    setPageIndex,
    setPeriod,
    setSearch,
    resetFilters,
  } = useStatsSettings();

  const npcKillersParams = buildNpcKillersParams(settings);

  const { data, isLoading } = useKillsControllerGetNpcKillers(
    {
      guildId,
      npcId,
    },
    npcKillersParams,
    {
      query: {
        enabled: Boolean(guildId && npcId),
      },
    },
  );

  const membersMap = useGuildMemberMap(guildId);

  const killers = data?.killers ?? [];
  const isCapped = killers.length >= NPC_KILLERS_LIMIT;

  const search = settings.search.toLowerCase();

  const filteredKillers = search
    ? killers.filter((k) => k.member.name.toLowerCase().includes(search))
    : killers;

  const total = filteredKillers.length;

  const { cursor, hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(pageIndex, total, ITEMS_PER_PAGE, setPageIndex);

  const paginatedKillers = filteredKillers.slice(
    cursor,
    cursor + ITEMS_PER_PAGE,
  );

  return {
    handleClearFilters: resetFilters,
    isLoading,
    data,
    t,
    npcId,
    killers,
    search: searchDraft,
    handleSearchChange: setSearch,
    settings,
    handlePeriodChange: setPeriod,
    hasActiveFilters,
    paginatedKillers,
    cursor,
    guildId,
    membersMap,
    total,
    isCapped,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
}
