import { findNpcType } from "@/constants/npc";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useKillsControllerGetMemberKills,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/client/main";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

import { useMemberColor } from "@/hooks/discord/use-member-color";
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
  cursor,
}: {
  settings: StatsSettings;
  debouncedSearch: string;
  debouncedMinLvl: number | undefined;
  debouncedMaxLvl: number | undefined;
  cursor: number;
}) =>
  buildMemberKillsParams({
    world: settings.world ?? undefined,
    npcTypes: getNpcTypeFilter(settings.npcType),
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    cursor,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

export function useMemberStatsPage() {
  const { t } = useTranslation();

  const { memberId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/members/$memberId",
  });

  const [cursor, setCursor] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
  } = useStatsSettings("member");

  const { data, isLoading } = useKillsControllerGetMemberKills(
    {
      guildId,
      memberId,
    },
    getMemberKillsQueryParams({
      settings,
      debouncedSearch,
      debouncedMinLvl,
      debouncedMaxLvl,
      cursor,
    }),
  );

  const { data: guildMembers } = useMembersControllerGetGuildMemberReferences(
    { guildId },
    {
      includeInactive: true,
    },
  );

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findNpcType(value);

    if (value !== "ALL" && !npcType) return;
    setNpcType(npcType ?? "ALL");
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCursor(0);
  };

  const handleNextPage = () => {
    if (data?.pagination?.hasNext) {
      setCursor(cursor + ITEMS_PER_PAGE);
    }
  };

  const handlePreviousPage = () => {
    if (cursor > 0) {
      setCursor(Math.max(0, cursor - ITEMS_PER_PAGE));
    }
  };

  const guildMember = guildMembers?.find(
    (m) => m.userId === data?.member?.memberUserId,
  );

  const adaptedMember = guildMember
    ? {
        roles: [{ position: 0, color: guildMember.color }],
      }
    : undefined;

  const memberColor = useMemberColor(adaptedMember);

  const member = data?.member;

  return {
    member,
    isLoading,
    t,
    data,
    settings,
    debouncedSearch,
    cursor,
    memberColor,
    search,
    handleSearchChange,
    handleWorldChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    guildId,
    handlePreviousPage,
    handleNextPage,
  };
}
