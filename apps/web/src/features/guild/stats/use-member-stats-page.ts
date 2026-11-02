import { useCursorStack } from "@/hooks/use-cursor-stack";
import { findKilledNpcType } from "@/constants/npc";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useKillsControllerGetMemberKills } from "@lootlog/client/main";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

import { getMemberColor } from "@/utils/get-member-color";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useStatsSettings } from "./hooks/use-stats-settings";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import {
  buildMemberKillsParams,
  DEFAULT_MEMBER_KILLS_LIMIT,
} from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = DEFAULT_MEMBER_KILLS_LIMIT;

type StatsSettings = ReturnType<typeof useStatsSettings>["settings"];

const getNpcTypeFilter = (npcType: StatsSettings["npcType"]) =>
  npcType && npcType !== "ALL" ? [npcType] : undefined;

const getMemberKillsQueryParams = ({
  settings,
  debouncedSearch,
  debouncedMinLvl,
  debouncedMaxLvl,
}: {
  settings: StatsSettings;
  debouncedSearch: string;
  debouncedMinLvl: number | undefined;
  debouncedMaxLvl: number | undefined;
}) =>
  buildMemberKillsParams({
    world: settings.world ?? undefined,
    npcTypes: getNpcTypeFilter(settings.npcType),
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

export function useMemberStatsPage() {
  const { t } = useTranslation();

  const { memberId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/members/$memberId",
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
  } = useStatsSettings("member");

  const filterParams = getMemberKillsQueryParams({
    settings,
    debouncedSearch,
    debouncedMinLvl,
    debouncedMaxLvl,
  });

  // A cursor is valid only for the filters it was issued for.
  const pages = useCursorStack(JSON.stringify(filterParams));

  const { data, isLoading } = useKillsControllerGetMemberKills(
    {
      guildId,
      memberId,
    },
    pages.cursor === undefined
      ? filterParams
      : { ...filterParams, cursor: pages.cursor },
  );

  const membersMap = useGuildMemberMap(guildId);

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findKilledNpcType(value);

    if (value !== "ALL" && !npcType) return;
    setNpcType(npcType ?? "ALL");
  };

  const handleMinLvlChange = (value: string) => {
    setMinLvl(value);
  };

  const handleMaxLvlChange = (value: string) => {
    setMaxLvl(value);
  };

  const handlePeriodChange = (value: KillStatsPeriod) => {
    setPeriod(value);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleNextPage = () => {
    if (data?.nextCursor) pages.goToNext(data.nextCursor);
  };

  const guildMember = membersMap.get(data?.member?.userId ?? "");

  const adaptedMember = guildMember
    ? {
        roles: [{ position: 0, color: guildMember.color }],
      }
    : undefined;

  const memberColor = getMemberColor(adaptedMember);

  const member = data?.member;

  return {
    member,
    isLoading,
    t,
    data,
    settings,
    debouncedSearch,
    firstRank: pages.pageIndex * ITEMS_PER_PAGE,
    hasPrev: pages.hasPrev,
    memberColor,
    search,
    handleSearchChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    guildId,
    handlePreviousPage: pages.goToPrevious,
    handleNextPage,
  };
}
