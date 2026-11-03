import { findKilledNpcType } from "@/constants/npc";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import {
  useKillsControllerGetGuildTopNpcs,
  type GuildTopNpcsResponseDtoOutputTopNpcsItem,
} from "@lootlog/client/main";

import { useStatsSettings } from "./hooks/use-stats-settings";
import {
  buildGuildTopNpcsParams,
  GUILD_TOP_NPCS_LIST_LIMIT,
} from "./utils/build-stats-query-params";
import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";

const ITEMS_PER_PAGE = 20;

export const useStatsNpcsListModel = () => {
  const { t } = useTranslation();

  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/",
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
    setNpcType,
    setPeriod,
    setSearch,
    resetFilters,
  } = useStatsSettings();

  const topNpcsParams = buildGuildTopNpcsParams({
    limit: GUILD_TOP_NPCS_LIST_LIMIT,
    npcType: settings.npcType === "ALL" ? undefined : settings.npcType,
    world: settings.world ?? undefined,
    search: settings.search || undefined,
    minLvl: parseKillStatsLevel(settings.minLvl),
    maxLvl: parseKillStatsLevel(settings.maxLvl),
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildTopNpcs(
    { guildId },
    topNpcsParams,
    {
      query: {
        enabled: Boolean(guildId),
      },
    },
  );

  const topNpcs = data?.topNpcs ?? [];

  const total = topNpcs.length;
  const isCapped = total >= GUILD_TOP_NPCS_LIST_LIMIT;

  const { cursor, hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(pageIndex, total, ITEMS_PER_PAGE, setPageIndex);

  const paginatedData = topNpcs.slice(cursor, cursor + ITEMS_PER_PAGE);

  const handleRowClick = (npc: GuildTopNpcsResponseDtoOutputTopNpcsItem) => {
    navigate({
      to: "/$guildId/stats/npcs/$npcId",
      params: { guildId, npcId: String(npc.npcId) },
    });
  };

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findKilledNpcType(value);

    if (value !== "ALL" && !npcType) return;
    setNpcType(npcType ?? "ALL");
  };

  return {
    t,
    handleClearFilters: resetFilters,
    search: searchDraft,
    handleSearchChange: setSearch,
    settings,
    handleNpcTypeChange,
    handleMinLvlChange: setMinLvl,
    handleMaxLvlChange: setMaxLvl,
    handlePeriodChange: setPeriod,
    isLoading,
    paginatedData,
    hasActiveFilters,
    handleRowClick,
    cursor,
    guildId,
    total,
    isCapped,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
};
