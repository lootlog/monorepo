import { useNavigate, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import {
  getKillsControllerGetGuildKillStatsQueryKey,
  useKillsControllerGetGuildKillStats,
  type NpcType,
} from "@lootlog/client/main";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = 20;

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

export const useStatsRankingModel = () => {
  const { t } = useTranslation();

  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/ranking",
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
    setPeriod,
  } = useStatsSettings("ranking");

  const [searchQuery, setSearchQuery] = useState("");

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
        queryKey: getKillsControllerGetGuildKillStatsQueryKey(
          { guildId },
          killStatsParams,
        ),
      },
    },
  );

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const value = e.target.value;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCursor(0);
    }, 500);
  };

  const memberRanking = data?.memberRanking ?? [];

  const filteredRanking = searchQuery
    ? memberRanking.filter((member) =>
        member.memberName?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memberRanking;

  const hasActiveFilters =
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all" ||
    Boolean(searchQuery);

  const total = filteredRanking.length;
  const paginatedData = filteredRanking.slice(cursor, cursor + ITEMS_PER_PAGE);

  const { hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(cursor, total, ITEMS_PER_PAGE, setCursor);

  const activeNpcTypes = NPC_TYPE_ORDER.filter((type) =>
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
    handleSearchChange,
    settings,
    handleWorldChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    data,
    paginatedData,
    hasActiveFilters,
    cursor,
    handleRowClick,
    activeNpcTypes,
    guildId,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
};
