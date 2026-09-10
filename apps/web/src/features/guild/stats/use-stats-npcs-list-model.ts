import { findNpcType } from "@/constants/npc";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import {
  getKillsControllerGetGuildTopNpcsQueryKey,
  useKillsControllerGetGuildTopNpcs,
  type GuildTopNpcsResponseDtoOutputTopNpcsItem,
} from "@lootlog/client/main";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildGuildTopNpcsParams } from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = 20;

export const useStatsNpcsListModel = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/",
  });
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(0);
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
  } = useStatsSettings("npcs-list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const topNpcsParams = buildGuildTopNpcsParams({
    limit: 100,
    npcType: settings.npcType === "ALL" ? undefined : settings.npcType,
    world: settings.world ?? undefined,
    search: debouncedSearch || undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildTopNpcs(
    { guildId },
    topNpcsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildTopNpcsQueryKey(
          { guildId },
          topNpcsParams,
        ),
      },
    },
  );

  const topNpcs = data?.topNpcs ?? [];
  const hasActiveFilters =
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all" ||
    settings.npcType !== "ALL" ||
    Boolean(debouncedSearch);
  const total = topNpcs.length;
  const paginatedData = topNpcs.slice(cursor, cursor + ITEMS_PER_PAGE);
  const { hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(cursor, total, ITEMS_PER_PAGE, setCursor);

  const handleRowClick = (npc: GuildTopNpcsResponseDtoOutputTopNpcsItem) => {
    navigate({
      to: "/$guildId/stats/npcs/$npcId",
      params: { guildId, npcId: String(npc.npcId) },
    });
  };

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findNpcType(value);
    if (value !== "ALL" && !npcType) return;
    setNpcType(npcType ?? "ALL");
    setCursor(0);
  };

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCursor(0);
  };

  return {
    t,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    data,
    paginatedData,
    hasActiveFilters,
    handleRowClick,
    cursor,
    guildId,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
};
