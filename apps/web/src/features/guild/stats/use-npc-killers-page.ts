import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getOffsetPagination } from "./utils/offset-pagination";

import {
  getKillsControllerGetNpcKillersQueryKey,
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useKillsControllerGetNpcKillers,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/client/main";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildNpcKillersParams } from "./utils/build-stats-query-params";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";

const ITEMS_PER_PAGE = 20;

export function useNpcKillersPage() {
  const { t } = useTranslation();

  const { npcId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/$npcId",
  });

  const [cursor, setCursor] = useState(0);
  const [search, setSearch] = useState("");
  const { settings, setWorld, setPeriod } = useStatsSettings("npc-killers");

  const npcKillersParams = buildNpcKillersParams({
    world: settings.world ?? undefined,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetNpcKillers(
    {
      guildId,
      npcId,
    },
    npcKillersParams,
    {
      query: {
        enabled: Boolean(guildId && npcId),
        queryKey: getKillsControllerGetNpcKillersQueryKey(
          {
            guildId,
            npcId,
          },
          npcKillersParams,
        ),
      },
    },
  );

  const { data: guildMembers } = useMembersControllerGetGuildMemberReferences(
    { guildId },
    {
      includeInactive: true,
    },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetGuildMemberReferencesQueryKey(
          { guildId },
          { includeInactive: true },
        ),
      },
    },
  );

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handlePeriodChange = (value: KillStatsPeriod) => {
    setPeriod(value);
    setCursor(0);
  };

  const membersMap = new Map(guildMembers?.map((m) => [m.userId, m]) ?? []);

  const killers = data?.killers ?? [];

  const filteredKillers = search
    ? killers.filter((k) =>
        k.memberName.toLowerCase().includes(search.toLowerCase()),
      )
    : killers;

  const hasActiveFilters =
    Boolean(settings.world) || settings.period !== "all" || Boolean(search);

  const total = filteredKillers.length;

  const paginatedKillers = filteredKillers.slice(
    cursor,
    cursor + ITEMS_PER_PAGE,
  );

  const { hasNext, hasPrev, handleNextPage, handlePreviousPage } =
    getOffsetPagination(cursor, total, ITEMS_PER_PAGE, setCursor);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCursor(0);
  };

  return {
    isLoading,
    data,
    t,
    npcId,
    killers,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
    handlePeriodChange,
    filteredKillers,
    hasActiveFilters,
    paginatedKillers,
    cursor,
    guildId,
    membersMap,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  };
}
