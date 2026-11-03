import { useCursorStack } from "@/hooks/use-cursor-stack";
import { findKilledNpcType } from "@/constants/npc";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useKillsControllerGetMemberKills } from "@lootlog/client/main";

import { getMemberColor } from "@/utils/get-member-color";
import { useGuildMemberMap } from "@/hooks/api/use-guild-member-map";
import { useStatsSettings } from "./hooks/use-stats-settings";

import {
  buildMemberKillsParams,
  DEFAULT_MEMBER_KILLS_LIMIT,
} from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = DEFAULT_MEMBER_KILLS_LIMIT;

export function useMemberStatsPage() {
  const { t } = useTranslation();

  const { memberId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/members/$memberId",
  });

  const {
    settings,
    searchDraft,
    hasActiveFilters,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
    setSearch,
    resetFilters,
  } = useStatsSettings();

  const filterParams = buildMemberKillsParams(settings);

  // A cursor is valid only for the filters it was issued for.
  const pages = useCursorStack(JSON.stringify(filterParams));

  const { data, isLoading } = useKillsControllerGetMemberKills(
    {
      guildId,
      memberId,
    },
    buildMemberKillsParams(settings, pages.cursor),
  );

  const membersMap = useGuildMemberMap(guildId);

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findKilledNpcType(value);

    if (value !== "ALL" && !npcType) return;
    setNpcType(npcType ?? "ALL");
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
    handleClearFilters: resetFilters,
    member,
    isLoading,
    t,
    data,
    settings,
    hasActiveFilters,
    firstRank: pages.pageIndex * ITEMS_PER_PAGE,
    hasPrev: pages.hasPrev,
    memberColor,
    search: searchDraft,
    handleSearchChange: setSearch,
    handleNpcTypeChange,
    handleMinLvlChange: setMinLvl,
    handleMaxLvlChange: setMaxLvl,
    handlePeriodChange: setPeriod,
    guildId,
    handlePreviousPage: pages.goToPrevious,
    handleNextPage,
  };
}
